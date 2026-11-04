import React, { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { api, API_URL } from "../api/http";
import { encryptFile, encryptText } from "../crypto/encryption";
import {
  UploadCloud,
  X,
  File,
  Lock,
  CheckCircle,
  AlertCircle,
  Loader2,
  HardDrive
} from "lucide-react";

export default function UploadModal({ folderId, isOpen, onClose, onUploadComplete }) {
  const { encryptionKey, storage, refreshStorage } = useAuth();
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({}); // { [filename]: { step, percent, error } }
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const formatSize = (bytes) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const handleFiles = (files) => {
    const list = Array.from(files);
    setSelectedFiles((prev) => [...prev, ...list]);
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const startUpload = async () => {
    if (!encryptionKey) {
      alert("Encryption key not unlocked. Please re-enter your encryption passphrase.");
      return;
    }

    if (selectedFiles.length === 0) return;

    setIsUploading(true);

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const filename = file.name;

      try {
        // Step 1: Encrypting
        setUploadProgress((p) => ({
          ...p,
          [filename]: { step: "encrypting", msg: "Encrypting with AES-256-GCM locally...", percent: 20 }
        }));

        const { encryptedBlob, nonce, sizeBytes } = await encryptFile(file, encryptionKey);

        // Step 2: Quota reservation
        setUploadProgress((p) => ({
          ...p,
          [filename]: { step: "reserving", msg: "Reserving quota with server...", percent: 40 }
        }));

        // Encrypt the filename for zero-knowledge storage
        const { ciphertextBase64: nameCiphertext } = await encryptText(file.name, encryptionKey);

        const intentRes = await api("/api/files/upload-intent", {
          method: "POST",
          body: JSON.stringify({
            sizeBytes,
            nameCiphertext,
            originalName: file.name,
            mimeType: file.type || "application/octet-stream",
            folderId: folderId || null
          })
        });

        const { reservationId, objectKey, uploadUrl, uploadType } = intentRes;

        // Step 3: Uploading ciphertext
        setUploadProgress((p) => ({
          ...p,
          [filename]: { step: "uploading", msg: "Uploading ciphertext...", percent: 70 }
        }));

        // Handle target URL (relative or absolute)
        const finalUrl = uploadUrl.startsWith("http") ? uploadUrl : `${API_URL}${uploadUrl}`;

        const uploadRes = await fetch(finalUrl, {
          method: "PUT",
          body: encryptedBlob,
          headers: {
            "Content-Type": file.type || "application/octet-stream"
          }
        });

        if (!uploadRes.ok) {
          throw new Error(`Upload transfer failed with status ${uploadRes.status}`);
        }

        // Step 4: Finalizing
        setUploadProgress((p) => ({
          ...p,
          [filename]: { step: "completing", msg: "Verifying and committing quota...", percent: 90 }
        }));

        await api("/api/files/complete", {
          method: "POST",
          body: JSON.stringify({
            reservationId,
            objectKey,
            nameCiphertext,
            originalName: file.name,
            sizeBytes,
            mimeType: file.type || "application/octet-stream",
            nonce,
            folderId: folderId || null
          })
        });

        setUploadProgress((p) => ({
          ...p,
          [filename]: { step: "done", msg: "Securely uploaded and encrypted!", percent: 100 }
        }));
      } catch (err) {
        console.error("Upload error for", filename, err);
        setUploadProgress((p) => ({
          ...p,
          [filename]: { step: "error", msg: err.message || "Upload failed", percent: 0 }
        }));
      }
    }

    setIsUploading(false);
    await refreshStorage();
    if (onUploadComplete) onUploadComplete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-xl p-6 shadow-2xl relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
              <UploadCloud className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Upload Files to Vault</h3>
              <p className="text-xs text-slate-400">Zero-Knowledge AES-256 Client Encryption</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dropzone */}
        <div
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`mt-4 border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragActive
              ? "border-teal-400 bg-teal-500/5"
              : "border-slate-700 hover:border-slate-600 bg-slate-950/50"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-3 text-teal-400">
            <Lock className="w-6 h-6" />
          </div>
          <p className="text-sm font-semibold text-slate-200">
            Drag and drop files here, or <span className="text-teal-400 hover:underline">browse</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Photos, Videos, Documents, Audio, Text (up to 2 GB total quota)
          </p>
        </div>

        {/* Selected files list */}
        {selectedFiles.length > 0 && (
          <div className="mt-4 max-h-52 overflow-y-auto space-y-2 pr-1">
            {selectedFiles.map((file, idx) => {
              const status = uploadProgress[file.name];
              return (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-xs"
                >
                  <div className="flex items-center space-x-3 overflow-hidden flex-1 mr-3">
                    <File className="w-4 h-4 text-slate-400 shrink-0" />
                    <div className="truncate">
                      <p className="font-medium text-slate-200 truncate">{file.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {formatSize(file.size)}{" "}
                        {status && <span className="text-teal-400 ml-2">• {status.msg}</span>}
                      </p>
                    </div>
                  </div>

                  {status ? (
                    <div>
                      {status.step === "done" && (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      )}
                      {status.step === "error" && (
                        <AlertCircle className="w-5 h-5 text-rose-400" />
                      )}
                      {status.step !== "done" && status.step !== "error" && (
                        <Loader2 className="w-5 h-5 text-teal-400 animate-spin" />
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(idx);
                      }}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="flex items-center space-x-1.5 text-xs text-slate-400">
            <Lock className="w-3.5 h-3.5 text-teal-400" />
            <span>Files are encrypted before leaving your browser</span>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              disabled={isUploading}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              {Object.values(uploadProgress).some((s) => s.step === "done") ? "Done" : "Cancel"}
            </button>
            <button
              onClick={startUpload}
              disabled={isUploading || selectedFiles.length === 0}
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 transition-all flex items-center space-x-2"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Encrypting & Uploading...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Encrypt & Upload ({selectedFiles.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
