/**
 * Delete rules that are fully shadowed by a later rule with the same selector.
 *
 * `.badge` is declared in layout.css and again in inventory.css with different
 * padding and different colours. inventory.css loads later, so it wins every
 * time and the layout.css copy is unreachable — editing it does nothing, which is
 * exactly the "I changed it and nothing happened" the layering produces.
 *
 * A rule is only removed when every longhand property it sets is set again later
 * for the same selector and media condition, at the same or stronger importance.
 * Specificity is identical by construction (the selector text matches), so order
 * and importance decide the winner outright.
 *
 *   node scripts/css-fold-shadowed.mjs           report only
 *   node scripts/css-fold-shadowed.mjs --apply   rewrite the stylesheets
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createStaticServer } from './static-server.mjs';
import { gameRuntimeStylePaths } from './runtime-source.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const chromePath = process.env.CHROME_PATH || String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const apply = process.argv.includes('--apply');

const server = createStaticServer(root);
await new Promise((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
const url = `http://127.0.0.1:${server.address().port}/index.html?seed=css-fold`;

let inventory;
let browser;
try {
  browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--disable-gpu'] });
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.styleSheets.length > 3);
  inventory = await page.evaluate(() => {
    const rules = [];
    let order = 0;
    for (const sheet of document.styleSheets) {
      const file = sheet.href ? sheet.href.split('/').pop() : 'inline';
      let indexInFile = 0;
      const walk = (list, media) => {
        for (const rule of list) {
          if (rule.cssRules && rule.conditionText !== undefined) { walk(rule.cssRules, rule.conditionText); continue; }
          if (!rule.selectorText) continue;
          const props = [];
          for (const prop of rule.style) props.push({ prop, important: rule.style.getPropertyPriority(prop) === 'important' });
          rules.push({ file, order: order++, indexInFile: indexInFile++, selector: rule.selectorText, media: media || '', props });
        }
      };
      try { walk(sheet.cssRules, ''); } catch (error) { /* cross-origin */ }
    }
    return rules;
  });
} finally {
  if (browser) await browser.close();
  await new Promise(done => server.close(done));
}

/** Last writer for each (media, selector, property), with its importance. */
const lastWriter = new Map();
for (const rule of inventory) {
  for (const { prop, important } of rule.props) {
    const key = `${rule.media}|${rule.selector}|${prop}`;
    const current = lastWriter.get(key);
    if (!current || important || !current.important) lastWriter.set(key, { order: rule.order, important });
  }
}

const shadowed = inventory.filter(rule => {
  if (!rule.props.length) return false;
  return rule.props.every(({ prop, important }) => {
    const winner = lastWriter.get(`${rule.media}|${rule.selector}|${prop}`);
    if (!winner || winner.order === rule.order) return false;
    // A later declaration only shadows this one if it is at least as strong.
    return winner.order > rule.order && (winner.important || !important);
  });
});

const byFile = new Map();
for (const rule of shadowed) {
  if (!byFile.has(rule.file)) byFile.set(rule.file, []);
  byFile.get(rule.file).push(rule);
}

console.log(`Правил всего: ${inventory.length}`);
console.log(`Полностью перекрытых более поздними правилами: ${shadowed.length}`);
for (const [file, rules] of [...byFile.entries()].sort((a, b) => b[1].length - a[1].length)) {
  console.log(`  ${file.padEnd(28)} ${rules.length}`);
  for (const rule of rules.slice(0, 6)) console.log(`      ${rule.media ? `@${rule.media} ` : ''}${rule.selector}`);
  if (rules.length > 6) console.log(`      ... ещё ${rules.length - 6}`);
}

if (!apply) {
  console.log('\nЗапустите с --apply, чтобы удалить их из файлов.');
  process.exit(0);
}

/** Walk a stylesheet's source, yielding each rule with its byte range. */
function sourceRules(css, media = '', counter = { index: 0 }) {
  const found = [];
  let i = 0;
  const n = css.length;
  while (i < n) {
    while (i < n && css[i].isSpace?.()) i += 1;
    while (i < n && /\s/.test(css[i])) i += 1;
    if (css.startsWith('/*', i)) { const j = css.indexOf('*/', i); i = j >= 0 ? j + 2 : n; continue; }
    if (i >= n) break;
    const brace = css.indexOf('{', i);
    if (brace < 0) break;
    const prelude = css.slice(i, brace).trim();
    let depth = 1;
    let j = brace + 1;
    while (j < n && depth) {
      if (css[j] === '{') depth += 1;
      else if (css[j] === '}') depth -= 1;
      j += 1;
    }
    // Only @media and @supports hold ordinary rules. @keyframes also nests, but
    // the CSSOM never enumerates its steps as rules, so descending into it would
    // shift every later index and delete the wrong block.
    const nests = /^@(media|supports)/.test(prelude);
    if (nests) {
      found.push(...sourceRules(css.slice(brace + 1, j - 1), prelude.replace(/^@media\s*/, ''), counter)
        .map(entry => ({ ...entry, start: entry.start + brace + 1, end: entry.end + brace + 1 })));
    } else if (!prelude.startsWith('@')) {
      found.push({ selector: prelude, media, start: i, end: j, index: counter.index++ });
    }
    i = j;
  }
  return found;
}

const normalise = selector => selector.split(',').map(part => part.trim().replace(/\s+/g, ' ')).join(', ');
let removed = 0;
for (const stylePath of gameRuntimeStylePaths(root)) {
  const file = stylePath.split(/[\\/]/).pop();
  const targets = byFile.get(file);
  if (!targets) continue;
  const css = readFileSync(stylePath, 'utf8');
  const rules = sourceRules(css);
  // Match on selector text and media condition rather than a running index: the
  // CSSOM and a text walk can disagree about what counts as a rule, and an index
  // that is off by one deletes the wrong block silently.
  const key = rule => `${normalise(rule.media)}|${normalise(rule.selector)}`;
  const sourceByKey = new Map();
  for (const rule of rules) {
    const id = key(rule);
    if (!sourceByKey.has(id)) sourceByKey.set(id, []);
    sourceByKey.get(id).push(rule);
  }
  const doomed = [];
  const skipped = [];
  for (const target of targets) {
    const matches = sourceByKey.get(key(target)) || [];
    if (matches.length === 1) doomed.push(matches[0]);
    else skipped.push(`${target.media ? `@${target.media} ` : ''}${target.selector} (${matches.length} совпадений)`);
  }
  for (const note of skipped) console.log(`  пропущено, нужна ручная правка: ${file}: ${note}`);
  if (!doomed.length) continue;
  let out = css;
  for (const rule of [...doomed].sort((a, b) => b.start - a.start)) {
    out = out.slice(0, rule.start) + out.slice(rule.end);
    removed += 1;
  }
  writeFileSync(stylePath, out.replace(/\n{3,}/g, '\n\n'), 'utf8');
  console.log(`${file}: удалено ${doomed.length}`);
}
console.log(`Удалено правил: ${removed}. Проверьте npm run css:check.`);
