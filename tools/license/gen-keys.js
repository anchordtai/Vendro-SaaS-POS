/**
 * Generate an Ed25519 keypair for signing licenses.
 *
 * - Public key is copied into: electron/license-public.pem
 * - Private key is written to: tools/license/keys/license-private.pem (gitignored)
 *
 * Run:
 *   node tools/license/gen-keys.js
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const keysDir = path.join(__dirname, "keys");
const privatePath = path.join(keysDir, "license-private.pem");
const publicPath = path.join(keysDir, "license-public.pem");
const appPublicPath = path.join(__dirname, "..", "..", "electron", "license-public.pem");

if (!fs.existsSync(keysDir)) fs.mkdirSync(keysDir, { recursive: true });

const { publicKey, privateKey } = crypto.generateKeyPairSync("ed25519");
const publicPem = publicKey.export({ type: "spki", format: "pem" });
const privatePem = privateKey.export({ type: "pkcs8", format: "pem" });

fs.writeFileSync(privatePath, privatePem, "utf8");
fs.writeFileSync(publicPath, publicPem, "utf8");
fs.writeFileSync(appPublicPath, publicPem, "utf8");

console.log("✅ Generated license keys");
console.log(`- Private: ${privatePath}`);
console.log(`- Public : ${publicPath}`);
console.log(`- App pub: ${appPublicPath}`);
console.log("\nIMPORTANT: Keep the private key secret. Do not commit it.");

