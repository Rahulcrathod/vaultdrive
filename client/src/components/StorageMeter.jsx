import React from "react";
import { Image, Video, Music, FileText, Code2, Archive, FolderArchive, Shield } from "lucide-react";

export default function StorageMeter({ storage }) {
  const formatBytes = (bytes = 0) => {
    if (bytes === 0) return "0 MB";
    const mb = bytes / (1024 * 1024);
    if (mb < 1024) return `${mb.toFixed(1)} MB`;
    return `${(mb / 1024).toFixed(2)} GB`;
  };

  const total = storage?.quotaBytes || 2147483648;
  const used = storage?.usedBytes || 0;
  const reserved = storage?.reservedBytes || 0;
  const available = Math.max(0, total - (used + reserved));
  const percent = Math.min(100, Number(((used / total) * 100).toFixed(1)));

  const cats = storage?.categories || {};
  const photoBytes = cats.photo?.bytes || 0;
  const videoBytes = cats.video?.bytes || 0;
  const audioBytes = cats.audio?.bytes || 0;
  const docBytes = cats.document?.bytes || 0;
  const textBytes = cats.text?.bytes || 0;
  const otherBytes = (cats.archive?.bytes || 0) + (cats.other?.bytes || 0);

  const getPercent = (b) => (total > 0 ? ((b / total) * 100).toFixed(1) : 0);

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 shadow-xl backdrop-blur-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-bold text-white tracking-tight">Personal Cloud Storage</h2>
            <span className="inline-flex items-center space-x-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <Shield className="w-3 h-3" />
              <span>2.0 GB Guaranteed</span>
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Backend-enforced atomic quota with client-side zero-knowledge encryption
          </p>
        </div>

        <div className="text-left sm:text-right">
          <div className="text-2xl font-black text-white tracking-tight">
            {formatBytes(used)}{" "}
            <span className="text-xs font-normal text-slate-400">/ {formatBytes(total)}</span>
          </div>
          <p className="text-xs text-teal-400 font-medium">
            {formatBytes(available)} available ({100 - percent}% free)
          </p>
        </div>
      </div>

      {/* Multi-segment Progress Bar */}
      <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden p-0.5 border border-slate-800 flex">
        {photoBytes > 0 && (
          <div
            title={`Photos: ${formatBytes(photoBytes)}`}
            className="h-full bg-teal-400 rounded-l-full transition-all duration-300"
            style={{ width: `${getPercent(photoBytes)}%` }}
          />
        )}
        {videoBytes > 0 && (
          <div
            title={`Videos: ${formatBytes(videoBytes)}`}
            className="h-full bg-cyan-400 transition-all duration-300"
            style={{ width: `${getPercent(videoBytes)}%` }}
          />
        )}
        {docBytes > 0 && (
          <div
            title={`Documents: ${formatBytes(docBytes)}`}
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${getPercent(docBytes)}%` }}
          />
        )}
        {audioBytes > 0 && (
          <div
            title={`Audio: ${formatBytes(audioBytes)}`}
            className="h-full bg-purple-500 transition-all duration-300"
            style={{ width: `${getPercent(audioBytes)}%` }}
          />
        )}
        {textBytes > 0 && (
          <div
            title={`Text & Code: ${formatBytes(textBytes)}`}
            className="h-full bg-amber-400 transition-all duration-300"
            style={{ width: `${getPercent(textBytes)}%` }}
          />
        )}
        {otherBytes > 0 && (
          <div
            title={`Archives & Other: ${formatBytes(otherBytes)}`}
            className="h-full bg-slate-500 rounded-r-full transition-all duration-300"
            style={{ width: `${getPercent(otherBytes)}%` }}
          />
        )}
      </div>

      {/* Category Legends */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mt-4 pt-4 border-t border-slate-800/60 text-xs">
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-teal-400" />
          <span className="text-slate-400">Photos:</span>
          <span className="font-semibold text-slate-200">{formatBytes(photoBytes)}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
          <span className="text-slate-400">Videos:</span>
          <span className="font-semibold text-slate-200">{formatBytes(videoBytes)}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
          <span className="text-slate-400">Documents:</span>
          <span className="font-semibold text-slate-200">{formatBytes(docBytes)}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-500" />
          <span className="text-slate-400">Audio:</span>
          <span className="font-semibold text-slate-200">{formatBytes(audioBytes)}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="text-slate-400">Text/Code:</span>
          <span className="font-semibold text-slate-200">{formatBytes(textBytes)}</span>
        </div>
        <div className="flex items-center space-x-2">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
          <span className="text-slate-400">Other:</span>
          <span className="font-semibold text-slate-200">{formatBytes(otherBytes)}</span>
        </div>
      </div>
    </div>
  );
}
