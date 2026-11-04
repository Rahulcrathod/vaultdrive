import mongoose from "mongoose";

const schema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      required: true,
      index: true
    },
    sizeBytes: {
      type: Number,
      required: true,
      min: 1
    },
    status: {
      type: String,
      enum: ["pending", "completed", "cancelled", "expired"],
      default: "pending"
    },
    objectKey: { type: String },
    expiresAt: { type: Date, required: true, index: true }
  },
  { timestamps: true }
);

export default mongoose.models.UploadReservation || mongoose.model("UploadReservation", schema);
