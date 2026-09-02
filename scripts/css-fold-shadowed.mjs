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
const applyDeclarations = process.argv.includes('--apply-decls');

const server = createStaticServer(root);
await new Promise((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
const url = `http://127.0.0.1:${server.address().port}/index.html?seed=css-fold`;

let inventory;
let browser;
let page;
try {
  browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--disable-gpu'] });
  page = await browser.newPage();
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
} catch (error) {
  if (browser) await browser.close();
  await new Promise(done => server.close(done));
  throw error;
}

/** Close the browser and the dev server once every phase is done. The page has
 *  to stay alive: expanding shorthands into longhands asks the browser itself. */
async function shutdown(code) {
  if (browser) await browser.close();
  await new Promise(done => server.close(done));
  process.exit(code);
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

if (!apply && !applyDeclarations) {
  console.log('\n--apply удаляет полностью перекрытые правила, --apply-decls — отдельные перекрытые объявления.');
  await shutdown(0);
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
      found.push({ selector: prelude, media, start: i, end: j, bodyStart: brace + 1, bodyEnd: j - 1, index: counter.index++ });
    }
    i = j;
  }
  return found;
}

const normalise = selector => selector.split(',').map(part => part.trim().replace(/\s+/g, ' ')).join(', ');

/** Split a rule body into declarations, with their byte ranges.
 *  Semicolons inside url(), quotes or parentheses do not end a declaration. */
function sourceDeclarations(body, offset) {
  const found = [];
  let depth = 0;
  let quote = null;
  let start = 0;
  for (let i = 0; i < body.length; i += 1) {
    const ch = body[i];
    if (quote) { if (ch === quote && body[i - 1] !== '\\') quote = null; continue; }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === '(') depth += 1;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (ch === ';' && !depth) {
      const text = body.slice(start, i);
      if (text.trim()) found.push({ text, start: offset + start, end: offset + i + 1 });
      start = i + 1;
    }
  }
  const tail = body.slice(start);
  if (tail.trim() && tail.includes(':')) found.push({ text: tail, start: offset + start, end: offset + body.length });
  return found.map(entry => {
    const colon = entry.text.indexOf(':');
    return { ...entry, prop: entry.text.slice(0, colon).trim().toLowerCase(), value: entry.text.slice(colon + 1) };
  }).filter(entry => entry.prop && !entry.prop.startsWith('/*'));
}
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
if (apply) console.log(`Удалено правил: ${removed}. Проверьте npm run css:check.`);

if (applyDeclarations) {
  // Phase two: inside rules that survive, drop the individual declarations whose
  // every longhand is written again later. A shorthand may only go when all the
  // longhands it expands to are shadowed, or the untouched sides would move.
  const stylePaths = gameRuntimeStylePaths(root);
  const parsed = stylePaths.map(stylePath => {
    const css = readFileSync(stylePath, 'utf8');
    const rules = sourceRules(css).map(rule => ({
      ...rule,
      decls: sourceDeclarations(css.slice(rule.bodyStart, rule.bodyEnd), rule.bodyStart)
    }));
    return { stylePath, file: stylePath.split(/[\\/]/).pop(), css, rules };
  });

  const texts = [...new Set(parsed.flatMap(entry =>
    entry.rules.flatMap(rule => rule.decls.map(decl => decl.text.trim()))))];
  const longhands = await page.evaluate(list => {
    const probe = document.createElement('div');
    const out = {};
    for (const text of list) {
      probe.style.cssText = '';
      probe.style.cssText = text.replace(/\s*!important\s*$/i, '');
      out[text] = [...probe.style];
    }
    return out;
  }, texts);

  let declRemoved = 0;
  for (const entry of parsed) {
    const byKey = new Map();
    for (const rule of inventory.filter(item => item.file === entry.file)) {
      const id = `${normalise(rule.media)}|${normalise(rule.selector)}`;
      if (!byKey.has(id)) byKey.set(id, []);
      byKey.get(id).push(rule);
    }
    const cuts = [];
    for (const rule of entry.rules) {
      const matches = byKey.get(`${normalise(rule.media)}|${normalise(rule.selector)}`) || [];
      if (matches.length !== 1) continue;
      const live = matches[0];
      for (const decl of rule.decls) {
        const props = longhands[decl.text.trim()] || [];
        if (!props.length) continue;
        const important = /!important\s*$/i.test(decl.text);
        const shadowed = props.every(prop => {
          const winner = lastWriter.get(`${live.media}|${live.selector}|${prop}`);
          return winner && winner.order > live.order && (winner.important || !important);
        });
        if (shadowed) cuts.push(decl);
      }
    }
    if (!cuts.length) continue;
    let out = entry.css;
    for (const decl of [...cuts].sort((a, b) => b.start - a.start)) out = out.slice(0, decl.start) + out.slice(decl.end);
    // A rule left holding nothing but whitespace is noise; drop it whole.
    out = out.replace(/(^|\n)([^{}\n][^{}]*)\{\s*\}\s*\n/g, '$1');
    writeFileSync(entry.stylePath, out.replace(/\n{3,}/g, '\n\n'), 'utf8');
    console.log(`${entry.file}: удалено объявлений ${cuts.length}`);
    declRemoved += cuts.length;
  }
  console.log(`Удалено объявлений: ${declRemoved}. Проверьте npm run css:check.`);
}

await shutdown(0);
