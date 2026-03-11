/**
 * Unit tests for storage helpers.
 * Request/response: validates public URL and upload calls.
 * Guard: mocks AWS S3 client.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";

const sendMock = vi.hoisted(() => vi.fn().mockResolvedValue({}));
vi.mock("@aws-sdk/client-s3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@aws-sdk/client-s3")>();
  return {
    ...actual,
    S3Client: vi.fn().mockImplementation(() => ({ send: sendMock })),
    PutObjectCommand: vi.fn()
  };
});

describe("storage helpers", () => {
  beforeEach(() => {
    sendMock.mockClear();
    process.env.S3_ENDPOINT = "http://localhost:9000";
    process.env.S3_BUCKET = "illuvrse";
    process.env.S3_ACCESS_KEY = "key";
    process.env.S3_SECRET_KEY = "secret";
    vi.resetModules();
  });

  it("builds public URL from endpoint + bucket", async () => {
    const { getPublicUrl } = await import("@illuvrse/storage");
    const url = getPublicUrl("path/file.png");
    expect(url).toBe("http://localhost:9000/illuvrse/path/file.png");
  });

  it("uploads buffer via S3 client", async () => {
    const { uploadBuffer } = await import("@illuvrse/storage");
    const url = await uploadBuffer("path/file.png", Buffer.from("data"), "image/png");
    expect(url).toContain("/illuvrse/path/file.png");
  });
});
