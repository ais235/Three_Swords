/**
 * Картинки для страницы на itch.io по стандарту пяти пунктов: GIF механики
 * (первый скриншот и начало описания) и вставки в описание.
 *
 * Снимается с настоящей сборки для itch (dist/three-blades-itch), а не с
 * исходников и не в графическом редакторе: в гифке ровно то, что увидит игрок
 * во встраивании. Код игры не трогается — бой расставляется через те же
 * глобальные функции, что используют тесты (scripts/ui-states.mjs), а ходы
 * делаются через canvasBattleClick — обработчик нажатия по полю.
 *
 * Сервер поднимается внутри этого процесса и гаснет вместе с ним — в finally,
 * при любом исходе: голый `&` в оболочке оставлял серверы жить часами.
 *
 *   npm run package:itch && npm run media:itch
 *
 *   artifacts/store/mechanic.gif      ход: Гарет подходит и добивает вепря
 *   artifacts/store/desc-map.png      карта похода, середина региона
 *   artifacts/store/desc-bosses.png   четыре босса
 *   artifacts/store/desc-squad.png    портреты отряда
 *
 * Кадры собирает в GIF scripts/itch-media.py (Pillow, одна палитра на клип);
 * ffmpeg не нужен.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createStaticServer } from './static-server.mjs';
import { applyUiState } from './ui-states.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const chromePath = process.env.CHROME_PATH || String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const buildDir = resolve(root, 'dist/three-blades-itch');
const outDir = resolve(root, 'artifacts/store');
const framesDir = resolve(root, 'tmp/itch-gif-frames');
if (!existsSync(resolve(buildDir, 'index.html'))) {
  console.error('Нет сборки dist/three-blades-itch — сначала npm run package:itch');
  process.exit(1);
}
mkdirSync(outDir, { recursive: true });

/* Игра только альбомная. Окно 1280×720 — то же, что встраивание на странице
   itch, плотность 1: клетка поля ~75 px, кусок 6×4 клетки — это ~480 px без
   масштабирования, а во всплывающей подсказке каталога (~300 px) клетка
   остаётся ~45 px и вепрь читается. */
const VIEW = { viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1, locale: 'en-US' };

/* Сцена ролика. У сида promo строка 1 — трава без препятствий на пути
   Гарета: он проходит две клетки и бьёт вепря, у которого оставлено 3 HP,
   так что удар добивает. Очередь хода переставлена: после Гарета ходит
   Алира, и она ждёт игрока — ни один враг не сдвинется, пока идёт запись. */
const STAGE = {
  heroes: { garet: [2, 1], alira: [1, 2], seris: [1, 3] },
  target: { at: [5, 1], hp: 3 },
  others: [[6, 2], [6, 3]],
  moveTo: [4, 1],
  crop: { x0: 0.55, y0: 0.45, cols: 6.6, rows: 3.9 }
};

/* Замедленные часы на время записи. Снимок куска поля занимает ~200 мс, то
   есть в реальном времени выходит 5 кадров в секунду — удар в 300 мс
   попадает в кадр одним снимком или не попадает вовсе. Поэтому на время
   записи страница живёт в SLOW раз медленнее: performance.now, Date.now,
   метки requestAnimationFrame и задержки таймеров идут через одни часы, а
   CSS-анимации замедляются через CDP. Код игры не меняется — подменяются
   часы браузера до загрузки страницы, как это делает виртуальное время.
   Время кадров в GIF — игровое, поэтому ролик идёт с настоящей скоростью. */
const SLOW = 12;
const CLOCK = () => {
  const realNow = performance.now.bind(performance);
  const realDate = Date.now;
  const dateOffset = realDate() - realNow();
  let factor = 1, baseReal = realNow(), baseVirt = baseReal;
  const virt = t => baseVirt + (t - baseReal) / factor;
  performance.now = () => virt(realNow());
  Date.now = () => Math.round(dateOffset + virt(realNow()));
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = cb => raf(t => cb(virt(t)));
  const st = window.setTimeout.bind(window), si = window.setInterval.bind(window);
  window.setTimeout = (fn, ms, ...a) => st(fn, (ms || 0) * factor, ...a);
  window.setInterval = (fn, ms, ...a) => si(fn, (ms || 0) * factor, ...a);
  window.__setClockFactor = f => { baseVirt = virt(realNow()); baseReal = realNow(); factor = f; };
};

