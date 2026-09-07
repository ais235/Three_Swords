/**
 * Find leftovers of the pre-kit interface across every UI state.
 *
 * The release plan's definition of done for the visual pass is "36 states at two
 * viewports, no old-style elements left". Reviewing 72 screenshots by eye finds
 * the loud ones and misses the quiet ones, so the two things that are unambiguous
 * are checked mechanically instead:
 *
 *   ROUNDED CORNERS. The game decided it is square (styles/tokens.css). A element
 *   with a radius either predates that decision or bypassed the token. Circles are
 *   fine - a dot or an avatar is a shape, not a softened rectangle.
 *
 *   COLOUR EMOJI IN CONTROLS. Buttons and tabs draw their icons through CSS masks
 *   now. An emoji left in one is drawn by the operating system's font: different
 *   on every machine and part of no art style. Emoji in game text is deliberate
 *   and not reported - only what sits inside something clickable.
 *
 * Colour is deliberately not checked here. Blue means rare and purple means magic,
 * so "cold colour" cannot be told from "wrong colour" without knowing the intent;
 * `node scripts/css-audit-tokens.mjs --colors` lists those for a human instead.
 *
 *   node scripts/audit-legacy-style.mjs           summary
 *   node scripts/audit-legacy-style.mjs --list    every finding
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createStaticServer } from './static-server.mjs';
import { applyUiState, UI_STATE_NAMES, VIEWPORTS } from './ui-states.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const chromePath = process.env.CHROME_PATH || String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const showList = process.argv.includes('--list');

const server = createStaticServer(root);
await new Promise((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
const url = `http://127.0.0.1:${server.address().port}/index.html?seed=legacy-style`;

/** Runs in the page. Returns the offenders visible in the current state. */
const scan = () => {
  const describe = el => {
    const id = el.id ? `#${el.id}` : '';
    const cls = typeof el.className === 'string' && el.className
      ? `.${el.className.trim().split(/\s+/).slice(0, 3).join('.')}` : '';
    return `${el.tagName.toLowerCase()}${id}${cls}`;
  };
  const visible = el => {
    const rect = el.getBoundingClientRect();
    if (rect.width < 2 || rect.height < 2) return false;
    const style = getComputedStyle(el);
    return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
  };
  // Pictographs the OS renders in colour. Arrows, box drawing and the geometric
  // shapes the interface uses as glyphs are not emoji and stay.
  const COLOUR_EMOJI = /[\u{1F300}-\u{1FAFF}\u{2728}\u{2B50}\u{2B55}]/u;

  const rounded = [];
  const emoji = [];
  for (const el of document.querySelectorAll('*')) {
    if (!visible(el)) continue;
    const style = getComputedStyle(el);
    const radii = [style.borderTopLeftRadius, style.borderTopRightRadius,
      style.borderBottomRightRadius, style.borderBottomLeftRadius];
    if (radii.some(value => value !== '0px' && !value.includes('%'))) {
      rounded.push(`${describe(el)} → ${radii.join(' ')}`);
    }
    const clickable = el.matches('button, .btn, [role="button"], [data-arsenal-slot], .inv-tab, .npc-tab, .trader-mode-tab');
    if (!clickable) continue;
    // An ability's own icon is content, not chrome: every skill in the game has
    // one, they are picked per ability the way a name is, and swapping several
    // dozen of them for drawn art is its own piece of work rather than part of
    // making the interface consistent. The button around them is on the kit.
    if (el.matches('.skill-action-btn, .skill-btn')) continue;
    // Own text only: a button containing a framed child should not report twice.
    const own = [...el.childNodes].filter(n => n.nodeType === Node.TEXT_NODE).map(n => n.textContent).join('');
    const all = el.textContent || '';
    const text = own.trim() ? own : all;
    const found = text.match(new RegExp(COLOUR_EMOJI, 'gu'));
    if (found) emoji.push(`${describe(el)} → ${[...new Set(found)].join(' ')}`);
  }
  return { rounded: [...new Set(rounded)], emoji: [...new Set(emoji)] };
};

const rounded = new Map();
const emoji = new Map();
let browser;
let statesSeen = 0;
try {
  browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--disable-gpu'] });
  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height }, locale: 'ru-RU'
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof startNewGame === 'function');
    for (const state of UI_STATE_NAMES) {
      if (!await applyUiState(page, state)) continue;
      statesSeen += 1;
      const result = await page.evaluate(scan);
      const where = `${viewport.name || `${viewport.width}x${viewport.height}`}/${state}`;
      for (const entry of result.rounded) {
        if (!rounded.has(entry)) rounded.set(entry, new Set());
        rounded.get(entry).add(where);
      }
      for (const entry of result.emoji) {
        if (!emoji.has(entry)) emoji.set(entry, new Set());
        emoji.get(entry).add(where);
      }
    }
    await context.close();
  }
} finally {
  if (browser) await browser.close();
  await new Promise(done => server.close(done));
}

console.log(`Просмотрено состояний: ${statesSeen} (${UI_STATE_NAMES.length} x ${VIEWPORTS.length})`);
console.log(`Скруглённых элементов: ${rounded.size}`);
console.log(`Кнопок с цветными эмодзи: ${emoji.size}`);

const dump = (title, table) => {
  if (!table.size) return;
  console.log(`\n== ${title} ==`);
  for (const [entry, states] of table) {
    console.log(`  ${entry}`);
    if (showList) console.log(`      ${[...states].slice(0, 4).join(', ')}${states.size > 4 ? ` +${states.size - 4}` : ''}`);
  }
};
dump('Скругления', rounded);
dump('Цветные эмодзи в кнопках', emoji);

if (rounded.size || emoji.size) process.exit(1);
console.log('\nСтарого стиля не осталось.');
