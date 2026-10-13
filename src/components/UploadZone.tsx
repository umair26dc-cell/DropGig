import React, { useState, useRef } from 'react';
import { UploadConfig } from '../types';
import { generateSyntheticLargeFile, formatBytes } from '../services/testFileGenerator';
import {
  UploadCloud,
  FileCheck,
  Settings,
  Lock,
  Clock,
  Globe,
  Sliders,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Zap,
  Info,
} from 'lucide-react';

interface UploadZoneProps {
  defaultDomain: string;
  onStartUpload: (file: File, config: UploadConfig) => void;
  isUploading: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({
  defaultDomain,
  onStartUpload,
  isUploading,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isGeneratingTestFile, setIsGeneratingTestFile] = useState(false);

  // Settings
  const [customDomain, setCustomDomain] = useState<string>(defaultDomain || '');
  const [customSlug, setCustomSlug] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [expiresInDays, setExpiresInDays] = useState<number | null>(7);
  const [chunkSizeMb, setChunkSizeMb] = useState<number>(10);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleGenerateSynthetic = (sizeGb: number) => {
    setIsGeneratingTestFile(true);
    setTimeout(() => {
      try {
        const bytes = Math.round(sizeGb * 1024 * 1024 * 1024);
        const file = generateSyntheticLargeFile(
          bytes,
          `Benchmark_Master_Render_${sizeGb}GB.mp4`,
          'video/mp4'
        );
        setSelectedFile(file);
      } catch (err) {
        console.error('Failed generating test file:', err);
      } finally {
        setIsGeneratingTestFile(false);
      }
    }, 50);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;

    const config: UploadConfig = {
      chunkSize: chunkSizeMb * 1024 * 1024,
      customDomain: customDomain.trim(),
      customSlug: customSlug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, ''),
      password: password.trim() || undefined,
      expiresInDays,
    };

    onStartUpload(selectedFile, config);
  };

  const isGigabytePlus = selectedFile && selectedFile.size >= 1024 * 1024 * 1024;

  return (
    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl">
      {/* Header text */}
      <div className="text-center max-w-xl mx-auto mb-6">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/80 mb-3">
          <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
          <span>Engineered for 1GB+ & Multi-Gigabyte Transfers</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Upload & Share Large Files Instantly
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2">
          Resumable zero-RAM chunked streaming with custom domain URLs like{' '}
          <code className="text-indigo-600 dark:text-indigo-400 font-mono font-medium">
            domain.tld/file/file-id
          </code>
        </p>
      </div>

      {/* Quick 1GB+ Test Generators */}
      <div className="mb-6 bg-gradient-to-r from-slate-50 via-indigo-50/40 to-slate-50 dark:from-slate-800/60 dark:via-indigo-950/20 dark:to-slate-800/60 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
          <div>
            <span className="text-xs font-semibold text-slate-900 dark:text-white block">
              Test with Real 1GB+ Files in 1 Click
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Generate genuine multi-gigabyte synthetic blobs directly in the browser
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isUploading || isGeneratingTestFile}
            onClick={() => handleGenerateSynthetic(1.25)}
            className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold shadow-xs disabled:opacity-50 transition flex items-center gap-1"
          >
            <Zap className="w-3 h-3 text-amber-300 fill-amber-300" />
            <span>Generate 1.25 GB File</span>
          </button>
          <button
            type="button"
            disabled={isUploading || isGeneratingTestFile}
            onClick={() => handleGenerateSynthetic(2.5)}
            className="text-xs px-2.5 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-medium transition"
          >
            2.5 GB
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Drag and drop surface */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/30 scale-[0.99]'
              : selectedFile
              ? 'border-emerald-400 dark:border-emerald-600 bg-emerald-50/30 dark:bg-emerald-950/20'
              : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-slate-50/50 dark:hover:bg-slate-800/40'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
            disabled={isUploading}
          />

          {selectedFile ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shadow-inner">
                <FileCheck className="w-8 h-8" />
              </div>
              <div className="mt-2 text-center max-w-lg">
                <p className="font-bold text-base text-slate-900 dark:text-white truncate" title={selectedFile.name}>
                  {selectedFile.name}
                </p>
                <div className="flex items-center justify-center gap-2 mt-1">
                  <span className="text-xs font-mono font-semibold text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                    {formatBytes(selectedFile.size)}
                  </span>
                  {isGigabytePlus && (
                    <span className="text-[11px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/80 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <Zap className="w-3 h-3 text-amber-500" /> REAL 1GB+ DETECTED
                    </span>
                  )}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Click or drag another file to replace
              </p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                <UploadCloud className="w-8 h-8" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Drag and drop your file here, or{' '}
                  <span className="text-indigo-600 dark:text-indigo-400 underline decoration-indigo-400">
                    browse from device
                  </span>
                </p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                  Supports any file format: 4K Video, Zip, ISO, Disk Images, Archives, up to 50 GB
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Custom Domain & Security Options Accordion */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/50 dark:bg-slate-800/30">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full flex items-center justify-between px-4 py-3 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition"
          >
            <span className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-indigo-500" />
              <span>Custom Domain, Custom Slug & Security Controls</span>
            </span>
            {showAdvanced ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {showAdvanced && (
            <div className="p-4 pt-2 border-t border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Custom Domain Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-indigo-500" /> Custom Domain
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs">
                  <span className="text-slate-400 font-mono mr-1">https://</span>
                  <input
                    type="text"
                    value={customDomain}
                    onChange={(e) => setCustomDomain(e.target.value)}
                    placeholder="share.mydomain.tld"
                    className="flex-1 bg-transparent font-mono text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Link format: https://{customDomain || 'domain.tld'}/file/id
                </span>
              </div>

              {/* Custom URL Slug */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5 text-indigo-500" /> Custom File Slug (Optional)
                </label>
                <div className="flex items-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs">
                  <span className="text-slate-400 font-mono mr-1">/file/</span>
                  <input
                    type="text"
                    value={customSlug}
                    onChange={(e) => setCustomSlug(e.target.value)}
                    placeholder="project-alpha-master"
                    className="flex-1 bg-transparent font-mono text-slate-800 dark:text-slate-100 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Leave blank for auto-generated secure 10-char hash
                </span>
              </div>

              {/* Password Protection */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-indigo-500" /> Password Protection (Optional)
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Set download password..."
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Expiration and Chunking */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-500" /> Expiry
                  </label>
                  <select
                    value={expiresInDays === null ? 'never' : expiresInDays.toString()}
                    onChange={(e) =>
                      setExpiresInDays(e.target.value === 'never' ? null : parseInt(e.target.value, 10))
                    }
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value="1">24 Hours</option>
                    <option value="7">7 Days</option>
                    <option value="30">30 Days</option>
                    <option value="never">Never (Permanent)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-indigo-500" /> Chunk Size
                  </label>
                  <select
                    value={chunkSizeMb}
                    onChange={(e) => setChunkSizeMb(parseInt(e.target.value, 10))}
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-2 text-xs text-slate-800 dark:text-slate-100 focus:outline-none"
                  >
                    <option value={5}>5 MB (Slow net)</option>
                    <option value={10}>10 MB (Recommended)</option>
                    <option value={20}>20 MB (High speed)</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Upload Button */}
        <button
          type="submit"
          disabled={!selectedFile || isUploading}
          className="w-full py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center gap-2"
        >
          <UploadCloud className="w-5 h-5" />
          <span>
            {selectedFile
              ? `Start Upload (${formatBytes(selectedFile.size)})`
              : 'Select or Drop a File to Upload'}
          </span>
        </button>
      </form>
    </div>
  );
};
