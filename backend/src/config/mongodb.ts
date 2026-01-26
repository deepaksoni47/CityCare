import mongoose from "mongoose";
import process from "process";

/**
 * Initialize MongoDB Connection
 *
 * For local development:
 * 1. Install MongoDB Community Edition or use MongoDB Atlas
 * 2. Set MONGODB_URI environment variable
 *
 * For Production:
 * - Use MongoDB Atlas or managed MongoDB service
 * - Set MONGODB_URI with credentials
 * - Ensure connection string includes all parameters
 */

let mongooseConnection: typeof mongoose | null = null;

export async function initializeMongoDB(): Promise<typeof mongoose> {
  if (mongooseConnection) {
    return mongooseConnection;
  }

  try {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error(
        "MONGODB_URI environment variable is not set. " +
          "Please set it before initializing MongoDB.",
      );
    }

    console.log("🔍 Debugging MongoDB initialization:");
    console.log("   MONGODB_URI:", mongoUri.substring(0, 50) + "...");

    // Connect to MongoDB
    mongooseConnection = await mongoose.connect(mongoUri, {
      // Connection pool settings
      maxPoolSize: process.env.MONGODB_POOL_SIZE
        ? parseInt(process.env.MONGODB_POOL_SIZE)
        : 10,
      minPoolSize: process.env.MONGODB_MIN_POOL_SIZE
        ? parseInt(process.env.MONGODB_MIN_POOL_SIZE)
        : 2,

      // Timeout settings
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 10000,

      // Retry settings
      retryWrites: true,
      w: "majority",

      // Database name (optional, can be in URI)
      // dbName: "citycare",

      // Authentication (included in URI)
      // authSource: "admin",
    });

    console.log("✅ MongoDB connected successfully");
    console.log(`   Database: ${mongoose.connection.name || "default"}`);
    console.log(`   Host: ${mongoose.connection.host}`);

    // Set up connection event listeners
    mongoose.connection.on("connected", () => {
      console.log("📡 MongoDB connected event");
    });

    mongoose.connection.on("disconnected", () => {
      console.log("⚠️  MongoDB disconnected");
    });

    mongoose.connection.on("error", (error) => {
      console.error("❌ MongoDB connection error:", error);
    });

    return mongooseConnection;
  } catch (error) {
    console.error("❌ Failed to initialize MongoDB:", error);
    throw error;
  }
}

/**
 * Get MongoDB connection
 */
export function getMongoConnection(): typeof mongoose {
  if (!mongooseConnection) {
    throw new Error(
      "MongoDB connection not initialized. Call initializeMongoDB() first.",
    );
  }
  return mongooseConnection;
}

/**
 * Close MongoDB connection gracefully
 */
export async function closeMongoConnection(): Promise<void> {
  if (mongooseConnection) {
    await mongooseConnection.disconnect();
    mongooseConnection = null;
    console.log("✅ MongoDB connection closed");
  }
}

/**
 * Check MongoDB connection status
 */
export function isMongoConnected(): boolean {
  return mongooseConnection?.connection?.readyState === 1;
}

/**
 * Get connection state description
 */
export function getMongoConnectionState(): string {
  const state = mongooseConnection?.connection?.readyState;
  const states: { [key: number]: string } = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };
  return states[state as number] || "unknown";
}

export default mongooseConnection;
