import { Router } from "express";
import path from "path";
import fs from "fs";
import { z } from "zod";
import File from "../models/File.js";
import { requireAuth } from "../middleware/authenticate.js";
import {
  reserveQuota,
  completeReservation,
  releaseQuota
} from "../services/quota.js";
import {
  createUploadUrl,
  createDownloadUrl,
  deleteObject,
  getObjectMetadata,
  LOCAL_VAULT_DIR
} from "../config/s3.js";
import { isUsingFallback } from "../config/database.js";
import { localStore } from "../config/localStore.js";

const router = Router();

// Helper to deduce category from MIME or extension
function categorizeMime(mimeType = "", fileName = "") {
  const mime = mimeType.toLowerCase();
  const ext = path.extname(fileName).toLowerCase();

  if (mime.startsWith("image/") || [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"].includes(ext)) {
    return "photo";
  }
  if (mime.startsWith("video/") || [".mp4", ".mov", ".mkv", ".webm", ".avi", ".flv"].includes(ext)) {
    return "video";
  }
  if (mime.startsWith("audio/") || [".mp3", ".wav", ".ogg", ".flac", ".m4a", ".aac"].includes(ext)) {
    return "audio";
  }
  if (
    mime.includes("pdf") ||
    mime.includes("word") ||
    mime.includes("officedocument") ||
    mime.includes("presentation") ||
    mime.includes("spreadsheet") ||
    [".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"].includes(ext)
  ) {
    return "document";
  }
  if (
    mime.startsWith("text/") ||
    [".txt", ".md", ".json", ".js", ".jsx", ".ts", ".tsx", ".html", ".css", ".py", ".csv", ".xml", ".yaml", ".yml"].includes(ext)
  ) {
    return "text";
  }
  if ([".zip", ".rar", ".7z", ".tar", ".gz", ".bz2"].includes(ext)) {
    return "archive";
  }
  return "other";
}

/**
 * 1. Request Upload Intent:
 * Reserves quota atomically and generates presigned URL / upload target
 */
router.post("/upload-intent", requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      sizeBytes: z.number().int().positive(),
      nameCiphertext: z.string().min(1),
      originalName: z.string().optional(),
      mimeType: z.string().optional(),
      folderId: z.string().nullable().optional()
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid upload parameters" });
    }

    const { sizeBytes, mimeType } = parsed.data;

    // Reserve quota in DB atomically
    const { reservationId, objectKey } = await reserveQuota(req.userId, sizeBytes);

    // Get upload URL (S3 presigned URL or local vault endpoint)
    const uploadTarget = await createUploadUrl(objectKey, mimeType || "application/octet-stream");

    res.json({
      reservationId,
      objectKey,
      uploadUrl: uploadTarget.uploadUrl,
      uploadType: uploadTarget.type,
      method: uploadTarget.method,
      expiresInSeconds: 900
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Local Vault direct upload (for development without AWS S3)
 */
router.put("/vault-upload/:key", (req, res) => {
  const objectKey = decodeURIComponent(req.params.key);
  // Prevent directory traversal
  const safeFilename = path.basename(objectKey);
  const targetDir = path.join(LOCAL_VAULT_DIR, path.dirname(objectKey));
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const filePath = path.join(targetDir, safeFilename);
  const writeStream = fs.createWriteStream(filePath);

  req.pipe(writeStream);

  writeStream.on("finish", () => {
    res.status(200).json({ success: true, message: "Encrypted object stored in local vault." });
  });

  writeStream.on("error", (err) => {
    console.error("Vault write error:", err);
    res.status(500).json({ error: "Failed to store encrypted object in local vault." });
  });
});

/**
 * Local Vault direct download stream
 */
router.get("/vault-download/:key", (req, res) => {
  const objectKey = decodeURIComponent(req.params.key);
  const filePath = path.join(LOCAL_VAULT_DIR, objectKey);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Object not found in vault" });
  }

  res.setHeader("Content-Type", "application/octet-stream");
  const readStream = fs.createReadStream(filePath);
  readStream.pipe(res);
});

/**
 * 2. Complete and finalize upload:
 * Verifies ciphertext object was uploaded and commits quota reservation
 */
router.post("/complete", requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      reservationId: z.string().min(1),
      objectKey: z.string().min(1),
      nameCiphertext: z.string().min(1),
      originalName: z.string().default("Encrypted File"),
      sizeBytes: z.number().int().min(0),
      mimeType: z.string().default("application/octet-stream"),
      nonce: z.string().min(1), // Base64 IV
      wrappedKey: z.string().optional().default(""),
      folderId: z.string().nullable().optional().default(null)
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid completion data", details: parsed.error.errors });
    }

    const {
      reservationId,
      objectKey,
      nameCiphertext,
      originalName,
      sizeBytes,
      mimeType,
      nonce,
      wrappedKey,
      folderId
    } = parsed.data;

    // Verify object presence in storage
    try {
      await getObjectMetadata(objectKey);
    } catch (e) {
      return res.status(400).json({ error: "Uploaded object not found in storage. Upload may have failed." });
    }

    // Commit quota reservation
    await completeReservation(reservationId, req.userId, sizeBytes);

    const category = categorizeMime(mimeType, originalName);

    // Save File record
    let fileDoc;
    if (isUsingFallback()) {
      fileDoc = localStore.createFile({
        ownerId: req.userId,
        nameCiphertext,
        originalName,
        objectKey,
        sizeBytes,
        mimeType,
        nonce,
        wrappedKey,
        folderId: folderId || null,
        category
      });
    } else {
      fileDoc = await File.create({
        ownerId: req.userId,
        nameCiphertext,
        originalName,
        objectKey,
        sizeBytes,
        mimeType,
        nonce,
        wrappedKey,
        folderId: folderId || null,
        category
      });
    }

    res.status(201).json({
      message: "File encrypted and uploaded successfully.",
      file: fileDoc
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 3. List user files
 */
router.get("/", requireAuth, async (req, res, next) => {
  try {
    const { folderId, category, search } = req.query;

    let files;
    if (isUsingFallback()) {
      const query = { ownerId: req.userId };
      if (folderId !== undefined) {
        query.folderId = folderId === "root" || folderId === "" ? null : folderId;
      }
      if (category && category !== "all") {
        query.category = category;
      }
      files = localStore.findFiles(query);
      if (search) {
        const s = search.toLowerCase();
        files = files.filter(f => f.originalName?.toLowerCase().includes(s));
      }
    } else {
      const query = { ownerId: req.userId };
      if (folderId !== undefined) {
        query.folderId = folderId === "root" || folderId === "" ? null : folderId;
      }
      if (category && category !== "all") {
        query.category = category;
      }
      if (search) {
        query.originalName = { $regex: search, $options: "i" };
      }
      files = await File.find(query).sort({ createdAt: -1 });
    }

    res.json({ files });
  } catch (err) {
    next(err);
  }
});

/**
 * 4. Get authorized download URL
 */
router.post("/:id/download-url", requireAuth, async (req, res, next) => {
  try {
    const fileId = req.params.id;
    let file;
    if (isUsingFallback()) {
      file = localStore.findFileById(fileId);
    } else {
      file = await File.findById(fileId);
    }

    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    if (file.ownerId.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: "Access denied. You do not own this file." });
    }

    const downloadUrl = await createDownloadUrl(file.objectKey);

    res.json({
      downloadUrl,
      fileName: file.originalName,
      nameCiphertext: file.nameCiphertext,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes,
      nonce: file.nonce,
      wrappedKey: file.wrappedKey
    });
  } catch (err) {
    next(err);
  }
});

/**
 * 5. Update / Rename / Move file
 */
router.patch("/:id", requireAuth, async (req, res, next) => {
  try {
    const fileId = req.params.id;
    const { originalName, folderId } = req.body;

    let file;
    if (isUsingFallback()) {
      file = localStore.findFileById(fileId);
      if (!file || file.ownerId !== req.userId) {
        return res.status(404).json({ error: "File not found or unauthorized" });
      }
      const updates = {};
      if (originalName) updates.originalName = originalName;
      if (folderId !== undefined) updates.folderId = folderId || null;
      const updated = localStore.updateFile(fileId, updates);
      return res.json({ file: updated });
    }

    file = await File.findById(fileId);
    if (!file || file.ownerId.toString() !== req.userId.toString()) {
      return res.status(404).json({ error: "File not found or unauthorized" });
    }

    if (originalName) file.originalName = originalName;
    if (folderId !== undefined) file.folderId = folderId || null;
    await file.save();

    res.json({ file });
  } catch (err) {
    next(err);
  }
});

/**
 * 6. Delete file (releases quota)
 */
router.delete("/:id", requireAuth, async (req, res, next) => {
  try {
    const fileId = req.params.id;
    let file;

    if (isUsingFallback()) {
      file = localStore.findFileById(fileId);
      if (!file || file.ownerId !== req.userId) {
        return res.status(404).json({ error: "File not found or unauthorized" });
      }
      // Delete from storage
      await deleteObject(file.objectKey);
      // Delete record
      localStore.deleteFile(fileId);
      // Release quota
      await releaseQuota(req.userId, file.sizeBytes);
      return res.json({ message: "File deleted and quota released.", releasedBytes: file.sizeBytes });
    }

    file = await File.findById(fileId);
    if (!file || file.ownerId.toString() !== req.userId.toString()) {
      return res.status(404).json({ error: "File not found or unauthorized" });
    }

    // Delete ciphertext from S3
    try {
      await deleteObject(file.objectKey);
    } catch (e) {
      console.warn("Storage deletion warning:", e.message);
    }

    const sizeBytes = file.sizeBytes;
    await File.findByIdAndDelete(fileId);
    await releaseQuota(req.userId, sizeBytes);

    res.json({
      message: "File deleted and quota released.",
      releasedBytes: sizeBytes
    });
  } catch (err) {
    next(err);
  }
});

export default router;
