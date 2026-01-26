import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Vote Document Interface
 * Community voting on issues
 */
export interface IVote extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: Types.ObjectId;
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
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
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
VoteSchema.index(
  { organizationId: 1, issueId: 1, userId: 1 },
  { unique: true },
);

// Index for counting votes per issue
VoteSchema.index({ issueId: 1, voteType: 1 });

export const Vote = mongoose.model<IVote>("Vote", VoteSchema);
