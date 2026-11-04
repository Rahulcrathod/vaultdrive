import mongoose from "mongoose";
import User from "../models/User.js";
import UploadReservation from "../models/UploadReservation.js";
import File from "../models/File.js";
import { isUsingFallback } from "../config/database.js";
import { localStore } from "../config/localStore.js";
import crypto from "crypto";

export const MAX_QUOTA_BYTES = 2147483648; // 2 GiB

/**
 * Concurrency-safe quota reservation before upload starts
 */
export async function reserveQuota(userId, sizeBytes, objectKey = null) {
  if (
    !Number.isSafeInteger(sizeBytes) ||
    sizeBytes <= 0 ||
    sizeBytes > MAX_QUOTA_BYTES
  ) {
    const err = new Error("Invalid upload size. Must be between 1 byte and 2 GiB.");
    err.status = 400;
    throw err;
  }

  const generatedKey = objectKey || `${userId}/${Date.now()}-${crypto.randomBytes(8).toString("hex")}.bin`;
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

  if (isUsingFallback()) {
    const user = localStore.findUserById(userId);
    if (!user) {
      const err = new Error("User not found");
      err.status = 404;
      throw err;
    }

    const available = user.quotaBytes - (user.usedBytes + user.reservedBytes);
    if (sizeBytes > available) {
      const err = new Error(`Storage quota exceeded. Required: ${(sizeBytes / (1024 * 1024)).toFixed(2)} MB, Available: ${(available / (1024 * 1024)).toFixed(2)} MB.`);
      err.status = 413;
      throw err;
    }

    localStore.updateUser(userId, {
      reservedBytes: user.reservedBytes + sizeBytes
    });

    const reservation = localStore.createReservation({
      ownerId: userId,
      sizeBytes,
      objectKey: generatedKey,
      expiresAt: expiresAt.toISOString()
    });

    return {
      reservationId: reservation._id,
      objectKey: generatedKey
    };
  }

  // MongoDB transactional reservation
  const session = await mongoose.startSession();
  try {
    let reservationId;
    await session.withTransaction(async () => {
      const user = await User.findOneAndUpdate(
        {
          _id: userId,
          $expr: {
            $lte: [
              { $add: ["$usedBytes", "$reservedBytes", sizeBytes] },
              "$quotaBytes"
            ]
          }
        },
        { $inc: { reservedBytes: sizeBytes } },
        { session, new: true }
      );

      if (!user) {
        const currentUser = await User.findById(userId).session(session);
        if (!currentUser) {
          const err = new Error("User not found");
          err.status = 404;
          throw err;
        }
        const free = currentUser.quotaBytes - (currentUser.usedBytes + currentUser.reservedBytes);
        const err = new Error(`2 GB quota exceeded. Available: ${(free / (1024 * 1024)).toFixed(1)} MB.`);
        err.status = 413;
        throw err;
      }

      const [resDoc] = await UploadReservation.create(
        [
          {
            ownerId: userId,
            sizeBytes,
            objectKey: generatedKey,
            expiresAt
          }
        ],
        { session }
      );

      reservationId = resDoc._id;
    });

    return { reservationId, objectKey: generatedKey };
  } finally {
    await session.endSession();
  }
}

/**
 * Commits reservation upon successful upload completion
 */
export async function completeReservation(reservationId, userId, actualSizeBytes) {
  if (isUsingFallback()) {
    const reservation = localStore.findReservationById(reservationId);
    if (!reservation) {
      throw Object.assign(new Error("Reservation not found"), { status: 404 });
    }
    if (reservation.ownerId !== userId) {
      throw Object.assign(new Error("Unauthorized reservation"), { status: 403 });
    }
    if (reservation.status !== "pending") {
      throw Object.assign(new Error(`Reservation is already ${reservation.status}`), { status: 400 });
    }

    const user = localStore.findUserById(userId);
    const reservedAmt = reservation.sizeBytes;
    const finalSize = Number.isSafeInteger(actualSizeBytes) ? actualSizeBytes : reservedAmt;

    localStore.updateUser(userId, {
      reservedBytes: Math.max(0, user.reservedBytes - reservedAmt),
      usedBytes: user.usedBytes + finalSize
    });

    localStore.updateReservation(reservationId, {
      status: "completed"
    });

    return { success: true };
  }

  // MongoDB
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const reservation = await UploadReservation.findOne({
        _id: reservationId,
        ownerId: userId,
        status: "pending"
      }).session(session);

      if (!reservation) {
        throw Object.assign(new Error("Valid pending reservation not found"), { status: 400 });
      }

      const reservedAmt = reservation.sizeBytes;
      const finalSize = Number.isSafeInteger(actualSizeBytes) ? actualSizeBytes : reservedAmt;

      await User.updateOne(
        { _id: userId },
        {
          $inc: {
            reservedBytes: -reservedAmt,
            usedBytes: finalSize
          }
        },
        { session }
      );

      reservation.status = "completed";
      await reservation.save({ session });
    });

    return { success: true };
  } finally {
    await session.endSession();
  }
}

/**
 * Releases quota upon file deletion
 */
export async function releaseQuota(userId, sizeBytes) {
  if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) return;

  if (isUsingFallback()) {
    const user = localStore.findUserById(userId);
    if (user) {
      localStore.updateUser(userId, {
        usedBytes: Math.max(0, user.usedBytes - sizeBytes)
      });
    }
    return;
  }

  await User.updateOne(
    { _id: userId },
    {
      $inc: { usedBytes: -sizeBytes }
    }
  );
}

/**
 * Returns comprehensive quota and category analytics
 */
export async function getStorageMetrics(userId) {
  let user, files;

  if (isUsingFallback()) {
    user = localStore.findUserById(userId);
    files = localStore.findFiles({ ownerId: userId });
  } else {
    user = await User.findById(userId);
    files = await File.find({ ownerId: userId });
  }

  if (!user) {
    throw Object.assign(new Error("User not found"), { status: 404 });
  }

  const quotaBytes = user.quotaBytes || MAX_QUOTA_BYTES;
  const usedBytes = user.usedBytes || 0;
  const reservedBytes = user.reservedBytes || 0;
  const availableBytes = Math.max(0, quotaBytes - (usedBytes + reservedBytes));
  const percentUsed = Math.min(100, Number(((usedBytes / quotaBytes) * 100).toFixed(2)));

  // Calculate breakdown by category
  const categories = {
    photo: { count: 0, bytes: 0, label: "Photos" },
    video: { count: 0, bytes: 0, label: "Videos" },
    audio: { count: 0, bytes: 0, label: "Audio" },
    document: { count: 0, bytes: 0, label: "Documents" },
    text: { count: 0, bytes: 0, label: "Text & Code" },
    archive: { count: 0, bytes: 0, label: "Archives" },
    other: { count: 0, bytes: 0, label: "Other" }
  };

  for (const f of files) {
    const cat = f.category || "other";
    if (categories[cat]) {
      categories[cat].count += 1;
      categories[cat].bytes += f.sizeBytes || 0;
    } else {
      categories.other.count += 1;
      categories.other.bytes += f.sizeBytes || 0;
    }
  }

  return {
    quotaBytes,
    usedBytes,
    reservedBytes,
    availableBytes,
    percentUsed,
    totalFiles: files.length,
    categories
  };
}
