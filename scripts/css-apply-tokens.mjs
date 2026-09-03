/**
 * Replace literal values with the token that already holds exactly that value.
 *
 * Only exact matches are touched, so the change cannot move a pixel: `8px` becomes
 * var(--space-4) only where var(--space-4) is 8px. Values that are off the scale
 * are deliberately left alone — see the header of styles/tokens.css. That makes a
 * raw number in a rule mean something afterwards: it is a value nobody has decided
 * about yet.
 *
 * The substitution is property-aware, which is the whole difficulty. `1px` in
 * `border: 1px solid` is a border width and must not become a spacing token, and
 * `4px` in `border-radius` is a radius rather than a gap. Properties are matched
 * against the same groups scripts/css-audit-tokens.mjs reports on.
 *
 *   node scripts/css-apply-tokens.mjs           dry run, prints what would change
 *   node scripts/css-apply-tokens.mjs --apply   writes the files
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gameRuntimeStylePaths } from './runtime-source.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const apply = process.argv.includes('--apply');

/** value -> token name, per group. Read from tokens.css so the two cannot drift. */
const tokensCss = readFileSync(resolve(root, 'styles/tokens.css'), 'utf8');
const declared = new Map();
for (const match of tokensCss.matchAll(/^\s*(--[a-z0-9-]+)\s*:\s*([^;]+);/gim)) {
  if (!declared.has(match[1])) declared.set(match[1], match[2].trim().toLowerCase());
}
const groupTokens = prefixes => {
  const table = new Map();
  for (const [name, value] of declared) {
    if (!prefixes.some(prefix => name.startsWith(prefix))) continue;
    // Zero needs no name, and the first token wins so a later alias cannot
    // silently take over a value an earlier one already owns.
    if (value === '0' || table.has(value)) continue;
    table.set(value, name);
  }
  return table;
};

// Shorthands carry a colour too, and leaving them out is how `border-bottom: 1px
// solid #2a2a4a` kept a raw hex while every longhand around it became a token.
// Only hex literals are touched inside them, so the width and style are untouched.
const COLOUR_PROPS = /^(color|background|background-color|border|border-(top|right|bottom|left)|border-color|border-(top|right|bottom|left)-color|outline|outline-color|box-shadow|text-shadow|fill|stroke|caret-color|text-decoration-color|column-rule|column-rule-color)$/;
const SPACE_PROPS = /^(padding|margin|gap|row-gap|column-gap|inset)(-(top|right|bottom|left|block|inline))?$/;
const RADIUS_PROPS = /^border(-[a-z]+)?-radius$/;
const FONT_PROPS = /^font-size$/;

const colours = groupTokens(['--bg-', '--text-', '--accent-', '--border']);
const spaces = groupTokens(['--space-']);
const radii = groupTokens(['--radius-']);
const fonts = groupTokens(['--font-']);

const tableFor = prop => {
  if (COLOUR_PROPS.test(prop)) return colours;
  if (SPACE_PROPS.test(prop)) return spaces;
  if (RADIUS_PROPS.test(prop)) return radii;
  if (FONT_PROPS.test(prop)) return fonts;
  return null;
};

const counts = new Map();
let total = 0;

/** Rewrite one declaration value. Returns the value unchanged when nothing applies. */
function rewrite(prop, value) {
  const table = tableFor(prop);
  if (!table) return value;
  if (/var\(|calc\(|clamp\(|min\(|max\(/i.test(value)) return value;

  if (table === colours) {
    // Hex only. rgba() values are intentionally left alone: they carry an alpha
    // the tokens do not have, so no token can be an exact match for them.
    return value.replace(/#[0-9a-f]{3,8}\b/gi, hex => {
      const token = table.get(hex.toLowerCase());
      if (!token) return hex;
      counts.set(token, (counts.get(token) || 0) + 1);
      total += 1;
      return `var(${token})`;
    });
  }

  // url() would make word-splitting wrong, and a length can never live inside one.
  if (value.includes('(')) return value;
  return value.split(/(\s+)/).map(part => {
    const token = table.get(part.toLowerCase());
    if (!token) return part;
    counts.set(token, (counts.get(token) || 0) + 1);
    total += 1;
    return `var(${token})`;
  }).join('');
}

const changedFiles = [];
for (const stylePath of gameRuntimeStylePaths(root)) {
  const file = basename(stylePath);
  if (file === 'tokens.css') continue; // the definitions themselves
  const css = readFileSync(stylePath, 'utf8');

  // Walk only the inside of declaration blocks. Selectors and at-rule preludes
  // contain colons of their own (media features, pseudo-classes) and would look
  // like declarations to a naive split.
  const out = css.replace(/\{([^{}]*)\}/g, (whole, body) => {
    const rebuilt = body.replace(
      /(^|;)(\s*)([-a-z]+)(\s*:\s*)([^;{}]*)/gi,
      (match, sep, lead, prop, colon, value) => {
        const name = prop.trim().toLowerCase();
        if (name.startsWith('--')) return match;
        const bang = /!important\s*$/i.exec(value);
        const core = bang ? value.slice(0, bang.index) : value;
        const trailing = core.slice(core.trimEnd().length);
        const next = rewrite(name, core.trim());
        return `${sep}${lead}${prop}${colon}${next}${trailing}${bang ? bang[0] : ''}`;
      }
    );
    return `{${rebuilt}}`;
  });

  if (out !== css) {
    changedFiles.push(file);
    if (apply) writeFileSync(stylePath, out, 'utf8');
  }
}

console.log(`${apply ? 'Заменено' : 'Будет заменено'}: ${total} значений в ${changedFiles.length} файлах`);
for (const [token, count] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${String(count).padStart(4)}  ${token}`);
}
if (!apply) console.log('\nЭто пробный прогон. Записать: --apply, затем npm run css:check.');
