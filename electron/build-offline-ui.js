// Copies the Electron offline UI into /out so production Electron can load file://out/index.html
const fs = require("fs");
const path = require("path");

const srcDir = path.join(__dirname, "offline-ui");
const outDir = path.join(__dirname, "..", "out");

function copyRecursive(from, to) {
  if (!fs.existsSync(from)) throw new Error(`Missing source dir: ${from}`);
  if (!fs.existsSync(to)) fs.mkdirSync(to, { recursive: true });

  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(src, dst);
    } else {
      fs.copyFileSync(src, dst);
    }
  }
}

console.log("🧱 Building offline UI → out/");
if (fs.existsSync(outDir)) {
  fs.rmSync(outDir, { recursive: true, force: true });
}
fs.mkdirSync(outDir, { recursive: true });
copyRecursive(srcDir, outDir);
console.log("✅ Offline UI ready at out/index.html");

