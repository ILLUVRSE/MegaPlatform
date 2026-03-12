const BASE_URL = process.env.ILLUVRSE_BASE_URL || "http://localhost:3000";
const COOKIE = process.env.ILLUVRSE_SESSION_COOKIE || "";

async function request(path, init = {}) {
  const headers = new Headers(init.headers || {});
  if (COOKIE) headers.set("cookie", COOKIE);
  if (!headers.has("content-type") && init.body) headers.set("content-type", "application/json");
  const response = await fetch(`${BASE_URL}${path}`, { ...init, headers });
  const text = await response.text();
  return { response, text };
}

async function main() {
  const create = await request("/api/party/create", {
    method: "POST",
    body: JSON.stringify({ name: "Codex Smoke Party", seatCount: 5, isPublic: false })
  });
  if (!create.response.ok) {
    throw new Error(`party create failed: ${create.response.status} ${create.text}`);
  }

  const created = JSON.parse(create.text);
  const code = created.code;
  if (!code) throw new Error("party create response missing code");

  for (let index = 0; index < 5; index += 1) {
    const ping = await request(`/api/party/${code}/presence/ping`, { method: "POST" });
    if (!ping.response.ok) {
      throw new Error(`presence ping failed for participant ${index + 1}: ${ping.response.status} ${ping.text}`);
    }
  }

  const voice = await request(`/api/party/${code}/voice/token`, { method: "POST" });
  if (![200, 503].includes(voice.response.status)) {
    throw new Error(`voice token returned unexpected status: ${voice.response.status} ${voice.text}`);
  }

  const events = await request(`/api/party/${code}/events`);
  if (!events.response.ok) {
    throw new Error(`party events stream failed: ${events.response.status} ${events.text}`);
  }

  console.log(JSON.stringify({ ok: true, code, voiceStatus: voice.response.status }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
