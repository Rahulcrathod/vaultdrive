import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ShieldCheck, HardDrive, LogOut, User, Lock, Sparkles } from "lucide-react";

export default function Navbar() {
  const { user, storage, logout, hasKey } = useAuth();

  const formatSize = (bytes = 0) => {
    if (bytes === 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  const used = storage?.usedBytes || user?.usedBytes || 0;
  const total = storage?.quotaBytes || user?.quotaBytes || 2147483648;
  const pct = Math.min(100, Math.round((used / total) * 100));

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-500 to-emerald-400 p-0.5 shadow-lg shadow-teal-500/20 group-hover:shadow-teal-500/30 transition-all">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-teal-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <span className="font-bold text-lg text-white tracking-tight">VaultDrive</span>
              <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 bg-teal-500/10 text-teal-400 border border-teal-500/20 rounded">
                E2EE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">Zero-Knowledge Cloud Storage</p>
          </div>
        </Link>

        {/* Center / Right controls */}
        {user ? (
          <div className="flex items-center space-x-4 sm:space-x-6">
            {/* Encryption status pill */}
            <div className="hidden md:flex items-center space-x-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs text-slate-300">
              <div className={`w-2 h-2 rounded-full ${hasKey ? "bg-emerald-400 animate-pulse" : "bg-amber-400"}`} />
              <span className="font-medium text-slate-300">
                {hasKey ? "Client AES-256-GCM Active" : "Key locked"}
              </span>
            </div>

            {/* Storage indicator */}
            <div className="hidden lg:flex flex-col items-end text-xs">
              <div className="flex items-center space-x-2 text-slate-400 mb-1">
                <HardDrive className="w-3.5 h-3.5 text-teal-400" />
                <span>
                  <strong className="text-slate-200">{formatSize(used)}</strong> of {formatSize(total)}
                </span>
                <span className="text-[11px] text-teal-400 font-medium">({pct}%)</span>
              </div>
              <div className="w-36 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-teal-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(pct, 2)}%` }}
                />
              </div>
            </div>

            {/* User badge */}
            <div className="flex items-center space-x-3 pl-2 border-l border-slate-800">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-800 to-slate-700 border border-slate-600 flex items-center justify-center text-teal-400 font-semibold text-sm uppercase">
                {user.username ? user.username[0] : "U"}
              </div>
              <div className="hidden sm:block text-left text-xs">
                <p className="font-semibold text-slate-200">{user.username}</p>
                <p className="text-slate-500 truncate max-w-[120px]">{user.email}</p>
              </div>

              <button
                onClick={logout}
                title="Sign Out"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center space-x-3 text-sm">
            <Link
              to="/login"
              className="text-slate-300 hover:text-white px-3 py-1.5 font-medium transition-colors"
            >
              Log In
            </Link>
            <Link
              to="/register"
              className="px-4 py-2 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 font-semibold shadow-md shadow-teal-500/20 transition-all flex items-center space-x-1.5"
            >
              <Sparkles className="w-4 h-4" />
              <span>Get 2 GB Free</span>
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
