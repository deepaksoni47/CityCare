import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Zone Document Interface
 * Represents geographic zones within a city
 */
export interface IZone extends Document {
  _id: mongoose.Types.ObjectId;
  cityId: Types.ObjectId;
  agencyId?: Types.ObjectId;
  name: string;
  code: string;
  location: {
    latitude: number;
    longitude: number;
  };
  address: string;
  zoneType:
    | "Residential"
    | "Commercial"
    | "Industrial"
    | "Public"
    | "Green"
    | "Mixed"
    | "Other";
  area: number;
  populationDensity?: number;
  createdYear: number;
  lastMaintenanceDate?: Date;
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
    location: {
      latitude: {
        type: Number,
        required: [true, "Latitude is required"],
      },
      longitude: {
        type: Number,
        required: [true, "Longitude is required"],
      },
    },
    address: {
      type: String,
      required: [true, "Address is required"],
    },
    zoneType: {
      type: String,
      enum: [
        "Residential",
        "Commercial",
        "Industrial",
        "Public",
        "Green",
        "Mixed",
        "Other",
      ],
      required: [true, "Zone type is required"],
      default: "Residential",
      index: true,
    },
    area: {
      type: Number,
      required: [true, "Area is required"],
      min: 0,
    },
    populationDensity: {
      type: Number,
    },
    createdYear: {
      type: Number,
      required: [true, "Creation year is required"],
    },
    lastMaintenanceDate: {
      type: Date,
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
  "location.latitude": 1,
  "location.longitude": 1,
});

// Create compound index
ZoneSchema.index({ cityId: 1, code: 1 }, { unique: true });

// Create text index for search
ZoneSchema.index({
  name: "text",
  code: "text",
});

export const Zone = mongoose.model<IZone>("Zone", ZoneSchema);

// Backward compatibility
export const Building = Zone;
export type IBuilding = IZone;
