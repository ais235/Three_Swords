import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, posix, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));

/* Сборка для itch.io отличается от сборки для Яндекс Игр ровно одним: в ней нет
 * загрузки /sdk.js. Всё остальное — тот же список файлов, та же проверка путей,
 * тот же манифест, поэтому это флаг, а не второй упаковщик: два списка файлов
 * разошлись бы на первой же новой картинке.
 *
 * Сам SDK отсутствует безболезненно: YaGames не объявлен, window.ysdk остаётся
 * пустым, и всё платформенное — реклама, лидерборды, облачные сохранения — само
 * не показывается (это проверяет scripts/test-itch-build.mjs). Но тег оставлять
 * нельзя: /sdk.js на itch ведёт в корень html-classic.itch.zone и даёт 404 при
 * каждой загрузке. */
const forItch = process.argv.includes('--itch');
const output = resolve(root, 'dist', forItch ? 'three-blades-itch' : 'three-blades');
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

// Bundled art and fonts come with licences that require their text to travel with
// any copy - SIL OFL for the font, CC BY for the interface kit. Nothing links to
// those files, so the url() scan above never sees them, but the archive we upload
// is a redistribution and has to carry them.
//
// Written as a sweep over the folders that actually contributed a file, rather
// than a list of filenames: the font licence was once hardcoded here, and when the
// interface art arrived with a licence of its own it would have shipped without it.
const assetDirs = new Set([...runtimeFiles]
  .filter(path => path.startsWith('assets/'))
  .map(posix.dirname));
for (const dir of assetDirs) {
  const absolute = resolve(root, dir);
  if (!existsSync(absolute)) continue;
  for (const entry of readdirSync(absolute)) {
    if (!/^(licen[cs]e|readme|copying|ofl)\b/i.test(entry)) continue;
    if (!statSync(resolve(absolute, entry)).isFile()) continue;
    runtimeFiles.add(`${dir}/${entry}`);
  }
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

if (forItch) {
  const stripped = index.replace(/[ \t]*<script[^>]+src=["']\/sdk\.js["'][^>]*><\/script>\r?\n?/i, '');
  if (stripped === index) throw new Error('itch build: тег /sdk.js не найден — проверь index.html');
  writeFileSync(resolve(output, 'index.html'), stripped);
  // Путь от корня домена работает только там, где игра лежит в корне. На itch
  // сборка раздаётся из подпапки, и любой такой путь — гарантированный 404.
  const absolute = [...stripped.matchAll(/(?:src|href)=["'](\/[^"']*)["']/gi)].map(match => match[1]);
  if (absolute.length) throw new Error(`itch build: пути от корня домена: ${absolute.join(', ')}`);
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

console.log(`Release ready (${forItch ? 'itch.io' : 'Яндекс Игры'}): ${output}`);
console.log(`Files: ${manifest.length}; unpacked: ${(totalBytes / 1024 / 1024).toFixed(1)} MB`);
