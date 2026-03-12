import { describe, expect, it } from "vitest";

import { POST as uploadPost } from "@/app/api/storage/upload/route";

describe("storage upload API", () => {
  it("returns a deprecation response", async () => {
    const request = new Request("http://localhost/api/storage/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dataUrl: "data:image/png;base64,aGVsbG8=", filename: "file.png" })
    });
    const response = await uploadPost(request);
    const payload = await response.json();
    expect(response.status).toBe(410);
    expect(payload.error).toContain("Deprecated upload API");
    expect(payload.replacement).toBe("http://localhost/api/uploads/sign");
  });
});
