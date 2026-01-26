import mongoose, { Schema, Document, Types } from "mongoose";

/**
 * User Document Interface
 * Represents citizens and officials in the City Care system
 */
export interface IOAuthProfile {
  provider: "google" | "github";
  providerId: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  cityId: Types.ObjectId;
  email: string;
  password?: string;
  name: string;
  avatar?: string;
  phone?: string;
  role: "citizen" | "officer" | "manager" | "admin";
  agencyId?: Types.ObjectId;
  isActive: boolean;
  isVerified: boolean;

  // OAuth support
  oauthProfiles: IOAuthProfile[];

  permissions: {
    canReportIssues: boolean;
    canResolveIssues: boolean;
    canAssignIssues: boolean;
    canViewAllIssues: boolean;
    canManageUsers: boolean;
    canGenerateReports: boolean;
  };

  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  preferences: {
    notifications: boolean;
    emailAlerts: boolean;
    receiveUpdates: boolean;
  };
  comparePassword(password: string): Promise<boolean>;
}

/**
 * User Schema
 */
const UserSchema = new Schema<IUser>(
  {
    cityId: {
      type: Schema.Types.ObjectId,
      ref: "City",
      required: [true, "City ID is required"],
      index: true,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      match: [
        /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
        "Please provide a valid email address",
      ],
      index: true,
    },
    password: {
      type: String,
      minlength: 6,
      select: false, // Don't return password by default
    },
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      index: true,
    },
    avatar: {
      type: String,
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ["citizen", "officer", "manager", "admin"],
      required: [true, "Role is required"],
      default: "citizen",
      index: true,
    },
    agencyId: {
      type: Schema.Types.ObjectId,
      ref: "Agency",
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },

    // OAuth profiles
    oauthProfiles: {
      type: [
        {
          provider: {
            type: String,
            enum: ["google", "github"],
            required: true,
          },
          providerId: {
            type: String,
            required: true,
          },
          email: String,
          name: String,
          avatar: String,
        },
      ],
      default: [],
    },

    permissions: {
      canReportIssues: { type: Boolean, default: true },
      canResolveIssues: { type: Boolean, default: false },
      canAssignIssues: { type: Boolean, default: false },
      canViewAllIssues: { type: Boolean, default: false },
      canManageUsers: { type: Boolean, default: false },
      canGenerateReports: { type: Boolean, default: false },
    },

    lastLogin: {
      type: Date,
    },
    preferences: {
      notifications: { type: Boolean, default: true },
      emailAlerts: { type: Boolean, default: false },
      receiveUpdates: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  },
);

// Make email unique only if password is set (OAuth users might not have email unique)
UserSchema.index({ email: 1, cityId: 1 }, { sparse: true, unique: true });

// Hash password before saving (only if modified)
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) {
    return next();
  }

  try {
    // Only hash if password exists
    if (this.password) {
      const bcrypt = require("bcryptjs");
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Method to compare passwords
UserSchema.methods.comparePassword = async function (
  candidatePassword: string,
): Promise<boolean> {
  try {
    const bcrypt = require("bcryptjs");
    if (!this.password) {
      return false;
    }
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error("Error comparing passwords");
  }
};

// Create text index for search
UserSchema.index({
  name: "text",
  email: "text",
});

// Create compound index for city + email
UserSchema.index({ cityId: 1, email: 1 });

export const User = mongoose.model<IUser>("User", UserSchema);
