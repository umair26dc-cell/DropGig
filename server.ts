import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
const isProduction = process.env.NODE_ENV === 'production';

// Ensure data storage directories exist
const DATA_DIR = path.resolve(process.cwd(), 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'files');
const TEMP_CHUNKS_DIR = path.join(DATA_DIR, 'temp_chunks');
const METADATA_FILE = path.join(DATA_DIR, 'metadata.json');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });
if (!fs.existsSync(TEMP_CHUNKS_DIR)) fs.mkdirSync(TEMP_CHUNKS_DIR, { recursive: true });
if (!fs.existsSync(METADATA_FILE)) {
  fs.writeFileSync(METADATA_FILE, JSON.stringify([], null, 2));
}

export interface DownloadLog {
  timestamp: number;
  userAgent?: string;
  range?: string;
}

export interface StoredFile {
  id: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  storedFileName: string;
  uploadedAt: number;
  expiresAt: number | null; // null = never
  downloadCount: number;
  downloadLogs?: DownloadLog[];
  hasPassword: boolean;
  passwordHash?: string;
  customDomain?: string;
  slug?: string;
  uploaderUid?: string;
  uploaderEmail?: string;
}

function getStoredFiles(): StoredFile[] {
  try {
    if (fs.existsSync(METADATA_FILE)) {
      const data = fs.readFileSync(METADATA_FILE, 'utf-8');
      return JSON.parse(data) as StoredFile[];
    }
  } catch (err) {
    console.error('Error reading metadata.json:', err);
  }
  return [];
}

function saveStoredFiles(files: StoredFile[]) {
  try {
    fs.writeFileSync(METADATA_FILE, JSON.stringify(files, null, 2));
  } catch (err) {
    console.error('Error saving metadata.json:', err);
  }
}

// JSON body parser for normal API endpoints
app.use(express.json({ limit: '10mb' }));

// 1. Initialize Upload
app.post('/api/upload/init', (req: Request, res: Response) => {
  try {
    const {
      fileName,
      fileSize,
      mimeType,
      totalChunks,
      chunkSize,
      password,
      expiresInDays,
      customDomain,
      customSlug,
      uploaderUid,
      uploaderEmail,
    } = req.body;

    if (!fileName || !fileSize || !totalChunks) {
      return res.status(400).json({ error: 'Missing required upload parameters' });
    }

    const uploadId = crypto.randomUUID();
    const tempDir = path.join(TEMP_CHUNKS_DIR, uploadId);
    fs.mkdirSync(tempDir, { recursive: true });

    // Store temporary upload session info
    const sessionInfo = {
      uploadId,
      fileName,
      fileSize: Number(fileSize),
      mimeType: mimeType || 'application/octet-stream',
      totalChunks: Number(totalChunks),
      chunkSize: Number(chunkSize),
      password: password || '',
      expiresInDays: expiresInDays ? Number(expiresInDays) : null,
      customDomain: customDomain || '',
      customSlug: customSlug || '',
      uploaderUid: uploaderUid || null,
      uploaderEmail: uploaderEmail || null,
      createdAt: Date.now(),
    };

    fs.writeFileSync(path.join(tempDir, 'session.json'), JSON.stringify(sessionInfo, null, 2));

    return res.json({
      success: true,
      uploadId,
      message: 'Upload initialized',
    });
  } catch (error: any) {
    console.error('Upload init error:', error);
    return res.status(500).json({ error: error.message || 'Failed to initialize upload' });
  }
});

