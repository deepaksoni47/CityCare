import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Analytics Document Interface
 * Stores aggregated analytics and metrics for cities
 */
export interface IAnalytics extends Document {
  _id: mongoose.Types.ObjectId;
  cityId: Types.ObjectId;
  date: Date;
  period: "daily" | "weekly" | "monthly";

  // Issue statistics
  totalIssuesReported: number;
  issuesByCategory: Record<string, number>;
  issuesByStatus: Record<string, number>;
  issuesByPriority: Record<string, number>;
  averageSeverity: number;

  // Resolution metrics
  totalIssuesResolved: number;
  averageResolutionTime: number;
  criticalIssuesResolved: number;

  // Location metrics
  zoneWithMostIssues: string;
  hotspotLocations: Array<{
    zoneId: Types.ObjectId;
    issueCount: number;
    latitude: number;
    longitude: number;
  }>;

  // User engagement
  uniqueReporters: number;
  reportsByRole: Record<string, number>;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Analytics Schema
 */
const AnalyticsSchema = new Schema<IAnalytics>(
  {
    cityId: {
      type: Schema.Types.ObjectId,
      ref: "City",
      required: [true, "City ID is required"],
      index: true,
    },
    date: {
      type: Date,
      required: [true, "Date is required"],
      index: true,
    },
    period: {
      type: String,
      enum: ["daily", "weekly", "monthly"],
      required: [true, "Period is required"],
      index: true,
    },

    // Issue statistics
    totalIssuesReported: {
      type: Number,
      default: 0,
      min: 0,
    },
    issuesByCategory: {
      type: Schema.Types.Mixed,
      default: {},
    },
    issuesByStatus: {
      type: Schema.Types.Mixed,
      default: {},
    },
    issuesByPriority: {
      type: Schema.Types.Mixed,
      default: {},
    },
    averageSeverity: {
      type: Number,
      default: 0,
      min: 0,
      max: 10,
    },

    // Resolution metrics
    totalIssuesResolved: {
      type: Number,
      default: 0,
      min: 0,
    },
    averageResolutionTime: {
      type: Number,
      default: 0,
      min: 0,
    },
    criticalIssuesResolved: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Location metrics
    zoneWithMostIssues: {
      type: String,
      default: "",
    },
    hotspotLocations: {
      type: [
        {
          zoneId: Schema.Types.ObjectId,
          issueCount: { type: Number, min: 0 },
          latitude: Number,
          longitude: Number,
        },
      ],
      default: [],
    },

    // User engagement
    uniqueReporters: {
      type: Number,
      default: 0,
      min: 0,
    },
    reportsByRole: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
  },
);

// Create compound index for efficient querying
AnalyticsSchema.index({ cityId: 1, date: 1, period: 1 });
AnalyticsSchema.index({ cityId: 1, period: 1, date: -1 });

export const Analytics = mongoose.model<IAnalytics>(
  "Analytics",
  AnalyticsSchema,
);
