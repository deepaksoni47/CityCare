import { Request, Response } from "express";
import { Issue } from "../../models/Issue";
import { Zone } from "../../models/Zone";
import mongoose from "mongoose";
import * as rewardsService from "../rewards/rewards.service";

/**
 * Create a new issue
 * POST /api/issues
 */
export async function createNewIssue(req: Request, res: Response) {
  try {
    const userId = req.userData?.id || req.user?.userId;
    const userRole = req.userData?.role;
    const userCityId = req.userData?.cityId;

    if (!userId || !userRole || !userCityId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User not authenticated or missing required user information",
      });
    }

    const {
      title,
      description,
      category,
      severity,
      zoneId,
      latitude,
      longitude,
      address,
      agencyId,
      images,
    } = req.body;

    // Validation
    if (!title || !description) {
      return res.status(400).json({
        error: "Validation error",
        message: "title and description are required",
      });
    }

    if (!category) {
      return res.status(400).json({
        error: "Validation error",
        message: "category is required",
      });
    }

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: "Validation error",
        message: "latitude and longitude are required",
      });
    }

    if (!zoneId) {
      return res.status(400).json({
        error: "Validation error",
        message: "zoneId is required",
      });
    }

    // Verify zone belongs to user's city or create it if it doesn't exist
    // Try to find by ObjectId first, then by code if that fails
    let zone = null;
    if (mongoose.Types.ObjectId.isValid(zoneId)) {
      zone = await Zone.findById(zoneId);
      if (zone && zone.cityId.toString() !== userCityId.toString()) {
        return res.status(403).json({
          error: "Forbidden",
          message: "Zone does not belong to your city",
        });
      }
    } else {
      // Try to find by code (e.g., "zone_north" -> "NORTH")
      const zoneCode =
        zoneId.split("_").pop()?.toUpperCase() || zoneId.toUpperCase();
      zone = await Zone.findOne({ cityId: userCityId, code: zoneCode });

      // If zone doesn't exist for this city, create it
      if (!zone) {
        const zoneName = zoneId
          .split("_")
          .slice(1)
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        zone = new Zone({
          cityId: userCityId,
          code: zoneCode,
          name: zoneName || zoneCode,
          zoneType: "other",
          centerPoint: {
            latitude: parseFloat(latitude),
            longitude: parseFloat(longitude),
          },
          area: 1.0, // Default area in square kilometers
          population: 0,
          status: "active",
        });
        await zone.save();
      }
    }

    if (!zone) {
      return res.status(400).json({
        error: "Validation error",
        message: "Invalid zone ID",
      });
    }

    // Create issue
    const issue = new Issue({
      cityId: userCityId,
      zoneId: zone._id, // Use the actual zone's ObjectId
      title,
      description,
      category,
      severity: severity || 5,
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        address: address || "",
      },
      reportedBy: new mongoose.Types.ObjectId(userId),
      reportedByRole: userRole,
      agencyId: agencyId ? new mongoose.Types.ObjectId(agencyId) : null,
      status: "open",
      priority: calculatePriority(severity || 5),
      images: images || [],
      comments: [],
      attachments: [],
    });

    await issue.save();

    // Award points for creating an issue and update user statistics (async, non-blocking)
    try {
      const pointsForIssue = 10; // Points for reporting an issue
      rewardsService
        .awardPoints(
          userId,
          userCityId.toString(),
          pointsForIssue,
          "issue_created",
          "Reported an issue",
          issue._id.toString(),
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
      console.error(
        "Failed to initiate reward actions for issue creation:",
        err,
      );
    }

    res.status(201).json({
      success: true,
      data: {
        issue,
      },
      message: "Issue created successfully",
    });
  } catch (error: unknown) {
    console.error("Create issue error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create issue";
    res.status(500).json({
      error: "Internal server error",
      message: errorMessage,
    });
  }
}

/**
 * Get all issues for user's city
 * GET /api/issues
 */
