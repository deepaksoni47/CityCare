import { Issue as IssueModel } from "../../models/Issue";
import { User as UserModel } from "../../models/User";
import { uploadImageToCloudinary } from "../../config/cloudinary";
import {
  Issue,
  IssueHistory,
  IssueStatus,
  IssuePriority,
  IssueCategory,
  UserRole,
  User,
} from "../../types";
import { priorityEngine, PriorityInput } from "../priority/priority-engine";
import { WebSocketService } from "../../services/websocket.service";
import { SSEService } from "../../services/sse.service";
import * as emailService from "../../services/email.service";
import * as rewardsService from "../rewards/rewards.service";

/**
 * Create a new issue
 */
export async function createIssue(
  issueData: Partial<Issue>,
  userId: string,
  userRole: UserRole,
): Promise<Issue> {
  // Use priority engine for deterministic scoring
  const priorityInput: PriorityInput = {
    category: (issueData.category as IssueCategory) || IssueCategory.OTHER,
    severity: issueData.severity,
    description: issueData.description,
    zoneId: issueData.zoneId,
    roomId: issueData.roomId,
    occupancy: issueData.occupancy,
    reportedAt: new Date(),
    blocksAccess: issueData.blocksAccess,
    safetyRisk: issueData.safetyRisk,
    criticalInfrastructure: issueData.criticalInfrastructure,
    affectsAcademics: issueData.affectsAcademics,
    examPeriod: issueData.examPeriod,
    currentSemester: issueData.currentSemester,
    isRecurring: issueData.isRecurring,
    previousOccurrences: issueData.previousOccurrences,
  };

  const priorityResult = priorityEngine.calculatePriority(priorityInput);

  const newIssue = new IssueModel({
    ...issueData,
    severity: priorityInput.severity || calculateSeverity(issueData.category),
    priority: priorityResult.priority,
    aiRiskScore: priorityResult.score,
    status: IssueStatus.OPEN,
    reportedBy: userId,
    reportedByRole: userRole.toLowerCase() as any,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const savedIssue = await newIssue.save();
  const issue = savedIssue.toObject() as unknown as Issue;
  issue.id = savedIssue._id.toString();

  // Log issue creation in history
  await createIssueHistory({
    issueId: issue.id,
    fieldName: "status",
    newValue: IssueStatus.OPEN,
    changedBy: userId,
    changeType: "status_change",
    comment: "Issue created",
    changedAt: new Date(),
  });

  // Emit real-time events
  try {
    const wsService = WebSocketService.getInstance();
    wsService.emitIssueCreated({
      issue,
      action: "created",
      timestamp: new Date(),
      cityId: issue.cityId,
      campusId: issue.campusId,
      zoneId: issue.zoneId,
    });

    // Trigger heatmap update
    wsService.emitHeatmapUpdated({
      cityId: issue.cityId,
      campusId: issue.campusId,
      zoneId: issue.zoneId,
      timestamp: new Date(),
      changeType: "issue_added",
      affectedArea: issue.location
        ? {
            latitude: issue.location.latitude,
            longitude: issue.location.longitude,
            radius: 100,
          }
        : undefined,
    });

    // SSE broadcast
    const sseService = SSEService.getInstance();
    sseService.sendIssueUpdate(
      issue.cityId,
      issue.campusId,
      issue.zoneId,
      "issue:created",
      { issue, timestamp: new Date() },
    );
  } catch (error) {
    console.error("Error emitting real-time events:", error);
  }

  // Award points for creating an issue and update user statistics (async, non-blocking)
  try {
    const pointsForIssue = 10; // configurable default for issue creation
    rewardsService
      .awardPoints(
        userId,
        issue.cityId as string,
        pointsForIssue,
        "issue_created",
        "Reported an issue",
        issue.id,
        "issue",
      )
      .catch((err) =>
        console.error("Error awarding points for issue creation:", err),
      );

    rewardsService
      .updateUserStatistics(userId, "issuesReported", 1)
      .catch((err) =>
        console.error(
          "Error updating user statistics for issue creation:",
          err,
        ),
      );
  } catch (err) {
    console.error("Failed to initiate reward actions for issue creation:", err);
  }

  return issue;
}

/**
 * Get issue by ID
 */
export async function getIssueById(issueId: string): Promise<Issue | null> {
  const issueDoc = await IssueModel.findById(issueId).lean();

  if (!issueDoc) {
    return null;
  }

  return { id: issueDoc._id.toString(), ...issueDoc } as unknown as Issue;
}

/**
 * Get all issues with filters
 */
export async function getIssues(filters: {
  cityId: string;
  zoneId?: string;
  agencyId?: string;
  roomId?: string;
  category?: IssueCategory;
  status?: IssueStatus;
  priority?: IssuePriority;
  reportedBy?: string;
  assignedTo?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}): Promise<{ issues: Issue[]; total: number }> {
  let query: any = { cityId: filters.cityId };

  // Apply filters
  if (filters.zoneId) {
    query.zoneId = filters.zoneId;
  }
  if (filters.agencyId) {
    query.agencyId = filters.agencyId;
  }
  if (filters.roomId) {
    query.roomId = filters.roomId;
  }
  if (filters.category) {
    query.category = filters.category;
  }
  if (filters.status) {
    query.status = filters.status;
  }
  if (filters.priority) {
    query.priority = filters.priority;
  }
  if (filters.reportedBy) {
    query.reportedBy = filters.reportedBy;
  }
  if (filters.assignedTo) {
    query.assignedTo = filters.assignedTo;
  }
  if (filters.startDate || filters.endDate) {
    query.createdAt = {};
    if (filters.startDate) {
      query.createdAt.$gte = filters.startDate;
    }
    if (filters.endDate) {
      query.createdAt.$lte = filters.endDate;
    }
  }

  // Count total matching documents
  const total = await IssueModel.countDocuments(query);

  // Apply limit and offset
  const limit = filters.limit || 100;
  const offset = filters.offset || 0;

  // Fetch documents with sorting
  const issues = await IssueModel.find(query)
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .lean();

  // Map to Issue type with id field
  const mappedIssues: Issue[] = issues.map((doc: any) => ({
    id: doc._id.toString(),
    ...doc,
  }));

  return { issues: mappedIssues, total };
}

/**
 * Update issue
 */
export async function updateIssue(
  issueId: string,
  updates: Partial<Issue>,
  userId: string,
): Promise<Issue> {
  const issueDoc = await IssueModel.findById(issueId).lean();

  if (!issueDoc) {
    throw new Error("Issue not found");
  }

  const oldIssue = issueDoc as unknown as Issue;

  const updatedData = {
    ...updates,
    updatedAt: new Date(),
  };

  await IssueModel.findByIdAndUpdate(issueId, updatedData);

  // Log changes in history
  for (const [field, newValue] of Object.entries(updates)) {
    const oldValue = (oldIssue as any)[field];
    if (oldValue !== newValue) {
      await createIssueHistory({
        issueId,
        fieldName: field,
        oldValue,
        newValue,
        changedBy: userId,
        changeType: "update",
        changedAt: new Date(),
      });
    }
  }

  const updatedIssue = { ...oldIssue, ...updatedData, id: issueId } as unknown as Issue;

  // Emit real-time events
  try {
    const wsService = WebSocketService.getInstance();
    wsService.emitIssueUpdated({
      issue: updatedIssue,
      action: "updated",
      timestamp: new Date(),
      cityId: updatedIssue.cityId,
      campusId: updatedIssue.campusId,
      zoneId: updatedIssue.zoneId,
    });

    // Trigger heatmap update if location/priority changed
    if (updates.location || updates.priority || updates.severity) {
      wsService.emitHeatmapUpdated({
        cityId: updatedIssue.cityId,
        campusId: updatedIssue.campusId,
        zoneId: updatedIssue.zoneId,
        timestamp: new Date(),
        changeType: "issue_updated",
      });
    }

    const sseService = SSEService.getInstance();
    sseService.sendIssueUpdate(
      updatedIssue.cityId,
      updatedIssue.campusId,
      updatedIssue.zoneId,
      "issue:updated",
      { issue: updatedIssue, timestamp: new Date() },
    );
  } catch (error) {
    console.error("Error emitting update events:", error);
  }

  return updatedIssue;
}

/**
 * Resolve issue
 */
export async function resolveIssue(
  issueId: string,
  userId: string,
  resolutionComment?: string,
  actualCost?: number,
  actualDuration?: number,
): Promise<Issue> {
  const issueDoc = await IssueModel.findById(issueId).lean();

  if (!issueDoc) {
    throw new Error("Issue not found");
  }

  const resolvedData: Partial<Issue> = {
    status: IssueStatus.RESOLVED,
    resolvedAt: new Date(),
    updatedAt: new Date(),
  };

  if (actualCost !== undefined) {
    resolvedData.actualCost = actualCost;
  }
  if (actualDuration !== undefined) {
    resolvedData.actualDuration = actualDuration;
  }

  await IssueModel.findByIdAndUpdate(issueId, resolvedData);

  // Log resolution in history
  await createIssueHistory({
    issueId,
    fieldName: "status",
    oldValue: IssueStatus.IN_PROGRESS,
    newValue: IssueStatus.RESOLVED,
    changedBy: userId,
    changeType: "resolution",
    comment: resolutionComment,
    changedAt: new Date(),
  });

  const issue = issueDoc as unknown as Issue;
  const resolvedIssue = { ...issue, ...resolvedData, id: issueId } as unknown as Issue;

  // Emit real-time events
  try {
    const wsService = WebSocketService.getInstance();
    wsService.emitIssueResolved({
      issue: resolvedIssue,
      action: "resolved",
      timestamp: new Date(),
      cityId: resolvedIssue.cityId,
      campusId: resolvedIssue.campusId,
      zoneId: resolvedIssue.zoneId,
    });

    // Update heatmap (issue resolved)
    wsService.emitHeatmapUpdated({
      cityId: resolvedIssue.cityId,
      campusId: resolvedIssue.campusId,
      zoneId: resolvedIssue.zoneId,
      timestamp: new Date(),
      changeType: "issue_resolved",
    });

    const sseService = SSEService.getInstance();
    sseService.sendIssueUpdate(
      resolvedIssue.cityId,
      resolvedIssue.campusId,
      resolvedIssue.zoneId,
      "issue:resolved",
      { issue: resolvedIssue, timestamp: new Date() },
    );
  } catch (error) {
    console.error("Error emitting resolution events:", error);
  }

  // Send email notification to the user who reported the issue (non-blocking)
  try {
    const reporterDoc = await UserModel.findById(
      resolvedIssue.reportedBy,
    ).lean();

    if (reporterDoc) {
      const reporter = {
        id: reporterDoc._id.toString(),
        ...reporterDoc,
      } as unknown as User;
      emailService
        .sendIssueResolvedEmail(reporter, resolvedIssue, resolutionComment)
        .catch((error) => {
          console.error("Failed to send issue resolution email:", error);
        });
    }
  } catch (error) {
    console.error("Error sending resolution email:", error);
  }

  return resolvedIssue;
}

/**
 * Assign issue to user
 */
export async function assignIssue(
  issueId: string,
  assignedToUserId: string,
  assignedByUserId: string,
): Promise<Issue> {
  const issueDoc = await IssueModel.findById(issueId).lean();

  if (!issueDoc) {
    throw new Error("Issue not found");
  }

  const oldIssue = issueDoc as unknown as Issue;

  await IssueModel.findByIdAndUpdate(issueId, {
    assignedTo: assignedToUserId,
    status: IssueStatus.IN_PROGRESS,
    updatedAt: new Date(),
  });

  // Log assignment in history
  await createIssueHistory({
    issueId,
    fieldName: "assignedTo",
    oldValue: oldIssue.assignedTo,
    newValue: assignedToUserId,
    changedBy: assignedByUserId,
    changeType: "assignment",
    changedAt: new Date(),
  });

  const assignedIssue = {
    ...oldIssue,
    id: issueId,
    assignedTo: assignedToUserId,
    status: IssueStatus.IN_PROGRESS,
    updatedAt: new Date(),
  } as unknown as Issue;

  // Emit real-time events
  try {
    const wsService = WebSocketService.getInstance();
    wsService.emitIssueAssigned({
      issue: assignedIssue,
      action: "assigned",
      timestamp: new Date(),
      cityId: assignedIssue.cityId,
      campusId: assignedIssue.campusId,
      zoneId: assignedIssue.zoneId,
      affectedUsers: [assignedToUserId],
    });

    const sseService = SSEService.getInstance();
    sseService.sendIssueUpdate(
      assignedIssue.cityId,
      assignedIssue.campusId,
      assignedIssue.zoneId,
      "issue:assigned",
      {
        issue: assignedIssue,
        assignedTo: assignedToUserId,
        timestamp: new Date(),
      },
    );
  } catch (error) {
    console.error("Error emitting assignment events:", error);
  }

  return assignedIssue;
}

/**
 * Delete issue (soft delete by closing)
 */
export async function deleteIssue(
  issueId: string,
  userId: string,
): Promise<void> {
  const issueDoc = await IssueModel.findById(issueId).lean();

  if (!issueDoc) {
    throw new Error("Issue not found");
  }

  await IssueModel.findByIdAndUpdate(issueId, {
    status: IssueStatus.CLOSED,
    updatedAt: new Date(),
  });

  // Log closure in history
  await createIssueHistory({
    issueId,
    fieldName: "status",
    oldValue: issueDoc.status,
    newValue: IssueStatus.CLOSED,
    changedBy: userId,
    changeType: "status_change",
    comment: "Issue closed/deleted",
    changedAt: new Date(),
  });

  const issue = issueDoc as unknown as Issue;

  // Send email notification to the user who reported the issue (non-blocking)
  try {
    const reporterDoc = await UserModel.findById(issue.reportedBy).lean();

    if (reporterDoc) {
      const reporter = {
        id: reporterDoc._id.toString(),
        ...reporterDoc,
      } as unknown as User;
      emailService
        .sendIssueDeletedEmail(reporter, { ...issue, id: issueId })
        .catch((error) => {
          console.error("Failed to send issue deletion email:", error);
        });
    }
  } catch (error) {
    console.error("Error sending deletion email:", error);
  }

  // Emit real-time events
  try {
    const wsService = WebSocketService.getInstance();
    wsService.emitIssueDeleted({
      issue: { ...issue, id: issueId, status: IssueStatus.CLOSED },
      action: "deleted",
      timestamp: new Date(),
      cityId: issue.cityId,
      campusId: issue.campusId,
      zoneId: issue.zoneId,
    });

    // Update heatmap
    wsService.emitHeatmapUpdated({
      cityId: issue.cityId,
      campusId: issue.campusId,
      zoneId: issue.zoneId,
      timestamp: new Date(),
      changeType: "issue_resolved",
    });

    const sseService = SSEService.getInstance();
    sseService.sendIssueUpdate(
      issue.cityId,
      issue.campusId,
      issue.zoneId,
      "issue:deleted",
      { issueId, timestamp: new Date() },
    );
  } catch (error) {
    console.error("Error emitting deletion events:", error);
  }
}

/**
 * Get issue history
 */
export async function getIssueHistory(
  issueId: string,
): Promise<IssueHistory[]> {
  // Note: IssueHistory model would need to be imported/created
  // For now using any to avoid blocking compilation
  const history = await (IssueModel as any).db
    .collection("issue_history")
    .find({ issueId })
    .sort({ changedAt: -1 })
    .lean();

  return history.map((doc: any) => ({
    id: doc._id.toString(),
    ...doc,
  })) as IssueHistory[];
}

/**
 * Upload image for issue using Cloudinary
 */
export async function uploadIssueImage(
  file: Buffer,
  fileName: string,
  cityId: string,
  issueId?: string,
): Promise<string> {
  try {
    // Create folder path in Cloudinary
    const folder = issueId
      ? `ciis/issues/${cityId}/${issueId}`
      : `ciis/issues/${cityId}/temp`;

    // Remove file extension and timestamp for cleaner public_id
    const cleanFileName = fileName.replace(/\.[^/.]+$/, "");

    // Upload to Cloudinary
    const imageUrl = await uploadImageToCloudinary(file, folder, cleanFileName);

    console.log(`✅ Image uploaded to Cloudinary: ${imageUrl}`);
    return imageUrl;
  } catch (error) {
    console.error("Error uploading image to Cloudinary:", error);
    throw new Error("Failed to upload image to Cloudinary");
  }
}

/**
 * Get issues by geographic proximity
 */
export async function getIssuesByProximity(
  cityId: string,
  centerLat: number,
  centerLng: number,
  radiusKm: number,
): Promise<Issue[]> {
  // MongoDB supports geospatial queries, but for compatibility
  // we'll use the same in-memory filtering approach
  const allIssues = await IssueModel.find({
    cityId,
    status: { $ne: IssueStatus.CLOSED },
  }).lean();

  const issues: Issue[] = [];

  for (const doc of allIssues) {
    const issue = { id: (doc as any)._id.toString(), ...doc } as unknown as Issue;
    const distance = calculateDistance(
      centerLat,
      centerLng,
      issue.location.latitude,
      issue.location.longitude,
    );

    if (distance <= radiusKm) {
      issues.push(issue);
    }
  }

  return issues;
}

/**
 * Get high-priority issues for a campus
 */
export async function getHighPriorityIssues(
  cityId: string,
  limit: number = 20,
): Promise<Issue[]> {
  // Query for high-priority open issues with a limit
  const issues = await IssueModel.find({
    cityId,
    status: { $in: [IssueStatus.OPEN, IssueStatus.IN_PROGRESS] },
    priority: { $in: [IssuePriority.HIGH, IssuePriority.CRITICAL] },
  })
    .sort({ aiRiskScore: -1 })
    .limit(limit * 2) // Fetch more to ensure we have enough after sorting
    .lean();

  const mappedIssues = issues.map((doc: any) => ({
    id: doc._id.toString(),
    ...doc,
  })) as Issue[];

  return mappedIssues.slice(0, limit);
}

/**
 * Get issue statistics for a campus
 */
export async function getIssueStats(cityId: string): Promise<{
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  byCategory: Record<string, number>;
  byPriority: Record<string, number>;
  avgResolutionTime: number;
}> {
  // Add limit to prevent excessive queries
  const allIssues = await IssueModel.find({ cityId }).limit(10000).lean();

  const stats = {
    total: allIssues.length,
    open: 0,
    inProgress: 0,
    resolved: 0,
    byCategory: {} as Record<string, number>,
    byPriority: {} as Record<string, number>,
    avgResolutionTime: 0,
  };

  let totalResolutionTime = 0;
  let resolvedCount = 0;

  allIssues.forEach((doc: any) => {
    const issue = doc as unknown as Issue;

    // Count by status
    if (issue.status === IssueStatus.OPEN) stats.open++;
    if (issue.status === IssueStatus.IN_PROGRESS) stats.inProgress++;
    if (issue.status === IssueStatus.RESOLVED) {
      stats.resolved++;
      if (issue.resolvedAt && issue.createdAt) {
        const resolutionTime =
          new Date(issue.resolvedAt).getTime() -
          new Date(issue.createdAt).getTime();
        totalResolutionTime += resolutionTime;
        resolvedCount++;
      }
    }

    // Count by category
    stats.byCategory[issue.category] =
      (stats.byCategory[issue.category] || 0) + 1;

    // Count by priority
    stats.byPriority[issue.priority] =
      (stats.byPriority[issue.priority] || 0) + 1;
  });

  // Calculate average resolution time in hours
  if (resolvedCount > 0) {
    stats.avgResolutionTime =
      totalResolutionTime / resolvedCount / 1000 / 60 / 60;
  }

  return stats;
}

/**
 * Helper: Create issue history entry
 */
async function createIssueHistory(
  historyData: Partial<IssueHistory>,
): Promise<void> {
  // Note: IssueHistory model would need to be imported/created
  // For now using MongoDB connection directly
  await (IssueModel as any).db
    .collection("issue_history")
    .insertOne(historyData);
}

/**
 * Helper: Calculate issue severity
 */
function calculateSeverity(category?: string): number {
  const severityMap: Record<string, number> = {
    [IssueCategory.SAFETY]: 9,
    [IssueCategory.STRUCTURAL]: 8,
    [IssueCategory.ELECTRICAL]: 7,
    [IssueCategory.PLUMBING]: 6,
    [IssueCategory.HVAC]: 5,
    [IssueCategory.NETWORK]: 4,
    [IssueCategory.MAINTENANCE]: 5,
    [IssueCategory.CLEANLINESS]: 3,
    [IssueCategory.FURNITURE]: 2,
    [IssueCategory.OTHER]: 3,
  };

  return category ? severityMap[category] || 5 : 5;
}

/**
 * Calculate distance between two points using Haversine formula
 * @param lat1 - Latitude of first point
 * @param lon1 - Longitude of first point
 * @param lat2 - Latitude of second point
 * @param lon2 - Longitude of second point
 * @returns Distance in meters
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Radius of Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c * 1000; // Convert km to meters
}
