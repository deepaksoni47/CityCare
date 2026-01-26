import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Agency Document Interface
 * Represents government agencies/departments managing city infrastructure
 */
export interface IAgency extends Document {
  _id: mongoose.Types.ObjectId;
  cityId: Types.ObjectId;
  name: string;
  code: string;
  type:
    | "water_supply"
    | "electricity"
    | "sanitation"
    | "roads"
    | "public_health"
    | "transportation"
    | "parks"
    | "admin"
    | "other";
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Agency Schema
 */
const AgencySchema = new Schema<IAgency>(
  {
    cityId: {
      type: Schema.Types.ObjectId,
      ref: "City",
      required: [true, "City ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Agency name is required"],
      trim: true,
      index: true,
    },
    code: {
      type: String,
      required: [true, "Agency code is required"],
      trim: true,
      uppercase: true,
    },
    type: {
      type: String,
      enum: [
        "water_supply",
        "electricity",
        "sanitation",
        "roads",
        "public_health",
        "transportation",
        "parks",
        "admin",
        "other",
      ],
      required: [true, "Agency type is required"],
      index: true,
    },
    contactPerson: {
      type: String,
      trim: true,
    },
    contactEmail: {
      type: String,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },
    contactPhone: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Create compound index
AgencySchema.index({ cityId: 1, code: 1 }, { unique: true });

// Create text index for search
AgencySchema.index({
  name: "text",
  code: "text",
});

export const Agency = mongoose.model<IAgency>("Agency", AgencySchema);
