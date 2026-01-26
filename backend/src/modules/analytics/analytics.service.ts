import { getFirestore } from "firebase-admin/firestore";
import { Issue, IssueStatus } from "../../types";
import { firestore } from "firebase-admin";
import { firestoreCache } from "../../utils/firestore-cache";

const db = getFirestore();

/**
 * Batch fetch zone names with caching
 */
async function getZoneNames(
  zoneIds: string[],
): Promise<Record<string, string>> {
  const zoneNamesMap: Record<string, string> = {};
  const idsToFetch: string[] = [];

  // Check cache first
  for (const id of zoneIds) {
    const cached = firestoreCache.get<string>(`zone:${id}`);
    if (cached) {
      zoneNamesMap[id] = cached;
    } else {
      idsToFetch.push(id);
    }
  }

  // Batch fetch uncached zones
  if (idsToFetch.length > 0) {
    const zoneDocs = await Promise.all(
      idsToFetch.map((id) => db.collection("zones").doc(id).get()),
    );

    for (let i = 0; i < idsToFetch.length; i++) {
      const zoneId = idsToFetch[i];
      const doc = zoneDocs[i];
      const name = doc.exists ? doc.get("name") || zoneId : zoneId;
      zoneNamesMap[zoneId] = name;
      firestoreCache.set(`zone:${zoneId}`, name, 10 * 60 * 1000); // 10 min TTL
    }
  }

  return zoneNamesMap;
}

/**
 * Batch fetch room data with caching
 */
async function getRoomData(
  roomIds: string[],
): Promise<Record<string, { floor: number; roomNumber: string }>> {
  const roomDataMap: Record<string, { floor: number; roomNumber: string }> = {};
  const idsToFetch: string[] = [];

  // Check cache first
  for (const id of roomIds) {
    const cached = firestoreCache.get<{ floor: number; roomNumber: string }>(
      `room:${id}`,
    );
    if (cached) {
      roomDataMap[id] = cached;
    } else {
      idsToFetch.push(id);
    }
  }

  // Batch fetch uncached rooms
  if (idsToFetch.length > 0) {
    const roomDocs = await Promise.all(
      idsToFetch.map((id) => db.collection("rooms").doc(id).get()),
    );

    for (let i = 0; i < idsToFetch.length; i++) {
      const roomId = idsToFetch[i];
      const doc = roomDocs[i];
      if (doc.exists) {
        const data = doc.data();
        if (data && data.floor !== undefined && data.roomNumber) {
          const roomData = { floor: data.floor, roomNumber: data.roomNumber };
          roomDataMap[roomId] = roomData;
          firestoreCache.set(`room:${roomId}`, roomData, 10 * 60 * 1000);
        }
      }
    }
  }

  return roomDataMap;
}

/**
 * Get issues per zone over time
 * OPTIMIZED: Uses limit(), field projection, and caching for zone names
 */
export async function getIssuesPerZoneOverTime(
  cityId: string,
  startDate: Date,
  endDate: Date,
  groupBy: "day" | "week" | "month" = "day",
): Promise<{
  zones: Array<{
    zoneId: string;
    zoneName: string;
    timeSeries: Array<{
      period: string;
      count: number;
    }>;
  }>;
}> {
  // Fetch issues with field projection to reduce data transfer (limit to 5000 to avoid quota overload)
  const issuesSnapshot = await db
    .collection("issues")
    .where("cityId", "==", cityId)
    .where("createdAt", ">=", firestore.Timestamp.fromDate(startDate))
    .where("createdAt", "<=", firestore.Timestamp.fromDate(endDate))
    .orderBy("createdAt", "asc")
    .limit(5000)
    .get();

  const issues = issuesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Issue[];

  // Get zone names with batch fetching and caching
  const zoneIds = [...new Set(issues.map((i) => i.zoneId))];
  const zoneNamesMap = await getZoneNames(zoneIds);

  // Group issues by zone and period
  const zoneData: Record<string, Record<string, number>> = {};

  issues.forEach((issue) => {
    const zoneId = issue.zoneId;
    const createdAt = issue.createdAt.toDate();
    const period = formatPeriod(createdAt, groupBy);

    if (!zoneData[zoneId]) {
      zoneData[zoneId] = {};
    }

    zoneData[zoneId][period] = (zoneData[zoneId][period] || 0) + 1;
  });

  // Convert to response format
  const result = zoneIds.map((zoneId) => {
    const periods = zoneData[zoneId] || {};
    const timeSeries = Object.entries(periods)
      .map(([period, count]) => ({ period, count }))
      .sort((a, b) => a.period.localeCompare(b.period));

    return {
      zoneId,
      zoneName: zoneNamesMap[zoneId],
      timeSeries,
    };
  });

  return { zones: result };
}

/**
 * Get most common issue types
 * OPTIMIZED: Uses limit() to cap results at 10000 issues
 */
