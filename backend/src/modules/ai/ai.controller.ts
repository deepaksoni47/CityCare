import { Request, Response } from "express";
import * as geminiService from "./gemini.service";
import { Issue as IssueModel } from "../../models/Issue";
import { Zone as ZoneModel } from "../../models/Zone";

/**
 * Generate AI insights for all issues
 */
// Simple in-memory cache for AI insights to prevent excessive reads
let cachedInsights: { data: any; timestamp: number } | null = null;
const INSIGHTS_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function generateGeneralInsights(_req: Request, res: Response) {
  try {
    // Serve cached insights when fresh
    if (
      cachedInsights &&
      Date.now() - cachedInsights.timestamp < INSIGHTS_TTL_MS
    ) {
      return res.json({ success: true, data: cachedInsights.data });
    }

    const issues = await IssueModel.find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const issueData = issues.map((doc: any) => ({
      id: doc._id.toString(),
      ...doc,
    }));

    if (issues.length === 0) {
      return res.status(404).json({
        error: "No issues found",
        message: "Cannot generate insights without issue data",
      });
    }

    const insights = await geminiService.analyzeIssuePatterns(issueData);

    const payload = {
      insights,
      analyzedIssues: issues.length,
      timestamp: new Date().toISOString(),
    };

    // Cache the result
    cachedInsights = { data: payload, timestamp: Date.now() };

    res.json({
      success: true,
      data: payload,
    });
  } catch (error: any) {
    console.error("Error generating insights:", error);
    res.status(500).json({
      error: "Failed to generate insights",
      message: error.message,
    });
  }
}

/**
 * Generate risk assessment for a specific zone
 */
