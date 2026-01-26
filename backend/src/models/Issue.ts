import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Issue Document Interface
 * Represents infrastructure issues reported by citizens
 */
export interface IIssue extends Document {
  _id: mongoose.Types.ObjectId;
  cityId: Types.ObjectId;
  zoneId: Types.ObjectId;
  agencyId?: Types.ObjectId;
  title: string;
  description: string;
  category:
    | "Roads"
    | "Water"
    | "Electricity"
    | "Sanitation"
    | "Parks"
    | "Public_Health"
    | "Transportation"
    | "Streetlights"
    | "Pollution"
    | "Safety"
    | "Other";
  severity: number;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "critical";
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };

  // Multi-modal submission
  submissionType: "text" | "voice" | "image" | "mixed";
  voiceTranscript?: string;
  voiceAudioUrl?: string;
  images?: string[];
  aiImageAnalysis?: string;

  // User tracking
  reportedBy: Types.ObjectId;
  reportedByRole: "citizen" | "officer" | "manager" | "admin";
  assignedTo?: Types.ObjectId;

  // Impact tracking
  estimatedCost?: number;
  actualCost?: number;
  estimatedResolutionTime?: number;
  actualResolutionTime?: number;
  affectedPeople?: number;

  // AI insights
  aiRiskScore: number;
  aiPredictedRecurrence?: boolean;
  aiRecommendations?: string[];
  aiSummary?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
}

/**
 * Issue Schema
 */
const IssueSchema = new Schema<IIssue>(
  {
    cityId: {
      type: Schema.Types.ObjectId,
      ref: "City",
      required: [true, "City ID is required"],
      index: true,
    },
    zoneId: {
      type: Schema.Types.ObjectId,
      ref: "Zone",
      required: [true, "Zone ID is required"],
      index: true,
    },
    agencyId: {
      type: Schema.Types.ObjectId,
      ref: "Agency",
    },
    title: {
      type: String,
      required: [true, "Issue title is required"],
      trim: true,
      maxlength: 200,
      index: true,
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: 2000,
    },
    category: {
      type: String,
      enum: [
        "Roads",
        "Water",
        "Electricity",
        "Sanitation",
        "Parks",
        "Public_Health",
        "Transportation",
        "Streetlights",
        "Pollution",
        "Safety",
        "Other",
      ],
      required: [true, "Category is required"],
      index: true,
    },
    severity: {
      type: Number,
      required: [true, "Severity is required"],
      min: 1,
      max: 10,
      index: true,
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
      index: true,
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high", "critical"],
      default: "low",
      index: true,
    },
    location: {
      latitude: {
        type: Number,
        required: [true, "Latitude is required"],
      },
      longitude: {
        type: Number,
        required: [true, "Longitude is required"],
      },
      address: {
        type: String,
      },
    },

    // Multi-modal submission fields
    submissionType: {
      type: String,
      enum: ["text", "voice", "image", "mixed"],
      default: "text",
    },
    voiceTranscript: {
      type: String,
    },
    voiceAudioUrl: {
      type: String,
    },
    images: {
      type: [String],
      default: [],
    },
    aiImageAnalysis: {
      type: String,
    },

    // User tracking
    reportedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Reporter ID is required"],
      index: true,
    },
    reportedByRole: {
      type: String,
      enum: ["citizen", "officer", "manager", "admin"],
      required: [true, "Reporter role is required"],
    },
    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    // Impact tracking
    estimatedCost: {
      type: Number,
      min: 0,
    },
    actualCost: {
      type: Number,
      min: 0,
    },
    estimatedResolutionTime: {
      type: Number,
      min: 0,
    },
    actualResolutionTime: {
      type: Number,
      min: 0,
    },
    affectedPeople: {
      type: Number,
      min: 0,
    },

    // AI insights
    aiRiskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
      index: true,
    },
    aiPredictedRecurrence: {
      type: Boolean,
      default: false,
    },
    aiRecommendations: {
      type: [String],
      default: [],
    },
    aiSummary: {
      type: String,
    },

    // Timestamp
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Create geospatial index for location-based queries
IssueSchema.index({
  "location.latitude": 1,
  "location.longitude": 1,
});

// Create compound indexes for common queries
IssueSchema.index({ cityId: 1, status: 1, priority: 1 });
IssueSchema.index({ cityId: 1, zoneId: 1, status: 1 });
IssueSchema.index({ cityId: 1, category: 1, severity: 1 });

// Create text index for search
IssueSchema.index({
  title: "text",
  description: "text",
  aiSummary: "text",
});

export const Issue = mongoose.model<IIssue>("Issue", IssueSchema);
