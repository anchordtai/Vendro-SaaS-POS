/**
 * Generate a signed Onyxx license key (offline-verifiable).
 *
 * Format:
 *   ONYXX1.<base64url(payloadJSON)>.<base64url(signature)>
 *
 * Payload includes expiresAt (ISO). Expiry duration can be months/years.
 *
 * Usage examples:
 *   node tools/license/generate-license.js --customer "Acme Bar" --months 12
 *   node tools/license/generate-license.js --customer "VIP Lounge" --years 2 --bind true
 *
 * Private key location (default):
 *   tools/license/keys/license-private.pem
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function b64url(buf) {
  return Buffer.from(buf)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const key = a.slice(2);
    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args[key] = true;
    } else {
      args[key] = next;
      i++;
    }
  }
  return args;
}

const args = parseArgs(process.argv);
const customer = String(args.customer || "").trim();
if (!customer) {
  console.error('Missing --customer "Customer Name"');
  process.exit(1);
}

const years = args.years ? Number(args.years) : 0;
const months = args.months ? Number(args.months) : 0;
const days = args.days ? Number(args.days) : 0;
const bind = String(args.bind ?? "true").toLowerCase() !== "false";
const seats = args.seats ? Number(args.seats) : 1;
const plan = String(args.plan || "standard");

const durationMs =
  (Number.isFinite(years) ? years : 0) * 365 * 24 * 60 * 60 * 1000 +
  (Number.isFinite(months) ? months : 0) * 30 * 24 * 60 * 60 * 1000 +
  (Number.isFinite(days) ? days : 0) * 24 * 60 * 60 * 1000;

if (durationMs <= 0) {
  console.error("Provide a duration: --months 12 OR --years 1 (or --days)");
  process.exit(1);
}

const issuedAt = new Date().toISOString();
const expiresAt = new Date(Date.now() + durationMs).toISOString();

const payload = {
  v: 1,
  customer,
  plan,
  seats,
  bindToDevice: bind,
  issuedAt,
  expiresAt,
};

const payloadJson = JSON.stringify(payload);

const privateKeyPath = args.key
  ? path.resolve(String(args.key))
  : path.join(__dirname, "keys", "license-private.pem");

if (!fs.existsSync(privateKeyPath)) {
  console.error(`Private key not found: ${privateKeyPath}`);
  console.error("Run: node tools/license/gen-keys.js");
  process.exit(1);
}

const privatePem = fs.readFileSync(privateKeyPath, "utf8");
const signature = crypto.sign(null, Buffer.from(payloadJson), privatePem);

const token = `ONYXX1.${b64url(payloadJson)}.${b64url(signature)}`;
console.log(token);

