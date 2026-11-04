import React, { useState } from "react";
import { api } from "../api/http";
import { FolderPlus, X, Loader2 } from "lucide-react";

export default function NewFolderModal({ parentFolderId, isOpen, onClose, onCreated }) {
  const [folderName, setFolderName] = useState("");
  const [color, setColor] = useState("#0D9488");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const colors = [
    { name: "Teal", hex: "#0D9488" },
    { name: "Cyan", hex: "#06B6D4" },
    { name: "Indigo", hex: "#6366F1" },
    { name: "Emerald", hex: "#10B981" },
    { name: "Amber", hex: "#F59E0B" },
    { name: "Rose", hex: "#F43F5E" },
    { name: "Purple", hex: "#A855F7" }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!folderName.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await api("/api/folders", {
        method: "POST",
        body: JSON.stringify({
          folderName: folderName.trim(),
          parentFolderId: parentFolderId || null,
          color
        })
      });

      setFolderName("");
      if (onCreated) onCreated();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to create folder");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center">
              <FolderPlus className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">New Folder</h3>
              <p className="text-xs text-slate-400">Organize your encrypted storage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Folder Name</label>
            <input
              type="text"
              autoFocus
              placeholder="e.g. Work Documents, Family Photos..."
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">Folder Color</label>
            <div className="flex items-center space-x-2.5">
              {colors.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  onClick={() => setColor(c.hex)}
                  className={`w-7 h-7 rounded-full transition-transform ${
                    color === c.hex ? "scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900" : "hover:scale-110"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !folderName.trim()}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 transition-all flex items-center space-x-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Create Folder</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
