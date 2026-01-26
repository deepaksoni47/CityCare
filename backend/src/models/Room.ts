import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Room Document Interface
 */
export interface IRoom extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: Types.ObjectId;
  buildingId: Types.ObjectId;
  departmentId?: Types.ObjectId;
  roomNumber: string;
  floor: number;
  roomType:
    | "classroom"
    | "lab"
    | "office"
    | "auditorium"
    | "library"
    | "common"
    | "restroom"
    | "other";
  capacity: number;
  area: number;
  hasAC: boolean;
  hasProjector: boolean;
  status: "active" | "under_maintenance" | "closed";
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Room Schema
 */
const RoomSchema = new Schema<IRoom>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
      index: true,
    },
    buildingId: {
      type: Schema.Types.ObjectId,
      ref: "Building",
      required: [true, "Building ID is required"],
      index: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
    },
    roomNumber: {
      type: String,
      required: [true, "Room number is required"],
      trim: true,
    },
    floor: {
      type: Number,
      required: [true, "Floor number is required"],
      min: 0,
    },
    roomType: {
      type: String,
      enum: [
        "classroom",
        "lab",
        "office",
        "auditorium",
        "library",
        "common",
        "restroom",
        "other",
      ],
      required: [true, "Room type is required"],
      index: true,
    },
    capacity: {
      type: Number,
      required: [true, "Capacity is required"],
      min: 1,
    },
    area: {
      type: Number,
      required: [true, "Area is required"],
      min: 0,
    },
    hasAC: {
      type: Boolean,
      default: false,
    },
    hasProjector: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "under_maintenance", "closed"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
  },
);

// Create compound index
RoomSchema.index(
  { organizationId: 1, buildingId: 1, roomNumber: 1 },
  { unique: true },
);

// Create text index for search
RoomSchema.index({
  roomNumber: "text",
});

export const Room = mongoose.model<IRoom>("Room", RoomSchema);
