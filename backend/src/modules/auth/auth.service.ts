import { OAuth2Client } from "google-auth-library";
import { User as UserModel } from "../../models/User";
import { User, UserRole } from "../../types";

// Initialize Google OAuth2 client
const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_OAUTH_CLIENT_ID,
  process.env.GOOGLE_OAUTH_CLIENT_SECRET,
  process.env.GOOGLE_OAUTH_REDIRECT_URI,
);

interface GoogleTokenPayload {
  iss: string;
  azp: string;
  aud: string;
  sub: string;
  email: string;
  email_verified: boolean;
  at_hash: string;
  name: string;
  picture: string;
  given_name: string;
  family_name: string;
  locale: string;
  iat: number;
  exp: number;
}

/**
 * Verify Google OAuth ID token from client
 */
export async function verifyIdToken(
  idToken: string,
): Promise<GoogleTokenPayload> {
  try {
    console.log("🔐 Verifying Google OAuth token, length:", idToken.length);

    // Verify the token with Google
    const ticket = await oauth2Client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_OAUTH_CLIENT_ID,
    });

    const payload = ticket.getPayload() as GoogleTokenPayload;
    if (!payload) {
      throw new Error("Invalid token payload");
    }

    console.log("✅ Google OAuth token verified for user:", payload.sub);
    return payload;
  } catch (error) {
    console.error("❌ Google OAuth token verification failed:", error);
    if (error instanceof Error) {
      throw new Error(`Invalid or expired token: ${error.message}`);
    }
    throw new Error("Invalid or expired token");
  }
}

/**
 * Get or create user in MongoDB after Google OAuth login
 */
export async function getOrCreateUser(
  googleUser: GoogleTokenPayload,
  cityId: string,
  role?: UserRole,
): Promise<{ user: User; isNewUser: boolean }> {
  const userDoc = await UserModel.findById(googleUser.sub).lean();

  if (userDoc) {
    // Update last login
    await UserModel.findByIdAndUpdate(googleUser.sub, {
      lastLogin: new Date(),
    });
    return {
      user: {
        id: (userDoc as any)._id.toString(),
        ...userDoc,
      } as unknown as User,
      isNewUser: false,
    };
  }

  // Create new user
  const newUser = {
    _id: googleUser.sub,
    cityId,
    email: googleUser.email || "",
    name: googleUser.name || googleUser.email?.split("@")[0] || "User",
    role: role || UserRole.STUDENT,
    isActive: true,
    permissions: getDefaultPermissions(role || UserRole.STUDENT),
    badges: [],
    rewardPoints: 0,
    level: 1,
    statistics: {
      issuesReported: 0,
      issuesResolved: 0,
      votesReceived: 0,
      votesCast: 0,
      helpfulReports: 0,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLogin: new Date(),
  };

  await UserModel.create(newUser);
  return {
    user: { id: googleUser.sub, ...newUser } as User,
    isNewUser: true,
  };
}

/**
 * Get default permissions based on role
 */
function getDefaultPermissions(role: UserRole) {
  switch (role) {
    case "admin":
      return {
        canCreateIssues: true,
        canResolveIssues: true,
        canAssignIssues: true,
        canViewAllIssues: true,
        canManageUsers: true,
      };
    case "facility_manager":
      return {
        canCreateIssues: true,
        canResolveIssues: true,
        canAssignIssues: true,
        canViewAllIssues: true,
        canManageUsers: false,
      };
    case "staff":
      return {
        canCreateIssues: true,
        canResolveIssues: true,
        canAssignIssues: false,
        canViewAllIssues: false,
        canManageUsers: false,
      };
    case "faculty":
      return {
        canCreateIssues: true,
        canResolveIssues: false,
        canAssignIssues: false,
        canViewAllIssues: false,
        canManageUsers: false,
      };
    case "student":
    default:
      return {
        canCreateIssues: true,
        canResolveIssues: false,
        canAssignIssues: false,
        canViewAllIssues: false,
        canManageUsers: false,
      };
  }
}

/**
 * Create user with email and password
 * Note: This requires Google Cloud Identity Platform to be configured
 */
export async function createUserWithEmail(
  email: string,
  password: string,
  name: string,
  cityId: string,
  role?: UserRole,
): Promise<{ user: User; token: string }> {
  try {
    // Create user via Google Cloud Identity Platform REST API
    const identityResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${process.env.GOOGLE_OAUTH_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          displayName: name,
          returnSecureToken: true,
        }),
      },
    );

    if (!identityResponse.ok) {
      const errorData = (await identityResponse.json()) as any;
      throw new Error(errorData.error?.message || "Failed to create user");
    }

    const identityData = (await identityResponse.json()) as any;
    const userId = identityData.localId;

    // Create user profile in MongoDB
    const newUser = {
      _id: userId,
      cityId,
      email,
      name,
      role: role || UserRole.STUDENT,
      isActive: true,
      permissions: getDefaultPermissions(role || UserRole.STUDENT),
      badges: [],
      rewardPoints: 0,
      level: 1,
      statistics: {
        issuesReported: 0,
        issuesResolved: 0,
        votesReceived: 0,
        votesCast: 0,
        helpfulReports: 0,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      lastLogin: new Date(),
    };

    await UserModel.create(newUser);

    // Sign in the newly created user to get an ID token
    const googleApiKey = process.env.GOOGLE_OAUTH_API_KEY;
    if (!googleApiKey) {
      throw new Error("Google OAuth API key not configured");
    }

    const authResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${googleApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true,
        }),
      },
    );

    if (!authResponse.ok) {
      throw new Error("Failed to authenticate newly created user");
    }

    const authData = (await authResponse.json()) as {
      idToken: string;
    };

    return {
      user: { id: userId, ...newUser } as User,
      token: authData.idToken,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes("email-already-exists")) {
        throw new Error("Email already registered");
      }
    }
    throw new Error("Failed to create user account");
  }
}

