const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function licenseFilePath(userDataPath) {
  return path.join(userDataPath, "license.json");
}

function readLicense(userDataPath) {
  try {
    const p = licenseFilePath(userDataPath);
    if (!fs.existsSync(p)) return null;
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeLicense(userDataPath, data) {
  const p = licenseFilePath(userDataPath);
  fs.writeFileSync(p, JSON.stringify(data, null, 2), "utf8");
}

function base64urlToBuffer(s) {
  const padded = String(s).replace(/-/g, "+").replace(/_/g, "/");
  const padLen = (4 - (padded.length % 4)) % 4;
  const b64 = padded + "=".repeat(padLen);
  return Buffer.from(b64, "base64");
}

function base64urlToString(s) {
  return base64urlToBuffer(s).toString("utf8");
}

function computeFingerprint() {
  // Lightweight offline fingerprint (not tamper-proof, but practical for offline POS)
  const input = `${process.platform}|${process.arch}|${require("os").hostname()}`;
  return crypto.createHash("sha256").update(input).digest("hex").slice(0, 24);
}

function isExpired(expiresAt) {
  if (!expiresAt) return true;
  return Date.now() > new Date(expiresAt).getTime();
}

function loadPublicKeyPem() {
  // Embedded public key used to verify signed licenses offline
  const p = path.join(__dirname, "license-public.pem");
  if (!fs.existsSync(p)) return null;
  const pem = fs.readFileSync(p, "utf8").trim();
  return pem || null;
}

function verifyToken(token) {
  const t = String(token || "").trim();
  if (!t.startsWith("ONYXX1.")) return { ok: false, status: "invalid_key", message: "Invalid license format" };
  const parts = t.split(".");
  if (parts.length !== 3) return { ok: false, status: "invalid_key", message: "Invalid license format" };

  const payloadJson = base64urlToString(parts[1]);
  let payload;
  try {
    payload = JSON.parse(payloadJson);
  } catch {
    return { ok: false, status: "invalid_key", message: "Invalid license payload" };
  }

  const pub = loadPublicKeyPem();
  if (!pub) return { ok: false, status: "missing_public_key", message: "License verifier not configured" };

  const sig = base64urlToBuffer(parts[2]);
  const verified = crypto.verify(null, Buffer.from(payloadJson), pub, sig);
  if (!verified) return { ok: false, status: "invalid_signature", message: "License signature invalid" };

  // Basic payload validation
  if (!payload?.expiresAt || !payload?.issuedAt) return { ok: false, status: "invalid_payload", message: "Missing expiry/issue date" };
  if (isExpired(payload.expiresAt)) return { ok: false, status: "expired", message: "License expired", payload };

  return { ok: true, status: "active", payload };
}

function checkLicense(userDataPath) {
  const lic = readLicense(userDataPath);
  if (!lic) {
    return { ok: false, status: "missing", message: "License not activated" };
  }

  // Legacy licenses (old format) are no longer accepted
  if (!lic.token) {
    return { ok: false, status: "invalid_key", message: "License must be re-activated with a new key" };
  }

  const verified = verifyToken(lic.token);
  if (!verified.ok) return verified;

  const payload = verified.payload;
  const bind = payload.bindToDevice !== false; // default true
  if (bind) {
    const fp = computeFingerprint();
    if (lic.fingerprint && lic.fingerprint !== fp) {
      return { ok: false, status: "invalid_device", message: "License not valid for this device" };
    }
  }

  return {
    ok: true,
    status: "active",
    license: {
      token: lic.token,
      activatedAt: lic.activatedAt,
      fingerprint: lic.fingerprint,
      customer: payload.customer,
      plan: payload.plan,
      seats: payload.seats,
      issuedAt: payload.issuedAt,
      expiresAt: payload.expiresAt,
      bindToDevice: bind,
    },
  };
}

function activateLicense(userDataPath, licenseKey) {
  const token = String(licenseKey || "").trim();
  const verified = verifyToken(token);
  if (!verified.ok) return verified;

  const payload = verified.payload;
  const bind = payload.bindToDevice !== false; // default true
  const activatedAt = new Date().toISOString();

  const license = {
    token,
    activatedAt,
    fingerprint: bind ? computeFingerprint() : null,
  };

  writeLicense(userDataPath, license);
  return checkLicense(userDataPath);
}

module.exports = {
  checkLicense,
  activateLicense,
  readLicense,
};