export async function getAllIssues(req: Request, res: Response) {
  try {
    const userCityId = req.userData?.cityId;
    const {
      zoneId,
      status,
      category,
      severity,
      reportedBy,
      page = 1,
      limit = 20,
    } = req.query;

    if (!userCityId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User city not found",
      });
    }

    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit as string) || 20),
    );

    const filter: any = {
      cityId: new mongoose.Types.ObjectId(userCityId.toString()),
    };

    if (zoneId) {
      filter.zoneId = new mongoose.Types.ObjectId(zoneId as string);
    }
    if (status) {
      filter.status = status;
    }
    if (category) {
      filter.category = category;
    }
    if (severity) {
      filter.severity = { $gte: parseInt(severity as string) };
    }
    if (reportedBy) {
      filter.reportedBy = new mongoose.Types.ObjectId(reportedBy as string);
    }

    const [issues, total] = await Promise.all([
      Issue.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate("reportedBy", "email name")
        .populate("assignedTo", "email name")
        .populate("zoneId", "name code"),
      Issue.countDocuments(filter),
    ]);

    res.json({
      success: true,
      data: {
        issues,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error: unknown) {
    console.error("Get issues error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch issues";
    res.status(500).json({
      error: "Failed to fetch issues",
      message: errorMessage,
    });
  }
}

/**
 * Get high-priority issues
 * GET /api/issues/priorities
 */
export async function getHighPriorityIssues(req: Request, res: Response) {
  try {
    const userCityId = req.userData?.cityId;
    const { limit = 20 } = req.query;

    if (!userCityId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User city not found",
      });
    }

    const limitNum = Math.min(
      100,
      Math.max(1, parseInt(limit as string) || 20),
    );

    // Filter for high-priority open issues
    const filter: any = {
      cityId: new mongoose.Types.ObjectId(userCityId.toString()),
      status: { $in: ["open", "in_progress"] },
      priority: { $in: ["high", "critical"] },
    };

    const issues = await Issue.find(filter)
      .sort({ severity: -1, createdAt: -1 })
      .limit(limitNum)
      .populate("reportedBy", "email name")
      .populate("assignedTo", "email name")
      .populate("zoneId", "name code");

    res.json({
      success: true,
      data: issues,
    });
  } catch (error: unknown) {
    console.error("Get high-priority issues error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to fetch high-priority issues";
    res.status(500).json({
      error: "Failed to fetch high-priority issues",
      message: errorMessage,
    });
  }
}

/**
 * Get issue by ID
 * GET /api/issues/:issueId
 */
export async function getIssueById(req: Request, res: Response) {
  try {
    const { issueId } = req.params;
    const userCityId = req.userData?.cityId;

    if (!userCityId) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User city ID not found",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(issueId)) {
      return res.status(400).json({
        error: "Validation error",
        message: "Invalid issue ID",
      });
    }

    const issue = await Issue.findById(issueId)
      .populate("reportedBy", "email name role")
      .populate("assignedTo", "email name role")
      .populate("zoneId", "name code")
      .populate("agencyId", "name type");

    if (!issue) {
      return res.status(404).json({
        error: "Not found",
        message: "Issue not found",
      });
    }

    // Check if user has access to this issue
    if (issue.cityId.toString() !== userCityId.toString()) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have access to this issue",
      });
    }

    res.json({
      success: true,
      data: {
        issue,
      },
    });
  } catch (error: unknown) {
    console.error("Get issue error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch issue";
    res.status(500).json({
      error: "Failed to fetch issue",
      message: errorMessage,
    });
  }
}

/**
 * Update issue
 * PUT /api/issues/:issueId
 */
export async function updateIssue(req: Request, res: Response) {
  try {
    const { issueId } = req.params;
    const userId = req.userData?.id;
    const userRole = req.userData?.role;

    if (!mongoose.Types.ObjectId.isValid(issueId)) {
      return res.status(400).json({
        error: "Validation error",
        message: "Invalid issue ID",
      });
    }

    const issue = await Issue.findById(issueId);

    if (!issue) {
      return res.status(404).json({
        error: "Not found",
        message: "Issue not found",
      });
    }

    // Check authorization
    const canUpdate =
      issue.reportedBy.toString() === userId ||
      userRole === "admin" ||
      userRole === "facility_manager";

    if (!canUpdate) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have permission to update this issue",
      });
    }

    // Update fields
    const { title, description, category, severity, status } = req.body;

    if (title) issue.title = title;
    if (description) issue.description = description;
    if (category) issue.category = category;
    if (severity !== undefined) {
      issue.severity = severity;
      issue.priority = calculatePriority(severity);
    }
    if (status) issue.status = status;

    await issue.save();

    res.json({
      success: true,
      data: {
        issue,
      },
      message: "Issue updated successfully",
    });
  } catch (error: unknown) {
    console.error("Update issue error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to update issue";
    res.status(500).json({
      error: "Failed to update issue",
      message: errorMessage,
    });
  }
}

/**
 * Resolve issue
 * PATCH /api/issues/:issueId/resolve
 */
