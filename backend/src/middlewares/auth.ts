import { Request, Response, NextFunction } from "express";
import { User } from "../models/User";
import { extractToken, verifyAccessToken, JWTPayload } from "../utils/jwt";

// Custom user type for authenticated requests
export interface AuthUser {
  userId: string;
  email?: string;
  role?: string;
  cityId?: string;
}

// Extend Express Request type
declare module "express-serve-static-core" {
  interface Request {
    user?: AuthUser;
  }
}

/**
 * Authenticate user from JWT token
 * Verifies JWT and retrieves user from MongoDB
 */
export async function authenticateUser(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;
    const token = extractToken(authHeader);

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "No authentication token provided",
      });
    }

    // Verify JWT token
    const payload = verifyAccessToken(token);
    if (!payload) {
      return res.status(401).json({
        success: false,
        error: "Unauthorized",
        message: "Invalid or expired token",
      });
    }

    // Get user data from MongoDB
    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found",
        message: "User profile not found in database",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        error: "Forbidden",
        message: "User account is inactive",
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Attach user info to request
    req.user = {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      cityId: user.cityId.toString(),
    } as AuthUser;

    next();
  } catch (error: any) {
    console.error("Authentication error:", error);
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Invalid or expired token",
    });
  }
}

/**
 * Require admin role
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Authentication required",
    });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Forbidden",
      message: "Admin access required",
    });
  }

  next();
}

/**
 * Require facility manager or admin role
 */
export function requireFacilityManager(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized",
      message: "Authentication required",
    });
  }

  if (req.user.role !== "facility_manager" && req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Forbidden",
      message: "Facility manager or admin access required",
    });
  }

  next();
}
