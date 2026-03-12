/**
 * Upload helpers for signed URL flow.
 * Request/response: sign -> PUT -> finalize.
 */
import type { UploadKind } from "./uploadRules";

type SignResponse = {
  objectKey: string;
  uploadUrl: string;
  expiresInSec: number;
  signedAt: string;
  publicUrl: string;
  headers?: Record<string, string>;
};

export async function signUpload(payload: {
  projectId: string;
  filename: string;
  contentType: string;
  uploadId: string;
  contentLength?: number;
}) {
  const response = await fetch("/api/uploads/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unable to sign upload." }));
    throw new Error(error.error ?? "Unable to sign upload.");
  }
  return (await response.json()) as SignResponse;
}

export function putUpload(payload: {
  uploadUrl: string;
  file: File;
  contentType: string;
  onProgress?: (progress: number) => void;
}) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", payload.uploadUrl, true);
    xhr.setRequestHeader("Content-Type", payload.contentType);

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;
      payload.onProgress?.(event.loaded / event.total);
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error("Upload failed."));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed."));
    xhr.send(payload.file);
  });
}

export async function finalizeUpload(payload: {
  projectId: string;
  kind: UploadKind;
  key: string;
  publicUrl: string;
  contentType: string;
  contentLength: number;
}) {
  const response = await fetch("/api/uploads/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: "Unable to finalize upload." }));
    throw new Error(error.error ?? "Unable to finalize upload.");
  }
  return (await response.json()) as { asset: { id: string; url: string; kind: string } };
}
