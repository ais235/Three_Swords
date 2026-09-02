/**
 * How many !important declarations actually decide an outcome. REPORT ONLY.
 *
 * Stripping them all at once breaks a thousand elements, so the flags are not
 * cargo cult — but that experiment says nothing about any single one. This walks
 * every element in every UI state, resolves each contested property among the
 * rules that match it, then demotes the winning flag to see whether anyone takes
 * over. It reports 130 of 520 flags as load-bearing.
 *
 * WHY THERE IS NO --apply. An earlier version had one, and it was wrong: acting
 * on its verdict changed 14234 computed values. The reproduced case is
 * #map-panel-title, where typography.css and readability.css both set line-height
 * with a flag at equal specificity — readability wins by order, so its flag looks
 * removable, yet dropping it hands the property to typography's flag. The model
 * says such a flag is needed and the numbers still came out wrong, so the model
 * is not trustworthy enough to edit files with. It is trustworthy enough to tell
 * you where the weight sits.
 *
 * Known weakness, kept here so the next attempt does not rediscover it: a rule's
 * specificity is taken as the maximum across its comma-separated parts, while the
 * cascade uses the specificity of the part that actually matched. A selector list
 * ending in #map-screen #map-help therefore inflates every other part of the list.
 *
 * Removing flags for real wants the empirical loop instead: strip one file, run
 * npm run css:check, keep the change only when the snapshot is identical.
 *
 *   node scripts/css-audit-important.mjs
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createStaticServer } from './static-server.mjs';
import { applyUiState, UI_STATE_NAMES, MEASURED_ROOTS, VIEWPORTS } from './ui-states.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const chromePath = process.env.CHROME_PATH || String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;

const server = createStaticServer(root);
await new Promise((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
const url = `http://127.0.0.1:${server.address().port}/index.html?seed=css-important`;

/** Runs in the page: decide, for this state, which important flags matter. */
const analyse = () => {
  const specificity = selector => {
    // Ids, then classes/attributes/pseudo-classes, then element names.
    // :not() and :is() contribute their own contents, so unwrap them rather than
    // discarding them: #map .node:not(.hidden) outranks #map .node.
    const cleaned = selector
      .replace(/:(not|is|has)\(([^)]*)\)/gi, ' $2 ')
      .replace(/:(where)\([^)]*\)/gi, ' ')
      .replace(/\([^)]*\)/g, '');
    const ids = (cleaned.match(/#[\w-]+/g) || []).length;
    const classes = (cleaned.match(/\.[\w-]+|\[[^\]]*\]|:(?!:)[\w-]+/g) || []).length;
    const elements = (cleaned.match(/(^|[\s>+~])[a-z][\w-]*/gi) || []).length + (cleaned.match(/::[\w-]+/g) || []).length;
    return ids * 10000 + classes * 100 + elements;
  };

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
        rules.push({
          id: `${file}#${indexInFile}`, file, indexInFile: indexInFile++, order: order++,
          selector: rule.selectorText, media: media || '', props,
          active: !media || matchMedia(media).matches,
          spec: Math.max(...rule.selectorText.split(',').map(part => specificity(part)))
        });
      }
    };
    try { walk(sheet.cssRules, ''); } catch (error) { /* cross-origin */ }
  }

  // Every element, not just those under the measured roots. font-size and
  // line-height are inherited, so a flag on html, body or a wrapper decides the
  // size of children that neither rule mentions.
  const elements = [document.documentElement, ...document.querySelectorAll('*')];

  // For every element and property, who wins, and would demoting a given
  // important declaration change that?
  const needed = new Set();
  const seenImportant = new Set();
  for (const rule of rules) {
    for (const { prop, important } of rule.props) {
      if (!important) continue;
      seenImportant.add(`${rule.id}|${prop}`);
      // A ::before or ::after box is not the element itself. Matching has to drop
      // the pseudo-element to ask the DOM anything, which would compare the two
      // as if they were one box, so never clear a flag on such a rule.
      if (rule.selector.includes('::')) needed.add(`${rule.id}|${prop}`);
    }
  }

  // Rules that carry at least one flag, plus every rule that could contest a
  // property one of them sets. Nothing else can change an outcome.
  const contestedProps = new Set();
  for (const rule of rules) {
    if (!rule.active) continue;
    for (const { prop, important } of rule.props) if (important) contestedProps.add(prop);
  }
  const relevant = rules.filter(rule => rule.active && rule.props.some(({ prop }) => contestedProps.has(prop)));

  const probeOf = rule => rule.selector.split(',').map(part => part
    .replace(/::[a-z-]+(\([^)]*\))?/gi, '')
    .replace(/:(hover|active|focus|focus-visible|focus-within|target)\b(\([^)]*\))?/gi, '')
    .trim()).filter(Boolean).join(',');
  for (const rule of relevant) rule.probe = probeOf(rule);

  const better = (a, b) => {
    for (let i = 0; i < 3; i += 1) { if (a[i] !== b[i]) return a[i] > b[i]; }
    return false;
  };

  // One pass over the elements: gather the rules that match, then resolve each
  // contested property among just those. Walking properties on the outside meant
  // re-testing every selector against every element once per property.
  for (const el of elements) {
    const hits = [];
    for (const rule of relevant) {
      try { if (rule.probe && el.matches(rule.probe)) hits.push(rule); } catch (error) { /* unsupported */ }
    }
    if (hits.length < 2) continue;
    const byProp = new Map();
    for (const rule of hits) {
      for (const { prop, important } of rule.props) {
        if (!contestedProps.has(prop)) continue;
        if (!byProp.has(prop)) byProp.set(prop, []);
        byProp.get(prop).push({ rule, important });
      }
    }
    for (const [prop, entries] of byProp) {
      if (entries.length < 2) continue;
      const rank = (entry, demoted) => [
        entry.important && !(demoted && demoted === entry.rule.id) ? 1 : 0,
        entry.rule.spec,
        entry.rule.order
      ];
      let winner = null;
      for (const entry of entries) if (!winner || better(rank(entry, null), rank(winner, null))) winner = entry;
      if (!winner || !winner.important) continue;
      let after = null;
      for (const entry of entries) if (!after || better(rank(entry, winner.rule.id), rank(after, winner.rule.id))) after = entry;
      if (after !== winner) needed.add(`${winner.rule.id}|${prop}`);
    }
  }

  return { all: [...seenImportant], needed: [...needed] };
};

