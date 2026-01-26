/**
 * OAuth Configuration
 * Supports Google and GitHub OAuth providers
 */

export const oauthConfig = {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || "",
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    redirectUri:
      process.env.GOOGLE_REDIRECT_URI ||
      "http://localhost:3000/auth/google/callback",
  },
  github: {
    clientId: process.env.GITHUB_CLIENT_ID || "",
    clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    redirectUri:
      process.env.GITHUB_REDIRECT_URI ||
      "http://localhost:3000/auth/github/callback",
  },
};

/**
 * OAuth URLs
 */
export const oauthUrls = {
  google: {
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    userinfo: "https://www.googleapis.com/oauth2/v2/userinfo",
  },
  github: {
    authorize: "https://github.com/login/oauth/authorize",
    token: "https://github.com/login/oauth/access_token",
    userinfo: "https://api.github.com/user",
  },
};

/**
 * OAuth scopes
 */
export const oauthScopes = {
  google: [
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ],
  github: ["user:email"],
};
