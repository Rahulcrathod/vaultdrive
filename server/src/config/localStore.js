import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import crypto from "crypto";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, "../../data");
const DB_FILE = path.join(DATA_DIR, "db.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial structure
const initialData = {
  users: [],
  files: [],
  folders: [],
  reservations: []
};

function readDb() {
  try {
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), "utf-8");
      return initialData;
    }
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading local db file, resetting to empty:", err);
    return initialData;
  }
}

function writeDb(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing to local db file:", err);
  }
}

export const localStore = {
  findUserById(id) {
    const db = readDb();
    return db.users.find(u => u._id === id || u.id === id);
  },
  findUserByEmail(email) {
    const db = readDb();
    const clean = email.trim().toLowerCase();
    return db.users.find(u => u.email.toLowerCase() === clean);
  },
  findUserByUsername(username) {
    const db = readDb();
    const clean = username.trim().toLowerCase();
    return db.users.find(u => u.username && u.username.toLowerCase() === clean);
  },
  findUserByResetToken(token) {
    const db = readDb();
    const now = new Date();
    return db.users.find(u => 
      u.resetPasswordToken === token &&
      u.resetPasswordExpires &&
      new Date(u.resetPasswordExpires) > now
    );
  },
  createUser(userData) {
    const db = readDb();
    const newUser = {
      _id: crypto.randomUUID(),
      quotaBytes: 2147483648, // 2 GiB
      usedBytes: 0,
      reservedBytes: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...userData
    };
    db.users.push(newUser);
    writeDb(db);
    return newUser;
  },
  updateUser(id, updates) {
    const db = readDb();
    const idx = db.users.findIndex(u => u._id === id || u.id === id);
    if (idx === -1) return null;
    db.users[idx] = {
      ...db.users[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    writeDb(db);
    return db.users[idx];
  },

  // File methods
  findFiles(query = {}) {
    const db = readDb();
    return db.files.filter(f => {
      for (const [k, v] of Object.entries(query)) {
        if (v === null && f[k] === null) continue;
        if (f[k] !== v) return false;
      }
      return true;
    });
  },
  findFileById(id) {
    const db = readDb();
    return db.files.find(f => f._id === id || f.id === id);
  },
  createFile(fileData) {
    const db = readDb();
    const newFile = {
      _id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...fileData
    };
    db.files.push(newFile);
    writeDb(db);
    return newFile;
  },
  updateFile(id, updates) {
    const db = readDb();
    const idx = db.files.findIndex(f => f._id === id || f.id === id);
    if (idx === -1) return null;
    db.files[idx] = {
      ...db.files[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    writeDb(db);
    return db.files[idx];
  },
  deleteFile(id) {
    const db = readDb();
    const idx = db.files.findIndex(f => f._id === id || f.id === id);
    if (idx === -1) return null;
    const [deleted] = db.files.splice(idx, 1);
    writeDb(db);
    return deleted;
  },

  // Folder methods
  findFolders(query = {}) {
    const db = readDb();
    return db.folders.filter(f => {
      for (const [k, v] of Object.entries(query)) {
        if (v === null && f[k] === null) continue;
        if (f[k] !== v) return false;
      }
      return true;
    });
  },
  findFolderById(id) {
    const db = readDb();
    return db.folders.find(f => f._id === id || f.id === id);
  },
  createFolder(folderData) {
    const db = readDb();
    const newFolder = {
      _id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...folderData
    };
    db.folders.push(newFolder);
    writeDb(db);
    return newFolder;
  },
  updateFolder(id, updates) {
    const db = readDb();
    const idx = db.folders.findIndex(f => f._id === id || f.id === id);
    if (idx === -1) return null;
    db.folders[idx] = {
      ...db.folders[idx],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    writeDb(db);
    return db.folders[idx];
  },
  deleteFolder(id) {
    const db = readDb();
    const idx = db.folders.findIndex(f => f._id === id || f.id === id);
    if (idx === -1) return null;
    const [deleted] = db.folders.splice(idx, 1);
    writeDb(db);
    return deleted;
  },

  // Upload reservations
  createReservation(resData) {
    const db = readDb();
    const newRes = {
      _id: crypto.randomUUID(),
      status: "pending",
      createdAt: new Date().toISOString(),
      ...resData
    };
    db.reservations.push(newRes);
    writeDb(db);
    return newRes;
  },
  findReservationById(id) {
    const db = readDb();
    return db.reservations.find(r => r._id === id || r.id === id);
  },
  updateReservation(id, updates) {
    const db = readDb();
    const idx = db.reservations.findIndex(r => r._id === id || r.id === id);
    if (idx === -1) return null;
    db.reservations[idx] = {
      ...db.reservations[idx],
      ...updates
    };
    writeDb(db);
    return db.reservations[idx];
  }
};
