import { FileMetadata, ActiveUpload, UploadConfig, StorageStats } from '../types';

export async function fetchFiles(uid?: string): Promise<FileMetadata[]> {
  const url = uid ? `/api/files?uid=${encodeURIComponent(uid)}` : '/api/files';
  const res = await fetch(url);
  if (!res.ok) throw new Error('Failed to load files');
  const data = await res.json();
  return data.files;
}

export async function fetchFileDetails(fileId: string, uid?: string): Promise<FileMetadata> {
  const url = uid ? `/api/files/${fileId}?uid=${encodeURIComponent(uid)}` : `/api/files/${fileId}`;
  const res = await fetch(url);
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to load file details');
  }
  const data = await res.json();
  return data.file;
}

export async function verifyPassword(fileId: string, password: string): Promise<boolean> {
  const res = await fetch(`/api/files/${fileId}/verify-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Invalid password');
  }
  const data = await res.json();
  return !!data.verified;
}

export async function deleteFile(fileId: string): Promise<void> {
  const res = await fetch(`/api/files/${fileId}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to delete file');
  }
}

export async function fetchStats(): Promise<StorageStats> {
  const res = await fetch('/api/stats');
  if (!res.ok) throw new Error('Failed to load stats');
  return res.json();
}

/**
 * Controller class to manage chunked upload with pause, resume, cancel,
 * and high-speed streaming.
 */
export class ChunkedUploader {
  private file: File;
  private config: UploadConfig;
  private uploadId: string | null = null;
  private currentChunk: number = 0;
  private totalChunks: number = 0;
  private chunkSize: number;
  private isPaused: boolean = false;
  private isCancelled: boolean = false;
  private onProgress: (state: ActiveUpload) => void;
  private lastProgressTime: number = 0;
  private lastUploadedBytes: number = 0;

  constructor(file: File, config: UploadConfig, onProgress: (state: ActiveUpload) => void) {
    this.file = file;
    this.config = config;
    this.chunkSize = config.chunkSize || 10 * 1024 * 1024; // Default 10MB
    this.totalChunks = Math.ceil(file.size / this.chunkSize);
    this.onProgress = onProgress;
  }

  private updateState(
    status: ActiveUpload['status'],
    uploadedBytes: number,
    errorMessage?: string,
    completedFile?: FileMetadata
  ) {
    const now = Date.now();
    let speedBps = 0;
    let etaSeconds = 0;

    if (this.lastProgressTime > 0 && now > this.lastProgressTime) {
      const timeDiff = (now - this.lastProgressTime) / 1000;
      const bytesDiff = uploadedBytes - this.lastUploadedBytes;
      if (timeDiff > 0 && bytesDiff > 0) {
        speedBps = bytesDiff / timeDiff;
        const remainingBytes = this.file.size - uploadedBytes;
        etaSeconds = speedBps > 0 ? remainingBytes / speedBps : 0;
      }
    }

    this.lastProgressTime = now;
    this.lastUploadedBytes = uploadedBytes;

    const domain = this.config.customDomain || window.location.host;
    const fileId = completedFile ? completedFile.id : this.config.customSlug || '';
    const shareUrl = fileId ? `https://${domain}/file/${fileId}` : undefined;

    this.onProgress({
      id: this.uploadId || 'init',
      fileName: this.file.name,
      fileSize: this.file.size,
      mimeType: this.file.type || 'application/octet-stream',
      uploadedBytes,
      totalChunks: this.totalChunks,
      currentChunkIndex: this.currentChunk,
      status,
      speedBps,
      etaSeconds,
      errorMessage,
      completedFile,
      customDomain: this.config.customDomain,
      shareUrl,
    });
  }

  public async start(): Promise<FileMetadata> {
    this.isPaused = false;
    this.isCancelled = false;
    this.lastProgressTime = Date.now();
    this.lastUploadedBytes = 0;

    // 1. Initialize upload session on server
    this.updateState('preparing', 0);
    const initRes = await fetch('/api/upload/init', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: this.file.name,
        fileSize: this.file.size,
        mimeType: this.file.type || 'application/octet-stream',
        totalChunks: this.totalChunks,
        chunkSize: this.chunkSize,
        password: this.config.password || '',
        expiresInDays: this.config.expiresInDays,
        customDomain: this.config.customDomain || '',
        customSlug: this.config.customSlug || '',
      }),
    });

    if (!initRes.ok) {
      const err = await initRes.json().catch(() => ({}));
      const msg = err.error || 'Failed to initialize upload session';
      this.updateState('error', 0, msg);
      throw new Error(msg);
    }

    const initData = await initRes.json();
    this.uploadId = initData.uploadId;

    // 2. Upload chunks in sequential stream
    this.updateState('uploading', 0);

    for (let i = this.currentChunk; i < this.totalChunks; i++) {
      if (this.isCancelled) {
        throw new Error('Upload cancelled');
      }

      while (this.isPaused) {
        await new Promise((r) => setTimeout(r, 300));
        if (this.isCancelled) throw new Error('Upload cancelled');
      }

      this.currentChunk = i;
      const start = i * this.chunkSize;
      const end = Math.min(start + this.chunkSize, this.file.size);
      const chunkBlob = this.file.slice(start, end);

      let attempts = 0;
      let success = false;
      let lastErr = '';

      while (attempts < 3 && !success && !this.isCancelled) {
        attempts++;
        try {
          const chunkRes = await fetch('/api/upload/chunk', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/octet-stream',
              'x-upload-id': this.uploadId!,
              'x-chunk-index': i.toString(),
            },
            body: chunkBlob,
          });

          if (!chunkRes.ok) {
            const errJson = await chunkRes.json().catch(() => ({}));
            throw new Error(errJson.error || `Chunk ${i} upload failed`);
          }

          success = true;
          const currentUploaded = end;
          this.updateState('uploading', currentUploaded);
        } catch (err: any) {
          lastErr = err.message || 'Network error';
          console.warn(`Chunk ${i} attempt ${attempts} failed: ${lastErr}. Retrying...`);
          if (attempts < 3) {
            await new Promise((r) => setTimeout(r, 1000 * attempts));
          }
        }
      }

      if (!success) {
        this.updateState('error', i * this.chunkSize, `Chunk ${i} failed: ${lastErr}`);
        throw new Error(`Failed uploading chunk ${i}: ${lastErr}`);
      }
    }

    // 3. Complete and Merge
    this.updateState('merging', this.file.size);
    const completeRes = await fetch('/api/upload/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uploadId: this.uploadId }),
    });

    if (!completeRes.ok) {
      const err = await completeRes.json().catch(() => ({}));
      const msg = err.error || 'Server failed to assemble chunks';
      this.updateState('error', this.file.size, msg);
      throw new Error(msg);
    }

    const completeData = await completeRes.json();
    const finalFile: FileMetadata = completeData.file;

    this.updateState('completed', this.file.size, undefined, finalFile);
    return finalFile;
  }

  public pause() {
    this.isPaused = true;
    this.updateState('paused', this.currentChunk * this.chunkSize);
  }

  public resume() {
    this.isPaused = false;
    this.lastProgressTime = Date.now();
    this.updateState('uploading', this.currentChunk * this.chunkSize);
  }

  public cancel() {
    this.isCancelled = true;
    this.updateState('error', 0, 'Upload was cancelled by user');
  }
}
