import { FileMetadata, IndexedDbStorageInfo } from '../types';

const DB_NAME = 'DropGig_CloudVault_DB';
const DB_VERSION = 1;
const STORE_NAME = 'vault_files';

interface StoredVaultItem {
  id: string;
  blob: Blob;
  metadata: FileMetadata;
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported in this browser environment'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get accurate browser storage quota and usage using StorageManager API
 */
export async function getStorageQuotaInfo(): Promise<IndexedDbStorageInfo> {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const estimate = await navigator.storage.estimate();
      const quota = estimate.quota || 10 * 1024 * 1024 * 1024; // Fallback 10GB
      const usage = estimate.usage || 0;
      const available = Math.max(0, quota - usage);
      const percentUsed = quota > 0 ? (usage / quota) * 100 : 0;

      return {
        quota,
        usage,
        available,
        percentUsed,
      };
    } catch (err) {
      console.error('Error querying storage estimate:', err);
    }
  }

  // Fallback defaults
  const fallbackQuota = 50 * 1024 * 1024 * 1024; // 50GB
  return {
    quota: fallbackQuota,
    usage: 0,
    available: fallbackQuota,
    percentUsed: 0,
  };
}

/**
 * Store a file blob in IndexedDB cloud vault with metadata and uploader ownership
 */
export async function saveFileToVault(
  file: File,
  meta: Partial<FileMetadata>
): Promise<FileMetadata> {
  const db = await openDB();
  const fileId = meta.id || `vault_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;

  const fullMetadata: FileMetadata = {
    id: fileId,
    originalName: file.name,
    fileSize: file.size,
    mimeType: file.type || 'application/octet-stream',
    uploadedAt: Date.now(),
    expiresAt: meta.expiresAt || null,
    downloadCount: 0,
    downloadLogs: [],
    hasPassword: !!meta.hasPassword,
    customDomain: meta.customDomain,
    uploaderUid: meta.uploaderUid,
    uploaderEmail: meta.uploaderEmail,
    isOwner: true,
    storageType: 'indexeddb',
  };

  const item: StoredVaultItem = {
    id: fileId,
    blob: file,
    metadata: fullMetadata,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(item);

    req.onsuccess = () => resolve(fullMetadata);
    req.onerror = () => reject(req.error);
  });
}

/**
 * List all files stored in IndexedDB cloud vault
 */
export async function getVaultFiles(uid?: string): Promise<FileMetadata[]> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      const items: StoredVaultItem[] = req.result || [];
      const metas = items.map((i) => {
        const isOwner = uid && i.metadata.uploaderUid && uid === i.metadata.uploaderUid;
        return {
          ...i.metadata,
          isOwner: !!isOwner,
          storageType: 'indexeddb' as const,
        };
      });
      resolve(metas);
    };

    req.onerror = () => reject(req.error);
  });
}

/**
 * Get file blob from IndexedDB for downloading or streaming
 */
export async function getVaultFileBlob(fileId: string): Promise<Blob | null> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(fileId);

    req.onsuccess = () => {
      const item: StoredVaultItem | undefined = req.result;
      if (!item) resolve(null);
      else resolve(item.blob);
    };

    req.onerror = () => reject(req.error);
  });
}

/**
 * Increment download counter and log for an IndexedDB vault file
 */
export async function trackVaultDownload(fileId: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.get(fileId);

    req.onsuccess = () => {
      const item: StoredVaultItem | undefined = req.result;
      if (item) {
        item.metadata.downloadCount = (item.metadata.downloadCount || 0) + 1;
        if (!item.metadata.downloadLogs) item.metadata.downloadLogs = [];
        item.metadata.downloadLogs.unshift({
          timestamp: Date.now(),
          userAgent: navigator.userAgent.substring(0, 100),
          range: 'indexeddb-direct',
        });
        if (item.metadata.downloadLogs.length > 50) {
          item.metadata.downloadLogs = item.metadata.downloadLogs.slice(0, 50);
        }
        store.put(item);
      }
      resolve();
    };

    req.onerror = () => reject(req.error);
  });
}

/**
 * Delete a file from the IndexedDB vault
 */
export async function deleteVaultFile(fileId: string): Promise<void> {
  const db = await openDB();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(fileId);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
