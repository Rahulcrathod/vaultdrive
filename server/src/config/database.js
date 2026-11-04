import mongoose from "mongoose";

let isConnected = false;
let isFallback = false;

export async function connectDatabase() {
  const uri = process.env.MONGODB_URI;

  if (!uri || uri.includes("YOUR_CLUSTER") || uri.includes("YOUR_USER")) {
    console.log("ℹ️ [Database] No production MONGODB_URI configured. Running in embedded local database mode.");
    isFallback = true;
    return;
  }

  try {
    const opts = {
      serverSelectionTimeoutMS: 4000,
      connectTimeoutMS: 5000
    };
    await mongoose.connect(uri, opts);
    isConnected = true;
    console.log("✅ [Database] Connected to MongoDB Atlas / cluster successfully.");
  } catch (err) {
    console.warn("⚠️ [Database] Could not connect to MongoDB:", err.message);
    console.log("ℹ️ [Database] Running with resilient local database store.");
    isFallback = true;
  }
}

export function isDbConnected() {
  return isConnected && mongoose.connection.readyState === 1;
}

export function isUsingFallback() {
  return isFallback || !isDbConnected();
}
