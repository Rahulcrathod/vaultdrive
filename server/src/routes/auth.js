import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import User from "../models/User.js";
import { isUsingFallback } from "../config/database.js";
import { localStore } from "../config/localStore.js";
import { requireAuth } from "../middleware/authenticate.js";
import { getStorageMetrics } from "../services/quota.js";
import File from "../models/File.js";
import { deleteObject } from "../config/s3.js";
import { sendPasswordResetEmail } from "../services/email.js";

const router = Router();

const registerSchema = z.object({
  email: z.string().email("Please provide a valid email address").max(254),
  username: z.string().min(3, "Username must be at least 3 characters").max(30).regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain alphanumeric characters, underscores, and dashes"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128)
});

const loginSchema = z.object({
  identifier: z.string().min(1, "Please provide your email or username"),
  password: z.string().min(1, "Please provide your password")
});

/**
 * Public Registration - Creates account with 2 GB private cloud storage
 */
router.post("/register", async (req, res, next) => {
  try {
    const parseResult = registerSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.errors[0]?.message || "Invalid registration data"
      });
    }

    const { email, username, password } = parseResult.data;
    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = username.trim().toLowerCase();

    // Check existing in DB or fallback
    if (isUsingFallback()) {
      if (localStore.findUserByEmail(cleanEmail)) {
        return res.status(409).json({ error: "An account with this email already exists." });
      }
      if (localStore.findUserByUsername(cleanUsername)) {
        return res.status(409).json({ error: "Username is already taken. Please choose another." });
      }

      // Generate client encryption salt (16 bytes hex)
      const salt = crypto.randomBytes(16).toString("hex");
      const passwordHash = await bcrypt.hash(password, 11);

      const user = localStore.createUser({
        email: cleanEmail,
        username: cleanUsername,
        passwordHash,
        salt,
        quotaBytes: 2147483648, // 2 GB
        usedBytes: 0,
        reservedBytes: 0
      });

      req.session.userId = user._id;

      return res.status(201).json({
        message: "Registration successful. 2 GB private storage activated.",
        user: {
          id: user._id,
          email: user.email,
          username: user.username,
          salt: user.salt,
          quotaBytes: user.quotaBytes,
          usedBytes: user.usedBytes
        }
      });
    }

    // MongoDB
    const existing = await User.findOne({
      $or: [{ email: cleanEmail }, { username: cleanUsername }]
    });

    if (existing) {
      if (existing.email === cleanEmail) {
        return res.status(409).json({ error: "An account with this email already exists." });
      }
      return res.status(409).json({ error: "Username is already taken. Please choose another." });
    }

    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = await bcrypt.hash(password, 11);

    const user = await User.create({
      email: cleanEmail,
      username: cleanUsername,
      passwordHash,
      salt,
      quotaBytes: 2147483648,
      usedBytes: 0,
      reservedBytes: 0
    });

    req.session.userId = user._id.toString();

    res.status(201).json({
      message: "Registration successful. 2 GB private storage activated.",
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        salt: user.salt,
        quotaBytes: user.quotaBytes,
        usedBytes: user.usedBytes
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Login - Authenticates user and returns encryption salt
 */
router.post("/login", async (req, res, next) => {
  try {
    const parseResult = loginSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Please enter your username/email and password." });
    }

    const { identifier, password } = parseResult.data;
    const cleanId = identifier.trim().toLowerCase();

    let user;
    if (isUsingFallback()) {
      user = localStore.findUserByEmail(cleanId) || localStore.findUserByUsername(cleanId);
    } else {
      user = await User.findOne({
        $or: [{ email: cleanId }, { username: cleanId }]
      }).select("+passwordHash");
    }

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials. Please check your username/email and password." });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials. Please check your username/email and password." });
    }

    const userIdStr = user._id.toString();
    req.session.userId = userIdStr;

    res.json({
      message: "Login successful",
      user: {
        id: userIdStr,
        email: user.email,
        username: user.username,
        salt: user.salt,
        quotaBytes: user.quotaBytes,
        usedBytes: user.usedBytes
      }
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Get current session user
 */
router.get("/me", requireAuth, async (req, res, next) => {
  try {
    let user;
    if (isUsingFallback()) {
      user = localStore.findUserById(req.userId);
    } else {
      user = await User.findById(req.userId);
    }

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const metrics = await getStorageMetrics(req.userId);

    res.json({
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        salt: user.salt,
        quotaBytes: user.quotaBytes,
        usedBytes: user.usedBytes,
        reservedBytes: user.reservedBytes
      },
      storage: metrics
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Logout
 */
router.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ error: "Could not log out" });
    }
    res.clearCookie("connect.sid");
    res.json({ message: "Logged out successfully" });
  });
});

