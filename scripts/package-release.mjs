import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const output = resolve(root, 'dist', 'three-blades');
const index = readFileSync(resolve(root, 'index.html'), 'utf8');

rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

const runtimeFiles = new Set(['index.html']);
const scannedSources = new Set();

function addRelativePath(path) {
  const relative = path.replaceAll('\\', '/');
  if (!relative.startsWith('/') && !relative.includes('://')) runtimeFiles.add(relative);
}

function scanRuntimeSource(relative, source) {
  if (scannedSources.has(relative)) return;
  scannedSources.add(relative);
  for (const match of source.matchAll(/['"(](assets\/[^'"()?#]+\.(?:png|jpe?g|webp|gif|svg|mp3|wav|ogg))['")]/gi)) {
    if (!match[1].includes('${')) runtimeFiles.add(match[1].replaceAll('\\', '/'));
  }
  // ITEM_ICON_MAP values are relative to assets/items/. Listing folder names
  // here meant every new category (progression/, ...) silently shipped without
  // its icons, so match any single-folder item path instead.
  for (const match of source.matchAll(/['"]([a-z0-9_-]+\/[a-z0-9_-]+\.(?:png|webp))['"]/gi)) {
    const candidate = `assets/items/${match[1]}`;
    if (existsSync(resolve(root, candidate))) runtimeFiles.add(candidate);
  }
  for (const match of source.matchAll(/(?:src|href)=["']([^"'?#]+\.(?:js|css))["']/gi)) addRelativePath(match[1]);
  // A url() inside a stylesheet resolves against that stylesheet, not the root.
  // Moving the CSS out of index.html turned assets/ui/fon.png into
  // ../assets/ui/fon.png, and the plain assets/ scan stopped seeing it, so the
  // menu and map backgrounds silently dropped out of the archive.
  for (const match of source.matchAll(/url\(\s*['"]?([^'")?#]+\.(?:png|jpe?g|webp|gif|svg|woff2?|ttf|otf))['"]?\s*\)/gi)) {
    const raw = match[1].replaceAll('\\', '/');
    if (raw.startsWith('data:') || raw.includes('://') || raw.startsWith('/')) continue;
    addRelativePath(posix.normalize(posix.join(posix.dirname(relative.replaceAll('\\', '/')), raw)));
  }
}

scanRuntimeSource('index.html', index);
for (const relative of [...runtimeFiles].filter(path => path.endsWith('.js') || path.endsWith('.css'))) {
  const sourcePath = resolve(root, relative);
  if (existsSync(sourcePath)) scanRuntimeSource(relative, readFileSync(sourcePath, 'utf8'));
}

// The bundled font is under the SIL Open Font License, which requires its licence
// text to travel with any copy of the font. Nothing links to the file, so the url()
// scan above never sees it; the archive we upload is a redistribution and must
// carry it regardless.
const fontDirs = new Set([...runtimeFiles].filter(path => path.endsWith('.woff2')).map(posix.dirname));
for (const dir of fontDirs) {
  const licence = `${dir}/PressStart2P-OFL.txt`;
  if (existsSync(resolve(root, licence))) runtimeFiles.add(licence);
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
