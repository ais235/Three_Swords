/**
 * Point the game's box rules at the surface tokens.
 *
 * A rule counts as a box when it declares a background, a one-pixel border in the
 * border colour, and a radius: that combination is what every panel, card, tab and
 * slot in the game is made of. Only those rules are rewritten, so `body`, which
 * shares the same background but is not a box, is left alone.
 *
 * Exact matches only, so nothing moves: the surface tokens resolve to the very
 * values being replaced. Radius is not touched — see styles/tokens.css for why.
 *
 *   node scripts/css-apply-surface.mjs           dry run
 *   node scripts/css-apply-surface.mjs --apply   writes the files
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gameRuntimeStylePaths } from './runtime-source.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const apply = process.argv.includes('--apply');

const BACKGROUNDS = new Map([
  ['var(--bg-dark)', 'var(--surface-bg)'],
  ['var(--bg-deep)', 'var(--surface-bg-sunken)'],
  ['var(--bg-card)', 'var(--surface-bg-raised)']
]);
const BORDER = '1px solid var(--border)';

let rules = 0;
const perFile = new Map();
const changedFiles = [];

for (const stylePath of gameRuntimeStylePaths(root)) {
  const file = basename(stylePath);
  if (file === 'tokens.css') continue;
  const css = readFileSync(stylePath, 'utf8');

  const out = css.replace(/([^{}]*)\{([^{}]*)\}/g, (whole, prelude, body) => {
    if (prelude.trim().startsWith('@')) return whole;

    const read = name => {
      const match = new RegExp(`(?:^|;)\\s*${name}\\s*:\\s*([^;}]*)`, 'i').exec(body);
      return match ? match[1].replace(/!important/i, '').trim() : null;
    };
    const background = read('background') || read('background-color');
    const border = read('border');
    const radius = read('border-radius');
    if (!background || !border || !radius) return whole;
    if (border.toLowerCase() !== BORDER) return whole;
    const surfaceBg = BACKGROUNDS.get(background.toLowerCase());
    if (!surfaceBg) return whole;

    let next = body.replace(
      /((?:^|;)\s*background(?:-color)?\s*:\s*)([^;}]*)/i,
      (match, lead, value) => `${lead}${value.replace(background, surfaceBg)}`
    );
    next = next.replace(
      /((?:^|;)\s*border\s*:\s*)([^;}]*)/i,
      (match, lead, value) => `${lead}${value.replace(BORDER, 'var(--surface-border)')}`
    );
    if (next === body) return whole;
    rules += 1;
    perFile.set(file, (perFile.get(file) || 0) + 1);
    return `${prelude}{${next}}`;
  });

  if (out !== css) {
    changedFiles.push(file);
    if (apply) writeFileSync(stylePath, out, 'utf8');
  }
}

console.log(`${apply ? 'Переведено' : 'Будет переведено'} на токены поверхности: ${rules} правил`);
for (const [file, count] of [...perFile.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(3)}  ${file}`);
}
if (!apply) console.log('\nЭто пробный прогон. Записать: --apply, затем npm run css:check.');
