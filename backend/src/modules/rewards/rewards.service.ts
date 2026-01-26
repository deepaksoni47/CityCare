import { User as UserModel } from "../../models/User";
import { Badge as BadgeModel } from "../../models/Badge";
import { User, Badge, RewardTransaction, LeaderboardEntry } from "../../types";

/**
 * Get user's reward profile
 */
export async function getUserRewards(userId: string): Promise<{
  rewardPoints: number;
  level: number;
  badges: Badge[];
  statistics: User["statistics"];
  nextLevelPoints: number;
  levelProgress: number;
}> {
  try {
    const userDoc = await UserModel.findById(userId).lean();

    if (!userDoc) {
      throw new Error("User not found");
    }

    const userData = userDoc as any;
    const points = userData.rewardPoints || 0;
    const level = userData.level || 1;
    const badgeIds = userData.badges || [];

    // Get badge details from user-earned badges
    const badges: Badge[] = [];
    if (badgeIds.length > 0) {
      const badgeDocs = await BadgeModel.find({
        userId: userId,
      })
        .limit(10)
        .lean();

      badgeDocs.forEach((doc: any) => {
        badges.push({ id: doc._id.toString(), ...doc } as Badge);
      });
    }

    // Calculate next level
    const nextLevelPoints = getPointsForLevel(level + 1);
    const currentLevelPoints = getPointsForLevel(level);
    const levelProgress =
      ((points - currentLevelPoints) / (nextLevelPoints - currentLevelPoints)) *
      100;

    return {
      rewardPoints: points,
      level,
      badges,
      statistics: userData.statistics || {},
      nextLevelPoints,
      levelProgress: Math.min(100, Math.max(0, levelProgress)),
    };
  } catch (error) {
    console.error("Error getting user rewards:", error);
    throw error;
  }
}

/**
 * Get user's transaction history
 */
export async function getUserTransactions(
  _userId: string,
  _limit: number = 50,
): Promise<RewardTransaction[]> {
  console.warn("RewardTransaction model not implemented yet");
  return [];
}

/**
 * Get all available badges
 */
export async function getAllBadges(): Promise<Badge[]> {
  try {
    // Get all active badges
    const badgeDocs = await BadgeModel.find().lean();

    // Map to Badge type
    const badges = badgeDocs.map((doc: any) => ({
      id: doc._id.toString(),
      ...doc,
    })) as Badge[];

    // Define rarity order for sorting
    const rarityOrder: Record<string, number> = {
      common: 1,
      rare: 2,
      epic: 3,
      legendary: 4,
    };

    // Sort by rarity, then by threshold
    badges.sort((a, b) => {
      const rarityDiff = rarityOrder[a.rarity] - rarityOrder[b.rarity];
      if (rarityDiff !== 0) return rarityDiff;
      return a.criteria.threshold - b.criteria.threshold;
    });

    return badges;
  } catch (error) {
    console.error("Error getting badges:", error);
    return [];
  }
}

/**
 * Get badge details
 */
export async function getBadgeById(badgeId: string): Promise<Badge | null> {
  try {
    const badgeDoc = await BadgeModel.findById(badgeId).lean();

    if (!badgeDoc) {
      return null;
    }

    return {
      id: (badgeDoc as any)._id.toString(),
      ...badgeDoc,
    } as unknown as Badge;
  } catch (error) {
    console.error("Error getting badge:", error);
    return null;
  }
}

/**
 * Get users who earned a specific badge
 */
export async function getBadgeAchievers(
  badgeId: string,
  limit: number = 20,
): Promise<
  Array<{
    userId: string;
    userName: string;
    earnedAt: Date;
  }>
> {
  try {
    const userBadges = await BadgeModel.find({ badgeType: badgeId })
      .sort({ earnedAt: -1 })
      .limit(limit)
      .lean();

    const achievers = await Promise.all(
      userBadges.map(async (badge: any) => {
        const userDoc = await UserModel.findById(badge.userId).lean();

        return {
          userId: badge.userId.toString(),
          userName: userDoc?.name || "Unknown User",
          earnedAt: badge.earnedAt,
        };
      }),
    );

    return achievers;
  } catch (error) {
    console.error("Error getting badge achievers:", error);
    return [];
  }
}

/**
 * Get leaderboard
 */
export async function getLeaderboard(
  cityId: string,
  period: "all_time" | "monthly" | "weekly" = "all_time",
  limit: number = 100,
): Promise<LeaderboardEntry[]> {
  try {
    // For now, generate live leaderboard
    // In production, you'd cache this in a separate collection
    return await generateLeaderboard(cityId, period, limit);
  } catch (error) {
    console.error("Error getting leaderboard:", error);
    return [];
  }
}

