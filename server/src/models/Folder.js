import mongoose from "mongoose";

const folderSchema = new mongoose.Schema(
  {
    ownerId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "User",
      required: true,
      index: true
    },
    folderName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120
    },
    parentFolderId: {
      type: mongoose.Schema.Types.Mixed,
      ref: "Folder",
      default: null
    },
    color: {
      type: String,
      default: "#0D9488"
    }
  },
  { timestamps: true }
);

folderSchema.index({ ownerId: 1, parentFolderId: 1 });

export default mongoose.models.Folder || mongoose.model("Folder", folderSchema);