// 2. Upload Chunk (Streaming octet-stream directly to disk)
app.post('/api/upload/chunk', (req: Request, res: Response) => {
  const uploadId = req.headers['x-upload-id'] as string;
  const chunkIndex = req.headers['x-chunk-index'] as string;

  if (!uploadId || chunkIndex === undefined) {
    return res.status(400).json({ error: 'Missing x-upload-id or x-chunk-index header' });
  }

  const tempDir = path.join(TEMP_CHUNKS_DIR, uploadId);
  if (!fs.existsSync(tempDir)) {
    return res.status(404).json({ error: 'Upload session not found or expired' });
  }

  const chunkPath = path.join(tempDir, `chunk_${chunkIndex}`);
  const writeStream = fs.createWriteStream(chunkPath);

  req.pipe(writeStream);

  writeStream.on('finish', () => {
    res.json({
      success: true,
      chunkIndex: Number(chunkIndex),
      message: `Chunk ${chunkIndex} uploaded successfully`,
    });
  });

  writeStream.on('error', (err) => {
    console.error('Error writing chunk:', err);
    res.status(500).json({ error: 'Failed to write chunk' });
  });
});

// 3. Complete Upload (Concatenate chunks into final file with zero-memory streaming)
app.post('/api/upload/complete', async (req: Request, res: Response) => {
  try {
    const { uploadId } = req.body;
    if (!uploadId) {
      return res.status(400).json({ error: 'Missing uploadId' });
    }

    const tempDir = path.join(TEMP_CHUNKS_DIR, uploadId);
    const sessionFile = path.join(tempDir, 'session.json');

    if (!fs.existsSync(sessionFile)) {
      return res.status(404).json({ error: 'Upload session does not exist' });
    }

    const session = JSON.parse(fs.readFileSync(sessionFile, 'utf-8'));
    const {
      fileName,
      fileSize,
      mimeType,
      totalChunks,
      password,
      expiresInDays,
      customDomain,
      customSlug,
      uploaderUid,
      uploaderEmail,
    } = session;

    // Verify all chunks exist
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(tempDir, `chunk_${i}`);
      if (!fs.existsSync(chunkPath)) {
        return res.status(400).json({
          error: `Missing chunk ${i} of ${totalChunks}. Please resume or retry.`,
        });
      }
    }

    // Determine final File ID
    let fileId = customSlug ? customSlug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '') : '';
    const files = getStoredFiles();

    // Check if slug taken, fallback to random short id
    if (!fileId || files.some((f) => f.id === fileId)) {
      fileId = crypto.randomBytes(5).toString('hex');
    }

    // Create safe stored file name
    const ext = path.extname(fileName);
    const storedFileName = `${fileId}${ext}`;
    const finalFilePath = path.join(UPLOADS_DIR, storedFileName);
    const finalWriteStream = fs.createWriteStream(finalFilePath);

    // Stream-merge chunks sequentially without loading into memory
    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(tempDir, `chunk_${i}`);
      await new Promise<void>((resolve, reject) => {
        const chunkReadStream = fs.createReadStream(chunkPath);
        chunkReadStream.pipe(finalWriteStream, { end: false });
        chunkReadStream.on('end', () => resolve());
        chunkReadStream.on('error', (err) => reject(err));
      });
      // Delete chunk to free up space immediately
      fs.unlinkSync(chunkPath);
    }
    finalWriteStream.end();

    // Cleanup session
    fs.unlinkSync(sessionFile);
    fs.rmdirSync(tempDir);

    // Compute expiration
    const now = Date.now();
    const expiresAt = expiresInDays ? now + expiresInDays * 24 * 60 * 60 * 1000 : null;

    // Hash password if provided
    let passwordHash: string | undefined = undefined;
    if (password && password.trim().length > 0) {
      passwordHash = crypto.createHash('sha256').update(password.trim()).digest('hex');
    }

    const newRecord: StoredFile = {
      id: fileId,
      originalName: fileName,
      fileSize: Number(fileSize),
      mimeType: mimeType || 'application/octet-stream',
      storedFileName,
      uploadedAt: now,
      expiresAt,
      downloadCount: 0,
      downloadLogs: [],
      hasPassword: !!passwordHash,
      passwordHash,
      customDomain: customDomain ? customDomain.trim().replace(/^https?:\/\//, '') : undefined,
      slug: customSlug || undefined,
      uploaderUid: uploaderUid || undefined,
      uploaderEmail: uploaderEmail || undefined,
    };

    files.unshift(newRecord);
    saveStoredFiles(files);

    return res.json({
      success: true,
      file: {
        id: newRecord.id,
        originalName: newRecord.originalName,
        fileSize: newRecord.fileSize,
        mimeType: newRecord.mimeType,
        uploadedAt: newRecord.uploadedAt,
        expiresAt: newRecord.expiresAt,
        downloadCount: newRecord.downloadCount,
        hasPassword: newRecord.hasPassword,
        customDomain: newRecord.customDomain,
        uploaderUid: newRecord.uploaderUid,
        uploaderEmail: newRecord.uploaderEmail,
      },
    });
  } catch (error: any) {
    console.error('Error completing upload:', error);
    return res.status(500).json({ error: error.message || 'Failed to complete upload' });
  }
});

