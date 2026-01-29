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
 * Handle Google OAuth callback redirect from Google
 * GET /api/auth/oauth/google/callback?code=<code>&state=<state>
 * Redirects to frontend callback page
 */
export function handleGoogleCallbackRedirect(req: Request, res: Response) {
  try {
    const { code, state } = req.query;

    if (!code || typeof code !== "string") {
      return res.status(400).json({
        error: "Missing parameter",
        message: "code is required",
      });
    }

    // state contains the cityId
    const cityId = state || "bilaspur";

    // Redirect to frontend callback handler
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const redirectUrl = `${frontendUrl}/auth/google/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(cityId)}`;

    res.redirect(redirectUrl);
  } catch (error: unknown) {
    console.error("Google OAuth callback redirect error:", error);
    res.status(500).json({
      error: "Callback handling failed",
      message:
        error instanceof Error ? error.message : "Failed to process callback",
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
