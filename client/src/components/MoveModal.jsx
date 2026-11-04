import React, { useState } from "react";
import { api } from "../api/http";
import { FolderSymlink, X, Loader2, Folder, HardDrive } from "lucide-react";

export default function MoveModal({ file, folders, isOpen, onClose, onMoved }) {
  const [selectedFolderId, setSelectedFolderId] = useState(file?.folderId || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen || !file) return null;

  const handleMove = async () => {
    try {
      setLoading(true);
      setError(null);
      await api(`/api/files/${file._id || file.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          folderId: selectedFolderId === "" || selectedFolderId === "root" ? null : selectedFolderId
        })
      });

      if (onMoved) onMoved();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to move file");
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
              <FolderSymlink className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">Move File</h3>
              <p className="text-xs text-slate-400 truncate max-w-[240px]">{file.originalName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
            {error}
          </div>
        )}

        <div className="mt-4 space-y-2 max-h-60 overflow-y-auto pr-1">
          {/* Root option */}
          <button
            type="button"
            onClick={() => setSelectedFolderId("")}
            className={`w-full flex items-center space-x-3 p-3 rounded-xl border text-xs text-left transition-all ${
              selectedFolderId === "" || selectedFolderId === "root"
                ? "bg-teal-500/10 border-teal-500/30 text-teal-300 font-semibold"
                : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
            }`}
          >
            <HardDrive className="w-4 h-4 text-teal-400 shrink-0" />
            <span>Root Vault (Home)</span>
          </button>

          {/* Folder options */}
          {folders.map((f) => {
            const isSelected = selectedFolderId === (f._id || f.id);
            return (
              <button
                key={f._id || f.id}
                type="button"
                onClick={() => setSelectedFolderId(f._id || f.id)}
                className={`w-full flex items-center space-x-3 p-3 rounded-xl border text-xs text-left transition-all ${
                  isSelected
                    ? "bg-teal-500/10 border-teal-500/30 text-teal-300 font-semibold"
                    : "bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700"
                }`}
              >
                <Folder className="w-4 h-4 shrink-0" style={{ color: f.color || "#0D9488" }} />
                <span className="truncate">{f.folderName}</span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-end space-x-3 pt-4 mt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleMove}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 transition-all flex items-center space-x-1.5"
          >
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Move Here</span>
          </button>
        </div>
      </div>
    </div>
  );
}
