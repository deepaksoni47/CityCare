import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * Department Document Interface
 */
export interface IDepartment extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: Types.ObjectId;
  name: string;
  code: string;
  buildingId?: Types.ObjectId;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Department Schema
 */
const DepartmentSchema = new Schema<IDepartment>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: [true, "Organization ID is required"],
      index: true,
    },
    name: {
      type: String,
      required: [true, "Department name is required"],
      trim: true,
      index: true,
    },
    code: {
      type: String,
      required: [true, "Department code is required"],
      trim: true,
      uppercase: true,
    },
    buildingId: {
      type: Schema.Types.ObjectId,
      ref: "Building",
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
DepartmentSchema.index({ organizationId: 1, code: 1 }, { unique: true });

// Create text index for search
DepartmentSchema.index({
  name: "text",
  code: "text",
});

export const Department = mongoose.model<IDepartment>(
  "Department",
  DepartmentSchema,
);
