/**
 * S3-compatible storage helpers.
 * Request/response: provides signed upload URLs and buffer uploads.
 * Guard: server-side only; requires S3 env vars.
 */
import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const S3_ENDPOINT = process.env.S3_ENDPOINT ?? "";
const S3_BUCKET = process.env.S3_BUCKET ?? "";
const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY ?? "";
const S3_SECRET_KEY = process.env.S3_SECRET_KEY ?? "";
const S3_PUBLIC_BASE_URL = process.env.S3_PUBLIC_BASE_URL ?? "";
const S3_SIGNED_UPLOAD_TTL_SEC = Number(process.env.S3_SIGNED_UPLOAD_TTL_SEC ?? 300);
const S3_REGION = process.env.S3_REGION ?? "us-east-1";
const S3_FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE !== "false";

const MIN_SIGNED_UPLOAD_TTL_SEC = 60;
const MAX_SIGNED_UPLOAD_TTL_SEC = 900;

function normalizeBase(base: string) {
  return base.trim().replace(/\/$/, "");
}

function isWeakPublicBase(value: string) {
  if (!value) return false;
  if (process.env.NODE_ENV !== "production") return false;
  return value.startsWith("http://");
}

function getSignedTtlSec() {
  if (!Number.isFinite(S3_SIGNED_UPLOAD_TTL_SEC)) return 300;
  return Math.min(MAX_SIGNED_UPLOAD_TTL_SEC, Math.max(MIN_SIGNED_UPLOAD_TTL_SEC, Math.floor(S3_SIGNED_UPLOAD_TTL_SEC)));
}

function getClient() {
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY || !S3_SECRET_KEY) {
    throw new Error("Missing S3 configuration");
  }

  if (isWeakPublicBase(S3_ENDPOINT)) {
    throw new Error("S3_ENDPOINT must use HTTPS in production.");
  }
  if (isWeakPublicBase(S3_PUBLIC_BASE_URL)) {
    throw new Error("S3_PUBLIC_BASE_URL must use HTTPS in production.");
  }

  return new S3Client({
    region: S3_REGION,
    endpoint: S3_ENDPOINT,
    credentials: {
      accessKeyId: S3_ACCESS_KEY,
      secretAccessKey: S3_SECRET_KEY
    },
    forcePathStyle: S3_FORCE_PATH_STYLE
  });
}

export async function getSignedUploadUrl(payload: {
  key: string;
  contentType: string;
  contentLength: number;
  expiresInSec?: number;
}) {
  const client = getClient();
  const { key, contentType, contentLength } = payload;
  const ttl = Number.isFinite(payload.expiresInSec)
    ? Math.min(MAX_SIGNED_UPLOAD_TTL_SEC, Math.max(MIN_SIGNED_UPLOAD_TTL_SEC, Math.floor(payload.expiresInSec as number)))
    : getSignedTtlSec();
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
    ContentLength: contentLength
  });
  return getSignedUrl(client, command, { expiresIn: ttl });
}

export async function uploadBuffer(key: string, buffer: Buffer, contentType: string) {
  if (process.env.VITEST === "true" || process.env.NODE_ENV === "test") {
    return getPublicUrl(key);
  }
  const client = getClient();
  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    Body: buffer,
    ContentType: contentType
  });
  await client.send(command);
  return getPublicUrl(key);
}

export function getPublicUrl(key: string) {
  if (!S3_ENDPOINT || !S3_BUCKET) {
    throw new Error("Missing S3 configuration");
  }
  const base = normalizeBase(S3_PUBLIC_BASE_URL || S3_ENDPOINT);
  return `${base}/${S3_BUCKET}/${key}`;
}

export async function headObject(key: string) {
  if (process.env.VITEST === "true" || process.env.NODE_ENV === "test") {
    return null;
  }
  const client = getClient();
  const command = new HeadObjectCommand({
    Bucket: S3_BUCKET,
    Key: key
  });
  const response = await client.send(command);
  return {
    contentType: response.ContentType ?? null,
    contentLength: typeof response.ContentLength === "number" ? response.ContentLength : null
  };
}

export async function deleteObject(key: string) {
  if (process.env.VITEST === "true" || process.env.NODE_ENV === "test") {
    return;
  }
  const client = getClient();
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: key
  });
  await client.send(command);
}