/**
 * Generate leaderboard from user data
 */
async function generateLeaderboard(
  cityId: string,
  period: "all_time" | "monthly" | "weekly",
  limit: number,
): Promise<LeaderboardEntry[]> {
  try {
    console.log(`Generating leaderboard for org: ${cityId}, period: ${period}`);

    // Get all users in the organization
    const userDocs = await UserModel.find({ cityId }).lean();

    console.log(`Found ${userDocs.length} users in organization`);
    if (userDocs.length === 0) {
      console.log(`No users found for organization: ${cityId}`);
    }

    // Filter out inactive users and sort by reward points
    const users = userDocs
      .map((doc: any) => ({
        ...doc,
        id: doc._id.toString(),
      }))
      .filter((user: any) => user.isActive !== false)
      .sort((a: any, b: any) => (b.rewardPoints || 0) - (a.rewardPoints || 0))
      .slice(0, limit);

    console.log(
      `After filtering: ${users.length} active users with top points: ${users
        .slice(0, 3)
        .map((u) => u.rewardPoints || 0)
        .join(", ")}`,
    );
    if (users.length === 0) {
      console.log("No active users found after filtering");
    }

    const leaderboard: LeaderboardEntry[] = users.map(
      (userData: any, index: number) => {
        return {
          id: `${period}_${userData.id}`,
          userId: userData.id,
          cityId,
          userName: userData.name || userData.email || "Unknown User",
          userRole: userData.role || "student",
          rewardPoints: userData.rewardPoints || 0,
          level: userData.level || 1,
          rank: index + 1,
          issuesReported: userData.statistics?.issuesReported || 0,
          votesReceived: userData.statistics?.votesReceived || 0,
          badges: userData.badges || [],
          period,
          updatedAt: new Date(),
        };
      },
    );

    console.log(`Generated leaderboard with ${leaderboard.length} entries`);
    return leaderboard;
  } catch (error) {
    console.error("Error generating leaderboard:", error);
    return [];
  }
}

/**
 * Award points to user
 */
export async function awardPoints(
  userId: string,
  _cityId: string,
  points: number,
  _type: string,
  _description: string,
  _relatedEntityId?: string,
  _relatedEntityType?: string,
): Promise<void> {
  try {
    // Get user document
    const userDoc = await UserModel.findById(userId).lean();
    if (!userDoc) {
      throw new Error("User not found");
    }

    const userData = userDoc as any;
    const currentPoints = userData.rewardPoints || 0;
    const newPoints = currentPoints + points;

    // Update user points and level
    await UserModel.findByIdAndUpdate(userId, {
      rewardPoints: newPoints,
      level: calculateLevel(newPoints),
    });

    // Create transaction record (Note: RewardTransaction model would be needed)
    console.warn("RewardTransaction recording not implemented");

    // Check for new badges
    await checkAndAwardBadges(userId);
  } catch (error) {
    console.error("Error awarding points:", error);
    throw error;
  }
}

/**
 * Check and award badges to user
 */
export async function checkAndAwardBadges(userId: string): Promise<Badge[]> {
  try {
    const userDoc = await UserModel.findById(userId).lean();
    if (!userDoc) return [];

    // Badge checking not fully implemented - would need BadgeDefinition model
    console.warn("Badge checking skipped - not fully implemented");
    return [];
  } catch (error) {
    console.error("Error checking badges:", error);
    return [];
  }
}

/**
 * Calculate user level based on points
 */
function calculateLevel(points: number): number {
  if (points >= 12000) return 10;
  if (points >= 8000) return 9;
  if (points >= 5500) return 8;
  if (points >= 3500) return 7;
  if (points >= 2000) return 6;
  if (points >= 1000) return 5;
  if (points >= 500) return 4;
  if (points >= 250) return 3;
  if (points >= 100) return 2;
  return 1;
}

/**
 * Get points required for a level
 */
function getPointsForLevel(level: number): number {
  const levels = [
    0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 12000, 999999,
  ];
  return levels[Math.min(level, levels.length - 1)] || 0;
}

/**
 * Update user statistics
 */
export async function updateUserStatistics(
  userId: string,
  field: keyof User["statistics"],
  increment: number = 1,
): Promise<void> {
  try {
    const userDoc = await UserModel.findById(userId).lean();
    if (!userDoc) return;

    const userData = userDoc as any;
    const statistics = userData.statistics || {};
    const currentValue = statistics[field] || 0;

    await UserModel.findByIdAndUpdate(userId, {
      [`statistics.${field}`]: currentValue + increment,
    });
  } catch (error) {
    console.error("Error updating user statistics:", error);
  }
}
