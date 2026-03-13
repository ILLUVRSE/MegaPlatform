#!/usr/bin/env node
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";

const rootDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const args = new Set(process.argv.slice(2));
const dryRun = args.has("--dry-run") || process.env.CI === "true" || !process.env.NEXTAUTH_SECRET;

const manifestPath = path.join(rootDir, "ops", "governance", "key-rotation.json");
const deploymentPath = path.join(rootDir, "ops", "governance", "deployment.json");
const documentedPaths = [
  path.join(rootDir, "docs", "security-rotation.md"),
  path.join(rootDir, "docs", "ops_brain", "runbooks", "key-rotation.md")
];

const requiredSecretRefs = ["NEXTAUTH_SECRET", "LIVEKIT_API_SECRET"];
const requiredConfigRefs = ["NEXTAUTH_SECRET", "LIVEKIT_API_KEY", "LIVEKIT_API_SECRET"];
const rotationWindowByRef = {
  NEXTAUTH_SECRET: 90,
  LIVEKIT_API_SECRET: 60
};
const minimumLengthByRef = {
  NEXTAUTH_SECRET: 32,
  LIVEKIT_API_SECRET: 24,
  LIVEKIT_API_KEY: 12
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

export function base64UrlEncode(value) {
  return Buffer.from(typeof value === "string" ? value : JSON.stringify(value), "utf8").toString("base64url");
}

export function base64UrlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

export function createHs256Token(payload, secret, header = { alg: "HS256", typ: "JWT" }) {
  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);
  const body = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${signature}`;
}

export function decodeJwtWithoutVerify(token) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;

  try {
    return {
      header: JSON.parse(base64UrlDecode(parts[0])),
      payload: JSON.parse(base64UrlDecode(parts[1])),
      signature: parts[2]
    };
  } catch {
    return null;
  }
}

export function verifyHs256Token(token, candidateSecrets) {
  const decoded = decodeJwtWithoutVerify(token);
  if (!decoded || decoded.header.alg !== "HS256") return null;

  const [encodedHeader, encodedPayload, encodedSignature] = token.split(".");
  const body = `${encodedHeader}.${encodedPayload}`;
  const signature = Buffer.from(encodedSignature, "base64url");

  for (const secret of candidateSecrets) {
    const expected = Buffer.from(createHmac("sha256", secret).update(body).digest("base64url"), "base64url");
    if (expected.length === signature.length && timingSafeEqual(expected, signature)) {
      return decoded;
    }
  }

  return null;
}

export function createJwtSessionToken(secret, nowSec) {
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

export function createLiveKitToken({ apiKey, apiSecret, nowSec }) {
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

export function verifyLiveKitToken(token, keyRing) {
  const decoded = decodeJwtWithoutVerify(token);
  if (!decoded) return null;

  const secret = keyRing.get(decoded.payload.iss);
  if (!secret) return null;
  return verifyHs256Token(token, [secret]);
}

export function validateSecretMaterial(refName, value) {
  assert(typeof value === "string" && value.trim().length > 0, `${refName} is empty`);
  assert(value === value.trim(), `${refName} must not include leading or trailing whitespace`);
  assert(
    value.length >= (minimumLengthByRef[refName] ?? 24),
    `${refName} must be at least ${minimumLengthByRef[refName] ?? 24} characters`
  );
  assert(!/^(test|dummy|example|replace|changeme)/i.test(value), `${refName} must not use placeholder material`);
  return value;
}

function getSecret(refName) {
  const configured = process.env[refName]?.trim();
  if (configured) return validateSecretMaterial(refName, configured);
  if (!dryRun) {
    fail(`${refName} is required when not running in dry-run mode`);
  }
  return validateSecretMaterial(refName, `${refName.toLowerCase()}-${randomBytes(24).toString("hex")}`);
}

function getLiveKitKey() {
  const configured = process.env.LIVEKIT_API_KEY?.trim();
  if (configured) return validateSecretMaterial("LIVEKIT_API_KEY", configured);
  if (!dryRun) {
    fail("LIVEKIT_API_KEY is required when not running in dry-run mode");
  }
  return validateSecretMaterial("LIVEKIT_API_KEY", `lk_${randomBytes(10).toString("hex")}`);
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

  const docs = documentedPaths.map(readText).join("\n");
  for (const refName of requiredConfigRefs) {
    assert(docs.includes(refName), `rotation docs must document ${refName}`);
  }

  for (const secretRef of requiredSecretRefs) {
    assert(entriesByRef.has(secretRef), `rotation manifest coverage missing for ${secretRef}`);
  }
}

export function simulateJwtRotation(nextAuthSecret) {
  const nowSec = Math.floor(Date.now() / 1000);
  const rotatedSecret = validateSecretMaterial("NEXTAUTH_SECRET", `${nextAuthSecret}.rotated-material`);

  const currentToken = createJwtSessionToken(nextAuthSecret, nowSec);
  const rotatedToken = createJwtSessionToken(rotatedSecret, nowSec);

  const currentDecoded = verifyHs256Token(currentToken, [nextAuthSecret]);
  const rotatedDecoded = verifyHs256Token(rotatedToken, [rotatedSecret]);
  assert(currentDecoded, "current JWT token did not validate with current secret");
  assert(rotatedDecoded, "rotated JWT token did not validate with rotated secret");

  assert(currentDecoded.payload.sub === "rotation-user", "current JWT token payload shape changed unexpectedly");
  assert(Array.isArray(currentDecoded.payload.permissions), "current JWT permissions claim must remain an array");

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

export function simulateLiveKitRotation({ apiKey, apiSecret }) {
  const nowSec = Math.floor(Date.now() / 1000);
  const rotatedApiKey = validateSecretMaterial("LIVEKIT_API_KEY", `${apiKey}_rotated`);
  const rotatedApiSecret = validateSecretMaterial("LIVEKIT_API_SECRET", `${apiSecret}.rotated-material`);

  const currentToken = createLiveKitToken({ apiKey, apiSecret, nowSec });
  const rotatedToken = createLiveKitToken({ apiKey: rotatedApiKey, apiSecret: rotatedApiSecret, nowSec });
  const currentKeyRing = new Map([[apiKey, apiSecret]]);
  const overlapKeyRing = new Map([
    [apiKey, apiSecret],
    [rotatedApiKey, rotatedApiSecret]
  ]);

  const currentDecoded = verifyLiveKitToken(currentToken, currentKeyRing);
  const rotatedDecoded = verifyLiveKitToken(rotatedToken, overlapKeyRing);
  assert(currentDecoded, "current LiveKit token did not validate with current key pair");
  assert(rotatedDecoded, "rotated LiveKit token did not validate with rotated key pair");
  assert(rotatedDecoded.payload.video?.roomJoin === true, "rotated LiveKit token lost roomJoin permissions");
  assert(rotatedDecoded.payload.iss === rotatedApiKey, "rotated LiveKit token did not carry the new issuer key");

  assert(verifyLiveKitToken(currentToken, overlapKeyRing), "current LiveKit token must validate during rotation overlap");
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
    `${requiredConfigRefs.length} key references validated; token signing and overlap verification ${
      dryRun ? "simulated" : "verified"
    }`
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  main();
}
