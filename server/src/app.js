import express from "express";
import session from "express-session";
import MongoStore from "connect-mongo";
import helmet from "helmet";
import cors from "cors";
import rateLimit from "express-rate-limit";

import authRoutes from "./routes/auth.js";
import fileRoutes from "./routes/files.js";
import folderRoutes from "./routes/folders.js";
import storageRoutes from "./routes/storage.js";
import { isDbConnected } from "./config/database.js";
import { getWelcomeHtml } from "./welcomeHtml.js";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../../client/dist");

const app = express();
const isProduction = process.env.NODE_ENV === "production";

app.disable("x-powered-by");

if (isProduction) {
  app.set("trust proxy", 1);
}

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

const allowedOrigins = [
  process.env.CLIENT_ORIGIN || "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://127.0.0.1:5173"
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps, curl, or same-origin)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in development
      }
    },
    credentials: true
  })
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Session configuration
const sessionConfig = {
  name: "vaultdrive.sid",
  secret: process.env.SESSION_SECRET || "vaultdrive-top-secret-signing-key-3928174921",
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: Number(process.env.SESSION_MAX_AGE_MS || 28800000) // 8 hours
  }
};

// If MongoDB is connected and MONGODB_URI is provided, use MongoStore
if (process.env.MONGODB_URI && !process.env.MONGODB_URI.includes("YOUR_")) {
  sessionConfig.store = MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    collectionName: "sessions",
    ttl: 14 * 24 * 60 * 60
  });
}

app.use(session(sessionConfig));

// Rate limit authentication routes to mitigate brute force
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: { error: "Too many authentication attempts. Please try again later." }
});

app.use("/api/auth", authLimiter, authRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/storage", storageRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "VaultDrive API",
    version: "1.0.0",
    storageQuotaPerUser: "2 GiB (2,147,483,648 bytes)",
    encryption: "Client-Side End-to-End Encryption (AES-256-GCM + PBKDF2)",
    database: isDbConnected() ? "MongoDB Atlas" : "Resilient Local Store"
  });
});

// Serve frontend SPA if built, or fallback to API welcome page
if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith("/api")) return next();
    res.sendFile(path.join(clientDistPath, "index.html"));
  });
} else {
  app.get("/", (req, res) => {
    const clientOrigin = process.env.CLIENT_ORIGIN || "http://localhost:5173";
    if (req.accepts("html")) {
      return res.send(getWelcomeHtml(clientOrigin, isDbConnected()));
    }
    res.json({
      status: "ok",
      service: "VaultDrive API",
      version: "1.0.0",
      clientUrl: clientOrigin,
      message: "VaultDrive API server is running. For the web interface, open " + clientOrigin
    });
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: `Endpoint ${req.method} ${req.originalUrl} not found` });
});

// Central error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  console.error(`[Error] ${req.method} ${req.url}:`, err.message);
  res.status(status).json({
    error: err.message || "Internal server error"
  });
});

export default app;
