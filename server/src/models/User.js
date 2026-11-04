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
    }
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", userSchema);
