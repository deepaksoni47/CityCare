import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Vote Document Interface
 * Community voting on issues
 */
export interface IVote extends Document {
  _id: mongoose.Types.ObjectId;
  cityId: Types.ObjectId;
  issueId: Types.ObjectId;
  userId: Types.ObjectId;
  voteType: "upvote" | "downvote";
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Vote Schema
 */
const VoteSchema = new Schema<IVote>(
  {
    cityId: {
      type: Schema.Types.ObjectId,
      ref: "City",
      required: [true, "City ID is required"],
      index: true,
    },
    issueId: {
      type: Schema.Types.ObjectId,
      ref: "Issue",
      required: [true, "Issue ID is required"],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    voteType: {
      type: String,
      enum: ["upvote", "downvote"],
      required: [true, "Vote type is required"],
    },
  },
  {
    timestamps: true,
  },
);

// Prevent duplicate votes from same user on same issue
VoteSchema.index({ cityId: 1, issueId: 1, userId: 1 }, { unique: true });

// Index for counting votes per issue
VoteSchema.index({ issueId: 1, voteType: 1 });

export const Vote = mongoose.model<IVote>("Vote", VoteSchema);
