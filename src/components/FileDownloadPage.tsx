import React, { useEffect, useState } from 'react';
import { FileMetadata } from '../types';
import { fetchFileDetails, verifyPassword } from '../services/api';
import { formatBytes } from '../services/testFileGenerator';
import {
  Download,
  ShieldCheck,
  Lock,
  ArrowLeft,
  FileVideo,
  FileAudio,
  FileArchive,
  FileText,
  FileCode,
  File as GenericFile,
  Copy,
  Check,
  QrCode,
  Globe,
  Clock,
  HardDrive,
  AlertCircle,
  Eye,
  Zap,
  CheckCircle2,
} from 'lucide-react';

interface FileDownloadPageProps {
  fileId: string;
  defaultDomain: string;
  onNavigateHome: () => void;
  onShowQr: (url: string, title: string) => void;
}

export const FileDownloadPage: React.FC<FileDownloadPageProps> = ({
  fileId,
  defaultDomain,
  onNavigateHome,
  onShowQr,
}) => {
  const [file, setFile] = useState<FileMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Password state
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  // Download state
  const [copiedLink, setCopiedLink] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    fetchFileDetails(fileId)
      .then((data) => {
        if (!isMounted) return;
        setFile(data);
        if (!data.hasPassword) {
          setIsUnlocked(true);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || 'File not found or expired');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [fileId]);

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setVerifying(true);
    setPasswordError(null);

    try {
      const verified = await verifyPassword(fileId, passwordInput);
      if (verified) {
        setIsUnlocked(true);
      } else {
        setPasswordError('Incorrect password. Please try again.');
      }
    } catch (err: any) {
      setPasswordError(err.message || 'Incorrect password');
    } finally {
      setVerifying(false);
    }
  };

  const getFileIcon = (mimeType: string, name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (mimeType.startsWith('video/') || ['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext || '')) {
      return <FileVideo className="w-10 h-10 text-purple-500" />;
    }
    if (mimeType.startsWith('audio/') || ['mp3', 'wav', 'flac', 'aac', 'ogg'].includes(ext || '')) {
      return <FileAudio className="w-10 h-10 text-amber-500" />;
    }
    if (
      mimeType.includes('zip') ||
      mimeType.includes('compressed') ||
      ['zip', 'rar', 'tar', 'gz', '7z', 'iso'].includes(ext || '')
    ) {
      return <FileArchive className="w-10 h-10 text-rose-500" />;
    }
    if (['js', 'ts', 'tsx', 'json', 'html', 'py', 'go'].includes(ext || '')) {
      return <FileCode className="w-10 h-10 text-emerald-500" />;
    }
    if (mimeType.startsWith('text/') || ['pdf', 'doc', 'txt'].includes(ext || '')) {
      return <FileText className="w-10 h-10 text-blue-500" />;
    }
    return <GenericFile className="w-10 h-10 text-indigo-500" />;
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6">
        <div className="w-12 h-12 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin mb-4" />
        <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
          Resolving file metadata...
        </p>
      </div>
    );
  }

  if (error || !file) {
    return (
      <div className="max-w-lg mx-auto my-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-xl">
        <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
          File Unavailable
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
          {error || 'The requested file does not exist, has expired, or was removed by the owner.'}
        </p>
        <button
          onClick={onNavigateHome}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
        >
          <ArrowLeft className="w-4 h-4" /> Return to DropGig Home
        </button>
      </div>
    );
  }

  const host = file.customDomain || defaultDomain || (typeof window !== 'undefined' ? window.location.host : '');
  const customShareUrl = `https://${host}/file/${file.id}`;
  const downloadUrl = `/api/download/${file.id}${passwordInput ? `?pwd=${encodeURIComponent(passwordInput)}` : ''}`;
  const inlinePreviewUrl = `${downloadUrl}${downloadUrl.includes('?') ? '&' : '?'}inline=true`;
  const isGigabyte = file.fileSize >= 1024 * 1024 * 1024;
  const isVideo = file.mimeType.startsWith('video/') || file.originalName.endsWith('.mp4');
  const isAudio = file.mimeType.startsWith('audio/') || file.originalName.endsWith('.mp3');

  const copyCustomLink = () => {
    navigator.clipboard.writeText(customShareUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto my-6 px-4">
      {/* Return button */}
      <button
        onClick={onNavigateHome}
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 mb-6 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dashboard
      </button>

      {/* Main Download Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Password Prompt Screen */}
        {file.hasPassword && !isUnlocked ? (
          <div className="max-w-md mx-auto text-center py-6">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Password Protected File
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
              The owner of <span className="font-semibold text-slate-700 dark:text-slate-300">{file.originalName}</span> has restricted access with a password.
            </p>

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter access password..."
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {passwordError && (
                  <p className="text-xs text-rose-500 mt-2 text-left">{passwordError}</p>
                )}
              </div>

              <button
                type="submit"
                disabled={verifying}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 disabled:opacity-50 transition"
              >
                {verifying ? 'Verifying...' : 'Unlock & Access File'}
              </button>
            </form>
          </div>
        ) : (
          /* File Download View */
          <div>
            {/* Top file identity */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-5 pb-6 border-b border-slate-100 dark:border-slate-800">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-50 dark:bg-slate-800 flex items-center justify-center shrink-0 shadow-inner">
                {getFileIcon(file.mimeType, file.originalName)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white break-words">
                    {file.originalName}
                  </h1>
                  {isGigabyte && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300 flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500 fill-amber-500" /> REAL 1GB+
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mt-2 flex-wrap">
                  <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 text-sm">
                    {formatBytes(file.fileSize)}
                  </span>
                  <span>•</span>
                  <span>{file.mimeType || 'application/octet-stream'}</span>
                  <span>•</span>
                  <span>{file.downloadCount} Total Downloads</span>
                </div>
              </div>
            </div>

            {/* Custom Domain Share Link Banner */}
            <div className="my-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Globe className="w-4 h-4 text-indigo-500" /> Custom Domain Access URL
                </span>
                <span className="text-slate-400 font-mono text-[11px]">
                  ID: {file.id}
                </span>
              </div>

              <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-3 py-2 rounded-xl">
                <input
                  type="text"
                  readOnly
                  value={customShareUrl}
                  className="flex-1 bg-transparent font-mono text-xs text-slate-800 dark:text-slate-200 focus:outline-none select-all"
                />
                <button
                  onClick={copyCustomLink}
                  className="flex items-center gap-1 text-xs px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </>
                  )}
                </button>
                <button
                  onClick={() => onShowQr(customShareUrl, file.originalName)}
                  title="Show QR Code"
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500 rounded-lg transition"
                >
                  <QrCode className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* In-Browser Stream Player (demonstrates HTTP 206 range seeking on 1GB+ video/audio) */}
            {(isVideo || isAudio) && (
              <div className="mb-6 p-4 rounded-2xl bg-slate-900 text-white space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold flex items-center gap-2">
                    <Eye className="w-4 h-4 text-indigo-400" />
                    <span>In-Browser Stream Preview (HTTP 206 Range Seeking)</span>
                  </span>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="text-xs text-indigo-300 underline"
                  >
                    {showPreview ? 'Hide Player' : 'Open Media Player'}
                  </button>
                </div>

                {showPreview && (
                  <div className="mt-3">
                    {isVideo ? (
                      <video
                        controls
                        className="w-full max-h-96 rounded-xl bg-black"
                        src={inlinePreviewUrl}
                      >
                        Your browser does not support video streaming.
                      </video>
                    ) : (
                      <audio controls className="w-full" src={inlinePreviewUrl}>
                        Your browser does not support audio streaming.
                      </audio>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Primary Download CTA */}
            <div className="space-y-4">
              <a
                href={downloadUrl}
                download={file.originalName}
                className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-indigo-600/25 transition flex items-center justify-center gap-3 group"
              >
                <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                <span>Download File ({formatBytes(file.fileSize)})</span>
              </a>

              {/* Safety Badges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/50">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="font-medium">Direct Clean Transfer</span>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/50">
                  <Zap className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="font-medium">Resumable High Speed</span>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                  <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="font-medium">
                    {file.expiresAt
                      ? `Expires: ${new Date(file.expiresAt).toLocaleDateString()}`
                      : 'Permanent Storage'}
                  </span>
                </div>
              </div>
            </div>

            {/* Metadata Detail Drawer */}
            <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 space-y-2">
              <div className="flex justify-between">
                <span>Exact File Size:</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300">
                  {file.fileSize.toLocaleString()} bytes
                </span>
              </div>
              <div className="flex justify-between">
                <span>Uploaded On:</span>
                <span className="font-mono text-slate-700 dark:text-slate-300">
                  {new Date(file.uploadedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Direct Stream Endpoint:</span>
                <span className="font-mono text-indigo-600 dark:text-indigo-400 truncate max-w-xs">
                  {downloadUrl}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
