import { Router } from "express";
import { z } from "zod";
import Folder from "../models/Folder.js";
import File from "../models/File.js";
import { requireAuth } from "../middleware/authenticate.js";
import { isUsingFallback } from "../config/database.js";
import { localStore } from "../config/localStore.js";

const router = Router();

/**
 * List folders
 */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { parentFolderId } = req.query;

    if (isUsingFallback()) {
      const query = { ownerId: req.userId };
      if (parentFolderId !== undefined) {
        query.parentFolderId = parentFolderId === "root" || parentFolderId === "" ? null : parentFolderId;
      }
      const folders = localStore.findFolders(query);
      return res.json({ folders });
    }

    const query = { ownerId: req.userId };
    if (parentFolderId !== undefined) {
      query.parentFolderId = parentFolderId === "root" || parentFolderId === "" ? null : parentFolderId;
    }
    const folders = await Folder.find(query).sort({ folderName: 1 });
    res.json({ folders });
  } catch (err) {
    next(err);
  }
});

/**
 * Create folder
 */
router.post("/", requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      folderName: z.string().min(1, "Folder name is required").max(100),
      parentFolderId: z.string().nullable().optional().default(null),
      color: z.string().optional().default("#0D9488")
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid folder name" });
    }

    const { folderName, parentFolderId, color } = parsed.data;

    if (isUsingFallback()) {
      const folder = localStore.createFolder({
        ownerId: req.userId,
        folderName: folderName.trim(),
        parentFolderId: parentFolderId || null,
        color
      });
      return res.status(201).json({ folder });
    }

    const folder = await Folder.create({
      ownerId: req.userId,
      folderName: folderName.trim(),
      parentFolderId: parentFolderId || null,
      color
    });

    res.status(201).json({ folder });
  } catch (err) {
    next(err);
  }
});

/**
 * Rename or Move folder
 */
router.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const folderId = req.params.id;
    const { folderName, parentFolderId, color } = req.body;

    if (isUsingFallback()) {
      const folder = localStore.findFolderById(folderId);
      if (!folder || folder.ownerId !== req.userId) {
        return res.status(404).json({ error: "Folder not found" });
      }
      const updates = {};
      if (folderName) updates.folderName = folderName.trim();
      if (parentFolderId !== undefined) updates.parentFolderId = parentFolderId || null;
      if (color) updates.color = color;
      const updated = localStore.updateFolder(folderId, updates);
      return res.json({ folder: updated });
    }

    const folder = await Folder.findById(folderId);
    if (!folder || folder.ownerId.toString() !== req.userId.toString()) {
      return res.status(404).json({ error: "Folder not found" });
    }

    if (folderName) folder.folderName = folderName.trim();
    if (parentFolderId !== undefined) folder.parentFolderId = parentFolderId || null;
    if (color) folder.color = color;
    await folder.save();

    res.json({ folder });
  } catch (err) {
    next(err);
  }
});

/**
 * Delete folder
 */
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const folderId = req.params.id;

    if (isUsingFallback()) {
      const folder = localStore.findFolderById(folderId);
      if (!folder || folder.ownerId !== req.userId) {
        return res.status(404).json({ error: "Folder not found" });
      }
      // Move any files in this folder to root or keep them
      const files = localStore.findFiles({ folderId });
      for (const f of files) {
        localStore.updateFile(f._id, { folderId: null });
      }
      localStore.deleteFolder(folderId);
      return res.json({ message: "Folder deleted" });
    }

    const folder = await Folder.findById(folderId);
    if (!folder || folder.ownerId.toString() !== req.userId.toString()) {
      return res.status(404).json({ error: "Folder not found" });
    }

    // Reset folderId on contained files to null (move to root)
    await File.updateMany({ folderId }, { $set: { folderId: null } });
    await Folder.findByIdAndDelete(folderId);

    res.json({ message: "Folder deleted" });
  } catch (err) {
    next(err);
  }
});

export default router;
