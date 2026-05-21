#!/usr/bin/env node
/** Audit BGM + battle SFX: code paths vs files on disk */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const bgmBlock = html.match(/const BGM_TRACKS = \{([\s\S]*?)\};/);
const bgmInCode = bgmBlock ? [...bgmBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];

const bsxPaths = [...html.matchAll(/r\('([^']+)'\)/g)].map((m) => 'assets/audio/battle/sfx/' + m[1]);

const sampleBlock = html.match(/const BATTLE_SFX_SAMPLE_URLS = \[([\s\S]*?)\];/);
const sampleUrls = sampleBlock ? [...sampleBlock[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];

function walk(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (/\.(mp3|wav|ogg|m4a|flac)$/i.test(e.name)) acc.push(p.split(path.sep).join('/'));
  }
  return acc;
}

const allAudio = walk(path.join(ROOT, 'assets/audio'));
const sfxOnDisk = allAudio.filter((p) => p.includes('/battle/sfx/'));
const bgmOnDisk = allAudio.filter((p) => p.includes('bgm_'));

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function findAlt(rel) {
  const base = rel.replace(/\.[^.]+$/, '');
  const exts = ['.wav', '.mp3', '.ogg', '.m4a'];
  return exts.filter((ext) => fs.existsSync(path.join(ROOT, base + ext))).map((e) => base + e);
}

const missing = [];
const mismatch = [];
for (const rel of bsxPaths) {
  if (exists(rel)) continue;
  const alts = findAlt(rel);
  if (alts.length) mismatch.push({ code: rel, alts });
  else missing.push(rel);
}

const bsxSet = new Set(bsxPaths);
const extraSfx = sfxOnDisk
  .map((p) => p.replace(/^assets\/audio\//, 'assets/audio/'))
  .filter((full) => {
    const rel = full.startsWith('assets/') ? full : 'assets/audio/' + full.split('assets/audio/').pop();
    const r = full.includes('battle/sfx') ? full.slice(full.indexOf('assets/')) : full;
    return true;
  });

// fix extra paths - walk returns paths like assets/audio/battle/sfx/...
const extra = [];
for (const p of sfxOnDisk) {
  const rel = p.startsWith('assets/') ? p : 'assets/audio/' + p;
  if (!bsxSet.has(rel)) extra.push(rel);
}

console.log('=== BGM (музыка) ===');
for (const p of bgmInCode) {
  console.log((exists(p) ? 'OK' : 'MISSING'), p);
}
const bgmExtra = bgmOnDisk.map((p) => (p.startsWith('assets/') ? p : 'assets/audio/' + p.split('assets/audio/').pop()));
for (const p of bgmOnDisk) {
  const rel = p.includes('assets/') ? p.slice(p.indexOf('assets/')) : p;
  if (!bgmInCode.includes(rel)) console.log('EXTRA on disk:', rel);
}

console.log('\n=== BSX: неверное расширение в коде ===');
mismatch.forEach(({ code, alts }) => console.log('CODE', code, '->', alts.join(' | ')));

console.log('\n=== BSX: полностью отсутствует ===');
missing.forEach((p) => console.log('MISSING', p));

console.log('\n=== Дубликаты на диске (не тот путь в BSX) ===');
extra.forEach((p) => console.log('EXTRA', p));

let sampleMissing = 0;
const sampleMismatch = [];
for (const u of sampleUrls) {
  if (exists(u)) continue;
  const alts = findAlt(u);
  if (alts.length) sampleMismatch.push({ code: u, alts });
  else sampleMissing++;
}
console.log('\n=== Префлоад BATTLE_SFX_SAMPLE_URLS ===');
console.log('missing:', sampleMissing, 'wrong ext:', sampleMismatch.length);
sampleMismatch.forEach(({ code, alts }) => console.log('PRELOAD', code, '->', alts.join(' | ')));

const zipFiles = fs.readdirSync(path.join(ROOT, 'assets/audio')).filter((f) => f.endsWith('.zip'));
console.log('\n=== ZIP (не в игре, только архивы) ===');
zipFiles.forEach((z) => console.log(z));

const fmt = {};
sfxOnDisk.forEach((p) => {
  const e = path.extname(p).toLowerCase();
  fmt[e] = (fmt[e] || 0) + 1;
});
console.log('\n=== Форматы SFX на диске ===', fmt);
console.log('\nSummary: BSX ok', bsxPaths.length - mismatch.length - missing.length, '/', bsxPaths.length);
