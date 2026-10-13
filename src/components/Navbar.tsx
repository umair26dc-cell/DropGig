import React from 'react';
import { StorageStats } from '../types';
import { formatBytes } from '../services/testFileGenerator';
import {
  UploadCloud,
  Globe,
  HardDrive,
  Layers,
  Zap,
  CheckCircle,
} from 'lucide-react';

interface NavbarProps {
  stats: StorageStats | null;
  activeTab: 'upload' | 'files';
  setActiveTab: (tab: 'upload' | 'files') => void;
  onOpenDomainModal: () => void;
  customDomain: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  stats,
  activeTab,
  setActiveTab,
  onOpenDomainModal,
  customDomain,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Brand */}
        <div
          onClick={() => setActiveTab('upload')}
          className="flex items-center gap-2.5 cursor-pointer select-none group"
        >
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base tracking-tight text-slate-900 dark:text-white">
                DropGig
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
                1GB+
              </span>
            </div>
            <p className="text-[10px] font-medium text-slate-400 -mt-0.5 hidden sm:block">
              Gigabyte-Grade File Transfers
            </p>
          </div>
        </div>

        {/* Center navigation tabs */}
        <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 rounded-lg transition ${
              activeTab === 'upload'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Upload File
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 ${
              activeTab === 'files'
                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-300 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>All Files</span>
            {stats && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200">
                {stats.totalFiles}
              </span>
            )}
          </button>
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Custom Domain quick button */}
          <button
            onClick={onOpenDomainModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-xs font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 shadow-xs transition"
          >
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            <span className="hidden md:inline font-mono text-[11px]">
              {customDomain || 'custom domain.tld'}
            </span>
            <span className="md:hidden">Domain</span>
          </button>

          {/* Real Storage badge */}
          {stats && (
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
              <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
              <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
                {formatBytes(stats.totalBytes)}
              </span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
