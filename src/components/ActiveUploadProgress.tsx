import React, { useState } from 'react';
import { ActiveUpload } from '../types';
import { formatBytes, formatDuration } from '../services/testFileGenerator';
import {
  Pause,
  Play,
  XCircle,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  QrCode,
  HardDriveDownload,
  Zap,
  Globe,
  PlusCircle,
  Layers,
} from 'lucide-react';

interface ActiveUploadProgressProps {
  upload: ActiveUpload;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
  onReset: () => void;
  onShowQr: (url: string, title: string) => void;
  onNavigateToFile: (fileId: string) => void;
}

export const ActiveUploadProgress: React.FC<ActiveUploadProgressProps> = ({
  upload,
  onPause,
  onResume,
  onCancel,
  onReset,
  onShowQr,
  onNavigateToFile,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedDirect, setCopiedDirect] = useState(false);

  const percent =
    upload.fileSize > 0
      ? Math.min(100, Math.round((upload.uploadedBytes / upload.fileSize) * 100))
      : 0;

  const speedMb = upload.speedBps > 0 ? (upload.speedBps / (1024 * 1024)).toFixed(1) : '0.0';

  // Build resolved links
  const defaultHost = typeof window !== 'undefined' ? window.location.host : 'localhost:3000';
  const displayHost = upload.customDomain || defaultHost;
  const fileId = upload.completedFile?.id || upload.id;
  const customShareUrl = `https://${displayHost}/file/${fileId}`;
  const directDownloadUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/download/${fileId}`;

  const copyCustomLink = () => {
    navigator.clipboard.writeText(customShareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const copyDirectLink = () => {
    navigator.clipboard.writeText(directDownloadUrl);
    setCopiedDirect(true);
    setTimeout(() => setCopiedDirect(false), 2000);
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
      {/* Top Banner & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-3">
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center font-semibold text-lg ${
              upload.status === 'completed'
                ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                : upload.status === 'error'
                ? 'bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
            }`}
          >
            {upload.status === 'completed' ? (
              <CheckCircle2 className="w-6 h-6" />
            ) : upload.status === 'error' ? (
              <AlertCircle className="w-6 h-6" />
            ) : (
              <Zap className="w-6 h-6 animate-pulse" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-slate-900 dark:text-white text-base sm:text-lg truncate max-w-md" title={upload.fileName}>
              {upload.fileName}
            </h3>
            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-medium text-slate-700 dark:text-slate-300 font-mono">
                {formatBytes(upload.fileSize)}
              </span>
              <span>•</span>
              <span className="capitalize font-medium">
                {upload.status === 'preparing' && 'Allocating Session...'}
                {upload.status === 'uploading' && `Streaming (${upload.currentChunkIndex + 1}/${upload.totalChunks} chunks)`}
                {upload.status === 'paused' && 'Paused'}
                {upload.status === 'merging' && 'Zero-Memory Disk Assembly...'}
                {upload.status === 'completed' && 'Upload Ready & Verified!'}
                {upload.status === 'error' && 'Transfer Interrupted'}
              </span>
            </div>
          </div>
        </div>

        {/* Upload Controls during transfer */}
        {(upload.status === 'uploading' || upload.status === 'paused') && (
          <div className="flex items-center gap-2">
            {upload.status === 'uploading' ? (
              <button
                onClick={onPause}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 transition"
              >
                <Pause className="w-3.5 h-3.5" /> Pause
              </button>
            ) : (
              <button
                onClick={onResume}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 transition"
              >
                <Play className="w-3.5 h-3.5" /> Resume
              </button>
            )}
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 transition"
            >
              <XCircle className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-2 mb-4">
        <div className="w-full h-3.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
          <div
            className={`h-full rounded-full transition-all duration-200 ${
              upload.status === 'completed'
                ? 'bg-emerald-500 shadow-emerald-500/30'
                : upload.status === 'error'
                ? 'bg-rose-500'
                : 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600'
            }`}
            style={{ width: `${percent}%` }}
          />
        </div>

        {/* Telemetry Metrics Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-slate-400 block text-[11px]">Transferred</span>
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
              {formatBytes(upload.uploadedBytes)} / {formatBytes(upload.fileSize)}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Upload Speed</span>
            <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-500" />
              {upload.status === 'uploading' ? `${speedMb} MB/s` : '--'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Time Remaining</span>
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
              {upload.status === 'uploading' && upload.etaSeconds > 0
                ? formatDuration(upload.etaSeconds)
                : upload.status === 'completed'
                ? 'Completed'
                : '--'}
            </span>
          </div>

          <div>
            <span className="text-slate-400 block text-[11px]">Chunks Processed</span>
            <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-400" />
              {upload.currentChunkIndex + 1} / {upload.totalChunks}
            </span>
          </div>
        </div>
      </div>

      {/* Error View */}
      {upload.status === 'error' && (
        <div className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-800 dark:text-rose-200 flex items-start gap-2 mb-4">
          <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <span className="font-semibold">Upload Failed:</span> {upload.errorMessage}
          </div>
          <button
            onClick={onReset}
            className="px-2 py-1 bg-rose-600 text-white rounded text-[11px] font-medium hover:bg-rose-700"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Completed State Card with Custom Domain Link */}
      {upload.status === 'completed' && upload.completedFile && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
          <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-600" /> Custom Domain Share Link
              </span>
              <span className="text-[11px] bg-emerald-200 dark:bg-emerald-900/80 text-emerald-800 dark:text-emerald-200 px-2 py-0.5 rounded font-mono">
                Accessible globally
              </span>
            </div>

            {/* Custom Domain URL box */}
            <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-800/80 px-3 py-2.5 rounded-lg shadow-xs">
              <span className="font-mono text-xs sm:text-sm font-semibold text-emerald-900 dark:text-emerald-200 flex-1 truncate select-all">
                {customShareUrl}
              </span>
              <button
                onClick={copyCustomLink}
                className="flex items-center gap-1 text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold transition"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy Link
                  </>
                )}
              </button>
            </div>

            <p className="text-[11px] text-emerald-700/80 dark:text-emerald-300/80">
              Anyone with this link can access and download this file directly via{' '}
              <span className="font-mono font-medium">{displayHost}/file/{fileId}</span>.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <button
              onClick={() => onNavigateToFile(upload.completedFile!.id)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
            >
              <ExternalLink className="w-3.5 h-3.5" /> Open Download Page
            </button>

            <button
              onClick={() => onShowQr(customShareUrl, upload.fileName)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
            >
              <QrCode className="w-3.5 h-3.5" /> QR Code
            </button>

            <button
              onClick={copyDirectLink}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition"
            >
              {copiedDirect ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-500" /> Direct Stream URL Copied
                </>
              ) : (
                <>
                  <HardDriveDownload className="w-3.5 h-3.5" /> Direct Stream Link
                </>
              )}
            </button>

            <button
              onClick={onReset}
              className="ml-auto flex items-center gap-1.5 px-3.5 py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl text-xs font-medium transition"
            >
              <PlusCircle className="w-4 h-4" /> Upload Another File
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
