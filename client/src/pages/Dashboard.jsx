import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import { api, API_URL } from "../api/http";
import { decryptFileToBlob } from "../crypto/encryption";
import StorageMeter from "../components/StorageMeter";
import UploadModal from "../components/UploadModal";
import PreviewModal from "../components/PreviewModal";
import NewFolderModal from "../components/NewFolderModal";
import RenameModal from "../components/RenameModal";
import MoveModal from "../components/MoveModal";
import {
  UploadCloud,
  FolderPlus,
  Search,
  Grid,
  List,
  Folder,
  File,
  Image,
  Video,
  Music,
  FileText,
  Code2,
  Archive,
  Download,
  Eye,
  Trash2,
  Edit3,
  FolderSymlink,
  MoreVertical,
  ChevronRight,
  HardDrive,
  RefreshCw,
  Lock,
  ArrowUpDown,
  Filter
} from "lucide-react";

export default function Dashboard() {
  const { user, encryptionKey, storage, refreshStorage } = useAuth();

  const [files, setFiles] = useState([]);
  const [folders, setFolders] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null); // null = root
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, name: "Home" }]);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date_desc");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const [renameItem, setRenameItem] = useState(null); // { item, type }
  const [moveFile, setMoveFile] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  // Fetch files & folders
  const loadContent = useCallback(async () => {
    try {
      setLoading(true);
      const folderParam = currentFolder ? currentFolder._id || currentFolder.id : "root";

      const [filesRes, foldersRes] = await Promise.all([
        api(`/api/files?folderId=${folderParam}${categoryFilter !== "all" ? `&category=${categoryFilter}` : ""}`),
        api(`/api/folders?parentFolderId=${folderParam}`)
      ]);

      setFiles(filesRes.files || []);
      setFolders(foldersRes.folders || []);
    } catch (err) {
      console.error("Failed to load dashboard content:", err);
    } finally {
      setLoading(false);
    }
  }, [currentFolder, categoryFilter]);

  useEffect(() => {
    loadContent();
  }, [loadContent]);

  // Navigate into folder
  const openFolder = (folder) => {
    setCurrentFolder(folder);
    setBreadcrumbs((prev) => [...prev, { id: folder._id || folder.id, name: folder.folderName }]);
  };

  // Navigate via breadcrumb
  const navigateToBreadcrumb = (index) => {
    const target = breadcrumbs[index];
    if (index === 0) {
      setCurrentFolder(null);
      setBreadcrumbs([{ id: null, name: "Home" }]);
    } else {
      setCurrentFolder({ _id: target.id, folderName: target.name });
      setBreadcrumbs(breadcrumbs.slice(0, index + 1));
    }
  };

  // Format file size
  const formatSize = (bytes = 0) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  // File Icon Helper
  const getFileIcon = (category, mimeType = "") => {
    switch (category) {
      case "photo":
        return <Image className="w-5 h-5 text-teal-400" />;
      case "video":
        return <Video className="w-5 h-5 text-cyan-400" />;
      case "audio":
        return <Music className="w-5 h-5 text-purple-400" />;
      case "document":
        return <FileText className="w-5 h-5 text-blue-400" />;
      case "text":
        return <Code2 className="w-5 h-5 text-amber-400" />;
      case "archive":
        return <Archive className="w-5 h-5 text-rose-400" />;
      default:
        return <File className="w-5 h-5 text-slate-400" />;
    }
  };

  // Download and decrypt file directly
  const handleDownload = async (file) => {
    try {
      const meta = await api(`/api/files/${file._id || file.id}/download-url`, { method: "POST" });
      const targetUrl = meta.downloadUrl.startsWith("http")
        ? meta.downloadUrl
        : `${API_URL}${meta.downloadUrl}`;

      const resp = await fetch(targetUrl);
      if (!resp.ok) throw new Error("Download transfer failed");
      const ciphertext = await resp.arrayBuffer();

      const blob = await decryptFileToBlob(ciphertext, meta.nonce, encryptionKey, meta.mimeType);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.originalName || "decrypted-file";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert("Failed to decrypt and download file: " + err.message);
    }
  };

  // Delete file
  const handleDeleteFile = async (file) => {
    if (!window.confirm(`Are you sure you want to permanently delete "${file.originalName}"? This will free up ${formatSize(file.sizeBytes)} from your 2 GB quota.`)) {
      return;
    }

    try {
      await api(`/api/files/${file._id || file.id}`, { method: "DELETE" });
      await refreshStorage();
      loadContent();
    } catch (err) {
      alert("Failed to delete file: " + err.message);
    }
  };

  // Delete folder
  const handleDeleteFolder = async (folder) => {
    if (!window.confirm(`Are you sure you want to delete folder "${folder.folderName}"? Files inside will be moved to Home.`)) {
      return;
    }

    try {
      await api(`/api/folders/${folder._id || folder.id}`, { method: "DELETE" });
      loadContent();
    } catch (err) {
      alert("Failed to delete folder: " + err.message);
    }
  };

  // Filter & Sort
  const filteredFiles = files
    .filter((f) => {
      if (!searchQuery) return true;
      return f.originalName?.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === "name_asc") return a.originalName.localeCompare(b.originalName);
      if (sortBy === "name_desc") return b.originalName.localeCompare(a.originalName);
      if (sortBy === "size_desc") return b.sizeBytes - a.sizeBytes;
      if (sortBy === "size_asc") return a.sizeBytes - b.sizeBytes;
      if (sortBy === "date_asc") return new Date(a.createdAt) - new Date(b.createdAt);
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* 2 GB Quota Storage Meter */}
      <StorageMeter storage={storage} />

      {/* Main Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl backdrop-blur-sm">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs text-slate-400 py-1">
          {breadcrumbs.map((crumb, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
              <button
                onClick={() => navigateToBreadcrumb(idx)}
                className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
                  idx === breadcrumbs.length - 1
                    ? "bg-teal-500/10 text-teal-300 font-bold border border-teal-500/20"
                    : "hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                {idx === 0 && <HardDrive className="w-3.5 h-3.5 text-teal-400" />}
                <span>{crumb.name}</span>
              </button>
            </React.Fragment>
          ))}
        </div>

        {/* Buttons */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => setIsNewFolderOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center space-x-1.5 transition-all"
          >
            <FolderPlus className="w-4 h-4 text-teal-400" />
            <span>New Folder</span>
          </button>

          <button
            onClick={() => setIsUploadOpen(true)}
            className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 flex items-center space-x-1.5 transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Files</span>
          </button>
        </div>
      </div>

      {/* Filter, Search & View Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Categories */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 text-xs font-medium">
          {[
            { id: "all", label: "All Items" },
            { id: "photo", label: "Photos" },
            { id: "video", label: "Videos" },
            { id: "document", label: "Documents" },
            { id: "audio", label: "Audio" },
            { id: "text", label: "Text & Code" }
          ].map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
                categoryFilter === cat.id
                  ? "bg-teal-500 text-slate-950 font-bold shadow-md shadow-teal-500/20"
                  : "bg-slate-900/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search, Sort, Grid toggle */}
        <div className="flex items-center space-x-3">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search encrypted files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition-colors"
            />
          </div>

          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-2.5 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-teal-500"
          >
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
            <option value="name_asc">Name (A-Z)</option>
            <option value="name_desc">Name (Z-A)</option>
            <option value="size_desc">Size (Largest)</option>
            <option value="size_asc">Size (Smallest)</option>
          </select>

          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "grid" ? "bg-teal-500/20 text-teal-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 rounded-lg transition-colors ${
                viewMode === "list" ? "bg-teal-500/20 text-teal-400" : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Folders Section */}
      {folders.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Folders</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {folders.map((folder) => (
              <div
                key={folder._id || folder.id}
                onClick={() => openFolder(folder)}
                className="group relative p-3.5 rounded-xl bg-slate-900/70 hover:bg-slate-800 border border-slate-800/80 hover:border-teal-500/30 transition-all cursor-pointer flex items-center justify-between shadow-sm"
              >
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  <Folder className="w-5 h-5 shrink-0" style={{ color: folder.color || "#0D9488" }} />
                  <span className="text-xs font-semibold text-slate-200 truncate group-hover:text-white">
                    {folder.folderName}
                  </span>
                </div>

                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setRenameItem({ item: folder, type: "folder" });
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-opacity"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Files Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Files ({filteredFiles.length})
          </h3>
          <button
            onClick={loadContent}
            className="text-xs text-slate-500 hover:text-teal-400 flex items-center space-x-1"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Refresh</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <RefreshCw className="w-8 h-8 text-teal-400 animate-spin mx-auto mb-3" />
            <p className="text-xs text-slate-400">Loading your encrypted vault...</p>
          </div>
        ) : filteredFiles.length === 0 ? (
          <div className="text-center py-16 px-4 bg-slate-900/40 border border-dashed border-slate-800 rounded-3xl">
            <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto mb-4 text-teal-400">
              <UploadCloud className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-white mb-1">No files in this folder</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-5">
              Upload photos, videos, documents, or text files. They will be encrypted with AES-256-GCM before leaving your device.
            </p>
            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-teal-500/20 inline-flex items-center space-x-2"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload First File</span>
            </button>
          </div>
        ) : viewMode === "grid" ? (
          /* Grid View */
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredFiles.map((file) => {
              const fileId = file._id || file.id;
              return (
                <div
                  key={fileId}
                  className="group relative bg-slate-900/70 border border-slate-800 hover:border-teal-500/40 rounded-2xl p-4 transition-all hover:shadow-xl hover:shadow-teal-500/5 flex flex-col justify-between"
                >
                  <div>
                    {/* Top row */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700/80 flex items-center justify-center">
                        {getFileIcon(file.category, file.mimeType)}
                      </div>

                      <div className="flex items-center space-x-1">
                        <span className="text-[10px] text-teal-400 font-mono flex items-center space-x-0.5 bg-teal-500/10 px-1.5 py-0.5 rounded border border-teal-500/20">
                          <Lock className="w-2.5 h-2.5" />
                          <span>E2EE</span>
                        </span>
                      </div>
                    </div>

                    {/* File info */}
                    <h4
                      title={file.originalName}
                      className="font-bold text-sm text-slate-100 truncate mb-1 group-hover:text-teal-300 transition-colors"
                    >
                      {file.originalName}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {formatSize(file.sizeBytes)} •{" "}
                      {new Date(file.createdAt).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric"
                      })}
                    </p>
                  </div>

                  {/* Actions bar */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-slate-400">
                    <button
                      onClick={() => setPreviewFile(file)}
                      title="Preview / Decrypt"
                      className="p-1.5 rounded-lg hover:text-teal-400 hover:bg-slate-800 transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(file)}
                      title="Download Decrypted"
                      className="p-1.5 rounded-lg hover:text-teal-400 hover:bg-slate-800 transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setMoveFile(file)}
                      title="Move to Folder"
                      className="p-1.5 rounded-lg hover:text-teal-400 hover:bg-slate-800 transition-colors"
                    >
                      <FolderSymlink className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setRenameItem({ item: file, type: "file" })}
                      title="Rename"
                      className="p-1.5 rounded-lg hover:text-teal-400 hover:bg-slate-800 transition-colors"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteFile(file)}
                      title="Delete (Frees 2 GB Quota)"
                      className="p-1.5 rounded-lg hover:text-rose-400 hover:bg-slate-800 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* List View */
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/70 border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Size</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Date Uploaded</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredFiles.map((file) => {
                  const fileId = file._id || file.id;
                  return (
                    <tr key={fileId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 flex items-center space-x-3">
                        {getFileIcon(file.category, file.mimeType)}
                        <span className="font-semibold text-slate-100 truncate max-w-xs sm:max-w-md">
                          {file.originalName}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">{formatSize(file.sizeBytes)}</td>
                      <td className="py-3 px-4 capitalize text-slate-400">{file.category}</td>
                      <td className="py-3 px-4 text-slate-400">
                        {new Date(file.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end space-x-1.5 text-slate-400">
                          <button
                            onClick={() => setPreviewFile(file)}
                            className="p-1.5 rounded hover:text-teal-400 hover:bg-slate-800"
                            title="Preview"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDownload(file)}
                            className="p-1.5 rounded hover:text-teal-400 hover:bg-slate-800"
                            title="Download"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setMoveFile(file)}
                            className="p-1.5 rounded hover:text-teal-400 hover:bg-slate-800"
                            title="Move"
                          >
                            <FolderSymlink className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setRenameItem({ item: file, type: "file" })}
                            className="p-1.5 rounded hover:text-teal-400 hover:bg-slate-800"
                            title="Rename"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteFile(file)}
                            className="p-1.5 rounded hover:text-rose-400 hover:bg-slate-800"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        folderId={currentFolder ? currentFolder._id || currentFolder.id : null}
        onUploadComplete={loadContent}
      />

      <NewFolderModal
        isOpen={isNewFolderOpen}
        onClose={() => setIsNewFolderOpen(false)}
        parentFolderId={currentFolder ? currentFolder._id || currentFolder.id : null}
        onCreated={loadContent}
      />

      <PreviewModal
        isOpen={Boolean(previewFile)}
        file={previewFile}
        onClose={() => setPreviewFile(null)}
      />

      <RenameModal
        isOpen={Boolean(renameItem)}
        item={renameItem?.item}
        type={renameItem?.type}
        onClose={() => setRenameItem(null)}
        onRenamed={loadContent}
      />

      <MoveModal
        isOpen={Boolean(moveFile)}
        file={moveFile}
        folders={folders}
        onClose={() => setMoveFile(null)}
        onMoved={loadContent}
      />
    </div>
  );
}