const server = createStaticServer(buildDir);
let browser;
try {
  await new Promise((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
  const url = `http://127.0.0.1:${server.address().port}/index.html?seed=promo`;
  browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--disable-gpu'] });

  const open = async () => {
    const context = await browser.newContext(VIEW);
    await context.addInitScript(CLOCK);
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof startNewGame === 'function');
    await page.evaluate(() => document.fonts.ready);
    return { context, page };
  };
  const hideCoach = page => page.evaluate(() => {
    document.querySelectorAll('#battle-coach-overlay, .onboarding-tip, #onboarding-modal')
      .forEach(el => el.classList.add('hidden'));
  });

  /* ---------- GIF: один тактический ход ---------- */
  {
    const { context, page } = await open();
    if (!await applyUiState(page, 'battle-combat')) throw new Error('бой не открылся');
    await hideCoach(page);
    const geo = await page.evaluate(stage => {
      const b = GameState.currentBattle;
      const heroes = b.units.filter(u => u.isHero);
      for (const hero of heroes) {
        const spot = stage.heroes[hero.heroId];
        if (spot) [hero.x, hero.y] = spot;
      }
      const enemies = b.units.filter(u => !u.isHero && u.hp > 0 && unitWidth(u) === 1 && unitHeight(u) === 1 && u.move > 0);
      const target = enemies[0];
      [target.x, target.y] = stage.target.at;
      target.hp = stage.target.hp;
      enemies.slice(1, 1 + stage.others.length).forEach((enemy, i) => { [enemy.x, enemy.y] = stage.others[i]; });
      const index = unit => b.units.indexOf(unit);
      const garet = heroes.find(u => u.heroId === 'garet');
      b.order = [...heroes.map(index), ...b.units.filter(u => !u.isHero).map(index)];
      b.activeIndex = 0;
      b.heroMoved = false;
      b.heroActionDone = false;
      b.mode = 'move';
      b.pendingSkill = null;
      updateBattleUI();
      const rect = document.getElementById('battle-canvas').getBoundingClientRect();
      return { left: rect.left, top: rect.top, cell: rect.width / GRID_W, garet: [garet.x, garet.y], target: [target.x, target.y], targetName: target.name };
    }, STAGE);
    if (geo.garet.join() !== STAGE.heroes.garet.join()) throw new Error('Гарет не встал на место');
    console.log(`сцена: Гарет ${geo.garet} → ${STAGE.moveTo}, цель ${geo.targetName} ${geo.target}, клетка ${geo.cell.toFixed(1)} px`);

    const clip = {
      x: Math.round(geo.left + STAGE.crop.x0 * geo.cell),
      y: Math.round(geo.top + STAGE.crop.y0 * geo.cell),
      width: Math.round(STAGE.crop.cols * geo.cell),
      height: Math.round(STAGE.crop.rows * geo.cell)
    };
    await page.waitForTimeout(500);

    const cdp = await context.newCDPSession(page);
    await cdp.send('Animation.enable');
    await cdp.send('Animation.setPlaybackRate', { playbackRate: 1 / SLOW });
    await page.evaluate(f => window.__setClockFactor(f), SLOW);

    const frames = [];
    let recording = true;
    const t0 = Date.now();
    const loop = (async () => {
      while (recording) {
        const png = await page.screenshot({ clip, animations: 'allow', caret: 'initial' });
        frames.push({ t: (Date.now() - t0) / SLOW, png });
      }
    })();
    // Паузы — в игровом времени. Нажатие — через canvasBattleClick, тот же
    // обработчик, что зовёт клик по полю, но без наведения мыши: подсказки
    // наведения (клетка, прогноз удара) в 300 px не читаются и закрывают вепря.
    const beat = ms => page.waitForTimeout(ms * SLOW);
    const tap = ([gx, gy]) => page.evaluate(([x, y]) => canvasBattleClick(x, y), [gx, gy]);
    await beat(1000);                                  // исходная расстановка
    await tap(STAGE.moveTo); await beat(900);        // шаг на две клетки
    await tap(geo.target); await beat(1500);         // удар и гибель вепря
    recording = false;
    await loop;
    await page.evaluate(() => window.__setClockFactor(1));

    const result = await page.evaluate(() => {
      const b = GameState.currentBattle;
      const garet = b.units.find(u => u.heroId === 'garet');
      return { garet: [garet.x, garet.y], alive: b.units.filter(u => !u.isHero && u.hp > 0).length, active: getActiveUnit()?.heroId };
    });
    console.log(`после хода: Гарет ${result.garet}, живых врагов ${result.alive}, ходит ${result.active}`);
    if (result.garet.join() !== STAGE.moveTo.join()) throw new Error('Гарет не дошёл — сюжет ролика сломан');
    await context.close();

    rmSync(framesDir, { recursive: true, force: true });
    mkdirSync(framesDir, { recursive: true });
    frames.forEach((f, i) => writeFileSync(resolve(framesDir, `${String(i).padStart(4, '0')}.png`), f.png));
    writeFileSync(resolve(framesDir, 'times.json'), JSON.stringify(frames.map(f => f.t)));
  }

  /* ---------- Вставка: карта похода ---------- */
  {
    const { context, page } = await open();
    if (!await applyUiState(page, 'map-selected')) throw new Error('карта не открылась');
    await hideCoach(page);
    /* Середина похода: отряд прошёл верхнюю полосу леса и стоит на развилке.
       Туман у карты — по расстоянию от отряда (2 клетки) плюс пройденное,
       поэтому видно ровно то, что видит игрок в этой точке. Кусок — семь
       колонок и три ряда в натуральную величину (630 px — ширина колонки
       описания): подписи узлов читаются, а вся карта, ужатая до 630,
       превратилась бы в мелкую сетку. */
    const clip = await page.evaluate(() => {
      const path = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]];
      GameState.mapFogVisited = [];
      for (const [x, y] of path) {
        const cell = GameState.mapGrid.find(c => c.x === x && c.y === y);
        cell.visited = true; cell.completed = true;
        mapFogVisitedAdd(y, x);
      }
      GameState.playerPos = { x: 4, y: 1 };
      mapFogVisitedAdd(1, 4);
      renderMap();
      const first = document.querySelector('[data-node-id="c_0_0"]').getBoundingClientRect();
      return { x: Math.round(first.x) - 6, y: Math.round(first.y) - 6, width: 630, height: 240 };
    });
    await page.waitForTimeout(500);
    await page.screenshot({ path: resolve(outDir, 'desc-map.png'), clip });
    console.log(`desc-map.png: ${clip.width}x${clip.height}`);
    await context.close();
  }
} finally {
  await browser?.close();
  await new Promise(done => server.close(done));
}

const py = (...args) => execFileSync('python', [resolve(root, 'scripts/itch-media.py'), ...args], { encoding: 'utf8', cwd: root }).trim();
console.log(py('gif', framesDir, resolve(outDir, 'mechanic.gif')));
console.log(py('art', framesDir, outDir));
