# 🔒 VaultDrive — Secure Personal Cloud Storage

**VaultDrive** is a production-grade, zero-knowledge personal cloud storage website built with **Node.js, Express, MongoDB/Atlas, S3 Object Storage, and React + Vite + Tailwind CSS**.

Every user registers with their unique User ID and password and receives a guaranteed **2 GB private storage quota** for photos, videos, confidential documents, text files, and folders with **client-side end-to-end encryption (E2EE)**.

---

## 🛡️ Key Features & Security Architecture

1. **Client-Side End-to-End Encryption (E2EE):**
   - Files are encrypted in the user's browser using the native **Web Crypto API (AES-256-GCM)** before leaving the device.
   - Decryption keys are derived locally using **PBKDF2 with 100,000 iterations** from the user's secret passphrase and a unique per-user cryptographic salt.
   - The server and storage provider only ever receive and store encrypted ciphertext. Plaintext never touches the cloud.

2. **Guaranteed 2 GB Quota with Atomic Reservations:**
   - Every registered account receives exactly **2 GiB (2,147,483,648 bytes)**.
   - The backend enforces concurrency-safe atomic quota reservations (`usedBytes + reservedBytes + uploadSize <= quotaBytes`).
   - Prevents race conditions and upload quota bypasses.
   - Quota is immediately freed when files are deleted.

3. **Complete File & Folder Management:**
   - **Upload:** Multi-file drag-and-drop or file picker with live encryption progress.
   - **Folders:** Create folders, nested subfolders with custom color badges, and breadcrumb navigation.
   - **In-Browser Decryption & Preview:**
     - 📸 Photos (JPG, PNG, GIF, WebP, SVG)
     - 🎥 Videos (MP4, WebM, MOV) with HTML5 player
     - 🎵 Audio (MP3, WAV, OGG) with audio player
     - 📄 Text, Code & Markdown (TXT, MD, JS, JSON) in-browser viewer
     - 📑 PDF documents
   - **Download Decrypted:** One-click in-memory decryption and saving directly to the user's computer.
   - **File Operations:** Rename, Move to folder, and Delete.
   - **Search & Filter:** Category filtering (Photos, Videos, Documents, Audio, Text/Code) and sorting (Name, Date, Size).

4. **Email Password Reset (Zero-Knowledge Re-initialization):**
   - Secure time-limited (15-min) cryptographic reset tokens delivered by email (SMTP / Ethereal preview).
   - Allows users who forgot their password to choose a new password.
   - Automatically generates a new cryptographic salt and re-initializes a fresh 2 GB vault for the user.

5. **Dual-Mode Resilient Storage:**
   - **Local Encrypted Vault Mode:** Works right out of the box with zero external configuration. Saves encrypted ciphertext to `server/data/vault/`.
   - **Cloud S3 Mode:** Configure AWS S3, Cloudflare R2, or MinIO in `.env` to switch to production cloud object storage with short-lived presigned URLs.

---

## 🚀 Quick Start (Running Locally)

### 1. Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **npm**: v9+

### 2. Start the Backend Server
```bash
cd server
npm install   # If not already installed
npm run dev
```
The server runs on **`http://localhost:5000`**.

### 3. Start the Frontend Application
In a new terminal:
```bash
cd client
npm install   # If not already installed
npm run dev
```
The client runs on **`http://localhost:5173`**.

Open your browser to `http://localhost:5173` to register your account and access your 2 GB secure vault!

---

## 🧪 Running Automated Tests

### Client Cryptography Unit Tests
Verifies AES-256-GCM key derivation, encryption, decryption, and tamper detection:
```bash
cd client
npm test
```

### Server & Quota Integration Tests
Verifies registration, login, 2 GB quota limits, atomic reservations, and file deletions:
```bash
cd server
npm test
```

---

## ⚙️ Production Environment Variables

### `server/.env`
```dotenv
NODE_ENV=production
PORT=5000
CLIENT_ORIGIN=https://yourdomain.com

# MongoDB Atlas
MONGODB_URI=mongodb+srv://YOUR_USER:YOUR_PASSWORD@cluster.mongodb.net/vaultdrive?retryWrites=true&w=majority

# Session Security
SESSION_SECRET=your_long_random_session_secret_32_chars_or_more

# Cloud Object Storage (AWS S3 / Cloudflare R2 / MinIO)
AWS_REGION=ap-south-1
AWS_S3_BUCKET=your-private-vaultdrive-bucket
AWS_ACCESS_KEY_ID=your-aws-access-key-id
AWS_SECRET_ACCESS_KEY=your-aws-secret-access-key

# Quota limits (2 GiB)
USER_QUOTA_BYTES=2147483648
MAX_UPLOAD_BYTES=2147483648
```

### `client/.env`
```dotenv
VITE_API_URL=https://api.yourdomain.com
```

---

## 📁 Project Structure

```text
vaultdrive/
├── client/
│   ├── src/
│   │   ├── api/
│   │   │   └── http.js              # Fetch wrapper with credentials & error handling
│   │   ├── crypto/
│   │   │   ├── encryption.js        # Web Crypto API AES-256-GCM + PBKDF2
│   │   │   └── encryption.test.js   # Vitest crypto test suite
│   │   ├── components/
│   │   │   ├── Navbar.jsx           # Brand, user status, storage bar
│   │   │   ├── StorageMeter.jsx     # Visual 2 GB multi-segment quota bar
│   │   │   ├── UploadModal.jsx      # Drag-and-drop client encryption upload
│   │   │   ├── PreviewModal.jsx     # In-memory decryption previewer
│   │   │   ├── NewFolderModal.jsx   # Create folder with color tags
│   │   │   ├── RenameModal.jsx      # Rename file or folder
│   │   │   └── MoveModal.jsx        # Move file to another folder
│   │   ├── context/
│   │   │   └── AuthContext.jsx      # User authentication and key state
│   │   ├── pages/
│   │   │   ├── Landing.jsx          # Public showcase & hero page
│   │   │   ├── Dashboard.jsx        # File manager with breadcrumbs & grid/list
│   │   │   ├── Login.jsx            # User sign in
│   │   │   └── Register.jsx         # Public sign up with instant 2 GB
│   │   ├── App.jsx                  # React Router routes
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
│
├── server/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.js          # MongoDB connection with resilient fallback
│   │   │   ├── localStore.js        # File-backed persistence driver
│   │   │   └── s3.js                # AWS S3 & local encrypted vault storage
│   │   ├── models/
│   │   │   ├── User.js              # User schema with 2 GB quota fields
│   │   │   ├── File.js              # File metadata & cryptographic nonces
│   │   │   ├── Folder.js            # Directory tree hierarchy
│   │   │   └── UploadReservation.js # Atomic quota reservation records
│   │   ├── services/
│   │   │   └── quota.js             # Concurrency-safe quota reservation engine
│   │   ├── middleware/
│   │   │   └── authenticate.js      # Session & authorization verification
│   │   ├── routes/
│   │   │   ├── auth.js              # Register, Login, Me, Logout
│   │   │   ├── files.js             # Upload-intent, Complete, Download, Delete
│   │   │   ├── folders.js           # Folder CRUD operations
│   │   │   └── storage.js           # Storage analytics & breakdown
│   │   ├── app.js                   # Express app with Helmet, CORS & Rate limiting
│   │   └── server.js                # HTTP listener
│   ├── test/
│   │   └── auth_and_quota.test.js   # Vitest integration tests
│   └── package.json
│
└── package.json                     # Monorepo scripts
```
