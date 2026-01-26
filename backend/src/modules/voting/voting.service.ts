import { Issue as IssueModel } from "../../models/Issue";
import { Vote as VoteModel } from "../../models/Vote";
import { User as UserModel } from "../../models/User";

/**
 * Cast a vote on an issue
 */
export async function voteOnIssue(
  issueId: string,
  userId: string,
  cityId: string,
): Promise<{ success: boolean; message: string; voteCount: number }> {
  try {
    // Check if issue exists
    const issueDoc = await IssueModel.findById(issueId).lean();

    if (!issueDoc) {
      return {
        success: false,
        message: "Issue not found",
        voteCount: 0,
      };
    }

    const issue = issueDoc as any;

    // Prevent voting on own issues
    if (issue.reportedBy === userId) {
      return {
        success: false,
        message: "You cannot vote on your own issue",
        voteCount: issue.voteCount || 0,
      };
    }

    // Prevent voting on resolved/closed issues (optional - remove if you want to allow)
    if (issue.status === "resolved" || issue.status === "closed") {
      return {
        success: false,
        message: "Cannot vote on resolved or closed issues",
        voteCount: issue.voteCount || 0,
      };
    }

    // Check if user has already voted
    const votedBy = issue.votedBy || [];
    if (votedBy.includes(userId)) {
      return {
        success: false,
        message: "You have already voted on this issue",
        voteCount: issue.voteCount || 0,
      };
    }

    // Update issue with vote
    const newVoteCount = (issue.voteCount || 0) + 1;
    const newVotedBy = [...votedBy, userId];

    await IssueModel.findByIdAndUpdate(issueId, {
      voteCount: newVoteCount,
      votedBy: newVotedBy,
      updatedAt: new Date(),
    });

    // Create vote record
    await new VoteModel({
      issueId,
      userId,
      cityId,
      createdAt: new Date(),
    }).save();

    const result = newVoteCount;

    // Award points to voter (async, don't wait)
    awardVotingPoints(userId, issueId, cityId, "vote_cast").catch((err) =>
      console.error("Error awarding vote points:", err),
    );

    // Award points to issue reporter (async, don't wait)
    awardVotingPoints(issue.reportedBy, issueId, cityId, "vote_received").catch(
      (err) => console.error("Error awarding reporter points:", err),
    );

    return {
      success: true,
      message: "Vote cast successfully",
      voteCount: result,
    };
  } catch (error: any) {
    console.error("Error voting on issue:", error);
    return {
      success: false,
      message: error.message || "Failed to cast vote",
      voteCount: 0,
    };
  }
}

/**
 * Remove a vote from an issue
 */
export async function unvoteOnIssue(
  issueId: string,
  userId: string,
): Promise<{ success: boolean; message: string; voteCount: number }> {
  try {
    // Check if issue exists
    const issueDoc = await IssueModel.findById(issueId).lean();

    if (!issueDoc) {
      return {
        success: false,
        message: "Issue not found",
        voteCount: 0,
      };
    }

    const issue = issueDoc as any;

    // Check if user has voted
    const votedBy = issue.votedBy || [];
    if (!votedBy.includes(userId)) {
      return {
        success: false,
        message: "You have not voted on this issue",
        voteCount: issue.voteCount || 0,
      };
    }

    // Update issue
    const newVoteCount = Math.max(0, (issue.voteCount || 0) - 1);
    const newVotedBy = votedBy.filter((id: string) => id !== userId);

    await IssueModel.findByIdAndUpdate(issueId, {
      voteCount: newVoteCount,
      votedBy: newVotedBy,
      updatedAt: new Date(),
    });

    // Delete vote record
    await VoteModel.deleteOne({ issueId, userId });

    return {
      success: true,
      message: "Vote removed successfully",
      voteCount: newVoteCount,
    };
  } catch (error: any) {
    console.error("Error unvoting on issue:", error);
    return {
      success: false,
      message: error.message || "Failed to remove vote",
      voteCount: 0,
    };
  }
}

/**
 * Get votes for an issue
 */
export async function getIssueVotes(issueId: string): Promise<{
  voteCount: number;
  voters: Array<{ userId: string; votedAt: Date }>;
}> {
  try {
    const votes = await VoteModel.find({ issueId })
      .sort({ createdAt: -1 })
      .lean();

    const voters = votes.map((vote: any) => ({
      userId: vote.userId.toString(),
      votedAt: vote.createdAt,
    }));

    return {
      voteCount: voters.length,
      voters,
    };
  } catch (error) {
    console.error("Error getting issue votes:", error);
    return {
      voteCount: 0,
      voters: [],
    };
  }
}

/**
 * Get user's votes
 */
export async function getUserVotes(userId: string): Promise<string[]> {
  try {
    const votes = await VoteModel.find({ userId }).lean();

    return votes.map((vote: any) => vote.issueId.toString());
  } catch (error) {
    console.error("Error getting user votes:", error);
    return [];
  }
}

/**
 * Check if user has voted on an issue
 */
export async function hasUserVoted(
  issueId: string,
  userId: string,
): Promise<boolean> {
  try {
    const vote = await VoteModel.findOne({ issueId, userId }).lean();

    return !!vote;
  } catch (error) {
    console.error("Error checking vote:", error);
    return false;
  }
}

/**
 * Award points for voting actions
 */
async function awardVotingPoints(
  userId: string,
  _issueId: string,
  cityId: string,
  type: "vote_cast" | "vote_received",
): Promise<void> {
  const points = type === "vote_cast" ? 2 : 5;

  try {
    const userDoc = await UserModel.findById(userId).lean();
    if (!userDoc) return;

    const userData = userDoc as any;
    const currentPoints = userData.rewardPoints || 0;
    const currentStats = userData.statistics || {};

    // Update points and statistics
    await UserModel.findByIdAndUpdate(userId, {
      rewardPoints: currentPoints + points,
      level: calculateLevel(currentPoints + points),
      "statistics.votesReceived":
        type === "vote_received"
          ? (currentStats.votesReceived || 0) + 1
          : currentStats.votesReceived || 0,
      "statistics.votesCast":
        type === "vote_cast"
          ? (currentStats.votesCast || 0) + 1
          : currentStats.votesCast || 0,
    });

    // Transaction record not implemented
    console.warn("Reward transaction record not implemented");

    // Check for badge eligibility (don't wait)
    checkAndAwardBadges(userId, cityId).catch((err) =>
      console.error("Error checking badges:", err),
    );
  } catch (error) {
    console.error("Error awarding voting points:", error);
    throw error;
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
 * Check and award badges to user (placeholder - full implementation in rewards service)
 */
async function checkAndAwardBadges(
  _userId: string,
  _cityId: string,
): Promise<void> {
  // This will be fully implemented in rewards.service.ts
  // For now, just a placeholder
}