export async function generateZoneRisk(req: Request, res: Response) {
  try {
    const { zoneId } = req.params;

    if (!zoneId) {
      return res.status(400).json({
        error: "Missing parameter",
        message: "zoneId is required",
      });
    }

    // Get zone info
    const zone = await ZoneModel.findById(zoneId).lean();

    if (!zone) {
      return res.status(404).json({
        error: "Zone not found",
        message: `Zone with ID ${zoneId} does not exist`,
      });
    }

    // Get recent issues for this zone (last 30 days) with limit
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentIssues = await IssueModel.find({
      zoneId: zoneId,
      createdAt: { $gte: thirtyDaysAgo },
    })
      .limit(1000)
      .lean();

    const issueData = recentIssues.map((doc: any) => ({
      id: doc._id.toString(),
      ...doc,
    }));

    const riskAssessment = await geminiService.generateRiskAssessment(
      (zone as any)?.name || zoneId,
      issueData,
    );

    res.json({
      success: true,
      data: {
        zoneId,
        zoneName: zone?.name,
        ...riskAssessment,
        recentIssuesCount: recentIssues.length,
        assessmentDate: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error generating building risk:", error);
    res.status(500).json({
      error: "Failed to generate risk assessment",
      message: error.message,
    });
  }
}

/**
 * Generate AI summary for a specific issue
 */
export async function generateIssueSummary(req: Request, res: Response) {
  try {
    const { issueId } = req.params;

    if (!issueId) {
      return res.status(400).json({
        error: "Missing parameter",
        message: "issueId is required",
      });
    }

    const issue = await IssueModel.findById(issueId).lean();

    if (!issue) {
      return res.status(404).json({
        error: "Issue not found",
        message: `Issue with ID ${issueId} does not exist`,
      });
    }

    const issueData = { id: (issue as any)._id.toString(), ...issue };
    const summary = await geminiService.generateIssueSummary(issueData);

    res.json({
      success: true,
      data: {
        issueId,
        summary,
        originalIssue: issueData,
      },
    });
  } catch (error: any) {
    console.error("Error generating issue summary:", error);
    res.status(500).json({
      error: "Failed to generate summary",
      message: error.message,
    });
  }
}

/**
 * Get maintenance suggestions for an issue
 */
export async function getMaintenanceSuggestions(req: Request, res: Response) {
  try {
    const { category, severity } = req.query;

    if (!category || !severity) {
      return res.status(400).json({
        error: "Missing parameters",
        message: "category and severity are required",
      });
    }

    const severityNum = parseInt(severity as string, 10);

    if (isNaN(severityNum) || severityNum < 1 || severityNum > 10) {
      return res.status(400).json({
        error: "Invalid severity",
        message: "Severity must be a number between 1 and 10",
      });
    }

    const suggestions = await geminiService.suggestMaintenanceActions(
      category as string,
      severityNum,
    );

    res.json({
      success: true,
      data: {
        category,
        severity: severityNum,
        suggestions,
      },
    });
  } catch (error: any) {
    console.error("Error generating maintenance suggestions:", error);
    res.status(500).json({
      error: "Failed to generate suggestions",
      message: error.message,
    });
  }
}

/**
 * Chat with AI assistant
 */
export async function chatWithAI(req: Request, res: Response) {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: "Missing parameter",
        message: "message is required in request body",
      });
    }

    const systemPrompt = `You are an AI assistant for a CityCare. 
Help facility managers and administrators with infrastructure-related questions, issue analysis, 
and maintenance recommendations. Keep responses professional and actionable.

User Question: ${message}`;

    const response = await geminiService.generateInsights(systemPrompt);

    res.json({
      success: true,
      data: {
        userMessage: message,
        aiResponse: response,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error in AI chat:", error);
    res.status(500).json({
      error: "Failed to process chat message",
      message: error.message,
    });
  }
}

/**
 * Classify issue from text input
 */
export async function classifyTextIssue(req: Request, res: Response) {
  try {
    const { text, buildingName, zone, reporterName } = req.body;

    if (!text) {
      return res.status(400).json({
        error: "Missing parameter",
        message: "text is required in request body",
      });
    }

    const classification = await geminiService.classifyIssueFromText(text, {
      buildingName,
      zone,
      reporterName,
    });

    res.json({
      success: true,
      data: {
        originalText: text,
        classification,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error classifying text:", error);
    res.status(500).json({
      error: "Failed to classify issue",
      message: error.message,
    });
  }
}

/**
 * Process voice input
 */
export async function processVoice(req: Request, res: Response) {
  try {
    const { audioBase64, mimeType, buildingName, zone, reporterName } =
      req.body;

    if (!audioBase64) {
      return res.status(400).json({
        error: "Missing parameter",
        message: "audioBase64 is required in request body",
      });
    }

    const result = await geminiService.processVoiceInput(
      audioBase64,
      mimeType || "audio/mp3",
      {
        buildingName,
        zone,
        reporterName,
      },
    );

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error("Error processing voice:", error);
    res.status(500).json({
      error: "Failed to process voice input",
      message: error.message,
    });
  }
}

/**
 * Analyze infrastructure image
 */
export async function analyzeImage(req: Request, res: Response) {
  try {
    const { imageUrl, expectedCategory, buildingName, additionalContext } =
      req.body;

    if (!imageUrl) {
      return res.status(400).json({
        error: "Missing parameter",
        message: "imageUrl is required in request body",
      });
    }

    const analysis = await geminiService.analyzeInfrastructureImage(imageUrl, {
      expectedCategory,
      buildingName,
      additionalContext,
    });

    res.json({
      success: true,
      data: {
        imageUrl,
        analysis,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error analyzing image:", error);

    // Handle Google API rate limit errors
    const errorMessage = error.message || "";
    if (
      errorMessage.includes("quota") ||
      errorMessage.includes("429") ||
      errorMessage.includes("Too Many Requests")
    ) {
      return res.status(429).json({
        error: "Rate limit exceeded",
        message:
          "Google Gemini API rate limit reached. Please wait a moment and try again. The free tier allows 20 requests per minute.",
        retryAfter: 60, // seconds
      });
    }

    res.status(500).json({
      error: "Failed to analyze image",
      message: error.message,
    });
  }
}

/**
 * Generate daily summary for administrators
 */
export async function getDailySummary(req: Request, res: Response) {
  try {
    const { cityId, date } = req.query;

    if (!cityId) {
      return res.status(400).json({
        error: "Missing parameter",
        message: "cityId is required",
      });
    }

    const summaryDate = date ? new Date(date as string) : new Date();

    const summary = await geminiService.generateDailySummary(
      cityId as string,
      summaryDate,
    );

    res.json({
      success: true,
      data: summary,
    });
  } catch (error: any) {
    console.error("Error generating daily summary:", error);
    res.status(500).json({
      error: "Failed to generate daily summary",
      message: error.message,
    });
  }
}

/**
 * Generate trend explanation
 */
export async function getTrendExplanation(req: Request, res: Response) {
  try {
    const { trends } = req.body;

    if (!trends || !Array.isArray(trends)) {
      return res.status(400).json({
        error: "Missing parameter",
        message: "trends array is required in request body",
      });
    }

    const explanation = await geminiService.generateTrendExplanation(trends);

    res.json({
      success: true,
      data: explanation,
    });
  } catch (error: any) {
    console.error("Error generating trend explanation:", error);
    res.status(500).json({
      error: "Failed to generate trend explanation",
      message: error.message,
    });
  }
}

/**
 * Generate incident report
 */
export async function getIncidentReport(req: Request, res: Response) {
  try {
    const { issueId } = req.params;

    if (!issueId) {
      return res.status(400).json({
        error: "Missing parameter",
        message: "issueId is required",
      });
    }

    const issue = await IssueModel.findById(issueId).lean();

    if (!issue) {
      return res.status(404).json({
        error: "Issue not found",
        message: `Issue with ID ${issueId} does not exist`,
      });
    }

    const issueData = { id: (issue as any)._id.toString(), ...issue };

    // Get related issues (same category and zone, last 90 days)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const relatedIssues = await IssueModel.find({
      zoneId: (issue as any).zoneId,
      category: (issue as any).category,
      createdAt: { $gte: ninetyDaysAgo },
      _id: { $ne: issueId },
    }).lean();

    const relatedIssuesData = relatedIssues.map((doc: any) => ({
      id: doc._id.toString(),
      ...doc,
    }));

    const report = await geminiService.generateIncidentReport(
      issueData,
      relatedIssuesData,
    );

    res.json({
      success: true,
      data: {
        issueId,
        report,
        relatedIssuesCount: relatedIssuesData.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    console.error("Error generating incident report:", error);
    res.status(500).json({
      error: "Failed to generate incident report",
      message: error.message,
    });
  }
}
