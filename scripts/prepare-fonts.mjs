import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const path = join(root, "assets/fonts/ABCArealVariable-97fb33de45.woff2");
const expectedDigest = "97fb33de45adbe9b429bd6f766b2c1ec38682a078b4ddb8ce5a08ec794b36f68";
const chunks = Array.from({ length: 7 }, (_, index) => process.env[`AREAL_WEBFONT_${index + 1}`] || "");
const restore = !process.argv.includes("--check") && chunks.some(Boolean);

if (restore && !chunks.every(Boolean)) throw new Error("All seven private Areal font parts are required.");

let font;
if (restore) {
  font = Buffer.from(chunks.join(""), "base64");
} else {
  try {
    font = await readFile(path);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
    throw new Error("The licensed Areal webfont is missing. Follow assets/fonts/README.md before building or testing.");
  }
}

// Fail closed: a release must not silently ship a missing, changed or oversized font.
if (font.length > 190 * 1024 || font.subarray(0, 4).toString() !== "wOF2" ||
    createHash("sha256").update(font).digest("hex") !== expectedDigest) {
  throw new Error("Areal must match the approved WOFF2 file and its 190 KiB budget.");
}

if (restore) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, font);
}
console.log(`ABC Areal webfont verified (${font.length} bytes).`);
