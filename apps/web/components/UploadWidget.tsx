/**
 * Reusable signed upload widget for Studio.
 * Request/response: signs, uploads, then finalizes StudioAsset creation.
 * Guard: client component.
 */
"use client";

import { useState } from "react";
import { finalizeUpload, putUpload, signUpload } from "@/lib/uploads";
import { getAcceptForKind, type UploadKind } from "@/lib/uploadRules";

type UploadWidgetProps = {
  projectId: string | null;
  kind: UploadKind;
  onUploaded: (asset: { id: string; url: string; kind: string }) => void;
};

export default function UploadWidget({ projectId, kind, onUploaded }: UploadWidgetProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFile = async (file: File) => {
    if (!projectId) {
      setError("Create a project first.");
      return;
    }

    setError(null);
    setStatus("Signing upload...");
    setProgress(0);

    try {
      const signPayload = await signUpload({
        projectId,
        filename: file.name,
        contentType: file.type,
        uploadId: crypto.randomUUID(),
        contentLength: file.size
      });

      setStatus("Uploading...");
      await putUpload({
        uploadUrl: signPayload.uploadUrl,
        file,
        contentType: file.type,
        onProgress: (value) => setProgress(value)
      });

      setStatus("Finalizing...");
      const result = await finalizeUpload({
        projectId,
        kind,
        key: signPayload.objectKey,
        publicUrl: signPayload.publicUrl,
        contentType: file.type,
        contentLength: file.size
      });

      setStatus("Upload complete.");
      setProgress(1);
      onUploaded(result.asset);
    } catch (err) {
      setStatus(null);
      setProgress(0);
      setError(err instanceof Error ? err.message : "Upload failed.");
    }
  };

  return (
    <div className="party-card space-y-3">
      <h3 className="text-lg font-semibold">Upload Asset</h3>
      <input
        type="file"
        accept={getAcceptForKind(kind)}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      {status ? <p className="text-sm text-illuvrse-muted">{status}</p> : null}
      {error ? <p className="text-sm text-illuvrse-danger">{error}</p> : null}
      {progress > 0 ? (
        <div className="h-2 w-full rounded-full bg-illuvrse-border">
          <div
            className="h-2 rounded-full bg-illuvrse-primary"
            style={{ width: `${Math.round(progress * 100)}%` }}
          />
        </div>
      ) : null}
    </div>
  );
}
