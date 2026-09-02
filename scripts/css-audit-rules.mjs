/**
 * Which CSS rules are dead, and which declarations are duplicated across files.
 *
 * Layering means one visual property can be set in four places. This walks every
 * rule in every shipped stylesheet against every UI state at both viewports and
 * reports what can be removed and what has to be folded together.
 *
 *   node scripts/css-audit-rules.mjs            summary
 *   node scripts/css-audit-rules.mjs --dead     list unmatched selectors
 *   node scripts/css-audit-rules.mjs --dupes    list duplicated declarations
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createStaticServer } from './static-server.mjs';
import { applyUiState, UI_STATE_NAMES, VIEWPORTS } from './ui-states.mjs';
import { readFileSync } from 'node:fs';
import { gameRuntimeScriptPaths } from './runtime-source.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const chromePath = process.env.CHROME_PATH || String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const args = process.argv.slice(2);
const showDead = args.includes('--dead');
const showDupes = args.includes('--dupes');
const applyDead = args.includes('--apply-dead');

/** Class and id names the running game can actually produce.
 *
 *  "Matched no element in any state" is only evidence, never proof: a state can
 *  be missing from the driver. But a class whose name appears nowhere in the
 *  markup or the scripts can never be attached to anything, and a rule that needs
 *  one is dead whatever the coverage. Names built by template literals are kept:
 *  map-region-1 never appears literally, only map-region-${'$'}{region} does, so a
 *  prefix hit counts as present. */
// Markup and scripts only. loadGameRuntimeSource also concatenates the
// stylesheets, and a class would then always find itself in its own rule.
const runtimeSource = [resolve(root, 'index.html'), ...gameRuntimeScriptPaths(root)]
  .map(path => readFileSync(path, 'utf8')).join('\n');
const tokenExists = token => {
  if (runtimeSource.includes(token)) return true;
  const parts = token.split('-');
  for (let take = parts.length - 1; take >= 1; take -= 1) {
    if (runtimeSource.includes(parts.slice(0, take).join('-') + '-')) return true;
  }
  return false;
};
const selectorTokens = selector => [...selector.matchAll(/[.#]([\w-]+)/g)].map(match => match[1]);
const provablyDead = selector => selector.split(',')
  .every(part => selectorTokens(part).some(token => !tokenExists(token)));

const server = createStaticServer(root);
await new Promise((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
const url = `http://127.0.0.1:${server.address().port}/index.html?seed=css-audit`;

let browser;
let inventory = null;
const matched = new Set();
try {
  browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--disable-gpu'] });
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, locale: 'ru-RU' });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof startNewGame === 'function');

    if (!inventory) {
      inventory = await page.evaluate(() => {
        const rules = [];
        for (const sheet of document.styleSheets) {
          const file = sheet.href ? sheet.href.split('/').pop() : 'inline';
          const walk = (list, media) => {
            for (const rule of list) {
              if (rule.cssRules && rule.conditionText !== undefined) { walk(rule.cssRules, rule.conditionText); continue; }
              if (!rule.selectorText) continue;
              const props = [];
              for (const prop of rule.style) props.push({ prop, important: rule.style.getPropertyPriority(prop) === 'important' });
              rules.push({ file, selector: rule.selectorText, media: media || '', props });
            }
          };
          try { walk(sheet.cssRules, ''); } catch (error) { /* cross-origin sheet */ }
        }
        return rules;
      });
    }
    // Pseudo-class and pseudo-element parts never match a static document, so
    // strip them before asking: a rule for :hover is not dead, it is conditional.
    const probes = [...new Set(inventory.map(rule => rule.selector))].map(selector => ({
      selector,
      probe: selector.split(',').map(part => part
        .replace(/::[a-z-]+(\([^)]*\))?/gi, '')
        .replace(/:(hover|active|focus|focus-visible|focus-within|disabled|checked|target|first-line|first-letter)\b(\([^)]*\))?/gi, '')
        .trim()).filter(Boolean).join(',')
    }));

    for (const state of UI_STATE_NAMES) {
      const built = await applyUiState(page, state);
      if (!built) continue;
      const hits = await page.evaluate(list => list
        .filter(({ probe }) => { try { return !!document.querySelector(probe); } catch (error) { return true; } })
        .map(({ selector }) => selector), probes);
      hits.forEach(selector => matched.add(selector));
    }
    await context.close();
  }
} finally {
  if (browser) await browser.close();
  await new Promise(done => server.close(done));
}

const dead = inventory.filter(rule => !matched.has(rule.selector));
const declarations = new Map();
for (const rule of inventory) {
  for (const { prop, important } of rule.props) {
    const key = `${rule.media}|${rule.selector}|${prop}`;
    if (!declarations.has(key)) declarations.set(key, []);
    declarations.get(key).push({ file: rule.file, important });
  }
}
const duplicated = [...declarations.entries()]
  .filter(([, sites]) => new Set(sites.map(site => site.file)).size > 1)
  .map(([key, sites]) => ({ key, files: sites.map(site => `${site.file}${site.important ? '!' : ''}`) }));

const byFile = (list, pick) => {
  const counts = new Map();
  for (const entry of list) for (const file of pick(entry)) counts.set(file, (counts.get(file) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
};

console.log(`Правил: ${inventory.length}, объявлений: ${declarations.size}, состояний проверено: ${UI_STATE_NAMES.length} x ${VIEWPORTS.length}`);
const proven = dead.filter(rule => provablyDead(rule.selector));
console.log(`Селекторов без совпадений: ${dead.length}`);
console.log(`Из них доказуемо мёртвых (имя класса не встречается в разметке и коде): ${proven.length}`);
console.log(`Объявлений, заданных в нескольких файлах: ${duplicated.length}`);
console.log('\nНесовпавшие селекторы по файлам:');
for (const [file, count] of byFile(dead, rule => [rule.file])) console.log(`  ${file.padEnd(28)} ${count}`);
console.log('\nФайлы, участвующие в дублях:');
for (const [file, count] of byFile(duplicated, dupe => new Set(dupe.files.map(name => name.replace('!', ''))))) {
  console.log(`  ${file.padEnd(28)} ${count}`);
}

if (showDead) {
  console.log('\n== Доказуемо мёртвые ==');
  for (const rule of proven) console.log(`  ${rule.file}${rule.media ? ` @${rule.media}` : ''}: ${rule.selector}`);
  console.log('\n== Не совпали, но классы существуют в коде (не удалять) ==');
  for (const rule of dead.filter(rule => !proven.includes(rule))) {
    console.log(`  ${rule.file}${rule.media ? ` @${rule.media}` : ''}: ${rule.selector}`);
  }
}
if (showDupes) {
  console.log('\n== Дублированные объявления ==');
  for (const dupe of duplicated) console.log(`  ${dupe.key}  <-  ${dupe.files.join(', ')}`);
}