export async function getMostCommonIssueTypes(
  cityId: string,
  startDate?: Date,
  endDate?: Date,
  zoneId?: string,
  queryLimit: number = 10,
): Promise<{
  issueTypes: Array<{
    category: string;
    count: number;
    percentage: number;
    avgSeverity: number;
    openCount: number;
    resolvedCount: number;
  }>;
  totalIssues: number;
}> {
  let query: firestore.Query = db
    .collection("issues")
    .where("cityId", "==", cityId);

  if (zoneId) {
    query = query.where("zoneId", "==", zoneId);
  }

  if (startDate) {
    query = query.where(
      "createdAt",
      ">=",
      firestore.Timestamp.fromDate(startDate),
    );
  }

  if (endDate) {
    query = query.where(
      "createdAt",
      "<=",
      firestore.Timestamp.fromDate(endDate),
    );
  }

  // Add limit to prevent quota overload (10,000 issues max per query)
  query = query.limit(10000);

  const issuesSnapshot = await query.get();
  const issues = issuesSnapshot.docs.map(
    (doc: firestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    }),
  ) as Issue[];

  const totalIssues = issues.length;

  // Group by category
  const categoryStats: Record<
    string,
    {
      count: number;
      totalSeverity: number;
      openCount: number;
      resolvedCount: number;
    }
  > = {};

  issues.forEach((issue) => {
    const category = issue.category;

    if (!categoryStats[category]) {
      categoryStats[category] = {
        count: 0,
        totalSeverity: 0,
        openCount: 0,
        resolvedCount: 0,
      };
    }

    categoryStats[category].count++;
    categoryStats[category].totalSeverity += issue.severity || 0;

    if (issue.status === IssueStatus.OPEN) {
      categoryStats[category].openCount++;
    } else if (issue.status === IssueStatus.RESOLVED) {
      categoryStats[category].resolvedCount++;
    }
  });

  // Convert to array and sort by count
  const issueTypes = Object.entries(categoryStats)
    .map(([category, stats]) => ({
      category,
      count: stats.count,
      percentage: totalIssues > 0 ? (stats.count / totalIssues) * 100 : 0,
      avgSeverity: stats.count > 0 ? stats.totalSeverity / stats.count : 0,
      openCount: stats.openCount,
      resolvedCount: stats.resolvedCount,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, queryLimit);

  return {
    issueTypes,
    totalIssues,
  };
}

/**
 * Get resolution time averages
 */
export async function getResolutionTimeAverages(
  cityId: string,
  startDate?: Date,
  endDate?: Date,
  zoneId?: string,
  groupBy?: "category" | "zone" | "priority",
): Promise<{
  overall: {
    avgResolutionHours: number;
    medianResolutionHours: number;
    totalResolved: number;
  };
  breakdown?: Array<{
    group: string;
    avgResolutionHours: number;
    medianResolutionHours: number;
    count: number;
    minResolutionHours: number;
    maxResolutionHours: number;
  }>;
}> {
  let query: firestore.Query = db
    .collection("issues")
    .where("cityId", "==", cityId)
    .where("status", "==", IssueStatus.RESOLVED);

  if (zoneId) {
    query = query.where("zoneId", "==", zoneId);
  }

  if (startDate) {
    query = query.where(
      "createdAt",
      ">=",
      firestore.Timestamp.fromDate(startDate),
    );
  }

  if (endDate) {
    query = query.where(
      "createdAt",
      "<=",
      firestore.Timestamp.fromDate(endDate),
    );
  }

  // Add limit to prevent quota overload
  query = query.limit(10000);

  const issuesSnapshot = await query.get();
  const issues = issuesSnapshot.docs.map(
    (doc: firestore.QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data(),
    }),
  ) as Issue[];

  // Calculate resolution times
  const resolutionTimes: number[] = [];
  const groupedData: Record<string, number[]> = {};

  issues.forEach((issue) => {
    if (issue.resolvedAt && issue.createdAt) {
      const resolutionHours =
        (issue.resolvedAt.toMillis() - issue.createdAt.toMillis()) /
        (1000 * 60 * 60);

      resolutionTimes.push(resolutionHours);

      // Group data if needed
      if (groupBy) {
        let groupKey: string;
        if (groupBy === "category") {
          groupKey = issue.category;
        } else if (groupBy === "zone") {
          groupKey = issue.zoneId;
        } else if (groupBy === "priority") {
          groupKey = issue.priority || "unknown";
        } else {
          groupKey = "unknown";
        }

        if (!groupedData[groupKey]) {
          groupedData[groupKey] = [];
        }
        groupedData[groupKey].push(resolutionHours);
      }
    }
  });

  // Calculate overall statistics
  const avgResolutionHours =
    resolutionTimes.length > 0
      ? resolutionTimes.reduce((sum, t) => sum + t, 0) / resolutionTimes.length
      : 0;

  const sortedTimes = [...resolutionTimes].sort((a, b) => a - b);
  const medianResolutionHours =
    sortedTimes.length > 0
      ? sortedTimes[Math.floor(sortedTimes.length / 2)]
      : 0;

  const overall = {
    avgResolutionHours: Math.round(avgResolutionHours * 100) / 100,
    medianResolutionHours: Math.round(medianResolutionHours * 100) / 100,
    totalResolved: resolutionTimes.length,
  };

  // Calculate breakdown statistics
  let breakdown:
    | Array<{
        group: string;
        avgResolutionHours: number;
        medianResolutionHours: number;
        count: number;
        minResolutionHours: number;
        maxResolutionHours: number;
      }>
    | undefined;

  if (groupBy && Object.keys(groupedData).length > 0) {
    breakdown = [];

    // Fetch zone names if grouping by zone
    const zoneNames: Record<string, string> = {};
    if (groupBy === "zone") {
      const zoneIds = Object.keys(groupedData);
      for (const zoneId of zoneIds) {
        const zoneDoc = await db.collection("zones").doc(zoneId).get();
        if (zoneDoc.exists) {
          zoneNames[zoneId] = zoneDoc.data()?.name || zoneId;
        } else {
          zoneNames[zoneId] = zoneId;
        }
      }
    }

    for (const [group, times] of Object.entries(groupedData)) {
      const avg = times.reduce((sum, t) => sum + t, 0) / times.length;
      const sorted = [...times].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];

      breakdown.push({
        group: groupBy === "zone" ? zoneNames[group] || group : group,
        avgResolutionHours: Math.round(avg * 100) / 100,
        medianResolutionHours: Math.round(median * 100) / 100,
        count: times.length,
        minResolutionHours: Math.round(Math.min(...times) * 100) / 100,
        maxResolutionHours: Math.round(Math.max(...times) * 100) / 100,
      });
    }

    // Sort by average resolution time (descending)
    breakdown.sort((a, b) => b.avgResolutionHours - a.avgResolutionHours);
  }

  return {
    overall,
    breakdown,
  };
}

/**
 * Get comprehensive trend analysis
 * OPTIMIZED: Added limit() to cap query results
 */