let browser;
const allImportant = new Set();
const neededImportant = new Set();
try {
  browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--disable-gpu'] });
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, locale: 'ru-RU' });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof startNewGame === 'function');
    await page.evaluate(roots => { window.__measuredRoots = roots; }, MEASURED_ROOTS);
    for (const state of UI_STATE_NAMES) {
      if (!await applyUiState(page, state)) continue;
      const result = await page.evaluate(analyse);
      result.all.forEach(key => allImportant.add(key));
      result.needed.forEach(key => neededImportant.add(key));
    }
    await context.close();
  }
} finally {
  if (browser) await browser.close();
  await new Promise(done => server.close(done));
}

const unnecessary = [...allImportant].filter(key => !neededImportant.has(key));
const byFile = new Map();
for (const key of unnecessary) {
  const file = key.split('#')[0];
  byFile.set(file, (byFile.get(file) || 0) + 1);
}
console.log(`Объявлений с !important: ${allImportant.size}`);
console.log(`Из них действительно решают исход: ${neededImportant.size}`);
console.log(`Можно снять флаг: ${unnecessary.length}`);
for (const [file, count] of [...byFile.entries()].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${file.padEnd(28)} ${count}`);
}

console.log('\nСнимать флаги этим инструментом нельзя: модель каскада недостаточно точна.');
console.log('Порядок для настоящего снятия: снять флаги в одном файле, прогнать npm run css:check,');
console.log('оставить правку только если слепок совпал.');