// 4. List files with download tracking and ownership support
app.get('/api/files', (req: Request, res: Response) => {
  const reqUid = req.query.uid as string | undefined;
  const files = getStoredFiles();
  const now = Date.now();
  // Filter expired files and clean up if needed
  const activeFiles = files.filter((f) => {
    if (f.expiresAt && f.expiresAt < now) {
      // Delete file from disk
      const filePath = path.join(UPLOADS_DIR, f.storedFileName);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (_) {}
      }
      return false;
    }
    return true;
  });

  if (activeFiles.length !== files.length) {
    saveStoredFiles(activeFiles);
  }

  // Return public sanitized metadata plus owner details
  const sanitized = activeFiles.map((f) => {
    const isOwner = reqUid && f.uploaderUid && reqUid === f.uploaderUid;
    return {
      id: f.id,
      originalName: f.originalName,
      fileSize: f.fileSize,
      mimeType: f.mimeType,
      uploadedAt: f.uploadedAt,
      expiresAt: f.expiresAt,
      downloadCount: f.downloadCount,
      downloadLogs: isOwner ? (f.downloadLogs || []) : undefined,
      hasPassword: f.hasPassword,
      customDomain: f.customDomain,
      uploaderUid: f.uploaderUid,
      uploaderEmail: f.uploaderEmail,
      isOwner: !!isOwner,
    };
  });

  res.json({ files: sanitized });
});

// 5. Get Single File Details
app.get('/api/files/:fileId', (req: Request, res: Response) => {
  const { fileId } = req.params;
  const reqUid = req.query.uid as string | undefined;
  const files = getStoredFiles();
  const file = files.find((f) => f.id === fileId);

  if (!file) {
    return res.status(404).json({ error: 'File not found or expired' });
  }

  if (file.expiresAt && file.expiresAt < Date.now()) {
    return res.status(410).json({ error: 'File has expired' });
  }

  const isOwner = reqUid && file.uploaderUid && reqUid === file.uploaderUid;

  res.json({
    file: {
      id: file.id,
      originalName: file.originalName,
      fileSize: file.fileSize,
      mimeType: file.mimeType,
      uploadedAt: file.uploadedAt,
      expiresAt: file.expiresAt,
      downloadCount: file.downloadCount,
      downloadLogs: isOwner ? (file.downloadLogs || []) : undefined,
      hasPassword: file.hasPassword,
      customDomain: file.customDomain,
      uploaderUid: file.uploaderUid,
      uploaderEmail: file.uploaderEmail,
      isOwner: !!isOwner,
    },
  });
});

// 6. Verify password for protected file
app.post('/api/files/:fileId/verify-password', (req: Request, res: Response) => {
  const { fileId } = req.params;
  const { password } = req.body;
  const files = getStoredFiles();
  const file = files.find((f) => f.id === fileId);

  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  if (!file.hasPassword) {
    return res.json({ verified: true });
  }

  const hash = crypto.createHash('sha256').update(password || '').digest('hex');
  if (hash === file.passwordHash) {
    return res.json({ verified: true });
  } else {
    return res.status(401).json({ error: 'Incorrect password' });
  }
});

