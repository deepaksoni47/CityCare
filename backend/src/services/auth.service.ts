import { User, IUser } from "../models/User";
import { City } from "../models/City";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt";
import mongoose from "mongoose";

/**
 * Register a new user
 */
export async function registerUser(data: {
  email: string;
  password?: string;
  name: string;
  cityId: string;
  role?: string;
  agencyId?: string;
}) {
  try {
    // Check if email already exists
    const existingUser = await User.findOne({ email: data.email });
    if (existingUser) {
      throw new Error("Email already registered");
    }

    // Verify city exists
    const city = await City.findById(data.cityId);
    if (!city) {
      throw new Error("City not found");
    }

    // Create new user
    const user = new User({
      email: data.email,
      password: data.password,
      name: data.name,
      cityId: new mongoose.Types.ObjectId(data.cityId),
      role: data.role || "citizen",
      agencyId: data.agencyId
        ? new mongoose.Types.ObjectId(data.agencyId)
        : undefined,
      isActive: true,
      isVerified: !!data.password, // Verified if registered with password
      preferences: {
        notifications: true,
        emailAlerts: false,
        receiveUpdates: true,
      },
    });

    // Set permissions based on role
    setPermissionsByRole(user);

    // Save user (password will be hashed in pre-save hook)
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return {
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        cityId: user.cityId,
      },
      accessToken,
      refreshToken,
    };
  } catch (error: any) {
    throw new Error(`Registration failed: ${error.message}`);
  }
}

/**
 * Login user
 */
export async function loginUser(email: string, password: string) {
  try {
    // Find user by email
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Check if user is active
    if (!user.isActive) {
      throw new Error("User account is inactive");
    }

    // Compare password
    const passwordMatch = await user.comparePassword(password);
    if (!passwordMatch) {
      throw new Error("Invalid email or password");
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return {
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        cityId: user.cityId,
      },
      accessToken,
      refreshToken,
    };
  } catch (error: any) {
    throw new Error(`Login failed: ${error.message}`);
  }
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(refreshToken: string) {
  try {
    // Verify refresh token
    const payload = verifyRefreshToken(refreshToken);
    if (!payload) {
      throw new Error("Invalid or expired refresh token");
    }

    // Get user
    const user = await User.findById(payload.userId);
    if (!user || !user.isActive) {
      throw new Error("User not found or inactive");
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user);

    return {
      accessToken: newAccessToken,
    };
  } catch (error: any) {
    throw new Error(`Token refresh failed: ${error.message}`);
  }
}

/**
 * Get user profile
 */
export async function getUserProfile(userId: string) {
  try {
    const user = await User.findById(userId).populate(["cityId", "agencyId"]);

    if (!user) {
      throw new Error("User not found");
    }

    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      cityId: user.cityId,
      agencyId: user.agencyId,
      phone: user.phone,
      permissions: user.permissions,
      preferences: user.preferences,
      createdAt: user.createdAt,
      lastLogin: user.lastLogin,
    };
  } catch (error: any) {
    throw new Error(`Failed to fetch user profile: ${error.message}`);
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  data: {
    name?: string;
    phone?: string;
    preferences?: {
      notifications?: boolean;
      emailAlerts?: boolean;
    };
  },
) {
  try {
    const user = await User.findByIdAndUpdate(userId, data, { new: true });

    if (!user) {
      throw new Error("User not found");
    }

    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      role: user.role,
      phone: user.phone,
      preferences: user.preferences,
    };
  } catch (error: any) {
    throw new Error(`Failed to update user profile: ${error.message}`);
  }
}

/**
 * Set permissions based on user role
 */
function setPermissionsByRole(user: IUser) {
  const rolePermissions: Record<string, Partial<IUser["permissions"]>> = {
    admin: {
      canCreateIssues: true,
      canResolveIssues: true,
      canAssignIssues: true,
      canViewAllIssues: true,
      canManageUsers: true,
    },
    manager: {
      canCreateIssues: true,
      canResolveIssues: true,
      canAssignIssues: true,
      canViewAllIssues: true,
      canManageUsers: false,
    },
    officer: {
      canCreateIssues: true,
      canResolveIssues: true,
      canAssignIssues: false,
      canViewAllIssues: true,
      canManageUsers: false,
    },
    citizen: {
      canCreateIssues: true,
      canResolveIssues: false,
      canAssignIssues: false,
      canViewAllIssues: false,
      canManageUsers: false,
    },
  };

  const permissions = rolePermissions[user.role] || rolePermissions.citizen;
  user.permissions = { ...user.permissions, ...permissions };
}
