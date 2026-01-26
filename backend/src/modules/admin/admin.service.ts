import { User as UserModel } from "../../models/User";
import { Issue as IssueModel } from "../../models/Issue";
import { Vote as VoteModel } from "../../models/Vote";
import { User, Issue, UserRole, IssueStatus } from "../../types";

interface UserFilters {
  role?: UserRole;
  isActive?: boolean;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

interface IssueFilters {
  status?: string;
  category?: string;
  severity?: number;
  zoneId?: string;
  reportedBy?: string;
  assignedTo?: string;
  search?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

/**
 * Get admin dashboard overview with key metrics
 */
export async function getDashboardOverview(cityId: string) {
  // Get user counts
  const usersData = await UserModel.find({ cityId }).lean();

  const users = usersData.map((doc: any) => ({
    id: doc._id.toString(),
    ...doc,
  })) as User[];

  const userStats = {
    total: users.length,
    active: users.filter((u) => u.isActive).length,
    byRole: {
      admin: users.filter((u) => u.role === UserRole.ADMIN).length,
      facilityManager: users.filter((u) => u.role === UserRole.FACILITY_MANAGER)
        .length,
      staff: users.filter((u) => u.role === UserRole.STAFF).length,
      faculty: users.filter((u) => u.role === UserRole.FACULTY).length,
      student: users.filter((u) => u.role === UserRole.STUDENT).length,
    },
  };

  // Get issue counts
  const issuesData = await IssueModel.find({ cityId }).lean();

  const issues = issuesData.map((doc: any) => ({
    id: doc._id.toString(),
    ...doc,
  })) as Issue[];

  const issueStats = {
    total: issues.length,
    open: issues.filter((i) => i.status === IssueStatus.OPEN).length,
    inProgress: issues.filter((i) => i.status === IssueStatus.IN_PROGRESS)
      .length,
    resolved: issues.filter((i) => i.status === IssueStatus.RESOLVED).length,
    closed: issues.filter((i) => i.status === IssueStatus.CLOSED).length,
    avgResolutionTime: calculateAvgResolutionTime(issues),
    bySeverity: {
      critical: issues.filter((i) => i.severity >= 8).length,
      high: issues.filter((i) => i.severity >= 6 && i.severity < 8).length,
      medium: issues.filter((i) => i.severity >= 4 && i.severity < 6).length,
      low: issues.filter((i) => i.severity < 4).length,
    },
  };

  // Get recent activity
  const recentIssues = issues
    .sort((a, b) => {
      const dateA = new Date(a.createdAt as any);
      const dateB = new Date(b.createdAt as any);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 10);

  const recentUsers = users
    .sort((a, b) => {
      const dateA = new Date(a.createdAt as any);
      const dateB = new Date(b.createdAt as any);
      return dateB.getTime() - dateA.getTime();
    })
    .slice(0, 10);

  // Get top contributors
  const topContributors = users
    .filter((u) => u.statistics?.issuesReported > 0)
    .sort(
      (a, b) =>
        (b.statistics?.issuesReported || 0) -
        (a.statistics?.issuesReported || 0),
    )
    .slice(0, 5)
    .map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      issuesReported: u.statistics?.issuesReported || 0,
      rewardPoints: u.rewardPoints,
    }));

  return {
    userStats,
    issueStats,
    recentIssues: recentIssues.map((i) => ({
      id: i.id,
      title: i.title,
      status: i.status,
      severity: i.severity,
      category: i.category,
      createdAt: i.createdAt,
      reportedBy: i.reportedBy,
    })),
    recentUsers: recentUsers.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      createdAt: u.createdAt,
    })),
    topContributors,
  };
}

/**
 * Get all users with filters and pagination
 */
