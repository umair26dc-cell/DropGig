import React, { useState, useEffect, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { UploadZone } from './components/UploadZone';
import { ActiveUploadProgress } from './components/ActiveUploadProgress';
import { FileList } from './components/FileList';
import { FileDownloadPage } from './components/FileDownloadPage';
import { QrCodeModal } from './components/QrCodeModal';
import { CustomDomainModal } from './components/CustomDomainModal';
import { FileMetadata, ActiveUpload, UploadConfig, StorageStats } from './types';
import { fetchFiles, fetchStats, deleteFile, ChunkedUploader } from './services/api';
import { formatBytes } from './services/testFileGenerator';
import {
  Zap,
  Globe,
  Shield,
  Layers,
  HardDrive,
  Sparkles,
  Server,
  CloudLightning,
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'files'>('upload');
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Active Upload State
  const [activeUpload, setActiveUpload] = useState<ActiveUpload | null>(null);
  const uploaderRef = useRef<ChunkedUploader | null>(null);

  // Route State: support /file/:fileId path directly
  const [currentFileRoute, setCurrentFileRoute] = useState<string | null>(null);

  // Custom Domain Preference
  const [customDomain, setCustomDomain] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('dropgig_custom_domain');
      if (saved) return saved;
      return window.location.host || 'share.mydomain.tld';
    }
    return 'share.mydomain.tld';
  });

  // Modals
  const [showDomainModal, setShowDomainModal] = useState<boolean>(false);
  const [qrModalData, setQrModalData] = useState<{ url: string; title: string } | null>(null);

  // Listen to browser URL path (supports /file/:fileId)
  useEffect(() => {
    const parseRoute = () => {
      const path = window.location.pathname;
      const match = path.match(/^\/file\/([a-zA-Z0-9_-]+)/);
      if (match && match[1]) {
        setCurrentFileRoute(match[1]);
      } else {
        setCurrentFileRoute(null);
      }
    };

    parseRoute();
    window.addEventListener('popstate', parseRoute);
    return () => window.removeEventListener('popstate', parseRoute);
  }, []);

  // Fetch initial files and stats
  const refreshData = async () => {
    try {
      const [filesData, statsData] = await Promise.all([fetchFiles(), fetchStats()]);
      setFiles(filesData);
      setStats(statsData);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleSaveDomain = (domain: string) => {
    setCustomDomain(domain);
    localStorage.setItem('dropgig_custom_domain', domain);
  };

  const handleStartUpload = (file: File, config: UploadConfig) => {
    // If config didn't set a custom domain, use user's saved domain
    const effectiveConfig: UploadConfig = {
      ...config,
      customDomain: config.customDomain || customDomain,
    };

    const uploader = new ChunkedUploader(file, effectiveConfig, (progressState) => {
      setActiveUpload({ ...progressState });
      if (progressState.status === 'completed') {
        refreshData();
      }
    });

    uploaderRef.current = uploader;
    uploader.start().catch((err) => {
      console.error('Upload error in App:', err);
    });
  };

  const handlePause = () => {
    uploaderRef.current?.pause();
  };

  const handleResume = () => {
    uploaderRef.current?.resume();
  };

  const handleCancel = () => {
    uploaderRef.current?.cancel();
  };

  const handleResetUpload = () => {
    uploaderRef.current = null;
    setActiveUpload(null);
  };

  const handleDeleteFile = async (fileId: string) => {
    await deleteFile(fileId);
    await refreshData();
  };

  const navigateToFile = (fileId: string) => {
    window.history.pushState({}, '', `/file/${fileId}`);
    setCurrentFileRoute(fileId);
  };

  const navigateToHome = () => {
    window.history.pushState({}, '', '/');
    setCurrentFileRoute(null);
  };

  const handleShowQr = (url: string, title: string) => {
    setQrModalData({ url, title });
  };

  // If user is accessing /file/:id
  if (currentFileRoute) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
        <Navbar
          stats={stats}
          activeTab={activeTab}
          setActiveTab={(tab) => {
            navigateToHome();
            setActiveTab(tab);
          }}
          onOpenDomainModal={() => setShowDomainModal(true)}
          customDomain={customDomain}
        />

        <main className="flex-1 py-8">
          <FileDownloadPage
            fileId={currentFileRoute}
            defaultDomain={customDomain}
            onNavigateHome={navigateToHome}
            onShowQr={handleShowQr}
          />
        </main>

        {showDomainModal && (
          <CustomDomainModal
            currentDomain={customDomain}
            onSaveDomain={handleSaveDomain}
            onClose={() => setShowDomainModal(false)}
          />
        )}

        {qrModalData && (
          <QrCodeModal
            url={qrModalData.url}
            title={qrModalData.title}
            onClose={() => setQrModalData(null)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      <Navbar
        stats={stats}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenDomainModal={() => setShowDomainModal(true)}
        customDomain={customDomain}
      />

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-8 space-y-10">
        {/* Hero Feature Pill */}
        <div className="flex flex-wrap items-center justify-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full shadow-xs">
            <Zap className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">1GB+ Real Streaming Uploads</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full shadow-xs">
            <Globe className="w-3.5 h-3.5 text-indigo-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Custom Domain URL: <code className="text-indigo-600 dark:text-indigo-400 font-mono">{customDomain}/file/:id</code>
            </span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full shadow-xs">
            <Shield className="w-3.5 h-3.5 text-emerald-500" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">HTTP 206 Resumable & Range Seeking</span>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'upload' ? (
          <div className="max-w-3xl mx-auto space-y-8">
            {activeUpload ? (
              <ActiveUploadProgress
                upload={activeUpload}
                onPause={handlePause}
                onResume={handleResume}
                onCancel={handleCancel}
                onReset={handleResetUpload}
                onShowQr={handleShowQr}
                onNavigateToFile={navigateToFile}
              />
            ) : (
              <UploadZone
                defaultDomain={customDomain}
                onStartUpload={handleStartUpload}
                isUploading={false}
              />
            )}

            {/* Quick Recent Files Preview below Upload Zone */}
            {files.length > 0 && !activeUpload && (
              <div className="pt-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    <span>Recent Uploaded Files ({files.length})</span>
                  </h3>
                  <button
                    onClick={() => setActiveTab('files')}
                    className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    View All in Repository &rarr;
                  </button>
                </div>
                <FileList
                  files={files.slice(0, 3)}
                  onDeleteFile={handleDeleteFile}
                  onNavigateToFile={navigateToFile}
                  onShowQr={handleShowQr}
                  defaultDomain={customDomain}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-5xl mx-auto">
            <FileList
              files={files}
              onDeleteFile={handleDeleteFile}
              onNavigateToFile={navigateToFile}
              onShowQr={handleShowQr}
              defaultDomain={customDomain}
            />
          </div>
        )}

        {/* Architecture & Capability Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5">
              Over 1 REAL Gigabyte Support
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Files are sliced into 5–20MB binary chunks in the browser and streamed directly to disk, bypassing standard Node.js RAM limits.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
              <Globe className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5">
              Custom Domain Routing
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Brand your links as <span className="font-mono text-purple-600 dark:text-purple-400">customdomain.tld/file/file-id</span>. Built-in link sharing, QR codes, and custom slugs.
            </p>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
              <Server className="w-5 h-5" />
            </div>
            <h4 className="font-bold text-sm text-slate-900 dark:text-white mb-1.5">
              HTTP 206 Range Stream Engine
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Supports partial content streaming for fast resuming, high-speed multi-threaded downloads, and in-browser media seeking.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-200 dark:border-slate-800 py-6 mt-12 bg-white/50 dark:bg-slate-900/50 text-xs text-slate-500 text-center">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-800 dark:text-slate-200">DropGig</span>
            <span>—</span>
            <span>Ultra-Scale File Sharing Engine</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Active Domain: <strong className="font-mono text-indigo-600 dark:text-indigo-400">{customDomain}</strong></span>
            <span>•</span>
            <span>Theoretical Limit: 50 GB per file</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {showDomainModal && (
        <CustomDomainModal
          currentDomain={customDomain}
          onSaveDomain={handleSaveDomain}
          onClose={() => setShowDomainModal(false)}
        />
      )}

      {qrModalData && (
        <QrCodeModal
          url={qrModalData.url}
          title={qrModalData.title}
          onClose={() => setQrModalData(null)}
        />
      )}
    </div>
  );
}
