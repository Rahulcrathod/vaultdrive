import React, { useState, useEffect } from "react";
import { api } from "../api/http";
import { Edit3, X, Loader2 } from "lucide-react";

export default function RenameModal({ item, type, isOpen, onClose, onRenamed }) {
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (item) {
      setName(type === "folder" ? item.folderName : item.originalName);
    }
  }, [item, type]);

  if (!isOpen || !item) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      setError(null);

      if (type === "folder") {
        await api(`/api/folders/${item._id || item.id}`, {
          method: "PATCH",
          body: JSON.stringify({ folderName: name.trim() })
        });
      } else {
        await api(`/api/files/${item._id || item.id}`, {
          method: "PATCH",
          body: JSON.stringify({ originalName: name.trim() })
        });
      }

      if (onRenamed) onRenamed();
      onClose();
    } catch (err) {
      setError(err.message || "Failed to rename");
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
              <Edit3 className="w-5 h-5 text-teal-400" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base">
                Rename {type === "folder" ? "Folder" : "File"}
              </h3>
              <p className="text-xs text-slate-400">Update item display name</p>
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
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">New Name</label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
            />
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
              disabled={loading || !name.trim()}
              className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 disabled:opacity-50 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 transition-all flex items-center space-x-1.5"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              <span>Save Name</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
