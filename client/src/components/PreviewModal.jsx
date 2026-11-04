import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { api, API_URL } from "../api/http";
import { decryptFileToBlob } from "../crypto/encryption";
import {
  X,
  Download,
  Loader2,
  FileText,
  AlertCircle,
  Shield,
  Eye,
  Lock
} from "lucide-react";

export default function PreviewModal({ file, isOpen, onClose }) {
  const { user, encryptionKey, unlockVault } = useAuth();
  const [decryptedBlob, setDecryptedBlob] = useState(null);
  const [blobUrl, setBlobUrl] = useState(null);
  const [dataUrl, setDataUrl] = useState(null);
  const [imgSrc, setImgSrc] = useState(null);
  const [textContent, setTextContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [unlockPass, setUnlockPass] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState(null);

  const fileId = file?._id || file?.id;

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!unlockPass) return;
    try {
      setUnlocking(true);
      setUnlockError(null);
      await unlockVault(unlockPass);
      setUnlockPass("");
    } catch (err) {
      setUnlockError(err.message || "Failed to unlock vault. Check your password.");
    } finally {
      setUnlocking(false);
    }
  };

  useEffect(() => {
    if (!isOpen || !fileId) {
      setDecryptedBlob(null);
      setBlobUrl(null);
      setDataUrl(null);
      setImgSrc(null);
      setTextContent(null);
      setError(null);
      return;
    }

    if (!encryptionKey) {
      setLoading(false);
      return;
    }

    let isMounted = true;
    let localBlobUrl = null;

    async function loadAndDecrypt() {
      try {
        setLoading(true);
        setError(null);

        // 1. Get download URL & cryptographic metadata
        const meta = await api(`/api/files/${fileId}/download-url`, {
          method: "POST"
        });

        const targetUrl = meta.downloadUrl.startsWith("http")
          ? meta.downloadUrl
          : `${API_URL}${meta.downloadUrl}`;

        // 2. Fetch ciphertext from storage
        const resp = await fetch(targetUrl);
        if (!resp.ok) {
          throw new Error(`Failed to retrieve ciphertext: status ${resp.status}`);
        }
        const ciphertextBuffer = await resp.arrayBuffer();

        // 3. Decrypt on client using Web Crypto API AES-256-GCM
        const blob = await decryptFileToBlob(
          ciphertextBuffer,
          meta.nonce,
          encryptionKey,
          meta.mimeType || "application/octet-stream"
        );

        if (!isMounted) return;

        localBlobUrl = URL.createObjectURL(blob);
        setDecryptedBlob(blob);
        setBlobUrl(localBlobUrl);
        setImgSrc(localBlobUrl);

        // For images, generate Data URL as an ultra-reliable fallback
        const isPhoto = file.category === "photo" || file.mimeType?.startsWith("image/") || meta.mimeType?.startsWith("image/");
        if (isPhoto) {
          const reader = new FileReader();
          reader.onloadend = () => {
            if (isMounted && reader.result) {
              setDataUrl(reader.result);
            }
          };
          reader.readAsDataURL(blob);
        }

        // If it's a text/json/markdown file, also read text
        if (
          file.category === "text" ||
          file.mimeType?.startsWith("text/") ||
          file.originalName?.endsWith(".json") ||
          file.originalName?.endsWith(".md") ||
          file.originalName?.endsWith(".txt") ||
          file.originalName?.endsWith(".js")
        ) {
          const text = await blob.text();
          if (isMounted) setTextContent(text);
        }
      } catch (err) {
        console.error("Decryption error:", err);
        if (isMounted) setError(err.message || "Failed to decrypt file");
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadAndDecrypt();

    return () => {
      isMounted = false;
      if (localBlobUrl) {
        URL.revokeObjectURL(localBlobUrl);
      }
    };
  }, [isOpen, fileId, encryptionKey]);

  if (!isOpen || !file) return null;

  const downloadDecrypted = () => {
    if (!decryptedBlob) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = file.originalName || "decrypted-file";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isImage = file.category === "photo" || file.mimeType?.startsWith("image/");
  const isVideo = file.category === "video" || file.mimeType?.startsWith("video/");
  const isAudio = file.category === "audio" || file.mimeType?.startsWith("audio/");
  const isPdf = file.mimeType === "application/pdf" || file.originalName?.endsWith(".pdf");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden relative">
        {/* Header */}
        <div className="flex items-center justify-between p-4 px-6 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-teal-400" />
            </div>
            <div className="truncate">
              <h3 className="font-bold text-white text-sm truncate">{file.originalName}</h3>
              <p className="text-[11px] text-teal-400 flex items-center space-x-1">
                <Shield className="w-3 h-3" />
                <span>Decrypted in-memory on this device</span>
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={downloadDecrypted}
              disabled={!blobUrl || loading}
              className="px-3 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-semibold text-xs flex items-center space-x-1.5 transition-all shadow-md shadow-teal-500/20"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Save Decrypted</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-6 flex items-center justify-center min-h-[300px] bg-slate-950/40">
          {!encryptionKey && (
            <div className="text-center py-10 max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-3 text-amber-400">
                <Lock className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-white mb-1">Vault Locked</h4>
              <p className="text-xs text-slate-400 mb-4">
                Enter your account password to unlock client-side decryption and preview this file.
              </p>
              <form onSubmit={handleUnlock} className="space-y-3">
                <input
                  type="password"
                  placeholder="Enter your account password..."
                  value={unlockPass}
                  onChange={(e) => setUnlockPass(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
                  autoFocus
                />
                {unlockError && <p className="text-xs text-rose-400">{unlockError}</p>}
                <button
                  type="submit"
                  disabled={unlocking || !unlockPass}
                  className="w-full py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 transition-all"
                >
                  {unlocking ? "Unlocking..." : "Unlock Vault & Preview"}
                </button>
              </form>
            </div>
          )}

          {encryptionKey && loading && (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 text-teal-400 animate-spin mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-200">
                Fetching ciphertext and decrypting locally...
              </p>
              <p className="text-xs text-slate-400 mt-1">
                Zero-Knowledge AES-256-GCM verification
              </p>
            </div>
          )}

          {encryptionKey && error && (
            <div className="text-center py-12 max-w-md">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
              <p className="text-sm font-semibold text-slate-200">Decryption Failed</p>
              <p className="text-xs text-rose-400/90 mt-1">{error}</p>
              <p className="text-xs text-slate-500 mt-2">
                Ensure your encryption passphrase is correct. Tampered ciphertext or wrong keys cannot be decrypted.
              </p>
            </div>
          )}

          {!loading && !error && blobUrl && (
            <div className="w-full flex items-center justify-center">
              {isImage && (
                <div className="flex flex-col items-center justify-center space-y-3 max-w-full">
                  <img
                    src={imgSrc || dataUrl || blobUrl}
                    alt={file.originalName}
                    onError={() => {
                      if (dataUrl && imgSrc !== dataUrl) {
                        setImgSrc(dataUrl);
                      }
                    }}
                    className="max-h-[65vh] max-w-full rounded-xl object-contain shadow-2xl border border-slate-800"
                  />
                  <div className="flex items-center space-x-3 text-xs text-slate-400">
                    <span>{file.originalName}</span>
                    <span>•</span>
                    <button
                      onClick={downloadDecrypted}
                      className="text-teal-400 hover:underline flex items-center space-x-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download decrypted image</span>
                    </button>
                  </div>
                </div>
              )}

              {isVideo && (
                <video
                  controls
                  autoPlay
                  src={blobUrl}
                  className="max-h-[65vh] max-w-full rounded-xl shadow-2xl border border-slate-800"
                />
              )}

              {isAudio && (
                <div className="p-8 rounded-2xl bg-slate-900 border border-slate-800 text-center max-w-md w-full">
                  <div className="w-16 h-16 rounded-full bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto mb-4 text-teal-400">
                    <Eye className="w-8 h-8" />
                  </div>
                  <h4 className="font-semibold text-white mb-4">{file.originalName}</h4>
                  <audio controls src={blobUrl} className="w-full" />
                </div>
              )}

              {textContent !== null && (
                <pre className="w-full max-h-[65vh] p-5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs overflow-auto whitespace-pre-wrap">
                  {textContent}
                </pre>
              )}

              {isPdf && (
                <iframe
                  src={blobUrl}
                  title={file.originalName}
                  className="w-full h-[65vh] rounded-xl border border-slate-800"
                />
              )}

              {!isImage && !isVideo && !isAudio && !isPdf && textContent === null && (
                <div className="text-center py-10">
                  <FileText className="w-12 h-12 text-teal-400 mx-auto mb-3" />
                  <p className="text-sm font-semibold text-slate-200">{file.originalName}</p>
                  <p className="text-xs text-slate-400 mt-1 mb-4">
                    This file format does not support in-browser preview.
                  </p>
                  <button
                    onClick={downloadDecrypted}
                    className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20"
                  >
                    Download Decrypted File
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
