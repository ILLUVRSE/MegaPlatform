#!/usr/bin/env node
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run") || process.env.CI === "true" || !process.env.NEXTAUTH_SECRET;

const manifestPath = path.join(rootDir, "ops", "governance", "key-rotation.json");
const deploymentPath = path.join(rootDir, "ops", "governance", "deployment.json");
const runbookPath = path.join(rootDir, "docs", "ops_brain", "runbooks", "key-rotation.md");

const requiredSecretRefs = ["NEXTAUTH_SECRET", "LIVEKIT_API_SECRET"];
const requiredConfigRefs = ["NEXTAUTH_SECRET", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"];
const rotationWindowByRef = {
  NEXTAUTH_SECRET: 90,
  LIVEKIT_API_SECRET: 60
};

function fail(message) {
  process.stderr.write(`[key-rotation] FAIL: ${message}\n`);
  process.exit(1);
}

function pass(message) {
  process.stdout.write(`[key-rotation] PASS: ${message}\n`);
}

function readJson(filePath) {
  return JSON.parse(readFileSync(filePath, "utf8"));
}

function readText(filePath) {
  return readFileSync(filePath, "utf8");
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function base64UrlEncode(value) {
  return Buffer.from(typeof value === "string" ? value : JSON.stringify(value), "utf8").toString("base64url");
}

function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function createHs256Token(payload, secret, header = { alg: "HS256", typ: "JWT" }) {
  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const body = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

function verifyHs256Token(token, candidateSecrets) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const header = JSON.parse(base64UrlDecode(encodedHeader));
  const payload = JSON.parse(base64UrlDecode(encodedPayload));

  if (header.alg !== "HS256") return null;

  const body = `${encodedHeader}.${encodedPayload}`;
  const signature = Buffer.from(encodedSignature, "base64url");

  for (const secret of candidateSecrets) {
    const expected = Buffer.from(createHmac("sha256", secret).update(body).digest("base64url"), "base64url");
    if (expected.length === signature.length && timingSafeEqual(expected, signature)) {
      return { header, payload };
    }
  }

  return null;
}

function createJwtSessionToken(secret, nowSec) {
  return createHs256Token(
    {
      sub: "rotation-user",
      userId: "rotation-user",
      role: "admin",
      permissions: ["party:host"],
      iat: nowSec,
      exp: nowSec + 60 * 60
    },
    secret
  );
}

function createLiveKitToken({ apiKey, apiSecret, nowSec }) {
  return createHs256Token(
    {
      iss: apiKey,
      sub: "rotation-user",
      iat: nowSec,
      nbf: nowSec - 5,
      exp: nowSec + 60 * 60,
      video: {
        room: "rotation-room",
        roomJoin: true,
        canPublish: true,
        canSubscribe: true
      }
    },
    apiSecret
  );
}

function verifyLiveKitToken(token, keyRing) {
  const untrusted = token.split(".");
  if (untrusted.length !== 3) return null;
  const payload = JSON.parse(base64UrlDecode(untrusted[1]));
  const secret = keyRing.get(payload.iss);
  if (!secret) return null;
  return verifyHs256Token(token, [secret]);
}

function getSecret(refName) {
  const configured = process.env[refName]?.trim();
  if (configured) return configured;
  if (!dryRun) {
    fail(`${refName} is required when not running in dry-run mode`);
  }
  return `${refName.toLowerCase()}-${randomBytes(24).toString("hex")}`;
}

function getLiveKitKey() {
  const configured = process.env.LIVEKIT_API_KEY?.trim();
  if (configured) return configured;
  if (!dryRun) {
    fail("LIVEKIT_API_KEY is required when not running in dry-run mode");
  }
  return `lk_${randomBytes(8).toString("hex")}`;
}

function validateManifest() {
  const manifest = readJson(manifestPath);
  assert(Array.isArray(manifest), "ops/governance/key-rotation.json must be an array");

  const now = Date.now();
  const entriesByRef = new Map();

  for (const entry of manifest) {
    assert(typeof entry?.id === "string" && entry.id.length > 0, `invalid manifest id: ${JSON.stringify(entry)}`);
    assert(
      typeof entry?.secretRef === "string" && entry.secretRef.length > 0,
      `invalid secretRef for ${entry?.id ?? "<unknown>"}`
    );
    assert(typeof entry?.owner === "string" && entry.owner.length > 0, `missing owner for ${entry.secretRef}`);
    assert(Number.isInteger(entry?.maxAgeDays) && entry.maxAgeDays > 0, `invalid maxAgeDays for ${entry.secretRef}`);

    const rotatedAt = Date.parse(String(entry?.lastRotatedAt ?? ""));
    assert(Number.isFinite(rotatedAt), `invalid lastRotatedAt for ${entry.secretRef}`);

    const ageDays = (now - rotatedAt) / (1000 * 60 * 60 * 24);
    assert(ageDays <= entry.maxAgeDays, `${entry.secretRef} is overdue (${Math.floor(ageDays)}d > ${entry.maxAgeDays}d)`);

    entriesByRef.set(entry.secretRef, entry);
  }

  for (const secretRef of requiredSecretRefs) {
    const entry = entriesByRef.get(secretRef);
    assert(entry, `missing manifest entry for ${secretRef}`);
    assert(
      entry.maxAgeDays <= rotationWindowByRef[secretRef],
      `${secretRef} maxAgeDays must stay at or below ${rotationWindowByRef[secretRef]}`
    );
  }

  return entriesByRef;
}

function validateConfigReferences(entriesByRef) {
  const deploymentConfig = readJson(deploymentPath);
  assert(Array.isArray(deploymentConfig), "ops/governance/deployment.json must be an array");

  const stage = deploymentConfig.find((entry) => entry.env === "stage");
  const prod = deploymentConfig.find((entry) => entry.env === "prod");
  assert(stage && Array.isArray(stage.requiredEnv), "stage deployment env keys are missing");
  assert(prod && Array.isArray(prod.requiredEnv), "prod deployment env keys are missing");

  for (const refName of requiredConfigRefs) {
    assert(stage.requiredEnv.includes(refName), `stage deployment config must require ${refName}`);
    assert(prod.requiredEnv.includes(refName), `prod deployment config must require ${refName}`);
  }

  const runbook = readText(runbookPath);
  for (const refName of requiredConfigRefs) {
    assert(runbook.includes(refName), `runbook must document ${refName}`);
  }

  for (const secretRef of requiredSecretRefs) {
    assert(entriesByRef.has(secretRef), `rotation manifest coverage missing for ${secretRef}`);
  }
}

function simulateJwtRotation(nextAuthSecret) {
  const nowSec = Math.floor(Date.now() / 1000);
  const rotatedSecret = `${nextAuthSecret}.rotated`;

  const currentToken = createJwtSessionToken(nextAuthSecret, nowSec);
  assert(verifyHs256Token(currentToken, [nextAuthSecret]), "current JWT token did not validate with current secret");

  const rotatedToken = createJwtSessionToken(rotatedSecret, nowSec);
  assert(verifyHs256Token(rotatedToken, [rotatedSecret]), "rotated JWT token did not validate with rotated secret");

  assert(
    verifyHs256Token(currentToken, [rotatedSecret, nextAuthSecret]),
    "current JWT token must remain valid during overlap window after rotation"
  );
  assert(
    verifyHs256Token(rotatedToken, [rotatedSecret, nextAuthSecret]),
    "rotated JWT token must validate when rollover accepts current and previous secrets"
  );
  assert(
    !verifyHs256Token(currentToken, [rotatedSecret]),
    "JWT rotation simulation did not prove that old tokens are rejected after overlap removal"
  );
}

function simulateLiveKitRotation({ apiKey, apiSecret }) {
  const nowSec = Math.floor(Date.now() / 1000);
  const rotatedApiKey = `${apiKey}_rotated`;
  const rotatedApiSecret = `${apiSecret}.rotated`;

  const currentToken = createLiveKitToken({ apiKey, apiSecret, nowSec });
  const currentKeyRing = new Map([[apiKey, apiSecret]]);
  assert(verifyLiveKitToken(currentToken, currentKeyRing), "current LiveKit token did not validate with current key pair");

  const overlapKeyRing = new Map([
    [apiKey, apiSecret],
    [rotatedApiKey, rotatedApiSecret]
  ]);
  const rotatedToken = createLiveKitToken({ apiKey: rotatedApiKey, apiSecret: rotatedApiSecret, nowSec });

  assert(verifyLiveKitToken(currentToken, overlapKeyRing), "current LiveKit token must validate during rotation overlap");
  assert(verifyLiveKitToken(rotatedToken, overlapKeyRing), "rotated LiveKit token did not validate with rotated key pair");
  assert(
    !verifyLiveKitToken(currentToken, new Map([[rotatedApiKey, rotatedApiSecret]])),
    "LiveKit rotation simulation did not prove the old key pair can be retired"
  );
}

function main() {
  const entriesByRef = validateManifest();
  validateConfigReferences(entriesByRef);

  const nextAuthSecret = getSecret("NEXTAUTH_SECRET");
  const liveKitApiSecret = getSecret("LIVEKIT_API_SECRET");
  const liveKitApiKey = getLiveKitKey();

  simulateJwtRotation(nextAuthSecret);
  simulateLiveKitRotation({ apiKey: liveKitApiKey, apiSecret: liveKitApiSecret });

  pass(
    `${requiredConfigRefs.length} key references validated; JWT and LiveKit rotation dry-run ${dryRun ? "simulated" : "verified"}`
  );
}

main();
