/**
 * Screenshot any UI state the test driver can reach.
 *
 * The redesign work needs before-and-after pictures constantly, and reaching a
 * screen by hand means playing the game to get there. This drives the same
 * scripts/ui-states.mjs the audits use, so a shot is one command.
 *
 *   node scripts/ui-shot.mjs map                      desktop, into artifacts/shots
 *   node scripts/ui-shot.mjs city-trader-buy --phone  812x375 landscape phone
 *   node scripts/ui-shot.mjs menu map --out=/tmp      several states at once
 *   node scripts/ui-shot.mjs --list                   what states exist
 */
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createStaticServer } from './static-server.mjs';
import { applyUiState, UI_STATE_NAMES } from './ui-states.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const chromePath = process.env.CHROME_PATH || String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const args = process.argv.slice(2);

if (args.includes('--list') || args.length === 0) {
  console.log('Состояния:\n  ' + UI_STATE_NAMES.join('\n  '));
  process.exit(0);
}

const outArg = args.find(arg => arg.startsWith('--out='));
const outDir = resolve(root, outArg ? outArg.slice('--out='.length) : 'artifacts/shots');
const tagArg = args.find(arg => arg.startsWith('--tag='));
const tag = tagArg ? `${tagArg.slice('--tag='.length)}-` : '';
const phone = args.includes('--phone');
const portrait = args.includes('--portrait');
// Retina by default: pixel art and 8px type are unreadable in a 1x screenshot.
const scaleArg = args.find(arg => arg.startsWith('--scale='));
const scale = scaleArg ? Number(scaleArg.slice('--scale='.length)) : 2;
const states = args.filter(arg => !arg.startsWith('--'));

const unknown = states.filter(state => !UI_STATE_NAMES.includes(state));
if (unknown.length) {
  console.error(`Неизвестные состояния: ${unknown.join(', ')}\nСписок: node scripts/ui-shot.mjs --list`);
  process.exit(1);
}

const [width, height] = phone ? [812, 375] : portrait ? [375, 812] : [1440, 900];
mkdirSync(outDir, { recursive: true });

const server = createStaticServer(root);
await new Promise((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
const url = `http://127.0.0.1:${server.address().port}/index.html?seed=ui-shot`;

let browser;
try {
  browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--disable-gpu'] });
  for (const state of states) {
    // A fresh context per state: the driver walks the game forward, so reusing one
    // page would make each shot depend on the ones before it.
    const context = await browser.newContext({
      viewport: { width, height }, deviceScaleFactor: scale, locale: 'ru-RU'
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof startNewGame === 'function');
    const reached = await applyUiState(page, state);
    if (reached) {
      const file = resolve(outDir, `${tag}${state}-${width}x${height}.png`);
      await page.screenshot({ path: file });
      console.log(`снято  ${file}`);
    } else {
      console.log(`пропущено (состояние недостижимо): ${state}`);
    }
    await context.close();
  }
} finally {
  if (browser) await browser.close();
  await new Promise(done => server.close(done));
}
