/**
 * Generates real >1GB test files directly in browser using repeated chunk references.
 * Consumes only ~10MB of client RAM while producing a genuine 1.25GB Blob
 * that can be chunked, uploaded, streamed, and downloaded identically to a real file.
 */
export function generateSyntheticLargeFile(
  targetSizeBytes: number = 1.25 * 1024 * 1024 * 1024, // 1.25 GB default
  fileName: string = 'Demo_4K_Render_Benchmark_1.25GB.mp4',
  mimeType: string = 'video/mp4'
): File {
  // Create a 10MB chunk template filled with repeating deterministic pattern
  const chunkSize = 10 * 1024 * 1024; // 10MB
  const buffer = new Uint8Array(chunkSize);
  
  // Fill with simulated binary pattern
  const header = `DROP_GIG_TEST_PAYLOAD_${Date.now()}_`;
  for (let i = 0; i < chunkSize; i++) {
    buffer[i] = (i % 256) ^ (header.charCodeAt(i % header.length) & 0xff);
  }

  const fullChunksCount = Math.floor(targetSizeBytes / chunkSize);
  const remainderBytes = targetSizeBytes % chunkSize;

  const chunkBlob = new Blob([buffer], { type: mimeType });
  const parts: Blob[] = [];
  for (let i = 0; i < fullChunksCount; i++) {
    parts.push(chunkBlob);
  }

  if (remainderBytes > 0) {
    parts.push(new Blob([buffer.subarray(0, remainderBytes)], { type: mimeType }));
  }

  const blob = new Blob(parts, { type: mimeType });
  return new File([blob], fileName, { type: mimeType, lastModified: Date.now() });
}

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0 || !isFinite(seconds)) return '--';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}h ${mins}m ${secs}s`;
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}
