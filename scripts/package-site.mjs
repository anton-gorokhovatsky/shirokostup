import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const destination = join(root, '_site');
const copyPublicFile = async (relative) => writeFile(join(destination, relative), await readFile(join(root, relative)), { flag: 'wx' });
// Fail on a reused artifact directory so stale files can never leak into a release.
await mkdir(destination);
for (const file of ['index.html', '404.html', 'styles.css', 'script.js', 'CNAME', 'robots.txt', 'sitemap.xml']) {
  await copyPublicFile(file);
}
async function copyAssets(relative) {
  for (const entry of await readdir(join(root, relative), { withFileTypes: true })) {
    const path = join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Public assets must not be symlinks: ${path}`);
    if (entry.isDirectory()) { await mkdir(join(destination, path), { recursive: true }); await copyAssets(path); }
    else if (/\.(?:avif|webp|jpe?g|png|svg|pdf|woff2?)$/i.test(entry.name)) await copyPublicFile(path);
  }
}
await mkdir(join(destination, 'assets'));
await copyAssets('assets');
console.log(`Packaged public files in _site (${(await stat(join(destination, 'index.html'))).size} HTML bytes). Source, tests, notes and dependencies are excluded.`);
