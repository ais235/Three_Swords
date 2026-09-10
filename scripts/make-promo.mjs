/**
 * Промо-материалы для карточки игры: скриншоты и ролик.
 *
 * Требование площадки 5.1.1.2 — на скриншоте должен быть реальный геймплей, и он
 * должен занимать не меньше 70% кадра. Поэтому кадры снимаются с живой игры через
 * тот же драйвер состояний, что и тесты, а не собираются в графическом редакторе:
 * нарисованный коллаж этого требования не выполняет, и его видно.
 *
 * Ролик пишется средствами браузера во время настоящего прохождения: расстановка,
 * несколько ходов боя, победа. Он не заменяет монтаж, но даёт исходник, который
 * уже показывает игру, а не слайд-шоу.
 *
 *   node scripts/make-promo.mjs                снимки и ролик в artifacts/promo
 *   node scripts/make-promo.mjs --shots        только снимки
 *   node scripts/make-promo.mjs --video        только ролик
 */
import { mkdirSync, renameSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createStaticServer } from './static-server.mjs';
import { applyUiState } from './ui-states.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const chromePath = process.env.CHROME_PATH || String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const args = process.argv.slice(2);
const wantShots = !args.includes('--video');
const wantVideo = !args.includes('--shots');
const outDir = resolve(root, 'artifacts/promo');
mkdirSync(outDir, { recursive: true });

/** Кадры карточки: что именно продаёт игру. Порядок — порядок в галерее. */
const SHOTS = [
  { state: 'battle-combat', name: '1-battle', note: 'тактический бой на сетке' },
  { state: 'map-selected', name: '2-map', note: 'карта похода и выбор маршрута' },
  { state: 'city-trader-buy', name: '3-city', note: 'город, торговец, снаряжение' },
  { state: 'perk-modal', name: '4-perks', note: 'ветки развития героя' },
  { state: 'victory', name: '5-victory', note: 'добыча и рост после боя' }
];

const server = createStaticServer(root);
await new Promise((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
const url = `http://127.0.0.1:${server.address().port}/index.html?seed=promo`;

const launch = () => chromium.launch({ executablePath: chromePath, headless: true, args: ['--disable-gpu'] });

if (wantShots) {
  const browser = await launch();
  for (const shot of SHOTS) {
    // Отдельный контекст на кадр: драйвер ведёт игру вперёд, и общий контекст
    // сделал бы каждый следующий кадр зависимым от предыдущих.
    // Игра ограничена шириной 1360px (typography.css), поэтому съёмка во весь
    // 1920 даёт мёртвые поля по бокам — а требование 5.1.1.2 считает геймплей
    // долей кадра. Вьюпорт берётся ровно по ширине игры, а до 1920x1080 кадр
    // доводится увеличением плотности пикселей: игра заполняет кадр целиком и
    // остаётся резкой.
    const context = await browser.newContext({
      viewport: { width: 1360, height: 765 },
      deviceScaleFactor: 1920 / 1360,
      locale: 'ru-RU'
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof startNewGame === 'function');
    const reached = await applyUiState(page, shot.state);
    if (!reached) { console.log(`пропущено: ${shot.state}`); await context.close(); continue; }
    // Подсказки обучения и оверлеи — не геймплей, а поверх него.
    await page.evaluate(() => {
      document.querySelectorAll('#battle-coach-overlay, .onboarding-tip, #onboarding-modal')
        .forEach(el => el.classList.add('hidden'));
    });
    await page.waitForTimeout(300);
    await page.screenshot({ path: resolve(outDir, `${shot.name}.png`) });
    console.log(`снимок  ${shot.name}.png  — ${shot.note}`);
    await context.close();
  }
  await browser.close();
}

if (wantVideo) {
  const videoDir = resolve(outDir, '_video');
  rmSync(videoDir, { recursive: true, force: true });
  mkdirSync(videoDir, { recursive: true });
  const browser = await launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    locale: 'ru-RU',
    recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } }
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => typeof startNewGame === 'function');

  const beat = ms => page.waitForTimeout(ms);
  await beat(1400);                                   // титульный экран
  await applyUiState(page, 'map-selected'); await beat(2200);
  await applyUiState(page, 'battle-deployment'); await beat(1600);
  await applyUiState(page, 'battle-combat'); await beat(1200);

  // Несколько настоящих ходов: попадания, полёт снарядов, убыль здоровья.
  for (let turn = 0; turn < 4; turn += 1) {
    const acted = await page.evaluate(() => {
      const b = GameState.currentBattle;
      if (!b) return false;
      const hero = typeof getActiveUnit === 'function' ? getActiveUnit() : null;
      if (!hero || !hero.isHero) return false;
      const enemy = b.units.find(u => !u.isHero && u.hp > 0);
      if (!enemy) return false;
      b.mode = 'attack';
      b.pendingSkill = null;
      canvasBattleClick(enemy.x, enemy.y);
      return true;
    });
    await beat(acted ? 1100 : 400);
  }
  await applyUiState(page, 'victory'); await beat(2400);

  await context.close();
  await browser.close();

  const produced = readdirSync(videoDir).filter(name => name.endsWith('.webm'));
  if (produced.length) {
    const target = resolve(outDir, 'gameplay.webm');
    rmSync(target, { force: true });
    renameSync(resolve(videoDir, produced[0]), target);
    rmSync(videoDir, { recursive: true, force: true });
    console.log(`ролик   gameplay.webm`);
  } else {
    console.log('ролик не записан: браузер не отдал файл');
  }
}

await new Promise(done => server.close(done));
console.log(`\nГотово: ${outDir}`);
console.log('Скриншоты 1920x1080, ролик 1280x720. Точные размеры для карточки');
console.log('уточняются в консоли разработчика — см. docs/PROMO.md.');
