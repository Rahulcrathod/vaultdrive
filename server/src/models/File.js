import mongoose from "mongoose";

const fileSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.Mixed, // string or ObjectId
      ref: "User",
      required: true,
      index: true
    },
    nameCiphertext: { type: String, required: true },
    originalName: { type: String, default: "Encrypted File" },
    objectKey: { type: String, required: true, unique: true },
    sizeBytes: { type: Number, required: true, min: 0 },
    mimeType: { type: String, default: "application/octet-stream" },
    nonce: { type: String, required: true }, // IV in Base64
    wrappedKey: { type: String, default: "" },
    folderId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Folder",
      default: null
    },
    category: {
      type: String,
      enum: ["photo", "video", "audio", "document", "text", "archive", "other"],
      default: "other"
    }
  },
  { timestamps: true }
);

fileSchema.index({ ownerId: 1, createdAt: -1 });
fileSchema.index({ ownerId: 1, folderId: 1 });

export default mongoose.models.File || mongoose.model("File", fileSchema);
