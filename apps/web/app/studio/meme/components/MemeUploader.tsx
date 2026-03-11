/**
 * Meme uploader component.
 * Request/response: uses signed upload flow for Studio assets.
 * Guard: client component.
 */
"use client";

import UploadWidget from "@/components/UploadWidget";

export default function MemeUploader({
  projectId,
  onUploaded
}: {
  projectId: string | null;
  onUploaded: (url: string) => void;
}) {
  return (
    <UploadWidget
      projectId={projectId}
      kind="IMAGE_UPLOAD"
      onUploaded={(asset) => onUploaded(asset.url)}
    />
  );
}
