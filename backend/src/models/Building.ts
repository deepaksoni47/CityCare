import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Building Document Interface
 */
export interface IBuilding extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: Types.ObjectId;
  departmentId?: Types.ObjectId;
  name: string;
  code: string;
  location: {
    latitude: number;
    longitude: number;
  };
  address: string;
  buildingType:
    | "Academic"
    | "Residential"
    | "Administrative"
    | "Library"
    | "Auditorium"
    | "Sports"
    | "Other";
  floors: number;
  totalArea: number;
  constructionYear: number;
  lastRenovation?: Date;
  status: "active" | "under_maintenance" | "decommissioned";
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Building Schema
 */
const BuildingSchema = new Schema<IBuilding>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
      index: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
    },
    name: {
      type: String,
      required: [true, "Building name is required"],
      trim: true,
      index: true,
    },
    code: {
      type: String,
      required: [true, "Building code is required"],
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
    buildingType: {
      type: String,
      enum: [
        "Academic",
        "Residential",
        "Administrative",
        "Library",
        "Auditorium",
        "Sports",
        "Other",
      ],
      required: [true, "Building type is required"],
      default: "Academic",
      index: true,
    },
    floors: {
      type: Number,
      required: [true, "Number of floors is required"],
      min: 1,
    },
    totalArea: {
      type: Number,
      required: [true, "Total area is required"],
      min: 0,
    },
    constructionYear: {
      type: Number,
      required: [true, "Construction year is required"],
    },
    lastRenovation: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["active", "under_maintenance", "decommissioned"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Create geospatial index for location-based queries
BuildingSchema.index({
  "location.latitude": 1,
  "location.longitude": 1,
});

// Create compound index
BuildingSchema.index({ organizationId: 1, code: 1 }, { unique: true });

// Create text index for search
BuildingSchema.index({
  name: "text",
  code: "text",
});

export const Building = mongoose.model<IBuilding>("Building", BuildingSchema);
