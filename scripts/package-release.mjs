import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const output = resolve(root, 'dist', 'three-blades');
const index = readFileSync(resolve(root, 'index.html'), 'utf8');

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

const runtimeFiles = new Set(['index.html']);
for (const match of index.matchAll(/['"(](assets\/[^'"()?#]+\.(?:png|jpe?g|webp|gif|svg|mp3|wav|ogg))['")]/gi)) {
  if (!match[1].includes('${')) runtimeFiles.add(match[1].replaceAll('\\', '/'));
}
for (const match of index.matchAll(/['"]((?:weapons|armor|accessories|materials|misc|consumables)\/[^'"]+\.(?:png|webp))['"]/gi)) {
  runtimeFiles.add(`assets/items/${match[1]}`);
}
for (const match of index.matchAll(/(?:src|href)=["']([^"'?#]+\.(?:js|css))["']/gi)) {
  const relative = match[1].replaceAll('\\', '/');
  if (!relative.startsWith('/') && !relative.includes('://')) runtimeFiles.add(relative);
}

const missing = [];
for (const relative of [...runtimeFiles].sort()) {
  const source = resolve(root, relative);
  if (!existsSync(source)) {
    missing.push(relative);
    continue;
  }
  const target = resolve(output, relative);
  mkdirSync(dirname(target), { recursive: true });
  copyFileSync(source, target);
}

if (missing.length) {
  throw new Error(`Missing runtime assets:\n${missing.join('\n')}`);
}

const invalidPaths = [...runtimeFiles].filter(path => /[^\x20-\x7E]/.test(path) || /\s/.test(path));
if (invalidPaths.length) {
  throw new Error(`Runtime paths must use ASCII without spaces:\n${invalidPaths.join('\n')}`);
}

const manifest = [...runtimeFiles].sort().map(path => ({
  path,
  bytes: statSync(resolve(output, path)).size
}));
const totalBytes = manifest.reduce((sum, file) => sum + file.bytes, 0);
writeFileSync(resolve(output, 'runtime-assets.json'), `${JSON.stringify({
  generatedAt: new Date().toISOString(),
  files: manifest.length,
  totalBytes,
  assets: manifest
}, null, 2)}\n`);

console.log(`Release ready: ${output}`);
console.log(`Files: ${manifest.length}; unpacked: ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
