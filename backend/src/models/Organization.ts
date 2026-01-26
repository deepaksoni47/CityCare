import mongoose, { Schema, Document } from "mongoose";

/**
 * Organization Document Interface
 * Represents a city/municipality using the City Care platform
 */
export interface IOrganization extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  shortName: string;
  address: string;
  city: string;
  state: string;
  country: string;
  campusCenter: {
    latitude: number;
    longitude: number;
  };
  campusBounds: {
    northWest: { latitude: number; longitude: number };
    northEast: { latitude: number; longitude: number };
    southWest: { latitude: number; longitude: number };
    southEast: { latitude: number; longitude: number };
  };
  contactEmail: string;
  contactPhone: string;
  website?: string;
  timezone: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Organization Schema
 */
const OrganizationSchema = new Schema<IOrganization>(
  {
    name: {
      type: String,
      required: [true, "Organization name is required"],
      trim: true,
      index: true,
    },
    shortName: {
      type: String,
      required: [true, "Short name is required"],
      trim: true,
      unique: true,
    },
    address: {
      type: String,
      required: [true, "Address is required"],
    },
    city: {
      type: String,
      required: [true, "City is required"],
      index: true,
    },
    state: {
      type: String,
      required: [true, "State is required"],
    },
    country: {
      type: String,
      required: [true, "Country is required"],
      default: "India",
    },
    campusCenter: {
      latitude: {
        type: Number,
        required: [true, "Center latitude is required"],
      },
      longitude: {
        type: Number,
        required: [true, "Center longitude is required"],
      },
    },
    campusBounds: {
      northWest: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
      },
      northEast: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
      },
      southWest: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
      },
      southEast: {
        latitude: { type: Number, required: true },
        longitude: { type: Number, required: true },
      },
    },
    contactEmail: {
      type: String,
      required: [true, "Contact email is required"],
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },
    contactPhone: {
      type: String,
      required: [true, "Contact phone is required"],
    },
    website: {
      type: String,
      trim: true,
    },
    timezone: {
      type: String,
      required: [true, "Timezone is required"],
      default: "Asia/Kolkata",
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

// Create geospatial index for location-based queries
OrganizationSchema.index({
  "campusCenter.latitude": 1,
  "campusCenter.longitude": 1,
});

// Create text index for search
OrganizationSchema.index({
  name: "text",
  shortName: "text",
  city: "text",
});

export const Organization = mongoose.model<IOrganization>(
  "Organization",
  OrganizationSchema,
);
