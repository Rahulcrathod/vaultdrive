import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254
    },
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 50
    },
    passwordHash: {
      type: String,
      required: true,
      select: false
    },
    salt: {
      type: String,
      required: true // 16-32 byte hex salt used on the client for PBKDF2 key derivation
    },
    quotaBytes: {
      type: Number,
      default: 2147483648, // 2 GiB (2 * 1024 * 1024 * 1024 bytes)
      immutable: true
    },
    usedBytes: {
      type: Number,
      default: 0,
      min: 0
    },
    reservedBytes: {
      type: Number,
      default: 0,
      min: 0
    },
    resetPasswordToken: {
      type: String,
      select: false,
      default: null
    },
    resetPasswordExpires: {
      type: Date,
      select: false,
      default: null
    },
    fullName: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100
    },
    gender: {
      type: String,
      default: "",
      trim: true,
      enum: ["male", "female", "non-binary", "other", "prefer_not_to_say", ""]
    },
    dateOfBirth: {
      type: String,
      default: "",
      trim: true
    },
    phone: {
      type: String,
      default: "",
      trim: true,
      maxlength: 30
    },
    address: {
      type: String,
      default: "",
      trim: true,
      maxlength: 250
    },
    city: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100
    },
    state: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100
    },
    country: {
      type: String,
      default: "",
      trim: true,
      maxlength: 100
    },
    postalCode: {
      type: String,
      default: "",
      trim: true,
      maxlength: 30
    },
    bio: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500
    }
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", userSchema);
