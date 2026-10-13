export interface DownloadLog {
  timestamp: number;
  userAgent?: string;
  range?: string;
}

export interface FileMetadata {
  id: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  uploadedAt: number;
  expiresAt: number | null;
  downloadCount: number;
  downloadLogs?: DownloadLog[];
  hasPassword: boolean;
  customDomain?: string;
  uploaderUid?: string;
  uploaderEmail?: string;
  isOwner?: boolean;
  storageType?: 'server' | 'indexeddb';
}

export type UploadStatus =
  | 'idle'
  | 'preparing'
  | 'uploading'
  | 'paused'
  | 'merging'
  | 'completed'
  | 'error';

export interface ActiveUpload {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  uploadedBytes: number;
  totalChunks: number;
  currentChunkIndex: number;
  status: UploadStatus;
  speedBps: number;
  etaSeconds: number;
  errorMessage?: string;
  completedFile?: FileMetadata;
  customDomain?: string;
  shareUrl?: string;
  storageTarget?: 'server' | 'indexeddb';
}

export interface UploadConfig {
  chunkSize: number;
  customDomain: string;
  customSlug: string;
  password?: string;
  expiresInDays: number | null;
  uploaderUid?: string;
  uploaderEmail?: string;
  storageTarget?: 'server' | 'indexeddb';
}

export interface StorageStats {
  totalFiles: number;
  totalBytes: number;
  totalDownloads: number;
  maxUploadLimit: number;
}

export interface IndexedDbStorageInfo {
  quota: number;
  usage: number;
  available: number;
  percentUsed: number;
}

export interface GoogleDriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink?: string;
  iconLink?: string;
  createdTime?: string;
}