/**
 * Request Password Reset Email
 */
router.post("/forgot-password", async (req, res, next) => {
  try {
    const schema = z.object({
      email: z.string().email("Please provide a valid email address")
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid email" });
    }

    const email = parsed.data.email.trim().toLowerCase();

    let user;
    if (isUsingFallback()) {
      user = localStore.findUserByEmail(email);
    } else {
      user = await User.findOne({ email });
    }

    // Always return generic success to prevent email enumeration
    const genericResponse = {
      message: "If an account with that email exists, password reset instructions have been sent to it."
    };

    if (!user) {
      return res.json(genericResponse);
    }

    // Generate unhashed reset token to email to user
    const rawToken = crypto.randomBytes(32).toString("hex");
    // Hash token to save in DB for security
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    if (isUsingFallback()) {
      localStore.updateUser(user._id, {
        resetPasswordToken: hashedToken,
        resetPasswordExpires: expiresAt.toISOString()
      });
    } else {
      user.resetPasswordToken = hashedToken;
      user.resetPasswordExpires = expiresAt;
      await user.save();
    }

    const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
    const resetUrl = `${clientOrigin}/reset-password?token=${rawToken}`;

    // Send email asynchronously without blocking the client response
    sendPasswordResetEmail({
      toEmail: user.email,
      username: user.username,
      resetUrl
    }).catch(err => console.error("Email sending background error:", err.message));

    res.json(genericResponse);
  } catch (err) {
    next(err);
  }
});

/**
 * Verify Reset Token
 */
router.get("/verify-reset-token/:token", async (req, res, next) => {
  try {
    const rawToken = req.params.token;
    if (!rawToken) {
      return res.status(400).json({ error: "Reset token is required" });
    }

    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    let user;
    if (isUsingFallback()) {
      user = localStore.findUserByResetToken(hashedToken);
    } else {
      user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: new Date() }
      });
    }

    if (!user) {
      return res.status(400).json({
        error: "Password reset link is invalid or has expired. Please request a new one."
      });
    }

    res.json({
      valid: true,
      email: user.email,
      username: user.username
    });
  } catch (err) {
    next(err);
  }
});

/**
 * Reset Password
 */
router.post("/reset-password", async (req, res, next) => {
  try {
    const schema = z.object({
      token: z.string().min(1, "Reset token is required"),
      password: z.string().min(8, "New password must be at least 8 characters").max(128)
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid request" });
    }

    const { token, password } = parsed.data;
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    let user;
    if (isUsingFallback()) {
      user = localStore.findUserByResetToken(hashedToken);
    } else {
      user = await User.findOne({
        resetPasswordToken: hashedToken,
        resetPasswordExpires: { $gt: new Date() }
      }).select("+passwordHash");
    }

    if (!user) {
      return res.status(400).json({
        error: "Password reset link is invalid or has expired. Please request a new one."
      });
    }

    // 1. Hash new password
    const passwordHash = await bcrypt.hash(password, 11);

    // 2. Generate a new cryptographic salt for the user
    const newSalt = crypto.randomBytes(16).toString("hex");

    // 3. In Zero-Knowledge architecture, old files cannot be decrypted with the new key.
    // Clean up old file ciphertext objects and delete records to restore a fresh 2 GB vault
    if (isUsingFallback()) {
      const userFiles = localStore.findFiles({ ownerId: user._id });
      for (const file of userFiles) {
        try {
          await deleteObject(file.objectKey);
        } catch (e) {}
        localStore.deleteFile(file._id);
      }
      localStore.updateUser(user._id, {
        passwordHash,
        salt: newSalt,
        usedBytes: 0,
        reservedBytes: 0,
        resetPasswordToken: null,
        resetPasswordExpires: null
      });
    } else {
      const userFiles = await File.find({ ownerId: user._id });
      for (const file of userFiles) {
        try {
          await deleteObject(file.objectKey);
        } catch (e) {
          console.warn("Could not delete old file object:", e.message);
        }
      }
      await File.deleteMany({ ownerId: user._id });

      user.passwordHash = passwordHash;
      user.salt = newSalt;
      user.usedBytes = 0;
      user.reservedBytes = 0;
      user.resetPasswordToken = null;
      user.resetPasswordExpires = null;
      await user.save();
    }

    res.json({
      message: "Password reset successful! Your 2 GB vault is ready with your new key. You can now log in."
    });
  } catch (err) {
    next(err);
  }
});

export default router;
