import { Request, Response } from "express";
import * as oauthService from "../../services/oauth.service";

/**
 * Get Google OAuth authorization URL
 * GET /api/auth/oauth/google/url?cityId=<id>
 */
export async function getGoogleAuthUrl(req: Request, res: Response) {
  try {
    const { cityId } = req.query;

    if (!cityId || typeof cityId !== "string") {
      return res.status(400).json({
        error: "Missing parameter",
        message: "cityId is required as query parameter",
      });
    }

    const authUrl = oauthService.getGoogleAuthUrl(cityId);

    res.json({
      success: true,
      data: {
        authUrl,
      },
    });
  } catch (error: unknown) {
    console.error("Get Google auth URL error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to get auth URL";
    res.status(500).json({
      error: "Failed to get auth URL",
      message: errorMessage,
    });
  }
}

/**
 * Handle Google OAuth callback
 * POST /api/auth/oauth/google/callback
 * Body: { code, cityId }
 */
export async function handleGoogleCallback(req: Request, res: Response) {
  try {
    const { code, cityId } = req.body;

    if (!code || typeof code !== "string") {
      return res.status(400).json({
        error: "Missing parameter",
        message: "code is required",
      });
    }

    if (!cityId || typeof cityId !== "string") {
      return res.status(400).json({
        error: "Missing parameter",
        message: "cityId is required",
      });
    }

    // Handle Google OAuth
    const result = await oauthService.handleGoogleOAuth(code, cityId);

    res.json({
      success: true,
      data: {
        user: result.user,
        accessToken: result.accessToken,
        refreshToken: result.refreshToken,
      },
      message: "Login successful",
    });
  } catch (error: unknown) {
    console.error("Google OAuth callback error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "OAuth failed";
    res.status(401).json({
      error: "Authentication failed",
      message: errorMessage,
    });
  }
}