/**
 * Authenticate user with email and password
 */
export async function authenticateWithEmail(
  email: string,
  password: string,
): Promise<{ user: User; token: string }> {
  try {
    // Find user in MongoDB by email
    const userDoc = await UserModel.findOne({
      email: email.toLowerCase(),
    }).select("+password");

    if (!userDoc) {
      throw new Error("Invalid email or password");
    }

    // Check if user is active
    if (!userDoc.isActive) {
      throw new Error("User account is deactivated");
    }

    // Verify password
    if (!userDoc.password) {
      throw new Error("Invalid email or password");
    }

    const isPasswordValid = await userDoc.comparePassword(password);
    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    // Update last login
    await UserModel.findByIdAndUpdate(userDoc._id, {
      lastLogin: new Date(),
    });

    // Generate a simple JWT token
    const jwt = require("jsonwebtoken");
    const token = jwt.sign(
      {
        userId: userDoc._id.toString(),
        email: userDoc.email,
        role: userDoc.role,
      },
      process.env.JWT_SECRET || "your-secret-key",
      { expiresIn: "7d" },
    );

    const userData = userDoc.toObject();
    delete (userData as any).password;

    return {
      user: {
        id: userDoc._id.toString(),
        ...userData,
        cityId: userDoc.cityId.toString(),
        agencyId: userDoc.agencyId?.toString(),
      } as User,
      token,
    };
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (
        error.message.includes("deactivated") ||
        error.message.includes("Invalid email or password")
      ) {
        throw error;
      }
    }
    throw new Error("Invalid email or password");
  }
}

/**
 * Get user by ID
 */
export async function getUserById(userId: string): Promise<User | null> {
  const userDoc = await UserModel.findById(userId).lean();

  if (!userDoc) {
    return null;
  }

  return { id: (userDoc as any)._id.toString(), ...userDoc } as unknown as User;
}

/**
 * Update user profile
 */
export async function updateUserProfile(
  userId: string,
  updates: Partial<User>,
): Promise<User> {
  // Don't allow updating sensitive fields
  const { id, cityId, createdAt, ...safeUpdates } = updates;

  await UserModel.findByIdAndUpdate(userId, {
    ...safeUpdates,
    updatedAt: new Date(),
  });

  const updatedDoc = await UserModel.findById(userId).lean();
  return {
    id: (updatedDoc as any)._id.toString(),
    ...updatedDoc,
  } as unknown as User;
}

/**
 * Get users by organization
 */
export async function getUsersByOrganization(
  cityId: string,
  role?: UserRole,
): Promise<User[]> {
  const query: any = {
    cityId,
    isActive: true,
  };

  if (role) {
    query.role = role;
  }

  const users = await UserModel.find(query).lean();
  return users.map((doc: any) => ({ id: doc._id.toString(), ...doc }) as User);
}

/**
 * Deactivate user
 */
export async function deactivateUser(userId: string): Promise<void> {
  await UserModel.findByIdAndUpdate(userId, {
    isActive: false,
    updatedAt: new Date(),
  });
}

/**
 * Update user role (admin only)
 */
export async function updateUserRole(
  userId: string,
  newRole: UserRole,
): Promise<User> {
  await UserModel.findByIdAndUpdate(userId, {
    role: newRole,
    permissions: getDefaultPermissions(newRole),
    updatedAt: new Date(),
  });

  const updatedDoc = await UserModel.findById(userId).lean();
  return {
    id: (updatedDoc as any)._id.toString(),
    ...updatedDoc,
  } as unknown as User;
}

/**
 * Check if user has permission
 */
export async function hasPermission(
  userId: string,
  permission: keyof User["permissions"],
): Promise<boolean> {
  const user = await getUserById(userId);
  if (!user || !user.isActive) {
    return false;
  }
  return user.permissions[permission] === true;
}

/**
 * Change user password via Google Cloud Identity
 */
export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  try {
    // Get user email from MongoDB
    const userDoc = await UserModel.findById(userId).lean();
    if (!userDoc) {
      throw new Error("User not found");
    }

    const userData = userDoc as any;
    const email = userData.email;

    // Verify current password by attempting sign-in via Google Identity Platform
    const googleApiKey = process.env.GOOGLE_OAUTH_API_KEY;
    if (!googleApiKey) {
      throw new Error("Google OAuth API key not configured");
    }

    const authResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${googleApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password: currentPassword,
          returnSecureToken: true,
        }),
      },
    );

    if (!authResponse.ok) {
      throw new Error("Current password is incorrect");
    }

    // Update password via Google Identity Platform REST API
    const updateResponse = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:update?key=${googleApiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          localId: userId,
          password: newPassword,
          returnSecureToken: true,
        }),
      },
    );

    if (!updateResponse.ok) {
      throw new Error("Failed to update password");
    }

    // Update timestamp in MongoDB
    await UserModel.findByIdAndUpdate(userId, {
      updatedAt: new Date(),
    });
  } catch (error: unknown) {
    if (error instanceof Error) {
      if (error.message.includes("Current password is incorrect")) {
        throw error;
      }
      if (error.message.includes("INVALID_PASSWORD")) {
        throw new Error("Current password is incorrect");
      }
    }
    throw new Error("Failed to change password");
  }
}
