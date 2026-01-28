import { Request, Response } from "express";
import { priorityEngine, PriorityInput } from "./priority-engine";
import { IssueCategory } from "../../types";

/**
 * Calculate priority score
 * POST /api/priority/calculate
 */
export async function calculatePriorityScore(req: Request, res: Response) {
  try {
    const input: PriorityInput = req.body;

    // Validation
    if (!input.category) {
      return res.status(400).json({
        error: "Missing parameter",
        message: "category is required",
      });
    }

    if (!input.reportedAt) {
      input.reportedAt = new Date();
    } else if (typeof input.reportedAt === "string") {
      input.reportedAt = new Date(input.reportedAt);
    }

    const result = priorityEngine.calculatePriority(input);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: unknown) {
    console.error("Calculate priority error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to calculate priority";
    res.status(500).json({
      error: "Internal server error",
      message: errorMessage,
    });
  }
}

/**
 * Batch calculate priorities
 * POST /api/priority/batch
 */
export async function batchCalculatePriority(req: Request, res: Response) {
  try {
    const { inputs } = req.body;

    if (!inputs || !Array.isArray(inputs)) {
      return res.status(400).json({
        error: "Missing parameter",
        message: "inputs array is required",
      });
    }

    // Normalize dates
    const normalizedInputs = inputs.map((input: any) => ({
      ...input,
      reportedAt: input.reportedAt ? new Date(input.reportedAt) : new Date(),
    }));

    const results = priorityEngine.batchCalculate(normalizedInputs);

    res.json({
      success: true,
      data: results,
      count: results.length,
    });
  } catch (error: unknown) {
    console.error("Batch calculate priority error:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to batch calculate priorities";
    res.status(500).json({
      error: "Internal server error",
      message: errorMessage,
    });
  }
}

/**
 * Recalculate priority with updated context
 * POST /api/priority/recalculate
 */
export async function recalculatePriority(req: Request, res: Response) {
  try {
    const { originalInput, contextUpdates } = req.body;

    if (!originalInput) {
      return res.status(400).json({
        error: "Missing parameter",
        message: "originalInput is required",
      });
    }

    // Normalize dates
    if (originalInput.reportedAt) {
      originalInput.reportedAt = new Date(originalInput.reportedAt);
    }

    const result = priorityEngine.recalculate(
      originalInput,
      contextUpdates || {},
    );

    res.json({
      success: true,
      data: result,
      message: "Priority recalculated with updated context",
    });
  } catch (error: unknown) {
    console.error("Recalculate priority error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to recalculate priority";
    res.status(500).json({
      error: "Internal server error",
      message: errorMessage,
    });
  }
}

/**
 * Get priority scoring explanation
 * GET /api/priority/explain
 */
export async function explainPriorityScoring(_req: Request, res: Response) {
  try {
    res.json({
      success: true,
      data: {
        description:
          "Deterministic priority scoring engine for campus infrastructure issues",
        algorithm: {
          weights: {
            categoryScore: "25%",
            severityScore: "20%",
            impactScore: "25%",
            urgencyScore: "15%",
            contextScore: "10%",
            historicalScore: "5%",
          },
          scoreRanges: {
            critical: "80-100",
            high: "60-79",
            medium: "40-59",
            low: "0-39",
          },
        },
        categoryBaselines: {
          Safety: { baseScore: 85, slaHours: 2 },
          Structural: { baseScore: 80, slaHours: 4 },
          Electrical: { baseScore: 70, slaHours: 8 },
          Plumbing: { baseScore: 65, slaHours: 12 },
          HVAC: { baseScore: 50, slaHours: 24 },
          Network: { baseScore: 45, slaHours: 16 },
          Maintenance: { baseScore: 40, slaHours: 48 },
          Cleanliness: { baseScore: 30, slaHours: 24 },
          Furniture: { baseScore: 25, slaHours: 72 },
          Other: { baseScore: 35, slaHours: 48 },
        },
        boosters: {
          safetyRisk: "+20 points",
          criticalInfrastructure: "+15 points",
          blocksAccess: "+25 points to impact",
          affectsAcademics: "+15 points to impact",
          examPeriod: "+30 points to context",
          recurring: "+20 points to urgency",
          highOccupancy: "Up to +40 points to impact",
        },
        inputs: {
          required: ["category", "reportedAt"],
          optional: [
            "severity",
            "occupancy",
            "affectedArea",
            "blocksAccess",
            "safetyRisk",
            "criticalInfrastructure",
            "affectsAcademics",
            "examPeriod",
            "isRecurring",
            "previousOccurrences",
            "avgResolutionTime",
            "escalationRate",
          ],
        },
      },
    });
  } catch (error: unknown) {
    console.error("Explain priority error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to explain priority";
    res.status(500).json({
      error: "Internal server error",
      message: errorMessage,
    });
  }
}

/**
 * Simulate priority scores for testing
 * POST /api/priority/simulate
 */
export async function simulatePriorityScores(_req: Request, res: Response) {
  try {
    const scenarios = [
      {
        name: "Critical Safety Issue - Major Road Cave-in",
        input: {
          category: IssueCategory.SAFETY,
          severity: 10,
          reportedAt: new Date(),
          blocksAccess: true,
          safetyRisk: true,
          occupancy: 500,
          criticalInfrastructure: true,
          affectedPeople: 2000,
          timeOfDay: "afternoon" as const,
        },
      },
      {
        name: "Burst Water Main - Residential Area",
        input: {
          category: IssueCategory.PLUMBING,
          severity: 9,
          reportedAt: new Date(),
          safetyRisk: true,
          criticalInfrastructure: true,
          affectedPeople: 1500,
          affectedArea: 200,
          blocksAccess: true,
        },
      },
      {
        name: "Power Outage - Hospital Zone",
        input: {
          category: IssueCategory.ELECTRICAL,
          severity: 10,
          reportedAt: new Date(),
          criticalInfrastructure: true,
          safetyRisk: true,
          affectedPeople: 800,
          affectedArea: 150,
          timeOfDay: "night" as const,
        },
      },
      {
        name: "Recurring Garbage Overflow - Market Area",
        input: {
          category: IssueCategory.CLEANLINESS,
          severity: 6,
          reportedAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
          isRecurring: true,
          previousOccurrences: 5,
          affectedPeople: 300,
          escalationRate: 0.7,
        },
      },
      {
        name: "Minor Pothole - Side Street Weekend",
        input: {
          category: IssueCategory.MAINTENANCE,
          severity: 3,
          reportedAt: new Date(),
          affectedPeople: 50,
          dayOfWeek: "weekend" as const,
        },
      },
      {
        name: "Broken Streetlight - Crime-Prone Area",
        input: {
          category: IssueCategory.ELECTRICAL,
          severity: 7,
          reportedAt: new Date(),
          safetyRisk: true,
          affectedPeople: 400,
          affectedArea: 100,
          timeOfDay: "night" as const,
        },
      },
    ];

    const results = scenarios.map((scenario) => ({
      scenario: scenario.name,
      input: scenario.input,
      result: priorityEngine.calculatePriority(scenario.input),
    }));

    res.json({
      success: true,
      data: results,
      message: "Priority simulation completed",
    });
  } catch (error: unknown) {
    console.error("Simulate priority error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to simulate priorities";
    res.status(500).json({
      error: "Internal server error",
      message: errorMessage,
    });
  }
}
