import { Request, Response } from "express";
import { Issue } from "../../models/Issue";
import { Zone } from "../../models/Zone";
import mongoose from "mongoose";

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

    // Verify zone belongs to user's city
    const zone = await Zone.findById(zoneId);
    if (!zone || zone.cityId.toString() !== userCityId.toString()) {
      return res.status(403).json({
        error: "Forbidden",
        message: "Zone does not belong to your city",
      });
    }

    // Create issue
    const issue = new Issue({
      cityId: userCityId,
      zoneId: new mongoose.Types.ObjectId(zoneId),
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

    const [issues, total] = await Promise.all([
      Issue.find(filter)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate("reportedBy", "email name")
        .populate("assignedTo", "email name"),
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