// 7. Delete File
app.delete('/api/files/:fileId', (req: Request, res: Response) => {
  const { fileId } = req.params;
  let files = getStoredFiles();
  const file = files.find((f) => f.id === fileId);

  if (!file) {
    return res.status(404).json({ error: 'File not found' });
  }

  const filePath = path.join(UPLOADS_DIR, file.storedFileName);
  if (fs.existsSync(filePath)) {
    try { fs.unlinkSync(filePath); } catch (_) {}
  }

  files = files.filter((f) => f.id !== fileId);
  saveStoredFiles(files);

  res.json({ success: true, message: 'File deleted' });
});

// 8. Stream/Download File with HTTP 206 Range Support (crucial for 1GB+ files & video seeking!)
app.get('/api/download/:fileId', (req: Request, res: Response) => {
  const { fileId } = req.params;
  const password = req.query.pwd as string | undefined;
  const isInline = req.query.inline === 'true';

  const files = getStoredFiles();
  const file = files.find((f) => f.id === fileId);

  if (!file) {
    return res.status(404).send('File not found or expired');
  }

  if (file.expiresAt && file.expiresAt < Date.now()) {
    return res.status(410).send('File has expired');
  }

  // Password check
  if (file.hasPassword) {
    const hash = crypto.createHash('sha256').update(password || '').digest('hex');
    if (hash !== file.passwordHash) {
      return res.status(401).send('Password required or incorrect');
    }
  }

  const filePath = path.join(UPLOADS_DIR, file.storedFileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File data missing on server disk');
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  // Increment download count and track download log only on first chunk/full download request
  if (!range || range.startsWith('bytes=0-')) {
    file.downloadCount += 1;
    if (!file.downloadLogs) file.downloadLogs = [];
    file.downloadLogs.unshift({
      timestamp: Date.now(),
      userAgent: req.headers['user-agent'] ? req.headers['user-agent'].substring(0, 120) : undefined,
      range: range ? range : 'full',
    });
    if (file.downloadLogs.length > 50) file.downloadLogs = file.downloadLogs.slice(0, 50);
    saveStoredFiles(files);
  }

  const disposition = isInline ? 'inline' : 'attachment';
  const encodedName = encodeURIComponent(file.originalName);

  if (range) {
    // Range parsing: bytes=start-end
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

    if (start >= fileSize || end >= fileSize) {
      res.status(416).set('Content-Range', `bytes */${fileSize}`);
      return res.end();
    }

    const chunksize = end - start + 1;
    const fileStream = fs.createReadStream(filePath, { start, end });

    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': file.mimeType || 'application/octet-stream',
      'Content-Disposition': `${disposition}; filename="${encodedName}"; filename*=UTF-8''${encodedName}`,
    });

    fileStream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': file.mimeType || 'application/octet-stream',
      'Accept-Ranges': 'bytes',
      'Content-Disposition': `${disposition}; filename="${encodedName}"; filename*=UTF-8''${encodedName}`,
    });

    fs.createReadStream(filePath).pipe(res);
  }
});

// Storage and System Stats API
app.get('/api/stats', (_req: Request, res: Response) => {
  const files = getStoredFiles();
  const totalFiles = files.length;
  const totalBytes = files.reduce((acc, f) => acc + f.fileSize, 0);
  const totalDownloads = files.reduce((acc, f) => acc + f.downloadCount, 0);

  res.json({
    totalFiles,
    totalBytes,
    totalDownloads,
    maxUploadLimit: 50 * 1024 * 1024 * 1024, // 50 GB theoretical chunk limit
  });
});

// Mount Vite or serve static dist
async function startServer() {
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 DropGig file sharing server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
