import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Badge Document Interface
 * Gamification rewards for citizen engagement
 */
export interface IBadge extends Document {
  _id: mongoose.Types.ObjectId;
  cityId: Types.ObjectId;
  userId: Types.ObjectId;
  badgeType: string;
  title: string;
  description: string;
  icon?: string;
  points: number;
  earnedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Badge Schema
 */
const BadgeSchema = new Schema<IBadge>(
  {
    cityId: {
      type: Schema.Types.ObjectId,
      ref: "City",
      required: [true, "City ID is required"],
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
      index: true,
    },
    badgeType: {
      type: String,
      required: [true, "Badge type is required"],
      enum: [
        "issue_reporter",
        "issue_solver",
        "active_contributor",
        "trend_spotter",
        "community_champion",
      ],
      index: true,
    },
    title: {
      type: String,
      required: [true, "Badge title is required"],
    },
    description: {
      type: String,
      required: [true, "Badge description is required"],
    },
    icon: {
      type: String,
    },
    points: {
      type: Number,
      required: [true, "Points are required"],
      default: 0,
      min: 0,
    },
    earnedAt: {
      type: Date,
      required: [true, "Earned date is required"],
    },
  },
  {
    timestamps: true,
  },
);

// Create compound index
BadgeSchema.index({ cityId: 1, userId: 1 });
BadgeSchema.index({ cityId: 1, badgeType: 1 });

export const Badge = mongoose.model<IBadge>("Badge", BadgeSchema);
