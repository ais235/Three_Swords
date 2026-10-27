/**
 * Одно полотно для поста: несколько экранов игры на общем фоне.
 *
 * Зачем отдельно от make-promo.mjs. Тот снимает кадры для карточки площадки, где
 * действует требование 5.1.1.2 — геймплей не меньше 70% кадра, и каждый кадр живёт
 * сам по себе. Пост в мессенджере устроен иначе: читатель видит одну картинку, и она
 * должна за секунду сказать, что это за игра. Поэтому здесь кадры кадрируются,
 * подписываются и собираются в один холст.
 *
 * Полотно рисуется в браузере и снимается одним скриншотом: это даёт шрифт и рамки
 * самой игры (9-slice border-image из assets/ui/kit), а не похожие на них. Собирать
 * коллаж вне игры пришлось бы повторять её оформление руками, и оно разошлось бы с
 * первой же правкой палитры.
 *
 * Кадры снимаются здесь же, тем же драйвером состояний, что и тесты: лежащие в
 * artifacts/ картинки живут недолго, а состояние игры описано в коде.
 *
 *   node scripts/make-poster.mjs             artifacts/promo/poster.png
 *   node scripts/make-poster.mjs --keep      не удалять исходные кадры
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createStaticServer } from './static-server.mjs';
import { applyUiState } from './ui-states.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const chromePath = process.env.CHROME_PATH || String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const keepSources = process.argv.includes('--keep');

/* Название игры живёт на площадке, а не в интерфейсе, и утверждается последним.
 * Здесь оно нужно — пост без названия бессмыслен, — но стоит одной строкой, чтобы
 * переименование стоило одной правки и одного прогона, а не перерисовки полотна. */
const TITLE = 'ТРИ КЛИНКА';
const TAGLINE = 'Пошаговая тактика про отряд из трёх героев';

/* Экран, кадрирование и подпись.
 *
 * Кадр показывается КУСКОМ в натуральную величину, а не целым экраном, ужатым в
 * плитку. Целый экран 1440x900 в плитке 760x400 даёт масштаб 0.53: подписи кнопок
 * и числа превращаются в кашу, и плитка перестаёт что-либо сообщать. Поэтому
 * `size` задаёт ширину, в которой рисуется исходный кадр (1440 — один к одному),
 * а `pos` — какой кусок попадает в окно плитки. Проценты в background-position
 * считаются от разницы размеров кадра и окна, а не от кадра. */
const PANELS = [
  { state: 'battle-combat', file: 'p-battle', span: 'wide', size: '1572px', pos: '0% 21%',
    cap: 'Бой по очереди ходов: позиция решает больше, чем урон' },
  { state: 'city-trader-buy', file: 'p-city', span: 'half', size: '1440px', pos: '32% 8%',
    cap: 'Город: торговец, алхимик, разведка' },
  { state: 'perk-modal', file: 'p-perks', span: 'half', size: '1240px', pos: '20% 30%',
    cap: 'Три ветки прокачки на каждого героя' },
  { state: 'battle-skill-targeting', file: 'p-aim', span: 'half', size: '1440px', pos: '91% 60%',
    cap: 'Умения по области бьют и по пустой клетке' },
  { state: 'victory', file: 'p-victory', span: 'half', size: '1700px', pos: '50% 18%',
    cap: 'После боя: опыт, золото, добыча' }
];

const srcDir = resolve(root, 'artifacts/poster-src');
const outDir = resolve(root, 'artifacts/promo');
mkdirSync(srcDir, { recursive: true });
mkdirSync(outDir, { recursive: true });

const server = createStaticServer(root);
await new Promise((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--disable-gpu'] });

/* ── 1. Кадры ───────────────────────────────────────────────────────────── */
for (const panel of PANELS) {
  // Свой контекст на кадр: драйвер ведёт игру вперёд, общий контекст сделал бы
  // каждый следующий кадр зависимым от предыдущих.
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,          // пиксель-арт и 8px шрифт в 1x нечитаемы
    locale: 'ru-RU'
  });
  const page = await context.newPage();
  await page.goto(`${origin}/index.html?seed=poster`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof startNewGame === 'function');
  if (!await applyUiState(page, panel.state)) {
    console.log(`пропущено: ${panel.state}`);
    await context.close();
    continue;
  }
  await page.evaluate(() => {
    document.querySelectorAll('#battle-coach-overlay, .onboarding-tip, #onboarding-modal')
      .forEach(el => el.classList.add('hidden'));
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: resolve(srcDir, `${panel.file}.png`) });
  console.log(`кадр    ${panel.file}.png  — ${panel.state}`);
  await context.close();
}

/* ── 2. Полотно ─────────────────────────────────────────────────────────── */
const wide = PANELS.find(p => p.span === 'wide');
const halves = PANELS.filter(p => p.span === 'half');

const panelHtml = p => `
  <figure class="shot ${p.span}">
    <div class="crop" style="background-image:url('/artifacts/poster-src/${p.file}.png');
                             background-size:${p.size} auto; background-position:${p.pos}"></div>
    <figcaption>${p.cap}</figcaption>
  </figure>`;

