import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  ShieldCheck,
  HardDrive,
  Lock,
  Zap,
  FolderTree,
  FileCheck,
  ArrowRight,
  Sparkles,
  Key,
  Database
} from "lucide-react";

export default function Landing() {
  const { user } = useAuth();

  return (
    <div className="relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-teal-500/15 to-emerald-500/10 rounded-full blur-[140px] pointer-events-none" />

      {/* Hero Section */}
      <section className="relative pt-20 pb-24 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-slate-900 border border-teal-500/30 text-teal-300 text-xs font-semibold mb-6 shadow-lg shadow-teal-500/5 animate-fade-in">
          <Sparkles className="w-4 h-4 text-teal-400" />
          <span>Public Registration Open • Free 2 GB Private Storage</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight sm:leading-none mb-6">
          Zero-Knowledge Cloud Storage.{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-emerald-300">
            Encrypted by You.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed mb-10">
          Store your photos, videos, confidential documents, and text files with client-side{" "}
          <strong className="text-teal-400">AES-256-GCM encryption</strong>. Every registered user receives a guaranteed{" "}
          <strong className="text-white">2 GB storage quota</strong> where the server never sees your unencrypted data.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          {user ? (
            <Link
              to="/dashboard"
              className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-xl shadow-teal-500/25 transition-all flex items-center justify-center space-x-2"
            >
              <span>Go to Your Vault Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link
                to="/register"
                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-xl shadow-teal-500/25 transition-all flex items-center justify-center space-x-2"
              >
                <span>Claim Your 2 GB Vault</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/login"
                className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-200 font-semibold text-sm border border-slate-800 transition-colors"
              >
                Sign In to Vault
              </Link>
            </>
          )}
        </div>

        {/* Highlight Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16 max-w-4xl mx-auto text-left">
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 mb-2">
              <HardDrive className="w-4 h-4" />
            </div>
            <div className="text-xl font-black text-white">2.0 GiB</div>
            <div className="text-xs text-slate-400">Quota Per Account</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 mb-2">
              <Lock className="w-4 h-4" />
            </div>
            <div className="text-xl font-black text-white">AES-256</div>
            <div className="text-xs text-slate-400">Web Crypto E2EE</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 mb-2">
              <Key className="w-4 h-4" />
            </div>
            <div className="text-xl font-black text-white">Zero-Knowledge</div>
            <div className="text-xs text-slate-400">Keys Stay on Device</div>
          </div>
          <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800">
            <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400 mb-2">
              <Database className="w-4 h-4" />
            </div>
            <div className="text-xl font-black text-white">Atomic Quota</div>
            <div className="text-xs text-slate-400">Concurrency-Safe</div>
          </div>
        </div>
      </section>

      {/* Security Architecture Section */}
      <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto border-t border-slate-800/80">
        <div className="text-center mb-12">
          <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            How VaultDrive Protects Your Files
          </h2>
          <p className="text-sm text-slate-400 mt-2 max-w-xl mx-auto">
            Traditional cloud drives hold the keys to your files. VaultDrive uses client-side encryption so that only you have access.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-4">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">1. In-Browser Encryption</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Before uploading, your browser generates an AES-256-GCM cipher with a fresh initialization vector. Plaintext never leaves your computer.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-teal-400 font-mono">
              Web Crypto API • PBKDF2 100k
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-4">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">2. Atomic 2 GB Quota</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                The backend reserves bytes atomically in MongoDB before upload intent is granted. Quota limits are enforced at the server API level.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-teal-400 font-mono">
              2,147,483,648 bytes • Race-Free
            </div>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col justify-between">
            <div>
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center text-teal-400 mb-4">
                <FileCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white mb-2">3. Local Decryption & Preview</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                When you download or preview a photo, video, or document, ciphertext is pulled and decrypted entirely inside your browser tab memory.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/60 text-[11px] text-teal-400 font-mono">
              Instant In-Memory Decrypt
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-8 text-center text-xs text-slate-500">
        <p>VaultDrive © 2026 • High-Security Personal Cloud Storage • 2 GB per account</p>
      </footer>
    </div>
  );
}
