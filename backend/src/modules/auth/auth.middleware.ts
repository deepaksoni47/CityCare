import { Request, Response, NextFunction } from "express";
import * as authService from "./auth.service";
import { UserRole, User } from "../../types";

// Extend Express Request type to include additional user data
declare module "express-serve-static-core" {
  interface Request {
    userData?: {
      id: string;
      cityId: string;
      role: UserRole;
      permissions: Record<string, boolean>;
    };
  }
}

/**
 * Authenticate Google OAuth token from Authorization header
 */
export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    let authHeader = req.headers.authorization as string | undefined;

    // Support token via query param (e.g., SSE EventSource which cannot set headers)
    if (!authHeader && req.query && (req.query.token as string)) {
      authHeader = `Bearer ${req.query.token as string}`;
    }

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "No authentication token provided",
      });
    }

    const idToken = authHeader.split("Bearer ")[1];

    // Verify Google OAuth token
    const decodedToken = await authService.verifyIdToken(idToken);

    // Get user data from MongoDB
    const user = await authService.getUserById(decodedToken.sub);

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User account is inactive or does not exist",
      });
    }

    // Attach user info to request (using AuthUser type)
    req.user = {
      userId: decodedToken.sub,
      email: decodedToken.email,
      role: user.role,
      cityId: user.cityId,
    };

    // Attach detailed user data to request
    req.userData = {
      id: user.id,
      cityId: user.cityId,
      role: user.role as UserRole,
      permissions: user.permissions,
    };

    next();
  } catch (error) {
    console.error("Authentication error:", error);
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or expired token",
    });
  }
}

/**
 * Authorize based on user role
 */
export function authorize(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userData) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User not authenticated",
      });
    }

    if (!allowedRoles.includes(req.userData.role)) {
      return res.status(403).json({
        error: "Forbidden",
        message: "You do not have permission to access this resource",
      });
    }

    next();
  };
}

/**
 * Check specific permission
 */
export function requirePermission(permission: keyof User["permissions"]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.userData) {
      return res.status(401).json({
        error: "Unauthorized",
        message: "User not authenticated",
      });
    }

    if (!req.userData.permissions[permission]) {
      return res.status(403).json({
        error: "Forbidden",
        message: `You do not have permission to ${permission}`,
      });
    }

    next();
  };
}

/**
 * Ensure user belongs to same organization
 */
export function sameOrganization(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const { cityId } = req.params;

  if (!req.userData) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "User not authenticated",
    });
  }

  if (req.userData.cityId !== cityId) {
    return res.status(403).json({
      error: "Forbidden",
      message: "You can only access resources from your organization",
    });
  }

  next();
}

/**
 * Optional authentication - attach user if token exists but don't fail
 */
export async function optionalAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      const idToken = authHeader.split("Bearer ")[1];
      const decodedToken = await authService.verifyIdToken(idToken);
      req.user = {
        userId: decodedToken.sub,
        email: decodedToken.email,
      };

      const user = await authService.getUserById(decodedToken.sub);
      if (user && user.isActive) {
        req.userData = {
          id: user.id,
          cityId: user.cityId,
          role: user.role as UserRole,
          permissions: user.permissions,
        };
      }
    }

    next();
  } catch (_error) {
    // Don't fail, just proceed without user
    next();
  }
}