export async function getComprehensiveTrends(
  cityId: string,
  startDate: Date,
  endDate: Date,
  groupBy: "day" | "week" | "month" = "day",
): Promise<{
  timeSeries: Array<{
    period: string;
    totalIssues: number;
    openIssues: number;
    resolvedIssues: number;
    avgSeverity: number;
    categoryCounts: Record<string, number>;
  }>;
}> {
  const issuesSnapshot = await db
    .collection("issues")
    .where("cityId", "==", cityId)
    .where("createdAt", ">=", firestore.Timestamp.fromDate(startDate))
    .where("createdAt", "<=", firestore.Timestamp.fromDate(endDate))
    .orderBy("createdAt", "asc")
    .limit(10000)
    .get();

  const issues = issuesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Issue[];

  // Group by period
  const periodData: Record<
    string,
    {
      issues: Issue[];
    }
  > = {};

  issues.forEach((issue) => {
    const period = formatPeriod(issue.createdAt.toDate(), groupBy);

    if (!periodData[period]) {
      periodData[period] = { issues: [] };
    }

    periodData[period].issues.push(issue);
  });

  // Calculate statistics for each period
  const timeSeries = Object.entries(periodData)
    .map(([period, data]) => {
      const { issues } = data;

      const totalIssues = issues.length;
      const openIssues = issues.filter(
        (i) => i.status === IssueStatus.OPEN,
      ).length;
      const resolvedIssues = issues.filter(
        (i) => i.status === IssueStatus.RESOLVED,
      ).length;

      const avgSeverity =
        issues.reduce((sum, i) => sum + (i.severity || 0), 0) / totalIssues;

      const categoryCounts: Record<string, number> = {};
      issues.forEach((issue) => {
        categoryCounts[issue.category] =
          (categoryCounts[issue.category] || 0) + 1;
      });

      return {
        period,
        totalIssues,
        openIssues,
        resolvedIssues,
        avgSeverity: Math.round(avgSeverity * 100) / 100,
        categoryCounts,
      };
    })
    .sort((a, b) => a.period.localeCompare(b.period));

  return { timeSeries };
}

/**
 * Detect recurring issues (same issue type + same location + time window)
 */
