import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Zone Document Interface
 * Represents geographic zones or districts within a city
 */
export interface IZone extends Document {
  _id: mongoose.Types.ObjectId;
  cityId: Types.ObjectId;
  agencyId?: Types.ObjectId;
  name: string;
  code: string;
  zoneType:
    | "residential"
    | "commercial"
    | "industrial"
    | "public_service"
    | "transportation"
    | "utilities"
    | "other";
  centerPoint: {
    latitude: number;
    longitude: number;
  };
  area: number;
  population?: number;
  status: "active" | "under_maintenance" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Zone Schema
 */
const ZoneSchema = new Schema<IZone>(
  {
    cityId: {
      type: Schema.Types.ObjectId,
      ref: "City",
      required: [true, "City ID is required"],
      index: true,
    },
    agencyId: {
      type: Schema.Types.ObjectId,
      ref: "Agency",
    },
    name: {
      type: String,
      required: [true, "Zone name is required"],
      trim: true,
      index: true,
    },
    code: {
      type: String,
      required: [true, "Zone code is required"],
      trim: true,
      uppercase: true,
    },
    zoneType: {
      type: String,
      enum: [
        "residential",
        "commercial",
        "industrial",
        "public_service",
        "transportation",
        "utilities",
        "other",
      ],
      required: [true, "Zone type is required"],
      default: "residential",
      index: true,
    },
    centerPoint: {
      latitude: {
        type: Number,
        required: [true, "Latitude is required"],
      },
      longitude: {
        type: Number,
        required: [true, "Longitude is required"],
      },
    },
    area: {
      type: Number,
      required: [true, "Area is required"],
      min: 0,
    },
    population: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ["active", "under_maintenance", "inactive"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Create geospatial index for location-based queries
ZoneSchema.index({
  "centerPoint.latitude": 1,
  "centerPoint.longitude": 1,
});

// Create compound index
ZoneSchema.index({ cityId: 1, code: 1 }, { unique: true });

// Create text index for search
ZoneSchema.index({
  name: "text",
  code: "text",
});

export const Zone = mongoose.model<IZone>("Zone", ZoneSchema);
