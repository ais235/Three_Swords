/**
 * Сборка для itch.io: ничего платформенного на экране, ничего не 404.
 *
 * Игра писалась под Яндекс Игры, и всё платформенное — реклама, лидерборды,
 * облачные сохранения — висит на `window.ysdk`. Без SDK оно само не показывается,
 * и именно поэтому проверка нужна: «само не показывается» держится на двадцати
 * отдельных `if (window.ysdk)`, и достаточно одного места, где кнопку рисуют без
 * проверки, чтобы игрок на itch нажал на рекламу, которой там нет, и остался без
 * награды. Прогон обходит все состояния интерфейса на трёх языках и ищет
 * предложение рекламы в видимом тексте, а не только в известных кнопках: формулировка
 * приходит из словаря, и новая награда за ролик появится в нём, а не в этом списке.
 *
 * Проверяется ровно та папка, которая поедет на itch, а не исходники: разница
 * между ними — вырезанный тег SDK, то есть ровно то, что здесь измеряется.
 *
 *   npm run test:itch
 */
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createStaticServer } from './static-server.mjs';
import { applyUiState, UI_STATE_NAMES } from './ui-states.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const build = resolve(root, 'dist', 'three-blades-itch');
const chromePath = process.env.CHROME_PATH || String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;

const failures = [];
const check = (name, condition, details = '') => {
  if (condition) console.log(`PASS ${name}`);
  else failures.push(`${name}${details ? `: ${details}` : ''}`);
};

if (!existsSync(resolve(build, 'index.html'))) {
  console.error('FAIL сборки нет — сначала npm run package:itch');
  process.exit(1);
}

// Предложение рекламы в том виде, в каком его читает игрок, на трёх языках.
const AD_WORDS = /реклам|anuncio|\[ad\]|\bad\b|rewarded/i;
// Кнопки, которые существуют только ради ролика, плюс оформление «за рекламу».
// Разведки у Вейры здесь нет намеренно: без рекламы она остаётся как бесплатная
// услуга, и признак рекламы с неё снимается — его и проверяем через классы.
const AD_SELECTOR = '.btn-ad, .vic-btn-ad, .ico-ad, #btn-ad-revive, #btn-vic-ad, #btn-heal-ad';

const indexHtml = readFileSync(resolve(build, 'index.html'), 'utf8');
check('в index.html нет загрузки SDK площадки', !/sdk\.js/i.test(indexHtml));
check('в index.html нет путей от корня домена', !/(?:src|href)=["']\/[^"']/i.test(indexHtml));

const server = createStaticServer(build);
await new Promise((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
const url = `http://127.0.0.1:${server.address().port}/index.html?seed=itch`;

let browser;
try {
  browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--disable-gpu'] });

  // ── Язык берётся у браузера ────────────────────────────────────────────────
  // На Яндексе язык приходит из SDK. Здесь его нет, и единственный источник —
  // locale браузера. Если бы падение было на 'ru', каждый англоязычный игрок на
  // itch открывал бы игру по-русски.
  for (const [locale, expect] of [['en-US', 'NEW GAME'], ['es-ES', 'NUEVA'], ['ru-RU', 'НОВАЯ']]) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof startNewGame === 'function');
    await page.waitForTimeout(150);
    const label = (await page.locator('#btn-new-game').first().textContent() || '').trim().toUpperCase();
    check(`язык по locale ${locale}`, label.includes(expect), `кнопка новой игры: «${label}»`);
    await context.close();
  }

  // ── Ничего платформенного ──────────────────────────────────────────────────
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ru-RU' });
  const page = await context.newPage();
  const consoleErrors = [];
  const badResponses = [];
  page.on('console', message => { if (message.type() === 'error') consoleErrors.push(`${message.text().slice(0, 120)} @ ${message.location()?.url || '?'}`); });
  page.on('requestfailed', request => badResponses.push(`${request.url().split('/').pop()} — ${request.failure()?.errorText}`));
  page.on('response', response => { if (response.status() >= 400) badResponses.push(`${response.url().split('/').pop()} — ${response.status()}`); });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof startNewGame === 'function');
  await page.waitForTimeout(200);
  check('SDK площадки не загружен', await page.evaluate(() => typeof YaGames === 'undefined' && !window.ysdk));

  const adHits = new Map();
  for (const lang of ['ru', 'en', 'es']) {
    await page.evaluate(code => setGameLanguage(code), lang);
    for (const state of UI_STATE_NAMES) {
      if (!await applyUiState(page, state)) continue;
      await page.evaluate(code => setGameLanguage(code), lang);
      await page.waitForTimeout(50);
      for (const hit of await page.evaluate(([selector, source]) => {
        const words = new RegExp(source, 'i');
        const visible = (el) => {
          const rect = el.getBoundingClientRect();
          if (rect.width < 2 || rect.height < 2) return false;
          const style = getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden' && Number(style.opacity) > 0.05;
        };
        const out = [];
        for (const el of document.querySelectorAll(selector)) {
          if (visible(el)) out.push(`кнопка ${el.id ? '#' + el.id : el.className}`);
        }
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const node = walker.currentNode;
          const text = (node.nodeValue || '').trim();
          if (!text || !words.test(text)) continue;
          const parent = node.parentElement;
          if (!parent || parent.closest('script, style, .hidden') || !visible(parent)) continue;
          out.push(`текст «${text.slice(0, 48)}»`);
        }
        return out.slice(0, 4);
      }, [AD_SELECTOR, AD_WORDS.source])) {
        if (!adHits.has(hit)) adHits.set(hit, `${state}/${lang}`);
      }
    }
  }
  const adSample = [...adHits.entries()].slice(0, 8).map(([what, where]) => `${where} → ${what}`);
  check('реклама нигде не предлагается', adHits.size === 0, `${adHits.size} шт.; ${adSample.join(' | ')}`);

  // Таблица рекордов отправляется в лидерборды площадки; без SDK вызов обязан
  // просто не состояться, а не упасть в необработанное обещание.
  check('лидерборды не вызываются', await page.evaluate(() => {
    try { submitLeaderboards(loadRecords()); return true; } catch (_) { return false; }
  }));

  check('в консоли нет ошибок', consoleErrors.length === 0, consoleErrors.slice(0, 4).join(' | '));
  check('все файлы отдаются', badResponses.length === 0, badResponses.slice(0, 6).join(' | '));
  await context.close();
} catch (error) {
  failures.push(`itch build: ${error.stack || error.message}`);
} finally {
  if (browser) await browser.close();
  await new Promise(done => server.close(done));
}

if (failures.length) {
  failures.forEach(failure => console.error(`FAIL ${failure}`));
  process.exit(1);
}
console.log('Itch build audit passed.');