export async function detectRecurringIssues(
  cityId: string,
  timeWindowDays: number = 30,
  minOccurrences: number = 2,
  locationRadius?: number,
): Promise<{
  recurringIssues: Array<{
    category: string;
    zoneId: string;
    zoneName: string;
    floor?: string;
    zone?: string;
    locationKey: string;
    occurrences: number;
    firstOccurrence: string;
    lastOccurrence: string;
    isRecurringRisk: boolean;
    issues: Array<{
      issueId: string;
      title: string;
      status: string;
      createdAt: string;
      severity: number;
      location?: {
        lat: number;
        lng: number;
      };
    }>;
    riskScore: number;
  }>;
  summary: {
    totalRecurringGroups: number;
    totalRecurringIssues: number;
    highRiskGroups: number;
    zonesAffected: number;
  };
}> {
  const endDate = new Date();
  const startDate = new Date(
    endDate.getTime() - timeWindowDays * 24 * 60 * 60 * 1000,
  );

  // Fetch all issues in the time window with limit
  const issuesSnapshot = await db
    .collection("issues")
    .where("cityId", "==", cityId)
    .where("createdAt", ">=", firestore.Timestamp.fromDate(startDate))
    .where("createdAt", "<=", firestore.Timestamp.fromDate(endDate))
    .orderBy("createdAt", "desc")
    .limit(10000)
    .get();

  const issues = issuesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Issue[];

  // Batch fetch room data with caching
  const uniqueRoomIds = [
    ...new Set(issues.filter((i) => i.roomId).map((i) => i.roomId!)),
  ];
  const roomDataMap = await getRoomData(uniqueRoomIds);

  // Group issues by category and location
  const issueGroups: Record<string, Issue[]> = {};

  issues.forEach((issue) => {
    // Get floor info from room if available
    const roomData = issue.roomId ? roomDataMap[issue.roomId] : undefined;
    const floor = roomData?.floor?.toString() || "";

    // Create a location key based on zone, floor, and optional coordinates
    let locationKey: string;

    if (issue.location && locationRadius) {
      // Round coordinates to create location zones based on radius
      const latRounded =
        Math.round(issue.location.latitude / locationRadius) * locationRadius;
      const lngRounded =
        Math.round(issue.location.longitude / locationRadius) * locationRadius;
      locationKey = `${issue.zoneId}|${floor}|${latRounded},${lngRounded}`;
    } else {
      // Use zone and floor only
      locationKey = `${issue.zoneId}|${floor}`;
    }

    // Group by category + location
    const groupKey = `${issue.category}|${locationKey}`;

    if (!issueGroups[groupKey]) {
      issueGroups[groupKey] = [];
    }

    issueGroups[groupKey].push(issue);
  });

  // Filter groups with minimum occurrences and build result
  const recurringGroups = Object.entries(issueGroups).filter(
    ([, issues]) => issues.length >= minOccurrences,
  );

  // Batch fetch zone names with caching
  const zoneIds = [...new Set(issues.map((i) => i.zoneId))];
  const zoneNames = await getZoneNames(zoneIds);

  // Build recurring issues result
  const recurringIssues = recurringGroups
    .map(([groupKey, groupIssues]) => {
      const [category, locationKey] = groupKey.split("|");
      const firstIssue = groupIssues[groupIssues.length - 1]; // Oldest
      const lastIssue = groupIssues[0]; // Most recent

      const occurrences = groupIssues.length;

      // Get floor info from first issue's room
      const firstRoomData = firstIssue.roomId
        ? roomDataMap[firstIssue.roomId]
        : undefined;
      const floor = firstRoomData?.floor?.toString();
      const zone = firstRoomData?.roomNumber;

      // Calculate risk score based on:
      // - Number of occurrences
      // - Average severity
      // - Time between occurrences
      // - Open issues count
      const avgSeverity =
        groupIssues.reduce((sum, i) => sum + (i.severity || 0), 0) /
        occurrences;
      const openIssuesCount = groupIssues.filter(
        (i) => i.status === IssueStatus.OPEN,
      ).length;
      const daysBetween =
        (lastIssue.createdAt.toMillis() - firstIssue.createdAt.toMillis()) /
        (1000 * 60 * 60 * 24);
      const recurrenceFrequency =
        occurrences > 1 ? daysBetween / (occurrences - 1) : 0;

      // Risk score: higher occurrences, higher severity, more frequent = higher risk
      let riskScore = occurrences * 10 + avgSeverity * 5 + openIssuesCount * 15;
      if (recurrenceFrequency > 0 && recurrenceFrequency < 7) {
        riskScore += 20; // Bonus for weekly or more frequent occurrences
      }

      const isRecurringRisk = occurrences >= 3 || riskScore >= 50;

      return {
        category,
        zoneId: firstIssue.zoneId,
        zoneName: zoneNames[firstIssue.zoneId],
        floor,
        zone,
        locationKey,
        occurrences,
        firstOccurrence: firstIssue.createdAt.toDate().toISOString(),
        lastOccurrence: lastIssue.createdAt.toDate().toISOString(),
        isRecurringRisk,
        issues: groupIssues.map((issue) => ({
          issueId: issue.id,
          title: issue.title,
          status: issue.status,
          createdAt: issue.createdAt.toDate().toISOString(),
          severity: issue.severity || 0,
          location: issue.location
            ? {
                lat: issue.location.latitude,
                lng: issue.location.longitude,
              }
            : undefined,
        })),
        riskScore: Math.round(riskScore),
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore); // Sort by risk score descending

  // Calculate summary statistics
  const totalRecurringIssues = recurringIssues.reduce(
    (sum, group) => sum + group.occurrences,
    0,
  );
  const highRiskGroups = recurringIssues.filter(
    (group) => group.isRecurringRisk,
  ).length;
  const zonesAffected = new Set(recurringIssues.map((group) => group.zoneId))
    .size;

  return {
    recurringIssues,
    summary: {
      totalRecurringGroups: recurringIssues.length,
      totalRecurringIssues,
      highRiskGroups,
      zonesAffected,
    },
  };
}

/**
 * Get admin metrics (MTTR, high-risk zones, issue growth rate)
 */
export async function getAdminMetrics(
  cityId: string,
  timeWindowDays: number = 30,
  comparisonTimeWindowDays?: number,
): Promise<{
  mttr: {
    overall: number;
    byCategory: Array<{
      category: string;
      mttr: number;
      count: number;
    }>;
    byZone: Array<{
      zoneId: string;
      zoneName: string;
      mttr: number;
      count: number;
    }>;
    byPriority: Array<{
      priority: string;
      mttr: number;
      count: number;
    }>;
    trend: Array<{
      period: string;
      mttr: number;
    }>;
  };
  highRiskZones: Array<{
    zoneId: string;
    zoneName: string;
    riskScore: number;
    openIssues: number;
    criticalIssues: number;
    avgSeverity: number;
    unressolvedAge: number;
    recurringIssues: number;
    riskFactors: string[];
  }>;
  issueGrowthRate: {
    currentPeriod: {
      total: number;
      open: number;
      resolved: number;
      avgPerDay: number;
    };
    previousPeriod?: {
      total: number;
      open: number;
      resolved: number;
      avgPerDay: number;
    };
    growthRate: number;
    trend: Array<{
      period: string;
      total: number;
      open: number;
      resolved: number;
    }>;
    projections: {
      nextWeek: number;
      nextMonth: number;
    };
  };
}> {
  const endDate = new Date();
  const startDate = new Date(
    endDate.getTime() - timeWindowDays * 24 * 60 * 60 * 1000,
  );

  // ========== MTTR Calculation ==========

  // Fetch all resolved issues in the time window with limit
  const resolvedIssuesSnapshot = await db
    .collection("issues")
    .where("cityId", "==", cityId)
    .where("status", "==", IssueStatus.RESOLVED)
    .where("resolvedAt", ">=", firestore.Timestamp.fromDate(startDate))
    .where("resolvedAt", "<=", firestore.Timestamp.fromDate(endDate))
    .limit(10000)
    .get();

  const resolvedIssues = resolvedIssuesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Issue[];

  // Calculate resolution times
  const resolutionTimes: Array<{ issue: Issue; hours: number }> = [];

  resolvedIssues.forEach((issue) => {
    if (issue.resolvedAt && issue.createdAt) {
      const hours =
        (issue.resolvedAt.toMillis() - issue.createdAt.toMillis()) /
        (1000 * 60 * 60);
      resolutionTimes.push({ issue, hours });
    }
  });

  // Overall MTTR
  const overallMTTR =
    resolutionTimes.length > 0
      ? resolutionTimes.reduce((sum, rt) => sum + rt.hours, 0) /
        resolutionTimes.length
      : 0;

  // MTTR by category
  const categoryMTTR: Record<string, { total: number; count: number }> = {};
  resolutionTimes.forEach(({ issue, hours }) => {
    if (!categoryMTTR[issue.category]) {
      categoryMTTR[issue.category] = { total: 0, count: 0 };
    }
    categoryMTTR[issue.category].total += hours;
    categoryMTTR[issue.category].count++;
  });

  const mttrByCategory = Object.entries(categoryMTTR)
    .map(([category, data]) => ({
      category,
      mttr: Math.round((data.total / data.count) * 100) / 100,
      count: data.count,
    }))
    .sort((a, b) => b.mttr - a.mttr);

  // MTTR by zone
  const zoneMTTR: Record<string, { total: number; count: number }> = {};
  resolutionTimes.forEach(({ issue, hours }) => {
    if (!zoneMTTR[issue.zoneId]) {
      zoneMTTR[issue.zoneId] = { total: 0, count: 0 };
    }
    zoneMTTR[issue.zoneId].total += hours;
    zoneMTTR[issue.zoneId].count++;
  });

  // Batch fetch zone names with caching
  const zoneIds = Object.keys(zoneMTTR);
  const zoneNames = await getZoneNames(zoneIds);

  const mttrByZone = Object.entries(zoneMTTR)
    .map(([zoneId, data]) => ({
      zoneId,
      zoneName: zoneNames[zoneId],
      mttr: Math.round((data.total / data.count) * 100) / 100,
      count: data.count,
    }))
    .sort((a, b) => b.mttr - a.mttr);

  // MTTR by priority
  const priorityMTTR: Record<string, { total: number; count: number }> = {};
  resolutionTimes.forEach(({ issue, hours }) => {
    const priority = issue.priority || "unknown";
    if (!priorityMTTR[priority]) {
      priorityMTTR[priority] = { total: 0, count: 0 };
    }
    priorityMTTR[priority].total += hours;
    priorityMTTR[priority].count++;
  });

  const mttrByPriority = Object.entries(priorityMTTR)
    .map(([priority, data]) => ({
      priority,
      mttr: Math.round((data.total / data.count) * 100) / 100,
      count: data.count,
    }))
    .sort((a, b) => {
      const order = { critical: 0, high: 1, medium: 2, low: 3 };
      return (
        (order[a.priority as keyof typeof order] || 4) -
        (order[b.priority as keyof typeof order] || 4)
      );
    });

  // MTTR trend (weekly over the time window)
  const weeklyMTTR: Record<string, { total: number; count: number }> = {};
  resolutionTimes.forEach(({ issue, hours }) => {
    const week = formatPeriod(issue.resolvedAt!.toDate(), "week");
    if (!weeklyMTTR[week]) {
      weeklyMTTR[week] = { total: 0, count: 0 };
    }
    weeklyMTTR[week].total += hours;
    weeklyMTTR[week].count++;
  });

  const mttrTrend = Object.entries(weeklyMTTR)
    .map(([period, data]) => ({
      period,
      mttr: Math.round((data.total / data.count) * 100) / 100,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

  // ========== High-Risk Zones ==========

  // Fetch all open issues with limit
  const openIssuesSnapshot = await db
    .collection("issues")
    .where("cityId", "==", cityId)
    .where("status", "in", [IssueStatus.OPEN, IssueStatus.IN_PROGRESS])
    .limit(10000)
    .get();

  const openIssues = openIssuesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Issue[];

  // Group issues by zone
  const zoneIssues: Record<string, Issue[]> = {};
  openIssues.forEach((issue) => {
    if (!zoneIssues[issue.zoneId]) {
      zoneIssues[issue.zoneId] = [];
    }
    zoneIssues[issue.zoneId].push(issue);
  });

  // Get recurring issues for each zone
  const recurringIssuesData = await detectRecurringIssues(
    cityId,
    timeWindowDays,
    2,
  );

  const zoneRecurringCount: Record<string, number> = {};
  recurringIssuesData.recurringIssues.forEach((group) => {
    zoneRecurringCount[group.zoneId] =
      (zoneRecurringCount[group.zoneId] || 0) + 1;
  });

  // Calculate risk scores for each zone
  const highRiskZones = Object.entries(zoneIssues)
    .map(([zoneId, issues]) => {
      const openCount = issues.length;
      const criticalCount = issues.filter(
        (i) => i.priority === "critical",
      ).length;
      const avgSeverity =
        issues.reduce((sum, i) => sum + (i.severity || 0), 0) / openCount;

      // Calculate average age of unresolved issues
      const now = new Date();
      const avgAge =
        issues.reduce((sum, i) => {
          const age = now.getTime() - i.createdAt.toDate().getTime();
          return sum + age / (1000 * 60 * 60 * 24); // Convert to days
        }, 0) / openCount;

      const recurringCount = zoneRecurringCount[zoneId] || 0;

      // Risk score calculation
      let riskScore =
        openCount * 5 +
        criticalCount * 20 +
        avgSeverity * 10 +
        avgAge * 2 +
        recurringCount * 15;

      // Risk factors
      const riskFactors: string[] = [];
      if (criticalCount > 0) riskFactors.push("Critical Issues Present");
      if (avgSeverity >= 7) riskFactors.push("High Average Severity");
      if (avgAge > 14) riskFactors.push("Long Unresolved Issues");
      if (recurringCount > 0) riskFactors.push("Recurring Problems");
      if (openCount > 10) riskFactors.push("High Issue Volume");

      return {
        zoneId,
        zoneName: zoneNames[zoneId] || zoneId,
        riskScore: Math.round(riskScore),
        openIssues: openCount,
        criticalIssues: criticalCount,
        avgSeverity: Math.round(avgSeverity * 100) / 100,
        unressolvedAge: Math.round(avgAge * 10) / 10,
        recurringIssues: recurringCount,
        riskFactors,
      };
    })
    .sort((a, b) => b.riskScore - a.riskScore);

  // ========== Issue Growth Rate ==========

  // Fetch all issues in current period with limit
  const currentIssuesSnapshot = await db
    .collection("issues")
    .where("cityId", "==", cityId)
    .where("createdAt", ">=", firestore.Timestamp.fromDate(startDate))
    .where("createdAt", "<=", firestore.Timestamp.fromDate(endDate))
    .limit(10000)
    .get();

  const currentIssues = currentIssuesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Issue[];

  const currentPeriodStats = {
    total: currentIssues.length,
    open: currentIssues.filter((i) => i.status === IssueStatus.OPEN).length,
    resolved: currentIssues.filter((i) => i.status === IssueStatus.RESOLVED)
      .length,
    avgPerDay: currentIssues.length / timeWindowDays,
  };

  // Fetch previous period data if comparison window provided
  let previousPeriodStats;
  let growthRate = 0;

  if (comparisonTimeWindowDays) {
    const prevEndDate = new Date(startDate.getTime() - 1);
    const prevStartDate = new Date(
      prevEndDate.getTime() - comparisonTimeWindowDays * 24 * 60 * 60 * 1000,
    );

    const previousIssuesSnapshot = await db
      .collection("issues")
      .where("cityId", "==", cityId)
      .where("createdAt", ">=", firestore.Timestamp.fromDate(prevStartDate))
      .where("createdAt", "<=", firestore.Timestamp.fromDate(prevEndDate))
      .limit(10000)
      .get();

    const previousIssues = previousIssuesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Issue[];

    previousPeriodStats = {
      total: previousIssues.length,
      open: previousIssues.filter((i) => i.status === IssueStatus.OPEN).length,
      resolved: previousIssues.filter((i) => i.status === IssueStatus.RESOLVED)
        .length,
      avgPerDay: previousIssues.length / comparisonTimeWindowDays,
    };

    // Calculate growth rate
    if (previousPeriodStats.total > 0) {
      growthRate =
        ((currentPeriodStats.total - previousPeriodStats.total) /
          previousPeriodStats.total) *
        100;
    }
  }

  // Calculate daily trend
  const dailyTrend: Record<
    string,
    { total: number; open: number; resolved: number }
  > = {};
  currentIssues.forEach((issue) => {
    const day = formatPeriod(issue.createdAt.toDate(), "day");
    if (!dailyTrend[day]) {
      dailyTrend[day] = { total: 0, open: 0, resolved: 0 };
    }
    dailyTrend[day].total++;
    if (issue.status === IssueStatus.OPEN) {
      dailyTrend[day].open++;
    } else if (issue.status === IssueStatus.RESOLVED) {
      dailyTrend[day].resolved++;
    }
  });

  const growthTrend = Object.entries(dailyTrend)
    .map(([period, data]) => ({
      period,
      total: data.total,
      open: data.open,
      resolved: data.resolved,
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

  // Simple linear projection based on current trend
  const recentDays = growthTrend.slice(-7); // Last 7 days
  const avgDailyGrowth =
    recentDays.length > 0
      ? recentDays.reduce((sum, d) => sum + d.total, 0) / recentDays.length
      : currentPeriodStats.avgPerDay;

  const projections = {
    nextWeek: Math.round(avgDailyGrowth * 7),
    nextMonth: Math.round(avgDailyGrowth * 30),
  };

  return {
    mttr: {
      overall: Math.round(overallMTTR * 100) / 100,
      byCategory: mttrByCategory,
      byZone: mttrByZone,
      byPriority: mttrByPriority,
      trend: mttrTrend,
    },
    highRiskZones: highRiskZones.slice(0, 10), // Top 10
    issueGrowthRate: {
      currentPeriod: {
        ...currentPeriodStats,
        avgPerDay: Math.round(currentPeriodStats.avgPerDay * 100) / 100,
      },
      previousPeriod: previousPeriodStats
        ? {
            ...previousPeriodStats,
            avgPerDay: Math.round(previousPeriodStats.avgPerDay * 100) / 100,
          }
        : undefined,
      growthRate: Math.round(growthRate * 100) / 100,
      trend: growthTrend,
      projections,
    },
  };
}

/**
 * Helper function to format period based on grouping
 */
function formatPeriod(date: Date, groupBy: "day" | "week" | "month"): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  if (groupBy === "day") {
    return `${year}-${month}-${day}`;
  } else if (groupBy === "week") {
    // Get week number
    const startOfYear = new Date(year, 0, 1);
    const diff = date.getTime() - startOfYear.getTime();
    const oneWeek = 1000 * 60 * 60 * 24 * 7;
    const weekNum = Math.floor(diff / oneWeek) + 1;
    return `${year}-W${String(weekNum).padStart(2, "0")}`;
  } else {
    // month
    return `${year}-${month}`;
  }
}

/**
 * Export analytics data to CSV format
 */
export async function exportAnalyticsToCSV(
  cityId: string,
  exportType: "issues" | "mttr" | "zones" | "summary",
  startDate: Date,
  endDate: Date,
): Promise<string> {
  let csvContent = "";

  switch (exportType) {
    case "issues":
      csvContent = await generateIssuesCSV(cityId, startDate, endDate);
      break;
    case "mttr":
      csvContent = await generateMTTRCSV(cityId, startDate, endDate);
      break;
    case "zones":
      csvContent = await generateZonesCSV(cityId, startDate, endDate);
      break;
    case "summary":
      csvContent = await generateSummaryCSV(cityId, startDate, endDate);
      break;
  }

  return csvContent;
}

/**
 * Generate issues CSV
 */
async function generateIssuesCSV(
  cityId: string,
  startDate: Date,
  endDate: Date,
): Promise<string> {
  const issuesSnapshot = await db
    .collection("issues")
    .where("cityId", "==", cityId)
    .where("createdAt", ">=", firestore.Timestamp.fromDate(startDate))
    .where("createdAt", "<=", firestore.Timestamp.fromDate(endDate))
    .orderBy("createdAt", "desc")
    .get();

  const issues = issuesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Issue[];

  // CSV Header
  const headers = [
    "Issue ID",
    "Title",
    "Category",
    "Status",
    "Priority",
    "Severity",
    "Zone ID",
    "Created At",
    "Resolved At",
    "Resolution Time (hours)",
    "Reported By",
  ];

  const rows = issues.map((issue) => {
    const resolutionTime =
      issue.resolvedAt && issue.createdAt
        ? (
            (issue.resolvedAt.toMillis() - issue.createdAt.toMillis()) /
            (1000 * 60 * 60)
          ).toFixed(2)
        : "N/A";

    return [
      issue.id,
      `"${issue.title.replace(/"/g, '""')}"`,
      issue.category,
      issue.status,
      issue.priority || "N/A",
      issue.severity || "N/A",
      issue.zoneId,
      issue.createdAt.toDate().toISOString(),
      issue.resolvedAt?.toDate().toISOString() || "N/A",
      resolutionTime,
      issue.reportedBy,
    ];
  });

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Generate MTTR CSV
 */
async function generateMTTRCSV(
  cityId: string,
  startDate: Date,
  endDate: Date,
): Promise<string> {
  const metrics = await getAdminMetrics(
    cityId,
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );

  // CSV Header
  const headers = ["Metric Type", "Name", "MTTR (hours)", "Issue Count"];

  const rows: string[][] = [];

  // Overall
  rows.push(["Overall", "All Issues", metrics.mttr.overall.toString(), "-"]);

  // By Category
  metrics.mttr.byCategory.forEach((cat) => {
    rows.push([
      "Category",
      cat.category,
      cat.mttr.toString(),
      cat.count.toString(),
    ]);
  });

  // By Zone
  metrics.mttr.byZone.forEach((zone) => {
    rows.push([
      "Zone",
      `"${zone.zoneName.replace(/"/g, '""')}"`,
      zone.mttr.toString(),
      zone.count.toString(),
    ]);
  });

  // By Priority
  metrics.mttr.byPriority.forEach((pri) => {
    rows.push([
      "Priority",
      pri.priority,
      pri.mttr.toString(),
      pri.count.toString(),
    ]);
  });

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Generate zones CSV
 */
async function generateZonesCSV(
  cityId: string,
  startDate: Date,
  endDate: Date,
): Promise<string> {
  const metrics = await getAdminMetrics(
    cityId,
    Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    ),
  );

  // CSV Header
  const headers = [
    "Zone ID",
    "Zone Name",
    "Risk Score",
    "Open Issues",
    "Critical Issues",
    "Avg Severity",
    "Unresolved Age (days)",
    "Recurring Issues",
    "Risk Factors",
  ];

  const rows = metrics.highRiskZones.map((zone) => [
    zone.zoneId,
    `"${zone.zoneName.replace(/"/g, '""')}"`,
    zone.riskScore.toString(),
    zone.openIssues.toString(),
    zone.criticalIssues.toString(),
    zone.avgSeverity.toString(),
    zone.unressolvedAge.toString(),
    zone.recurringIssues.toString(),
    `"${zone.riskFactors.join("; ")}"`,
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Generate summary CSV
 */
async function generateSummaryCSV(
  cityId: string,
  startDate: Date,
  endDate: Date,
): Promise<string> {
  const timeWindowDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  const metrics = await getAdminMetrics(cityId, timeWindowDays, timeWindowDays);
  const commonIssues = await getMostCommonIssueTypes(
    cityId,
    startDate,
    endDate,
  );

  const headers = ["Metric", "Value"];
  const rows: string[][] = [];

  // General Statistics
  rows.push([
    "Report Period",
    `${startDate.toISOString()} to ${endDate.toISOString()}`,
  ]);
  rows.push(["City ID", cityId]);
  rows.push(["Generated At", new Date().toISOString()]);
  rows.push(["", ""]);

  // MTTR Metrics
  rows.push(["=== MTTR Metrics ===", ""]);
  rows.push(["Overall MTTR (hours)", metrics.mttr.overall.toString()]);
  rows.push([
    "Critical Issues MTTR (hours)",
    metrics.mttr.byPriority
      .find((p) => p.priority === "critical")
      ?.mttr.toString() || "N/A",
  ]);
  rows.push(["", ""]);

  // Issue Statistics
  rows.push(["=== Issue Statistics ===", ""]);
  rows.push([
    "Total Issues (Current Period)",
    metrics.issueGrowthRate.currentPeriod.total.toString(),
  ]);
  rows.push([
    "Open Issues",
    metrics.issueGrowthRate.currentPeriod.open.toString(),
  ]);
  rows.push([
    "Resolved Issues",
    metrics.issueGrowthRate.currentPeriod.resolved.toString(),
  ]);
  rows.push([
    "Issue Growth Rate (%)",
    metrics.issueGrowthRate.growthRate.toString(),
  ]);
  rows.push(["", ""]);

  // Zone Risks
  rows.push(["=== High-Risk Zones ===", ""]);
  rows.push(["Total High-Risk Zones", metrics.highRiskZones.length.toString()]);
  if (metrics.highRiskZones.length > 0) {
    rows.push([
      "Highest Risk Zone",
      `"${metrics.highRiskZones[0].zoneName.replace(/"/g, '""')}"`,
    ]);
    rows.push([
      "Highest Risk Score",
      metrics.highRiskZones[0].riskScore.toString(),
    ]);
  }
  rows.push(["", ""]);

  // Top Issue Categories
  rows.push(["=== Top Issue Categories ===", ""]);
  commonIssues.issueTypes.slice(0, 5).forEach((type, index) => {
    rows.push([
      `${index + 1}. ${type.category}`,
      `${type.count} (${type.percentage.toFixed(1)}%)`,
    ]);
  });

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

/**
 * Generate daily/weekly snapshot report
 */
export async function generateSnapshotReport(
  cityId: string,
  snapshotType: "daily" | "weekly",
): Promise<{
  period: string;
  summary: {
    totalIssues: number;
    openIssues: number;
    resolvedIssues: number;
    criticalIssues: number;
    avgSeverity: number;
    mttr: number;
  };
  topZones: Array<{
    zoneId: string;
    zoneName: string;
    issueCount: number;
    criticalCount: number;
  }>;
  topCategories: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
  trends: {
    issueGrowth: number;
    mttrChange: number;
  };
  alerts: Array<{
    type: "critical" | "warning" | "info";
    message: string;
  }>;
  generatedAt: string;
}> {
  const endDate = new Date();
  const days = snapshotType === "daily" ? 1 : 7;
  const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
  const comparisonStartDate = new Date(
    startDate.getTime() - days * 24 * 60 * 60 * 1000,
  );

  // Fetch current period issues
  const currentIssuesSnapshot = await db
    .collection("issues")
    .where("cityId", "==", cityId)
    .where("createdAt", ">=", firestore.Timestamp.fromDate(startDate))
    .where("createdAt", "<=", firestore.Timestamp.fromDate(endDate))
    .get();

  const currentIssues = currentIssuesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Issue[];

  // Fetch previous period for comparison
  const previousIssuesSnapshot = await db
    .collection("issues")
    .where("cityId", "==", cityId)
    .where("createdAt", ">=", firestore.Timestamp.fromDate(comparisonStartDate))
    .where("createdAt", "<", firestore.Timestamp.fromDate(startDate))
    .get();

  const previousIssues = previousIssuesSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Issue[];

  // Calculate summary statistics
  const totalIssues = currentIssues.length;
  const openIssues = currentIssues.filter(
    (i) =>
      i.status === IssueStatus.OPEN || i.status === IssueStatus.IN_PROGRESS,
  ).length;
  const resolvedIssues = currentIssues.filter(
    (i) => i.status === IssueStatus.RESOLVED,
  ).length;
  const criticalIssues = currentIssues.filter(
    (i) => i.priority === "critical",
  ).length;
  const avgSeverity =
    currentIssues.length > 0
      ? currentIssues.reduce((sum, i) => sum + (i.severity || 0), 0) /
        currentIssues.length
      : 0;

  // Calculate MTTR for resolved issues
  const resolvedWithTime = currentIssues.filter(
    (i) => i.resolvedAt && i.createdAt,
  );
  const mttr =
    resolvedWithTime.length > 0
      ? resolvedWithTime.reduce((sum, i) => {
          const time =
            (i.resolvedAt!.toMillis() - i.createdAt.toMillis()) /
            (1000 * 60 * 60);
          return sum + time;
        }, 0) / resolvedWithTime.length
      : 0;

  // Top zones
  const zoneCounts: Record<string, { count: number; critical: number }> = {};
  currentIssues.forEach((issue) => {
    if (!zoneCounts[issue.zoneId]) {
      zoneCounts[issue.zoneId] = { count: 0, critical: 0 };
    }
    zoneCounts[issue.zoneId].count++;
    if (issue.priority === "critical") {
      zoneCounts[issue.zoneId].critical++;
    }
  });

  const zoneIds = Object.keys(zoneCounts);
  const zoneNames: Record<string, string> = {};
  for (const zoneId of zoneIds) {
    const zoneDoc = await db.collection("zones").doc(zoneId).get();
    if (zoneDoc.exists) {
      zoneNames[zoneId] = zoneDoc.data()?.name || zoneId;
    } else {
      zoneNames[zoneId] = zoneId;
    }
  }

  const topZones = Object.entries(zoneCounts)
    .map(([zoneId, data]) => ({
      zoneId,
      zoneName: zoneNames[zoneId],
      issueCount: data.count,
      criticalCount: data.critical,
    }))
    .sort((a, b) => b.issueCount - a.issueCount)
    .slice(0, 5);

  // Top categories
  const categoryCounts: Record<string, number> = {};
  currentIssues.forEach((issue) => {
    categoryCounts[issue.category] = (categoryCounts[issue.category] || 0) + 1;
  });

  const topCategories = Object.entries(categoryCounts)
    .map(([category, count]) => ({
      category,
      count,
      percentage: (count / totalIssues) * 100,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Calculate trends
  const issueGrowth =
    previousIssues.length > 0
      ? ((totalIssues - previousIssues.length) / previousIssues.length) * 100
      : 0;

  const prevResolvedWithTime = previousIssues.filter(
    (i) => i.resolvedAt && i.createdAt,
  );
  const prevMTTR =
    prevResolvedWithTime.length > 0
      ? prevResolvedWithTime.reduce((sum, i) => {
          const time =
            (i.resolvedAt!.toMillis() - i.createdAt.toMillis()) /
            (1000 * 60 * 60);
          return sum + time;
        }, 0) / prevResolvedWithTime.length
      : 0;

  const mttrChange = prevMTTR > 0 ? ((mttr - prevMTTR) / prevMTTR) * 100 : 0;

  // Generate alerts
  const alerts: Array<{
    type: "critical" | "warning" | "info";
    message: string;
  }> = [];

  if (criticalIssues > 0) {
    alerts.push({
      type: "critical",
      message: `${criticalIssues} critical issue${criticalIssues > 1 ? "s" : ""} ${snapshotType === "daily" ? "today" : "this week"}`,
    });
  }

  if (mttr > 72) {
    alerts.push({
      type: "warning",
      message: `MTTR (${mttr.toFixed(1)}h) exceeds 72-hour target`,
    });
  }

  if (issueGrowth > 25) {
    alerts.push({
      type: "warning",
      message: `Issue volume increased by ${issueGrowth.toFixed(1)}% compared to previous period`,
    });
  }

  if (mttrChange > 20) {
    alerts.push({
      type: "warning",
      message: `MTTR increased by ${mttrChange.toFixed(1)}%`,
    });
  }

  if (openIssues > resolvedIssues * 2) {
    alerts.push({
      type: "warning",
      message: `Open issues (${openIssues}) significantly exceed resolved issues (${resolvedIssues})`,
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      type: "info",
      message: "All metrics within normal range",
    });
  }

  return {
    period:
      snapshotType === "daily"
        ? formatPeriod(endDate, "day")
        : formatPeriod(endDate, "week"),
    summary: {
      totalIssues,
      openIssues,
      resolvedIssues,
      criticalIssues,
      avgSeverity: Math.round(avgSeverity * 100) / 100,
      mttr: Math.round(mttr * 100) / 100,
    },
    topZones,
    topCategories,
    trends: {
      issueGrowth: Math.round(issueGrowth * 100) / 100,
      mttrChange: Math.round(mttrChange * 100) / 100,
    },
    alerts,
    generatedAt: new Date().toISOString(),
  };
}