const html = `<!doctype html>
<html lang="ru"><head><meta charset="utf-8">
<style>
  @font-face {
    font-family: 'Press Start 2P'; font-style: normal; font-weight: 400;
    src: url('/assets/fonts/press-start-2p-cyrillic.woff2') format('woff2');
    unicode-range: U+0301, U+0400-045F, U+0490-0491, U+04B0-04B1, U+2116;
  }
  @font-face {
    font-family: 'Press Start 2P'; font-style: normal; font-weight: 400;
    src: url('/assets/fonts/press-start-2p-latin.woff2') format('woff2');
    unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+2000-206F;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1600px; background: #0a0806; color: #ece4d6;
    font-family: 'Press Start 2P', monospace;
    image-rendering: pixelated;
  }
  /* Шапка: фон главного меню, затемнённый, чтобы текст читался поверх неба. */
  header {
    position: relative; height: 448px; overflow: hidden;
    border-bottom: 3px solid #4d3b32;
  }
  header .bg {
    position: absolute; inset: 0;
    background: url('/assets/ui/fon.webp') center 42% / cover no-repeat;
  }
  header .veil {
    position: absolute; inset: 0;
    background: linear-gradient(90deg, rgba(10,8,6,.93) 0%, rgba(10,8,6,.78) 46%, rgba(10,8,6,.30) 100%);
  }
  header .inner {
    position: relative; height: 100%; display: flex; align-items: center;
    padding: 0 56px; gap: 32px;
  }
  .words { flex: 1 1 auto; }
  h1 {
    font-size: 54px; line-height: 1.35; color: #f0a500;
    text-shadow: 0 4px 0 #2a1c08, 0 0 28px rgba(240,165,0,.35);
    letter-spacing: 2px;
  }
  .tag { margin-top: 26px; font-size: 19px; line-height: 1.75; color: #ece4d6; }
  .meta { margin-top: 22px; font-size: 14px; line-height: 2; color: #b8ab97; }
  .meta b { color: #1abc9c; font-weight: 400; }
  header .party { width: 372px; height: 372px; flex: 0 0 auto;
    background: url('/assets/ui/heroes.webp') center / contain no-repeat;
    filter: drop-shadow(0 10px 24px rgba(0,0,0,.75)); }

  main { padding: 40px 40px 0; display: flex; flex-wrap: wrap; gap: 28px; }
  /* Рамка — та же, что на панелях в игре: 9-slice из kit/panel.png, без fill:
   * 82px дерева, растянутые на 700px, смазываются в кашу. */
  .shot {
    border-style: solid; border-width: 7px;
    border-image: url('/assets/ui/kit/panel.png') 7 stretch;
    background: #13100c; overflow: hidden;
  }
  .shot.wide { flex: 0 0 100%; }
  .shot.half { flex: 0 0 calc(50% - 14px); }
  .shot .crop { background-repeat: no-repeat; }
  .shot.wide .crop { height: 620px; }
  .shot.half .crop { height: 400px; }
  figcaption {
    padding: 18px 22px; font-size: 14px; line-height: 1.8; color: #ece4d6;
    background: #1a1611; border-top: 2px solid #4d3b32;
  }
  .shot.wide figcaption { font-size: 17px; color: #f0a500; }

  footer {
    margin-top: 36px; padding: 30px 46px 38px;
    border-top: 3px solid #4d3b32; background: #13100c;
    display: flex; align-items: center; justify-content: space-between; gap: 30px;
  }
  footer .left { font-size: 15px; line-height: 2; color: #b8ab97; }
  footer .left b { color: #ece4d6; font-weight: 400; }
  footer .right { font-size: 13px; line-height: 2; color: #8d8171; text-align: right; }
</style></head>
<body>
  <header>
    <div class="bg"></div><div class="veil"></div>
    <div class="inner">
      <div class="words">
        <h1>${TITLE}</h1>
        <div class="tag">${TAGLINE}</div>
        <div class="meta">
          Поход по карте · три региона · четыре босса<br>
          Прокачка до 10 уровня · 39 видов врагов<br>
          <b>Браузер · ПК и телефон · ru / en / es</b>
        </div>
      </div>
      <div class="party"></div>
    </div>
  </header>
  <main>
    ${wide ? panelHtml(wide) : ''}
    ${halves.map(panelHtml).join('')}
  </main>
  <footer>
    <div class="left"><b>Пошаговые бои на сетке.</b><br>Проигрыш стоит похода — но следующий отряд собирается иначе.</div>
    <div class="right">Пиксель-арт · без таймеров<br>Бой идёт, пока вы думаете</div>
  </footer>
</body></html>`;

const pagePath = resolve(root, 'artifacts/poster.html');
writeFileSync(pagePath, html, 'utf8');

const context = await browser.newContext({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1 });
const page = await context.newPage();
await page.goto(`${origin}/artifacts/poster.html`, { waitUntil: 'networkidle' });
// Шрифт подгружается лениво: снимок до его готовности уйдёт с запасной гарнитурой,
// и весь текст поедет по ширине.
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(200);
const out = resolve(outDir, 'poster.png');
await page.screenshot({ path: out, fullPage: true });
const size = await page.evaluate(() => [document.body.scrollWidth, document.body.scrollHeight]);
await context.close();
await browser.close();
await new Promise(done => server.close(done));

if (!keepSources) rmSync(srcDir, { recursive: true, force: true });
rmSync(pagePath, { force: true });
console.log(`\nполотно ${out}  ${size[0]}x${size[1]}`);
