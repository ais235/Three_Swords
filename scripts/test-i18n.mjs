/**
 * Перевод: на английском и испанском на экране не должно оставаться русского.
 *
 * Требование площадки 8.2.3 — смешение языков это отказ. Чекер эту проверку
 * оставляет в «не проверено»: он не знает, какой язык сейчас активен, и не может
 * истолковать результат сканирования DOM. Здесь язык переключается явно, поэтому
 * результат однозначен.
 *
 * Словарь проверяется отдельно и статически: 608 троек ru/en/es во всех файлах
 * исходников, ни одного пропуска. Но полный словарь ничего не говорит о строках,
 * собранных в коде мимо него, — их ловит только обход живых экранов.
 *
 *   npm run test:i18n
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createStaticServer } from './static-server.mjs';
import { applyUiState, UI_STATE_NAMES } from './ui-states.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const chromePath = process.env.CHROME_PATH || String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;

const failures = [];
const check = (name, condition, details = '') => {
  if (condition) console.log(`PASS ${name}`);
  else failures.push(`${name}${details ? `: ${details}` : ''}`);
};

/** Видимый текст с кириллицей. Возвращает узлы, а не весь текст экрана. */
const scanCyrillic = () => {
  const CYRILLIC = /[А-Яа-яЁё]/;
  const found = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!CYRILLIC.test(node.nodeValue || '')) return NodeFilter.FILTER_REJECT;
      const parent = node.parentElement;
      if (!parent) return NodeFilter.FILTER_REJECT;
      // Скрытое не показывается игроку, а служебные узлы вроде <script> текстом
      // на экране не являются.
      if (parent.closest('script, style, [aria-hidden="true"], .hidden')) return NodeFilter.FILTER_REJECT;
      const rect = parent.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return NodeFilter.FILTER_REJECT;
      const style = getComputedStyle(parent);
      if (style.display === 'none' || style.visibility === 'hidden') return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    }
  });
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const parent = node.parentElement;
    found.push({
      text: node.nodeValue.trim().slice(0, 60),
      where: parent.id ? `#${parent.id}` : `.${String(parent.className).split(' ')[0]}`
    });
    if (found.length >= 12) break;
  }
  return found;
};

const server = createStaticServer(root);
await new Promise((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
const url = `http://127.0.0.1:${server.address().port}/index.html?seed=i18n`;

let browser;
try {
  browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--disable-gpu'] });
  for (const lang of ['en', 'es']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ru-RU' });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof startNewGame === 'function');
    await page.evaluate(code => setGameLanguage(code), lang);
    await page.waitForTimeout(150);

    const leaks = new Map();
    // Испанский и английский длиннее русского, а вёрстка мерялась на русском:
    // подпись, которая помещалась, на другом языке вылезает за кнопку.
    const clipped = new Map();
    for (const state of UI_STATE_NAMES) {
      if (!await applyUiState(page, state)) continue;
      // Переключение языка повторяется после каждого перехода: экраны
      // перерисовываются на ходу, и часть из них строится заново.
      await page.evaluate(code => setGameLanguage(code), lang);
      await page.waitForTimeout(60);
      for (const item of await page.evaluate(scanCyrillic)) {
        // Строки, которые вписывает сам драйвер состояний, чтобы наполнить
        // журнал и модалки: они русские по определению и к переводу игры
        // отношения не имеют.
        if (/Проверочн|Ещё одна строка для высоты/.test(item.text)) continue;
        const key = `${item.where} :: ${item.text}`;
        if (!leaks.has(key)) leaks.set(key, state);
      }
      for (const item of await page.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll('button, .btn, .inv-tab, .npc-tab, .trader-mode-tab')) {
          const rect = el.getBoundingClientRect();
          if (rect.width < 2 || rect.height < 2) continue;
          if (getComputedStyle(el).overflow === 'visible') continue;
          if (el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2) {
            out.push(`${el.id ? '#' + el.id : '.' + String(el.className).split(' ')[0]} «${(el.textContent || '').trim().slice(0, 26)}»`);
          }
        }
        return out.slice(0, 6);
      })) {
        if (!clipped.has(item)) clipped.set(item, state);
      }
    }
    const sample = [...leaks.entries()].slice(0, 20).map(([text, state]) => `${state} → ${text}`);
    check(`на языке ${lang} не осталось русского текста`, leaks.size === 0,
      `${leaks.size} шт.; ${sample.join(' | ')}`);
    const clipSample = [...clipped.entries()].slice(0, 8).map(([what, state]) => `${state} → ${what}`);
    check(`на языке ${lang} подписи кнопок не обрезаны`, clipped.size === 0,
      `${clipped.size} шт.; ${clipSample.join(' | ')}`);
    await context.close();
  }
} catch (error) {
  failures.push(`i18n execution: ${error.stack || error.message}`);
} finally {
  if (browser) await browser.close();
  await new Promise(done => server.close(done));
}

if (failures.length) {
  failures.forEach(failure => console.error(`FAIL ${failure}`));
  process.exit(1);
}
console.log('I18n audit passed.');