export async function getAllUsers(cityId: string, filters: UserFilters) {
  const {
    role,
    isActive,
    search,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = filters;

  const queryObj: any = { cityId };

  if (role) {
    queryObj.role = role;
  }

  if (isActive !== undefined) {
    queryObj.isActive = isActive;
  }

  const usersData = await UserModel.find(queryObj).lean();
  let users = usersData.map((doc: any) => ({
    id: doc._id.toString(),
    ...doc,
  })) as User[];

  // Client-side search filter
  if (search) {
    const searchLower = search.toLowerCase();
    users = users.filter(
      (u) =>
        u.name.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower),
    );
  }

  // Sort
  users.sort((a, b) => {
    let aVal: any = a[sortBy as keyof User];
    let bVal: any = b[sortBy as keyof User];

    if (aVal?.toDate) aVal = aVal;
    if (bVal?.toDate) bVal = bVal;

    if (sortOrder === "asc") {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  // Pagination
  const total = users.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedUsers = users.slice(startIndex, endIndex);

  return {
    users: paginatedUsers,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get user by ID with full details
 */
export async function getUserById(userId: string) {
  const userDoc = await UserModel.findById(userId).lean();

  if (!userDoc) {
    throw new Error("User not found");
  }

  const user = {
    id: (userDoc as any)._id.toString(),
    ...userDoc,
  } as unknown as User;

  // Get user's issues
  const issuesData = await IssueModel.find({ reportedBy: userId }).lean();

  const issues = issuesData.map((doc: any) => ({
    id: doc._id.toString(),
    ...doc,
  }));

  return {
    ...user,
    issuesReported: issues,
    issuesCount: issues.length,
  };
}

/**
 * Update user details
 */
export async function updateUser(userId: string, updates: Partial<User>) {
  const userDoc = await UserModel.findById(userId).lean();

  if (!userDoc) {
    throw new Error("User not found");
  }

  // Remove fields that shouldn't be updated directly
  const { id, createdAt, statistics, ...allowedUpdates } = updates as any;

  const updatedDoc = await UserModel.findByIdAndUpdate(
    userId,
    {
      ...allowedUpdates,
      updatedAt: new Date(),
    },
    { new: true },
  ).lean();

  return {
    id: (updatedDoc as any)._id.toString(),
    ...updatedDoc,
  } as unknown as User;
}

/**
 * Delete user
 */
export async function deleteUser(userId: string) {
  const userDoc = await UserModel.findById(userId).lean();

  if (!userDoc) {
    throw new Error("User not found");
  }

  // Delete user from MongoDB
  await UserModel.findByIdAndDelete(userId);

  // Note: Firebase Auth deletion should be handled via separate admin API
  // if integration is needed
}

/**
 * Toggle user active status
 */
export async function toggleUserStatus(userId: string) {
  const userDoc = await UserModel.findById(userId).lean();

  if (!userDoc) {
    throw new Error("User not found");
  }

  const currentStatus = (userDoc as any).isActive;

  const updatedDoc = await UserModel.findByIdAndUpdate(
    userId,
    {
      isActive: !currentStatus,
      updatedAt: new Date(),
    },
    { new: true },
  ).lean();

  return {
    id: (updatedDoc as any)._id.toString(),
    ...updatedDoc,
  } as unknown as User;
}

/**
 * Get all issues with admin filters
 */
export async function getAllIssues(cityId: string, filters: IssueFilters) {
  const {
    status,
    category,
    severity,
    zoneId,
    reportedBy,
    assignedTo,
    search,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = filters;

  const queryObj: any = { cityId };

  if (status) {
    queryObj.status = status;
  }

  if (category) {
    queryObj.category = category;
  }

  if (zoneId) {
    queryObj.zoneId = zoneId;
  }

  if (reportedBy) {
    queryObj.reportedBy = reportedBy;
  }

  if (assignedTo) {
    queryObj.assignedTo = assignedTo;
  }

  if (startDate || endDate) {
    queryObj.createdAt = {};
    if (startDate) queryObj.createdAt.$gte = startDate;
    if (endDate) queryObj.createdAt.$lte = endDate;
  }

  const issuesData = await IssueModel.find(queryObj).lean();
  let issues = issuesData.map((doc: any) => ({
    id: doc._id.toString(),
    ...doc,
  })) as Issue[];

  // Client-side filters
  if (severity !== undefined) {
    issues = issues.filter((i) => i.severity === severity);
  }

  if (search) {
    const searchLower = search.toLowerCase();
    issues = issues.filter(
      (i) =>
        i.title.toLowerCase().includes(searchLower) ||
        i.description.toLowerCase().includes(searchLower),
    );
  }

  // Sort
  issues.sort((a, b) => {
    let aVal: any = a[sortBy as keyof Issue];
    let bVal: any = b[sortBy as keyof Issue];

    if (aVal?.toDate) aVal = aVal;
    if (bVal?.toDate) bVal = bVal;

    if (sortOrder === "asc") {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  // Pagination
  const total = issues.length;
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedIssues = issues.slice(startIndex, endIndex);

  // Get reporter names for each issue
  const issuesWithReporter = await Promise.all(
    paginatedIssues.map(async (issue) => {
      try {
        const reporterDoc = await UserModel.findById(issue.reportedBy).lean();
        const reporterName = reporterDoc
          ? (reporterDoc as any).name
          : "Unknown";
        return {
          ...issue,
          reporterName,
        };
      } catch (error) {
        return {
          ...issue,
          reporterName: "Unknown",
        };
      }
    }),
  );

  return {
    issues: issuesWithReporter,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get user statistics and activity
 */
export async function getUserStatistics(userId: string) {
  const userDoc = await UserModel.findById(userId).lean();

  if (!userDoc) {
    throw new Error("User not found");
  }

  const user = userDoc as unknown as User;

  // Get user's issues
  const issuesData = await IssueModel.find({ reportedBy: userId }).lean();

  const issues = issuesData.map((doc: any) => ({
    id: doc._id.toString(),
    ...doc,
  })) as Issue[];

  // Calculate statistics
  const issuesByStatus = {
    open: issues.filter((i) => i.status === IssueStatus.OPEN).length,
    inProgress: issues.filter((i) => i.status === IssueStatus.IN_PROGRESS)
      .length,
    resolved: issues.filter((i) => i.status === IssueStatus.RESOLVED).length,
    closed: issues.filter((i) => i.status === IssueStatus.CLOSED).length,
  };

  const issuesByCategory = issues.reduce(
    (acc, issue) => {
      acc[issue.category] = (acc[issue.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const avgSeverity =
    issues.length > 0
      ? issues.reduce((sum, i) => sum + i.severity, 0) / issues.length
      : 0;

  // Get voting activity
  const votingData = await VoteModel.find({ userId }).lean();

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      rewardPoints: user.rewardPoints,
      level: user.level,
      badges: user.badges,
    },
    statistics: user.statistics,
    issueStatistics: {
      total: issues.length,
      byStatus: issuesByStatus,
      byCategory: issuesByCategory,
      avgSeverity: Math.round(avgSeverity * 10) / 10,
    },
    votingActivity: {
      totalVotes: votingData.length,
    },
  };
}

/**
 * Get system analytics
 */
export async function getSystemAnalytics(
  cityId: string,
  startDate?: Date,
  endDate?: Date,
) {
  const queryObj: any = { cityId };

  if (startDate || endDate) {
    queryObj.createdAt = {};
    if (startDate) queryObj.createdAt.$gte = startDate;
    if (endDate) queryObj.createdAt.$lte = endDate;
  }

  const issuesData = await IssueModel.find(queryObj).lean();
  const issues = issuesData.map((doc: any) => ({
    id: doc._id.toString(),
    ...doc,
  })) as Issue[];

  // Issues trend over time
  const issuesTrend = calculateTrend(issues, "createdAt");

  // Resolution trend
  const resolvedIssues = issues.filter(
    (i) => i.status === IssueStatus.RESOLVED,
  );
  const resolutionTrend = calculateTrend(resolvedIssues, "updatedAt");

  // Category distribution
  const categoryDistribution = issues.reduce(
    (acc, issue) => {
      acc[issue.category] = (acc[issue.category] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Zone distribution
  const zoneDistribution = issues.reduce(
    (acc, issue) => {
      acc[issue.zoneId] = (acc[issue.zoneId] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // Severity distribution
  const severityDistribution = {
    critical: issues.filter((i) => i.severity >= 8).length,
    high: issues.filter((i) => i.severity >= 6 && i.severity < 8).length,
    medium: issues.filter((i) => i.severity >= 4 && i.severity < 6).length,
    low: issues.filter((i) => i.severity < 4).length,
  };

  return {
    issuesTrend,
    resolutionTrend,
    categoryDistribution,
    zoneDistribution,
    severityDistribution,
    avgResolutionTime: calculateAvgResolutionTime(resolvedIssues),
    totalIssues: issues.length,
    resolvedIssues: resolvedIssues.length,
    resolutionRate:
      issues.length > 0 ? (resolvedIssues.length / issues.length) * 100 : 0,
  };
}

/**
 * Get user activity logs
 */
export async function getUserActivity(
  userId: string,
  options: { page?: number; limit?: number },
) {
  const { page = 1, limit = 50 } = options;

  // Get user's issues
  const issuesData = await IssueModel.find({ reportedBy: userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const issues = issuesData.map((doc: any) => ({
    id: doc._id.toString(),
    ...doc,
    activityType: "issue_reported",
  }));

  // Get user's votes
  const votesData = await VoteModel.find({ userId })
    .sort({ votedAt: -1 })
    .limit(limit)
    .lean();

  const votes = votesData.map((doc: any) => ({
    id: doc._id.toString(),
    ...doc,
    activityType: "vote_cast",
  }));

  // Combine and sort by timestamp
  const activity = [...issues, ...votes].sort((a: any, b: any) => {
    const dateA =
      a.createdAt instanceof Date
        ? a.createdAt
        : a.votedAt instanceof Date
          ? a.votedAt
          : new Date(0);
    const dateB =
      b.createdAt instanceof Date
        ? b.createdAt
        : b.votedAt instanceof Date
          ? b.votedAt
          : new Date(0);
    return dateB.getTime() - dateA.getTime();
  });

  const total = activity.length;
  const startIndex = (page - 1) * limit;
  const paginatedActivity = activity.slice(startIndex, startIndex + limit);

  return {
    activity: paginatedActivity,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Bulk update users
 */
export async function bulkUpdateUsers(
  userIds: string[],
  updates: Partial<User>,
) {
  const { id, createdAt, statistics, ...allowedUpdates } = updates as any;

  let successCount = 0;
  const errors: Array<{ userId: string; error: string }> = [];

  for (const userId of userIds) {
    try {
      const userDoc = await UserModel.findById(userId).lean();

      if (!userDoc) {
        errors.push({ userId, error: "User not found" });
        continue;
      }

      await UserModel.findByIdAndUpdate(userId, {
        ...allowedUpdates,
        updatedAt: new Date(),
      });

      successCount++;
    } catch (error) {
      errors.push({
        userId,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  return {
    successCount,
    failureCount: errors.length,
    errors,
  };
}

/**
 * Export users data
 */
export async function exportUsers(cityId: string, format: "json" | "csv") {
  const usersData = await UserModel.find({ cityId }).lean();

  const users = usersData.map((doc: any) => {
    return {
      id: doc._id.toString(),
      name: doc.name,
      email: doc.email,
      role: doc.role,
      isActive: doc.isActive,
      rewardPoints: doc.rewardPoints,
      level: doc.level,
      issuesReported: doc.statistics?.issuesReported || 0,
      issuesResolved: doc.statistics?.issuesResolved || 0,
      createdAt:
        doc.createdAt instanceof Date ? doc.createdAt.toISOString() : "",
    };
  });

  if (format === "csv") {
    return convertToCSV(users);
  }

  return JSON.stringify(users, null, 2);
}

/**
 * Export issues data
 */
export async function exportIssues(
  cityId: string,
  format: "json" | "csv",
  filters?: { status?: string; category?: string },
) {
  const queryObj: any = { cityId };

  if (filters?.status) {
    queryObj.status = filters.status;
  }

  if (filters?.category) {
    queryObj.category = filters.category;
  }

  const issuesData = await IssueModel.find(queryObj).lean();

  const issues = issuesData.map((doc: any) => {
    return {
      id: doc._id.toString(),
      title: doc.title,
      description: doc.description,
      category: doc.category,
      status: doc.status,
      severity: doc.severity,
      priority: doc.priority,
      zoneId: doc.zoneId,
      reportedBy: doc.reportedBy,
      assignedTo: doc.assignedTo || "",
      voteCount: doc.voteCount || 0,
      createdAt:
        doc.createdAt instanceof Date ? doc.createdAt.toISOString() : "",
      updatedAt:
        doc.updatedAt instanceof Date ? doc.updatedAt.toISOString() : "",
    };
  });

  if (format === "csv") {
    return convertToCSV(issues);
  }

  return JSON.stringify(issues, null, 2);
}

// Helper functions

function calculateAvgResolutionTime(issues: Issue[]): number {
  const resolvedIssues = issues.filter(
    (i) => i.status === IssueStatus.RESOLVED && i.updatedAt && i.createdAt,
  );

  if (resolvedIssues.length === 0) return 0;

  const totalTime = resolvedIssues.reduce((sum, issue) => {
    const created =
      issue.createdAt instanceof Date
        ? issue.createdAt
        : new Date(issue.createdAt as any);
    const resolved =
      issue.updatedAt instanceof Date
        ? issue.updatedAt
        : new Date(issue.updatedAt as any);
    return sum + (resolved.getTime() - created.getTime());
  }, 0);

  // Return average in hours
  return (
    Math.round((totalTime / resolvedIssues.length / (1000 * 60 * 60)) * 10) / 10
  );
}

function calculateTrend(
  items: any[],
  dateField: string,
): Array<{ date: string; count: number }> {
  const trendMap: Record<string, number> = {};

  items.forEach((item) => {
    const date =
      item[dateField] instanceof Date
        ? item[dateField]
        : new Date(item[dateField]);
    const dateStr = date.toISOString().split("T")[0];
    trendMap[dateStr] = (trendMap[dateStr] || 0) + 1;
  });

  return Object.entries(trendMap)
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function convertToCSV(data: any[]): string {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const csvRows = [headers.join(",")];

  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      // Escape commas and quotes
      const escaped = ("" + value).replace(/"/g, '""');
      return `"${escaped}"`;
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}
