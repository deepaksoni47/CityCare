import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Issue Prediction Document Interface
 * Represents AI-powered predictions of infrastructure issues
 */
export interface IIssuePrediction extends Document {
  _id: mongoose.Types.ObjectId;
  cityId: Types.ObjectId;
  zoneId: Types.ObjectId;
  agencyId?: Types.ObjectId;
  predictedCategory: string;
  predictedSeverity: number;
  probability: number;
  reasoning: string;
  suggestedPreventiveMeasures: string[];
  estimatedTimeframe: string;
  basedOnHistoricalIssues: Types.ObjectId[];
  isActualized: boolean;
  actualizedIssueId?: Types.ObjectId;
  actualizedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Issue Prediction Schema
 */
const IssuePredictionSchema = new Schema<IIssuePrediction>(
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
    predictedCategory: {
      type: String,
      required: [true, "Predicted category is required"],
      index: true,
    },
    predictedSeverity: {
      type: Number,
      required: [true, "Predicted severity is required"],
      min: 1,
      max: 10,
    },
    probability: {
      type: Number,
      required: [true, "Probability is required"],
      min: 0,
      max: 1,
      index: true,
    },
    reasoning: {
      type: String,
      required: [true, "Reasoning is required"],
    },
    suggestedPreventiveMeasures: {
      type: [String],
      default: [],
    },
    estimatedTimeframe: {
      type: String,
      required: [true, "Estimated timeframe is required"],
    },
    basedOnHistoricalIssues: {
      type: [Schema.Types.ObjectId],
      ref: "Issue",
      default: [],
    },
    isActualized: {
      type: Boolean,
      default: false,
      index: true,
    },
    actualizedIssueId: {
      type: Schema.Types.ObjectId,
      ref: "Issue",
    },
    actualizedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

// Create compound index for common queries
IssuePredictionSchema.index({
  cityId: 1,
  zoneId: 1,
  isActualized: 1,
});

IssuePredictionSchema.index({
  cityId: 1,
  probability: 1,
});

export const IssuePrediction = mongoose.model<IIssuePrediction>(
  "IssuePrediction",
  IssuePredictionSchema,
);
