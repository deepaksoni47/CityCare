/**
 * Environment variable loader
 * This MUST be imported first, before any other modules
 */
import * as dotenv from "dotenv";
import * as path from "path";

// Load environment variables from parent directory
const envPath = path.join(process.cwd(), "../.env");
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.error("❌ Failed to load .env file:", result.error);
  console.log("   Tried path:", envPath);
} else {
  console.log("✅ Environment variables loaded");
  console.log("   MONGODB_URI:", process.env.MONGODB_URI ? "Set" : "Not set");
  console.log("   JWT_SECRET:", process.env.JWT_SECRET ? "Set" : "Not set");
  console.log(
    "   GOOGLE_CLIENT_ID:",
    process.env.GOOGLE_CLIENT_ID ? "Set" : "Not set",
  );
}

// Verify critical variables are set
if (!process.env.MONGODB_URI) {
  console.warn("⚠️  MONGODB_URI not set - database will not connect");
  console.warn("   See MONGODB_ATLAS_SETUP.md for setup instructions");
}

if (!process.env.JWT_SECRET) {
  console.error("❌ JWT_SECRET is required for authentication");
  process.exit(1);
}
