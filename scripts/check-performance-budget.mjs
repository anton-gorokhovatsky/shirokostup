import { readdir, stat } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const failures = [];

const budgets = new Map([
  ["index.html", 80 * 1024],
  ["styles.css", 110 * 1024],
  ["script.js", 35 * 1024],
]);

for (const [file, maximumBytes] of budgets) {
  const { size } = await stat(join(repositoryRoot, file));
  if (size > maximumBytes) {
    failures.push(`${file} is ${size} bytes; budget is ${maximumBytes} bytes.`);
  }
}

const imageDirectory = join(repositoryRoot, "assets", "images");
const imageEntries = await readdir(imageDirectory, { recursive: true, withFileTypes: true });
let totalImageBytes = 0;
let largestImage = { path: "", size: 0 };

for (const entry of imageEntries) {
  if (!entry.isFile()) continue;
  const relativePath = join(entry.parentPath ?? entry.path, entry.name).slice(imageDirectory.length + 1);
  const { size } = await stat(join(imageDirectory, relativePath));
  totalImageBytes += size;
  if (size > largestImage.size) largestImage = { path: relativePath, size };
}

const maximumImageBytes = 750 * 1024;
const maximumTotalImageBytes = 12 * 1024 * 1024;

if (largestImage.size > maximumImageBytes) {
  failures.push(
    `Largest image ${largestImage.path} is ${largestImage.size} bytes; per-image budget is ${maximumImageBytes} bytes.`,
  );
}

if (totalImageBytes > maximumTotalImageBytes) {
  failures.push(`Image library is ${totalImageBytes} bytes; budget is ${maximumTotalImageBytes} bytes.`);
}

if (failures.length) {
  console.error(`Performance budget failed (${failures.length}):`);
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    `Performance budget passed: ${totalImageBytes} image bytes; largest image ${largestImage.path} (${largestImage.size} bytes).`,
  );
}
