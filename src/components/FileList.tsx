import React, { useState } from 'react';
import { FileMetadata } from '../types';
import { formatBytes } from '../services/testFileGenerator';
import {
  FileText,
  FileVideo,
  FileAudio,
  FileArchive,
  FileCode,
  File as GenericFile,
  Copy,
  Check,
  Trash2,
  Download,
  ExternalLink,
  QrCode,
  Lock,
  Clock,
  Eye,
  Search,
  Globe,
  HardDrive,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

interface FileListProps {
  files: FileMetadata[];
  onDeleteFile: (fileId: string) => Promise<void>;
  onNavigateToFile: (fileId: string) => void;
  onShowQr: (url: string, title: string) => void;
  defaultDomain: string;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  onDeleteFile,
  onNavigateToFile,
  onShowQr,
  defaultDomain,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const getFileIcon = (mimeType: string, name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (mimeType.startsWith('video/') || ['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext || '')) {
      return <FileVideo className="w-5 h-5 text-purple-500" />;
    }
    if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext || '')) {
      return <FileAudio className="w-5 h-5 text-amber-500" />;
    }
    if (
      mimeType.includes('zip') ||
      mimeType.includes('compressed') ||
      mimeType.includes('tar') ||
      ['zip', 'rar', 'tar', 'gz', '7z', 'iso'].includes(ext || '')
    ) {
      return <FileArchive className="w-5 h-5 text-rose-500" />;
    }
    if (['js', 'ts', 'tsx', 'jsx', 'json', 'html', 'css', 'py', 'go', 'rs'].includes(ext || '')) {
      return <FileCode className="w-5 h-5 text-emerald-500" />;
    }
    if (mimeType.startsWith('text/') || ['pdf', 'doc', 'docx', 'txt', 'md'].includes(ext || '')) {
      return <FileText className="w-5 h-5 text-blue-500" />;
    }
    return <GenericFile className="w-5 h-5 text-indigo-500" />;
  };

  const filteredFiles = files.filter((f) =>
    f.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    f.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleCopyLink = (file: FileMetadata) => {
    const host = file.customDomain || defaultDomain || window.location.host;
    const url = `https://${host}/file/${file.id}`;
    navigator.clipboard.writeText(url);
    setCopiedId(file.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = async (fileId: string) => {
    if (!confirm('Are you sure you want to delete this shared file? The link will immediately stop working.')) {
      return;
    }
    setDeletingId(fileId);
    try {
      await onDeleteFile(fileId);
    } catch (err) {
      console.error(err);
    } finally {
      setDeletingId(null);
    }
  };

  const formatExpiry = (expiresAt: number | null) => {
    if (!expiresAt) return 'Never expires';
    const now = Date.now();
    const diff = expiresAt - now;
    if (diff <= 0) return 'Expired';
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    if (days > 0) return `Expires in ${days}d ${hours}h`;
    return `Expires in ${hours}h`;
  };

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-indigo-500" />
            <span>Shared Files Repository</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
              {files.length}
            </span>
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Manage links, monitor downloads, and customize domains
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search files or IDs..."
            className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {files.length === 0 ? (
        <div className="py-12 text-center text-slate-400">
          <HardDrive className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
            No files uploaded yet
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Upload your first multi-gigabyte file above to generate custom domain links!
          </p>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="py-8 text-center text-slate-400 text-xs">
          No files matching "{searchTerm}"
        </div>
      ) : (
        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {filteredFiles.map((file) => {
            const host = file.customDomain || defaultDomain || window.location.host;
            const customLink = `https://${host}/file/${file.id}`;
            const isGigabyte = file.fileSize >= 1024 * 1024 * 1024;

            return (
              <div
                key={file.id}
                className="py-4 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 rounded-xl px-2 transition"
              >
                {/* File info */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                    {getFileIcon(file.mimeType, file.originalName)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        onClick={() => onNavigateToFile(file.id)}
                        className="font-bold text-sm text-slate-900 dark:text-white truncate cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition"
                        title={file.originalName}
                      >
                        {file.originalName}
                      </span>
                      {isGigabyte && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                          1GB+
                        </span>
                      )}
                      {file.hasPassword && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" /> Password
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-1 flex-wrap">
                      <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                        {formatBytes(file.fileSize)}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Download className="w-3 h-3" /> {file.downloadCount} downloads
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {formatExpiry(file.expiresAt)}
                      </span>
                    </div>

                    {/* Custom Domain Preview */}
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <Globe className="w-3 h-3 text-indigo-500 shrink-0" />
                      <span className="text-[11px] font-mono text-indigo-600 dark:text-indigo-400 truncate">
                        {customLink}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
                  <button
                    onClick={() => handleCopyLink(file)}
                    title="Copy custom domain share link"
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition"
                  >
                    {copiedId === file.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-500" /> Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Copy Link
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onShowQr(customLink, file.originalName)}
                    title="Scan QR Code"
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-lg transition"
                  >
                    <QrCode className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onNavigateToFile(file.id)}
                    title="Open Download Landing Page"
                    className="p-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/50 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 rounded-lg transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>

                  <a
                    href={`/api/download/${file.id}`}
                    download={file.originalName}
                    title="Direct Download"
                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 rounded-lg transition"
                  >
                    <Download className="w-4 h-4" />
                  </a>

                  <button
                    disabled={deletingId === file.id}
                    onClick={() => handleDelete(file.id)}
                    title="Delete file"
                    className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-slate-400 hover:text-rose-600 rounded-lg transition disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
