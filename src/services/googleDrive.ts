import { GoogleDriveFile } from '../types';

declare global {
  interface Window {
    gapi?: any;
    google?: any;
  }
}

/**
 * Ensures Google Picker API client script is loaded and ready
 */
export async function loadGooglePickerApi(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('Window not defined'));

    if (window.google?.picker) {
      return resolve();
    }

    const checkGapi = () => {
      if (window.gapi) {
        window.gapi.load('picker', {
          callback: () => resolve(),
          onerror: () => reject(new Error('Failed to load Google Picker via gapi.load')),
        });
      } else {
        // Load api.js script dynamically if not present
        const existingScript = document.querySelector('script[src*="apis.google.com/js/api.js"]');
        if (!existingScript) {
          const script = document.createElement('script');
          script.src = 'https://apis.google.com/js/api.js';
          script.async = true;
          script.defer = true;
          script.onload = () => {
            window.gapi.load('picker', {
              callback: () => resolve(),
              onerror: () => reject(new Error('Failed to load Google Picker')),
            });
          };
          script.onerror = () => reject(new Error('Failed to load Google API script'));
          document.body.appendChild(script);
        } else {
          setTimeout(checkGapi, 150);
        }
      }
    };

    checkGapi();
  });
}

/**
 * Open native Google Picker dialog to choose files directly from Google Drive
 */
export async function showGooglePicker(
  accessToken: string,
  onFilePicked: (file: { id: string; name: string; mimeType: string; sizeBytes?: number }) => void,
  onError?: (error: any) => void
): Promise<void> {
  try {
    await loadGooglePickerApi();

    if (!window.google?.picker) {
      throw new Error('Google Picker library is not ready');
    }

    const pickerOrigin =
      window.location.ancestorOrigins && window.location.ancestorOrigins.length > 0
        ? window.location.ancestorOrigins[window.location.ancestorOrigins.length - 1]
        : window.location.origin;

    const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
      .setIncludeFolders(true)
      .setSelectFolderEnabled(false);

    const picker = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setOrigin(pickerOrigin)
      .setCallback((data: any) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const doc = data.docs?.[0];
          if (doc) {
            onFilePicked({
              id: doc.id,
              name: doc.name,
              mimeType: doc.mimeType || 'application/octet-stream',
              sizeBytes: doc.sizeBytes ? parseInt(doc.sizeBytes, 10) : undefined,
            });
          }
        }
      })
      .build();

    picker.setVisible(true);
  } catch (err) {
    console.error('Error opening Google Picker:', err);
    if (onError) onError(err);
  }
}

/**
 * Upload a file directly into user's Google Drive using Resumable Drive v3 API
 */
export async function uploadToGoogleDrive(
  fileBlob: Blob,
  fileName: string,
  mimeType: string,
  accessToken: string,
  onProgress?: (percent: number) => void
): Promise<{ id: string; name: string; webViewLink?: string }> {
  // Step 1: Initialize resumable upload
  const initRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': mimeType || 'application/octet-stream',
      'X-Upload-Content-Length': fileBlob.size.toString(),
    },
    body: JSON.stringify({
      name: fileName,
      description: 'Exported from DropGig High-Performance Large File Share',
    }),
  });

  if (!initRes.ok) {
    const errorData = await initRes.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Google Drive upload init failed (${initRes.status})`);
  }

  const uploadLocation = initRes.headers.get('Location');
  if (!uploadLocation) {
    throw new Error('Did not receive upload location header from Google Drive API');
  }

  if (onProgress) onProgress(20);

  // Step 2: Send file content
  const uploadRes = await fetch(uploadLocation, {
    method: 'PUT',
    headers: {
      'Content-Type': mimeType || 'application/octet-stream',
    },
    body: fileBlob,
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    throw new Error(`Google Drive upload failed: ${errText}`);
  }

  if (onProgress) onProgress(100);

  const driveData = await uploadRes.json();
  const fileId = driveData.id;
  const webViewLink = `https://drive.google.com/file/d/${fileId}/view`;

  return {
    id: fileId,
    name: driveData.name || fileName,
    webViewLink,
  };
}

/**
 * Fetch list of recent files from user's Google Drive
 */
export async function listGoogleDriveFiles(accessToken: string): Promise<GoogleDriveFile[]> {
  const url =
    'https://www.googleapis.com/drive/v3/files?pageSize=25&fields=files(id,name,mimeType,size,webViewLink,iconLink,createdTime)&orderBy=modifiedTime%20desc';

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || 'Failed to list Google Drive files');
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Download file binary blob from Google Drive by fileId
 */
export async function downloadFromGoogleDrive(fileId: string, accessToken: string): Promise<Blob> {
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to download file from Google Drive (${res.status})`);
  }

  return res.blob();
}
