import mongoose from "mongoose";
import "../env";
import { User as UserModel } from "../models/User";
import { Issue } from "../models/Issue";

/**
 * Backfill user statistics and reward points for existing issues
 */
async function backfillUserStats() {
  try {
    // Connect to MongoDB
    const MONGODB_URI = process.env.MONGODB_URI;
    if (!MONGODB_URI) {
      console.error("❌ MONGODB_URI not set in environment");
      process.exit(1);
    }

    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB\n");

    // Get all users
    const users = await UserModel.find({}).lean();
    console.log(`Found ${users.length} users\n`);

    let updatedCount = 0;
    let totalPointsAwarded = 0;

    for (const userDoc of users) {
      const userId = userDoc._id.toString();
      const userName = userDoc.name || userDoc.email;

      // Count issues reported by this user
      const issuesReported = await Issue.countDocuments({
        reportedBy: new mongoose.Types.ObjectId(userId),
      });

      // Count issues resolved by this user (if they're an admin/agency)
      const issuesResolved = await Issue.countDocuments({
        resolvedBy: new mongoose.Types.ObjectId(userId),
      });

      if (issuesReported > 0 || issuesResolved > 0) {
        // Calculate points: 10 per issue reported, 50 per issue resolved
        const pointsForReporting = issuesReported * 10;
        const pointsForResolving = issuesResolved * 50;
        const totalPoints = pointsForReporting + pointsForResolving;

        // Calculate level based on total points
        const level = calculateLevel(
          (userDoc as any).rewardPoints || 0 + totalPoints,
        );

        // Update user document
        await UserModel.findByIdAndUpdate(userId, {
          $set: {
            "statistics.issuesReported": issuesReported,
            "statistics.issuesResolved": issuesResolved,
          },
          $inc: {
            rewardPoints: totalPoints,
          },
          level: level,
        });

        console.log(`✅ Updated ${userName}:`);
        console.log(`   - Issues reported: ${issuesReported}`);
        console.log(`   - Issues resolved: ${issuesResolved}`);
        console.log(`   - Points awarded: ${totalPoints}`);
        console.log(`   - New level: ${level}\n`);

        updatedCount++;
        totalPointsAwarded += totalPoints;
      }
    }

    console.log(`\n🎉 Backfill complete!`);
    console.log(`   - Updated ${updatedCount} users`);
    console.log(`   - Awarded ${totalPointsAwarded} total points`);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  }
}

/**
 * Calculate user level based on points
 */
function calculateLevel(points: number): number {
  if (points < 50) return 1;
  if (points < 150) return 2;
  if (points < 300) return 3;
  if (points < 500) return 4;
  if (points < 800) return 5;
  if (points < 1200) return 6;
  if (points < 1700) return 7;
  if (points < 2300) return 8;
  if (points < 3000) return 9;
  return 10;
}

// Run the script
backfillUserStats();
