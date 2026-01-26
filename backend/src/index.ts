// CRITICAL: Load environment variables FIRST before any other imports
import "./env";

import express, { Application, Request, Response, NextFunction } from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import mongoose from "mongoose";
import { initializeCloudinary } from "./config/cloudinary";
import { WebSocketService } from "./services/websocket.service";
import { SSEService } from "./services/sse.service";
import {
  securityHeaders,
  preventCommonAttacks,
  logSuspiciousActivity,
  enforceHTTPS,
  addRequestId,
} from "./utils/security.utils";
import { globalRateLimiter } from "./middlewares/rateLimiter.middleware";

// Initialize Express app
const app: Application = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 3001;

// Initialize MongoDB Atlas Connection
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI not set in .env file");
  console.error("   See MONGODB_ATLAS_SETUP.md for setup instructions");
  process.exit(1);
}

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB Atlas connected successfully");
  })
  .catch((error) => {
    console.error("❌ MongoDB Atlas connection failed:", error.message);
    process.exit(1);
  });

// Initialize Cloudinary
try {
  initializeCloudinary();
} catch (error) {
  console.error("Failed to initialize Cloudinary:", error);
  console.warn(
    "⚠️ Image uploads will not work without Cloudinary configuration",
  );
}

// Initialize WebSocket service
try {
  WebSocketService.initialize(httpServer);
  SSEService.getInstance();
} catch (error) {
  console.error("Failed to initialize real-time services:", error);
}

// Security middleware (order matters!)
app.use(addRequestId); // Add request ID for tracking
app.use(enforceHTTPS); // Force HTTPS in production

// Set trust proxy if behind a proxy/load balancer (needed for express-rate-limit to correctly use X-Forwarded-For)
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", true);
  console.log("ℹ️ Express 'trust proxy' enabled (TRUST_PROXY=true)");
}

// CORS configuration - MUST be before helmet to avoid conflicts
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : [
      "http://localhost:3000",
      "http://localhost:3001",
      "https://citycare-innovex.vercel.app",
    ];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Reject origin
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    exposedHeaders: ["X-Request-ID"],
    maxAge: 86400, // 24 hours
  }),
);

// Helmet security headers (configured to not interfere with CORS)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(securityHeaders); // Additional security headers
app.use(logSuspiciousActivity); // Log suspicious requests
app.use(preventCommonAttacks); // Prevent SQL injection, XSS, etc.
app.use(globalRateLimiter); // Global rate limiting

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Compression middleware
app.use(compression());

// Request logging middleware
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`,
    );
  });
  next();
});

// Health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API routes
app.get("/api", (_req: Request, res: Response) => {
  res.json({
    message: "CityCare API",
    version: "2.0.0",
    endpoints: {
      health: "/health",
      auth: "/api/auth",
      oauth: "/api/auth/oauth/google",
      cities: "/api/cities",
      zones: "/api/cities/:cityId/zones",
      agencies: "/api/cities/:cityId/agencies",
      issues: "/api/issues",
      issuesHeatmap: "/api/issues/heatmap/:cityId",
      issuesStats: "/api/issues/stats/:cityId",
      buildings: "/api/zones",
      analytics: "/api/analytics",
      ai: "/api/ai",
      priority: "/api/priority",
      heatmap: "/api/heatmap",
      realtime: "/api/realtime",
      voting: "/api/issues/:id/vote",
      rewards: "/api/rewards",
      badges: "/api/badges",
      leaderboard: "/api/leaderboard",
      admin: "/api/admin",
    },
  });
});

// Import and mount route modules
import authRoutes from "./modules/auth/routes";
import cityRoutes from "./modules/admin/city.routes";
import issuesNewRoutes from "./modules/issues/issues-new.routes";
import aiRoutes from "./modules/ai/routes";
import issueRoutes from "./modules/issues/routes";
import priorityRoutes from "./modules/priority/routes";
import heatmapRoutes from "./modules/heatmap/routes";
import realtimeRoutes from "./modules/realtime/routes";
import analyticsRoutes from "./modules/analytics/routes";
import votingRoutes from "./modules/voting/routes";
import rewardsRoutes from "./modules/rewards/routes";
import adminRoutes from "./modules/admin/routes";

// New city-oriented routes (OAuth + City/Zone/Agency + Issues)
app.use("/api/auth", authRoutes); // Includes OAuth routes
app.use("/api/cities", cityRoutes); // City/Zone/Agency management
app.use("/api/issues", issuesNewRoutes); // New city-oriented issues (CRUD + Heatmap)

// Legacy routes (keeping for backward compatibility)
app.use("/api/ai", aiRoutes);
app.use("/api/issues", issueRoutes); // Old issues routes
app.use("/api/issues", votingRoutes); // Voting routes nested under /api/issues
app.use("/api/priority", priorityRoutes);
app.use("/api/heatmap", heatmapRoutes);
app.use("/api/realtime", realtimeRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api", rewardsRoutes); // Rewards, badges, leaderboard routes
app.use("/api/admin", adminRoutes); // Admin dashboard routes

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: "Not Found",
    message: `Route ${req.method} ${req.path} not found`,
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Unhandled error:", err);
  res.status(500).json({
    error: "Internal Server Error",
    message:
      process.env.NODE_ENV === "production"
        ? "An unexpected error occurred"
        : err.message,
  });
});

// Start server
httpServer.listen(PORT, () => {
  const oauthStatus = process.env.GOOGLE_CLIENT_ID
    ? "✅ Enabled"
    : "❌ Not configured";
  const mongoStatus = process.env.MONGODB_URI
    ? "✅ Connected"
    : "❌ Not configured";

  console.log(`
🚀 CityCare Backend Server Started
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📍 Server:      http://localhost:${PORT}
🏥 Health:      http://localhost:${PORT}/health
🔧 Environment: ${process.env.NODE_ENV || "development"}
🗄️  Database:    MongoDB Atlas ${mongoStatus}
⚡ WebSocket:   Enabled
📡 SSE:         Enabled
🔐 OAuth:       Google ${oauthStatus}
🏙️  Cities:      /api/cities
📋 Issues:      /api/issues
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);
});

export default app;
