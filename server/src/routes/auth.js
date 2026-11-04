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
        fullName: user.fullName || "",
        gender: user.gender || "",
        dateOfBirth: user.dateOfBirth || "",
        phone: user.phone || "",
        address: user.address || "",
        city: user.city || "",
        state: user.state || "",
        country: user.country || "",
        postalCode: user.postalCode || "",
        bio: user.bio || "",
        createdAt: user.createdAt,
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
 * Update user profile details
 */
router.put("/profile", requireAuth, async (req, res, next) => {
  try {
    const schema = z.object({
      username: z
        .string()
        .min(3, "Username must be at least 3 characters")
        .max(50, "Username cannot exceed 50 characters")
        .regex(/^[a-zA-Z0-9_.-]+$/, "Username can only contain letters, numbers, underscores, dashes, and periods")
        .optional(),
      email: z.string().email("Invalid email address").optional(),
      fullName: z.string().max(100, "Full name cannot exceed 100 characters").optional(),
      gender: z.enum(["male", "female", "non-binary", "other", "prefer_not_to_say", ""]).optional(),
      dateOfBirth: z.string().max(30).optional(),
      phone: z.string().max(30).optional(),
      address: z.string().max(250, "Address cannot exceed 250 characters").optional(),
      city: z.string().max(100).optional(),
      state: z.string().max(100).optional(),
      country: z.string().max(100).optional(),
      postalCode: z.string().max(30).optional(),
      bio: z.string().max(500, "Bio cannot exceed 500 characters").optional()
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: parsed.error.errors[0]?.message || "Invalid input data" });
    }

    const {
      username,
      email,
      fullName,
      gender,
      dateOfBirth,
      phone,
      address,
      city,
      state,
      country,
      postalCode,
      bio
    } = parsed.data;

    let user;
    if (isUsingFallback()) {
      user = localStore.findUserById(req.userId);
      if (!user) return res.status(404).json({ error: "User not found" });

      if (username && username.toLowerCase() !== user.username.toLowerCase()) {
        const existingUsername = localStore.findUserByUsername(username);
        if (existingUsername && (existingUsername._id || existingUsername.id) !== req.userId) {
          return res.status(409).json({ error: `Username "${username}" is already taken.` });
        }
      }

      if (email && email.toLowerCase() !== user.email.toLowerCase()) {
        const existingEmail = localStore.findUserByEmail(email);
        if (existingEmail && (existingEmail._id || existingEmail.id) !== req.userId) {
          return res.status(409).json({ error: `Email "${email}" is already registered to another account.` });
        }
      }

      const updates = {};
      if (username) updates.username = username.trim().toLowerCase();
      if (email) updates.email = email.trim().toLowerCase();
      if (fullName !== undefined) updates.fullName = fullName.trim();
      if (gender !== undefined) updates.gender = gender;
      if (dateOfBirth !== undefined) updates.dateOfBirth = dateOfBirth.trim();
      if (phone !== undefined) updates.phone = phone.trim();
      if (address !== undefined) updates.address = address.trim();
      if (city !== undefined) updates.city = city.trim();
      if (state !== undefined) updates.state = state.trim();
      if (country !== undefined) updates.country = country.trim();
      if (postalCode !== undefined) updates.postalCode = postalCode.trim();
      if (bio !== undefined) updates.bio = bio.trim();

      const updated = localStore.updateUser(req.userId, updates);
      return res.json({
        message: "Profile details updated successfully",
        user: {
          id: updated._id || updated.id,
          email: updated.email,
          username: updated.username,
          fullName: updated.fullName || "",
          gender: updated.gender || "",
          dateOfBirth: updated.dateOfBirth || "",
          phone: updated.phone || "",
          address: updated.address || "",
          city: updated.city || "",
          state: updated.state || "",
          country: updated.country || "",
          postalCode: updated.postalCode || "",
          bio: updated.bio || "",
          createdAt: updated.createdAt,
          salt: updated.salt,
          quotaBytes: updated.quotaBytes,
          usedBytes: updated.usedBytes
        }
      });
    }

    user = await User.findById(req.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Validate username uniqueness
    if (username && username.toLowerCase() !== user.username.toLowerCase()) {
      const existingUsername = await User.findOne({
        username: username.toLowerCase(),
        _id: { $ne: user._id }
      });
      if (existingUsername) {
        return res.status(409).json({ error: `Username "${username}" is already taken. Please choose another.` });
      }
      user.username = username.trim().toLowerCase();
    }

    // Validate email uniqueness
    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const existingEmail = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: user._id }
      });
      if (existingEmail) {
        return res.status(409).json({ error: `Email "${email}" is already in use by another account.` });
      }
      user.email = email.trim().toLowerCase();
    }

    if (fullName !== undefined) user.fullName = fullName.trim();
    if (gender !== undefined) user.gender = gender;
    if (dateOfBirth !== undefined) user.dateOfBirth = dateOfBirth.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (address !== undefined) user.address = address.trim();
    if (city !== undefined) user.city = city.trim();
    if (state !== undefined) user.state = state.trim();
    if (country !== undefined) user.country = country.trim();
    if (postalCode !== undefined) user.postalCode = postalCode.trim();
    if (bio !== undefined) user.bio = bio.trim();

    await user.save();

    res.json({
      message: "Profile details updated successfully",
      user: {
        id: user._id.toString(),
        email: user.email,
        username: user.username,
        fullName: user.fullName || "",
        gender: user.gender || "",
        dateOfBirth: user.dateOfBirth || "",
        phone: user.phone || "",
        address: user.address || "",
        city: user.city || "",
        state: user.state || "",
        country: user.country || "",
        postalCode: user.postalCode || "",
        bio: user.bio || "",
        createdAt: user.createdAt,
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

    if (!user) {
      return res.status(404).json({
        error: `No VaultDrive account was found for "${email}". Please verify the email address or register an account.`
      });
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

    // Send email with delivery verification
    let mailResult;
    try {
      mailResult = await sendPasswordResetEmail({
        toEmail: user.email,
        username: user.username,
        resetUrl
      });
    } catch (mailErr) {
      console.warn("[Auth] SMTP delivery warning:", mailErr.message);
      mailResult = { isFallback: true, directResetUrl: resetUrl };
    }

    if (mailResult?.isFallback || mailResult?.directResetUrl) {
      return res.json({
        success: true,
        message: `Password reset link generated for ${user.email}. Note: Standard SMTP is restricted on Render Free tier, so your instant reset link is provided directly below.`,
        resetUrl: mailResult.directResetUrl || resetUrl,
        isFallback: true
      });
    }

    res.json({
      success: true,
      message: `Password reset instructions sent to ${user.email}. Check your Inbox and Spam/Junk folders.`
    });
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
