/**
 * Computed-style snapshot across every UI state and both target viewports.
 *
 * The stylesheets are layered: a base set plus three correction layers that
 * override it with !important. Merging those layers back down is only safe if it
 * is provably pixel-neutral, and "provably" means measured, not eyeballed. This
 * records what the browser actually computes for every element, so a refactor can
 * be diffed against a baseline taken before it started.
 *
 *   npm run css:baseline      write the baseline (gitignored, regenerate freely)
 *   npm run css:check         compare the current build against it
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createStaticServer } from './static-server.mjs';
import { applyUiState, UI_STATE_NAMES, MEASURED_ROOTS, VIEWPORTS } from './ui-states.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const chromePath = process.env.CHROME_PATH || String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const args = process.argv.slice(2);
const writeMode = args.includes('--write');
const outArg = args.find(arg => arg.startsWith('--out='));
const baselinePath = resolve(root, outArg ? outArg.slice('--out='.length) : 'docs/css-baseline.json');

const PROPS = [
  'display', 'position', 'visibility', 'opacity', 'z-index', 'overflow-x', 'overflow-y',
  'font-family', 'font-size', 'font-weight', 'font-style', 'line-height', 'letter-spacing',
  'text-transform', 'text-align', 'white-space', 'color', 'text-shadow',
  'background-color', 'background-image', 'background-size', 'background-position',
  'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'border-top-style', 'border-top-left-radius', 'border-bottom-right-radius',
  'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'flex-direction', 'flex-wrap', 'justify-content', 'align-items', 'gap',
  'grid-template-columns', 'grid-template-rows',
  'box-shadow', 'transform', 'box-sizing'
];

const server = createStaticServer(root);
await new Promise((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
const url = `http://127.0.0.1:${server.address().port}/index.html?seed=css-snapshot`;

let browser;
const snapshot = {};
const missing = [];
try {
  browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--disable-gpu'] });
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      locale: 'ru-RU',
      deviceScaleFactor: 1
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof startNewGame === 'function');
    // Animations would make two identical builds measure differently.
    await page.addStyleTag({ content: '*, *::before, *::after { transition: none !important; animation: none !important; }' });

    for (const state of UI_STATE_NAMES) {
      const built = await applyUiState(page, state);
      if (!built) { missing.push(state); continue; }
      snapshot[`${viewport.name}/${state}`] = await page.evaluate(({ props, roots }) => {
        const out = {};
        const pathOf = el => {
          const parts = [];
          let node = el;
          while (node && node !== document.body) {
            const parent = node.parentElement;
            if (!parent) break;
            parts.unshift(node.id ? `#${node.id}` : `${node.tagName.toLowerCase()}[${[...parent.children].indexOf(node)}]`);
            if (node.id) break;
            node = parent;
          }
          return parts.join('>');
        };
        for (const selector of roots) {
          const rootEl = document.querySelector(selector);
          if (!rootEl || getComputedStyle(rootEl).display === 'none') continue;
          for (const el of [rootEl, ...rootEl.querySelectorAll('*')]) {
            if (el.tagName === 'SCRIPT' || el.tagName === 'STYLE') continue;
            const cs = getComputedStyle(el);
            const rect = el.getBoundingClientRect();
            // The dev server picks a fresh port each run; absolute asset URLs must
            // not make two identical builds look different.
            const record = props.map(prop =>
              `${prop}:${cs.getPropertyValue(prop).split(location.origin).join('~')}`).join(';');
            out[pathOf(el)] = `${record};@rect:${Math.round(rect.width)}x${Math.round(rect.height)}`;
          }
        }
        return out;
      }, { props: PROPS, roots: MEASURED_ROOTS });
    }
    await context.close();
  }
} finally {
  if (browser) await browser.close();
  await new Promise(done => server.close(done));
}

if (missing.length) console.warn(`Не удалось построить состояния: ${[...new Set(missing)].join(', ')}`);
const elementCount = Object.values(snapshot).reduce((sum, group) => sum + Object.keys(group).length, 0);

if (writeMode || !existsSync(baselinePath)) {
  mkdirSync(dirname(baselinePath), { recursive: true });
  writeFileSync(baselinePath, JSON.stringify(snapshot), 'utf8');
  console.log(`Базовый слепок записан: ${baselinePath}`);
  console.log(`${Object.keys(snapshot).length} пар «состояние × вьюпорт», ${elementCount} элементов.`);
  process.exit(0);
}

const baseline = JSON.parse(readFileSync(baselinePath, 'utf8'));
const differences = [];
const splitProps = record => Object.fromEntries(record.split(';').map(pair => {
  const at = pair.indexOf(':');
  return [pair.slice(0, at), pair.slice(at + 1)];
}));
for (const group of new Set([...Object.keys(baseline), ...Object.keys(snapshot)])) {
  const before = baseline[group] || {};
  const after = snapshot[group] || {};
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (before[key] === after[key]) continue;
    if (!(key in before)) { differences.push({ group, key, kind: 'added' }); continue; }
    if (!(key in after)) { differences.push({ group, key, kind: 'removed' }); continue; }
    const beforeProps = splitProps(before[key]);
    const afterProps = splitProps(after[key]);
    for (const prop of Object.keys(beforeProps)) {
      if (beforeProps[prop] !== afterProps[prop]) {
        differences.push({ group, key, kind: 'changed', prop, before: beforeProps[prop], after: afterProps[prop] });
      }
    }
  }
}

console.log(`Сверено ${elementCount} элементов в ${Object.keys(snapshot).length} парах «состояние × вьюпорт».`);
if (!differences.length) {
  console.log('PASS вычисленные стили совпадают с базовым слепком.');
  process.exit(0);
}
const byProp = new Map();
for (const diff of differences) {
  const label = diff.kind === 'changed' ? diff.prop : diff.kind;
  byProp.set(label, (byProp.get(label) || 0) + 1);
}
console.error(`FAIL расхождений: ${differences.length}`);
console.error('По свойствам: ' + [...byProp.entries()].sort((a, b) => b[1] - a[1])
  .map(([prop, count]) => `${prop}=${count}`).join(', '));
for (const diff of differences.slice(0, 40)) {
  console.error(diff.kind === 'changed'
    ? `  ${diff.group} ${diff.key}\n      ${diff.prop}: ${diff.before}  ->  ${diff.after}`
    : `  ${diff.group} ${diff.key} (${diff.kind})`);
}
if (differences.length > 40) console.error(`  ... и ещё ${differences.length - 40}`);
process.exit(1);
