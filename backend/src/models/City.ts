import mongoose, { Schema, Document } from "mongoose";

/**
 * City Document Interface
 * Represents a city or municipality using the City Care platform
 */
export interface ICity extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  code: string;
  state: string;
  country: string;
  centerPoint: {
    latitude: number;
    longitude: number;
  };
  boundaries: {
    northWest: { latitude: number; longitude: number };
    northEast: { latitude: number; longitude: number };
    southWest: { latitude: number; longitude: number };
    southEast: { latitude: number; longitude: number };
  };
  population: number;
  area: number;
  administratorEmail: string;
  administratorPhone: string;
  website?: string;
  timezone: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * City Schema
 */
const CitySchema = new Schema<ICity>(
  {
    name: {
      type: String,
      required: [true, "City name is required"],
      trim: true,
      index: true,
    },
    code: {
      type: String,
      required: [true, "City code is required"],
      trim: true,
      unique: true,
      uppercase: true,
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
    centerPoint: {
      latitude: {
        type: Number,
        required: [true, "Center latitude is required"],
      },
      longitude: {
        type: Number,
        required: [true, "Center longitude is required"],
      },
    },
    boundaries: {
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
    population: {
      type: Number,
      default: 0,
    },
    area: {
      type: Number,
      default: 0,
    },
    administratorEmail: {
      type: String,
      required: [true, "Administrator email is required"],
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
    },
    administratorPhone: {
      type: String,
      required: [true, "Administrator phone is required"],
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
CitySchema.index({
  "centerPoint.latitude": 1,
  "centerPoint.longitude": 1,
});

// Create text index for search
CitySchema.index({
  name: "text",
  code: "text",
  state: "text",
});

export const City = mongoose.model<ICity>("City", CitySchema);