export async function resolveIssue(req: Request, res: Response) {
  try {
    const { issueId } = req.params;
    const userId = req.userData?.id;
    const userRole = req.userData?.role;
    const { resolutionNotes } = req.body;

    if (!mongoose.Types.ObjectId.isValid(issueId)) {
      return res.status(400).json({
        error: "Validation error",
        message: "Invalid issue ID",
      });
    }

    const canResolve =
      userRole === "staff" ||
      userRole === "facility_manager" ||
      userRole === "admin";

    if (!canResolve) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Only officers, managers, and admins can resolve issues",
      });
    }

    const issue = await Issue.findById(issueId);

    if (!issue) {
      return res.status(404).json({
        error: "Not found",
        message: "Issue not found",
      });
    }

    issue.status = "resolved";
    issue.resolvedBy = new mongoose.Types.ObjectId(userId);
    issue.resolvedAt = new Date();
    issue.actualResolutionTime = Math.floor(
      (new Date().getTime() - issue.createdAt!.getTime()) / (1000 * 60),
    );

    if (resolutionNotes) {
      issue.resolutionNotes = resolutionNotes;
    }

    await issue.save();

    res.json({
      success: true,
      data: {
        issue,
      },
      message: "Issue resolved successfully",
    });
  } catch (error: unknown) {
    console.error("Resolve issue error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to resolve issue";
    res.status(500).json({
      error: "Failed to resolve issue",
      message: errorMessage,
    });
  }
}

/**
 * Delete issue
 * DELETE /api/issues/:issueId
 */
export async function deleteIssue(req: Request, res: Response) {
  try {
    const { issueId } = req.params;
    const userId = req.userData?.id;
    const userRole = req.userData?.role;

    if (!mongoose.Types.ObjectId.isValid(issueId)) {
      return res.status(400).json({
        error: "Validation error",
        message: "Invalid issue ID",
      });
    }

    const issue = await Issue.findById(issueId);

    if (!issue) {
      return res.status(404).json({
        error: "Not found",
        message: "Issue not found",
      });
    }

    // Check authorization
    const canDelete =
      issue.reportedBy.toString() === userId ||
      userRole === "admin" ||
      userRole === "facility_manager";

    if (!canDelete) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You don't have permission to delete this issue",
      });
    }

    await Issue.findByIdAndDelete(issueId);

    res.json({
      success: true,
      message: "Issue deleted successfully",
    });
  } catch (error: unknown) {
    console.error("Delete issue error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete issue";
    res.status(500).json({
      error: "Failed to delete issue",
      message: errorMessage,
    });
  }
}

/**
 * Get nearby issues for heatmap
 * GET /api/issues/heatmap/:cityId
 */
export async function getNearbyIssues(req: Request, res: Response) {
  try {
    const { cityId } = req.params;
    const { latitude, longitude, distance = 5000 } = req.query;

    if (!latitude || !longitude) {
      return res.status(400).json({
        error: "Validation error",
        message: "latitude and longitude are required",
      });
    }

    const lat = parseFloat(latitude as string);
    const lon = parseFloat(longitude as string);
    const dist = parseInt(distance as string) || 5000;

    const issues = await Issue.find({
      cityId: new mongoose.Types.ObjectId(cityId),
      "location.coordinates": {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [lon, lat],
          },
          $maxDistance: dist,
        },
      },
    })
      .select("_id title category severity location status")
      .limit(100);

    res.json({
      success: true,
      data: {
        issues,
        count: issues.length,
      },
    });
  } catch (error: unknown) {
    console.error("Get nearby issues error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch nearby issues";
    res.status(500).json({
      error: "Failed to fetch nearby issues",
      message: errorMessage,
    });
  }
}

/**
 * Get issue statistics
 * GET /api/issues/stats/:cityId
 */
export async function getIssueStats(req: Request, res: Response) {
  try {
    const { cityId } = req.params;

    const stats = await Issue.aggregate([
      {
        $match: {
          cityId: new mongoose.Types.ObjectId(cityId),
        },
      },
      {
        $facet: {
          byStatus: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 },
              },
            },
          ],
          byCategory: [
            {
              $group: {
                _id: "$category",
                count: { $sum: 1 },
              },
            },
          ],
          bySeverity: [
            {
              $group: {
                _id: "$severity",
                count: { $sum: 1 },
              },
            },
          ],
          total: [{ $count: "count" }],
        },
      },
    ]);

    res.json({
      success: true,
      data: stats[0],
    });
  } catch (error: unknown) {
    console.error("Get issue stats error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch statistics";
    res.status(500).json({
      error: "Failed to fetch statistics",
      message: errorMessage,
    });
  }
}

/**
 * Helper function to calculate priority based on severity
 */
function calculatePriority(
  severity: number,
): "low" | "medium" | "high" | "critical" {
  if (severity >= 8) return "critical";
  if (severity >= 6) return "high";
  if (severity >= 4) return "medium";
  return "low";
}
