/**
 * Which literal values repeat across the stylesheets, and which are already tokens.
 *
 * A design token layer is only worth having if it is derived from what the CSS
 * actually says. Inventing a scale first and forcing the files into it changes
 * pixels; reading the files first and naming what is already there does not.
 *
 * Counts values as an author writes them, not as the browser expands them: the
 * point is to find the strings a person would have to edit in ten places to
 * change one colour.
 *
 *   node scripts/css-audit-tokens.mjs            summary per group
 *   node scripts/css-audit-tokens.mjs --colors   every colour with its files
 *   node scripts/css-audit-tokens.mjs --min=4    only values used at least 4 times
 */
import { readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gameRuntimeStylePaths } from './runtime-source.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
const minArg = args.find(arg => arg.startsWith('--min='));
const min = minArg ? Number(minArg.slice('--min='.length)) : 3;
const showColors = args.includes('--colors');
const showGroup = args.find(arg => arg.startsWith('--group='))?.slice('--group='.length);

/** Property -> which token group it belongs to. */
const GROUPS = [
  ['colour', /^(color|background|background-color|border-color|border(-top|-right|-bottom|-left)?-color|outline-color|fill|stroke|caret-color|text-decoration-color|column-rule-color)$/],
  ['space', /^(padding|margin|gap|row-gap|column-gap|inset)(-top|-right|-bottom|-left|-block|-inline)?$/],
  ['radius', /^border(-[a-z]+)?-radius$/],
  ['type', /^(font-size|line-height|letter-spacing|font-weight)$/],
  ['border', /^border(-top|-right|-bottom|-left)?$/],
  ['shadow', /^(box-shadow|text-shadow)$/]
];
const groupOf = prop => GROUPS.find(([, test]) => test.test(prop))?.[0] || null;

// Comments carry example values and would be counted as real declarations.
const strip = css => css.replace(/\/\*[\s\S]*?\*\//g, '');

const seen = new Map();
for (const stylePath of gameRuntimeStylePaths(root)) {
  const file = basename(stylePath);
  const css = strip(readFileSync(stylePath, 'utf8'));
  // Declarations only: skip anything before a '{' so selectors and at-rule
  // preludes (which contain colons in media queries) never look like properties.
  for (const block of css.matchAll(/\{([^{}]*)\}/g)) {
    for (const raw of block[1].split(';')) {
      const at = raw.indexOf(':');
      if (at < 0) continue;
      const prop = raw.slice(0, at).trim().toLowerCase();
      if (prop.startsWith('--')) continue;
      const group = groupOf(prop);
      if (!group) continue;
      const value = raw.slice(at + 1).replace(/!important/i, '').trim().toLowerCase();
      if (!value || value.startsWith('var(')) continue;
      const key = `${group}|${value}`;
      if (!seen.has(key)) seen.set(key, { group, value, count: 0, files: new Set(), props: new Set() });
      const entry = seen.get(key);
      entry.count += 1;
      entry.files.add(file);
      entry.props.add(prop);
    }
  }
}

const entries = [...seen.values()].sort((a, b) => b.count - a.count);
const byGroup = new Map();
for (const entry of entries) {
  if (!byGroup.has(entry.group)) byGroup.set(entry.group, []);
  byGroup.get(entry.group).push(entry);
}

console.log(`Литеральных значений (не var): ${entries.length}, вхождений: ${entries.reduce((sum, e) => sum + e.count, 0)}`);
console.log(`Порог показа: ${min}\n`);
for (const [group, list] of byGroup) {
  const repeated = list.filter(entry => entry.count >= min);
  console.log(`${group.padEnd(8)} уникальных ${String(list.length).padStart(4)}, повторяются ${String(repeated.length).padStart(3)}, вхождений у повторяющихся ${repeated.reduce((s, e) => s + e.count, 0)}`);
}

const detail = showColors ? 'colour' : showGroup;
if (detail) {
  console.log(`\n== ${detail} ==`);
  for (const entry of (byGroup.get(detail) || []).filter(item => item.count >= min)) {
    console.log(`  ${String(entry.count).padStart(3)}  ${entry.value.padEnd(30)} ${[...entry.props].join(',').padEnd(24)} ${[...entry.files].join(' ')}`);
  }
}
