import axios from "axios";
import { User } from "../models/User";
import { City } from "../models/City";
import { oauthConfig, oauthUrls } from "../config/oauth";
import { generateAccessToken, generateRefreshToken } from "../utils/jwt";
import mongoose from "mongoose";

/**
 * Google OAuth Handler
 */
export async function handleGoogleOAuth(code: string, cityId: string) {
  try {
    // Exchange code for access token
    const tokenResponse = await axios.post(oauthUrls.google.token, {
      code,
      client_id: oauthConfig.google.clientId,
      client_secret: oauthConfig.google.clientSecret,
      redirect_uri: oauthConfig.google.redirectUri,
      grant_type: "authorization_code",
    });

    const accessToken = tokenResponse.data.access_token;

    // Get user info from Google
    const userInfoResponse = await axios.get(oauthUrls.google.userinfo, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const googleUser = userInfoResponse.data;

    // Find or create user
    const user = await findOrCreateOAuthUser({
      provider: "google",
      providerId: googleUser.id,
      email: googleUser.email,
      name: googleUser.name,
      avatar: googleUser.picture,
      cityId,
    });

    // Generate tokens
    const newAccessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    return {
      user: {
        _id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        cityId: user.cityId,
        avatar: user.avatar,
      },
      accessToken: newAccessToken,
      refreshToken,
    };
  } catch (error: any) {
    throw new Error(`Google OAuth failed: ${error.message}`);
  }
}

/**
 * GitHub OAuth Handler - REMOVED
 * Use Google OAuth instead
 */
export async function handleGitHubOAuth(_code: string, _cityId: string) {
  throw new Error(
    "GitHub OAuth is not supported. Please use Google OAuth instead.",
  );
}

/**
 * Find or create user from OAuth profile (Google only)
 */
async function findOrCreateOAuthUser(profile: {
  provider: "google";
  providerId: string;
  email: string;
  name: string;
  avatar?: string;
  cityId: string;
}) {
  try {
    // Verify city exists
    const city = await City.findById(profile.cityId);
    if (!city) {
      throw new Error("City not found");
    }

    // Try to find existing user by email
    let user = await User.findOne({
      email: profile.email,
      cityId: new mongoose.Types.ObjectId(profile.cityId),
    });

    if (user) {
      // Add or update OAuth profile
      const existingProfile = user.oauthProfiles.findIndex(
        (p) => p.provider === profile.provider,
      );

      if (existingProfile === -1) {
        user.oauthProfiles.push({
          provider: profile.provider,
          providerId: profile.providerId,
          email: profile.email,
          name: profile.name,
          avatar: profile.avatar,
        });
      } else {
        user.oauthProfiles[existingProfile] = {
          provider: profile.provider,
          providerId: profile.providerId,
          email: profile.email,
          name: profile.name,
          avatar: profile.avatar,
        };
      }

      user.lastLogin = new Date();
      if (!user.isVerified) {
        user.isVerified = true;
      }
      await user.save();

      return user;
    }

    // Create new user from OAuth profile
    const newUser = new User({
      email: profile.email,
      name: profile.name,
      avatar: profile.avatar,
      cityId: new mongoose.Types.ObjectId(profile.cityId),
      role: "citizen",
      isActive: true,
      isVerified: true, // OAuth users are pre-verified
      oauthProfiles: [
        {
          provider: profile.provider,
          providerId: profile.providerId,
          email: profile.email,
          name: profile.name,
          avatar: profile.avatar,
        },
      ],
      preferences: {
        notifications: true,
        emailAlerts: false,
        receiveUpdates: true,
      },
    });

    // Don't set password for OAuth users
    newUser.password = undefined;

    await newUser.save();
    return newUser;
  } catch (error: any) {
    throw new Error(`Failed to find or create user: ${error.message}`);
  }
}

/**
 * Generate OAuth authorization URL for Google
 */
export function getGoogleAuthUrl(cityId: string, state?: string): string {
  const params = new URLSearchParams({
    client_id: oauthConfig.google.clientId,
    redirect_uri: oauthConfig.google.redirectUri,
    response_type: "code",
    scope: oauthConfig.google.clientId ? "openid email profile" : "openid",
    state: state || cityId,
  });

  return `${oauthUrls.google.authorize}?${params.toString()}`;
}

/**
 * Generate OAuth authorization URL for GitHub - REMOVED
 * Use Google OAuth instead
 */
export function getGitHubAuthUrl(_cityId: string, _state?: string): string {
  throw new Error(
    "GitHub OAuth is not supported. Please use Google OAuth instead.",
  );
}
