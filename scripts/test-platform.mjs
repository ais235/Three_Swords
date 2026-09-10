/**
 * Платформенный контракт Яндекс Игр: то, что проверяет модерация, а не игрок.
 *
 * Общественный чекер (~/.claude/tools/yandex-games) даёт более широкий обзор, но
 * запускается руками и половину рантайм-проверок оставляет в «не проверено»,
 * потому что не видит вызовов внутри игры. Здесь проверяется то, что можно
 * утверждать точно, и проверяется на каждом прогоне тестов.
 *
 * SDK подставляется заглушкой: на площадке его отдаёт /sdk.js, локально это 404.
 * Заглушка отвечает ровно той поверхностью, которой пользуется игра.
 *
 *   npm run test:platform
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createStaticServer } from './static-server.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const chromePath = process.env.CHROME_PATH || String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;

const failures = [];
const check = (name, condition, details = '') => {
  if (condition) console.log(`PASS ${name}`);
  else { failures.push(`${name}${details ? `: ${details}` : ''}`); }
};

/** Заглушка SDK плюс запись моментов, которые иначе не увидеть снаружи. */
const instrument = () => {
  const t0 = performance.now();
  const trace = { readyAt: null, pixelFontAtReady: null, firstPaintAt: null, adsShown: 0, leaderboardCalls: 0 };
  window.__platformTrace = trace;
  requestAnimationFrame(() => { trace.firstPaintAt = Math.round(performance.now() - t0); });
  const later = (fn, ms) => setTimeout(fn, ms);
  const store = {};
  window.YaGames = {
    init: () => Promise.resolve({
      environment: { i18n: { lang: 'ru' }, app: { id: 'test' } },
      features: {
        LoadingAPI: {
          ready() {
            trace.readyAt = Math.round(performance.now() - t0);
            trace.pixelFontAtReady = document.fonts.check('12px "Press Start 2P"');
            return Promise.resolve();
          }
        }
      },
      adv: {
        showFullscreenAdv({ callbacks } = {}) {
          trace.adsShown += 1;
          later(() => callbacks?.onOpen?.(), 5);
          later(() => callbacks?.onClose?.(true), 20);
        },
        showRewardedVideo({ callbacks } = {}) {
          trace.adsShown += 1;
          later(() => callbacks?.onOpen?.(), 5);
          later(() => callbacks?.onRewarded?.(), 10);
          later(() => callbacks?.onClose?.(), 20);
        }
      },
      getPlayer: () => Promise.resolve({
        getMode: () => 'lite',
        setData: data => { Object.assign(store, data); return Promise.resolve(); },
        getData: keys => Promise.resolve((keys || Object.keys(store))
          .reduce((acc, key) => (acc[key] = store[key], acc), {})),
        setStats: () => Promise.resolve(),
        getStats: () => Promise.resolve({})
      }),
      // Современные имена: игра зовёт lb.setScore (src/game-state.js).
      leaderboards: {
        setScore: () => { trace.leaderboardCalls += 1; return Promise.resolve(); },
        getPlayerEntry: () => Promise.reject(new Error('no entry')),
        getEntries: () => Promise.resolve({ entries: [] })
      }
    })
  };
};

const server = createStaticServer(root);
await new Promise((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
const url = `http://127.0.0.1:${server.address().port}/index.html?seed=platform`;

let browser;
try {
  browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--disable-gpu'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'ru-RU' });
  const page = await context.newPage();

  // Всё, что игра тянет из сети. Архив обязан быть самодостаточным: внешний
  // запрос — это отказ модерации и пустой экран у игрока, если хост недоступен.
  const external = [];
  page.on('request', request => {
    const target = request.url();
    if (!target.startsWith('http')) return;
    if (!target.includes('127.0.0.1')) external.push(target);
  });

  await page.addInitScript(instrument);
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof startNewGame === 'function');
  await page.waitForFunction(() => window.__platformTrace?.readyAt !== null, { timeout: 8000 })
    .catch(() => {});
  const trace = await page.evaluate(() => window.__platformTrace);

  check('LoadingAPI.ready() вызывается', trace.readyAt !== null, JSON.stringify(trace));
  // Правило проекта: площадка снимает загрузчик по этому вызову, поэтому к нему
  // шрифт обязан быть загружен, иначе первый кадр уходит с запасной гарнитурой.
  check('ready() дожидается пиксельного шрифта', trace.pixelFontAtReady === true, JSON.stringify(trace));
  check('ready() после первого кадра',
    trace.firstPaintAt !== null && trace.readyAt >= trace.firstPaintAt, JSON.stringify(trace));

  // Требование 1.6.2.7: меню браузера поверх игры площадка считает дефектом.
  const contextMenuBlocked = await page.evaluate(() => {
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
    document.getElementById('game-container').dispatchEvent(event);
    return event.defaultPrevented;
  });
  check('правая кнопка не открывает меню браузера', contextMenuBlocked);

  // -webkit-touch-callout проверяется статически в scripts/audit-layout.mjs:
  // это свойство Safari, Chrome его не реализует и выбрасывает из вычисленных
  // стилей, поэтому здесь оно всегда выглядело бы отсутствующим.

  check('игра ничего не грузит извне', external.length === 0, external.slice(0, 5).join(', '));

  // Реклама на старте — частая причина отказа: до первого экрана её быть не должно.
  check('реклама не показывается при запуске', trace.adsShown === 0, String(trace.adsShown));

  await context.close();
} catch (error) {
  failures.push(`platform execution: ${error.stack || error.message}`);
} finally {
  if (browser) await browser.close();
  await new Promise(done => server.close(done));
}

if (failures.length) {
  failures.forEach(failure => console.error(`FAIL ${failure}`));
  process.exit(1);
}
console.log('Platform contract passed.');
