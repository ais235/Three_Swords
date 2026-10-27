/**
 * Картинки карточки на itch.io: обложка 630×500 и баннер 960×350.
 *
 * Обложка — то, что видно в списках и в поиске; itch показывает её вдвое меньше
 * (315×250), поэтому на ней три вещи: название, отряд и одна строка жанра. Текст
 * мельче подзаголовка в таком масштабе не читается, и дробить его бессмысленно.
 *
 * Баннер — первое, что видит зашедший на страницу. Он полосой, а не ключевым
 * артом 16:9: высокая картинка занимает весь первый экран, и описание с кнопкой
 * уходят под сгиб. 350 px — середина диапазона живых страниц (248–456).
 *
 * Рисуется в браузере поверх арта самой игры: шрифт — тот же woff2, что в игре,
 * поэтому надпись не разъезжается и её не нужно сверять по буквам, как бывает с
 * надписями, вшитыми в сгенерированную картинку.
 *
 *   node scripts/make-itch-cover.mjs      artifacts/store/cover-630x500.png
 *                                         artifacts/store/banner-960x350.png
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createStaticServer } from './static-server.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const chromePath = process.env.CHROME_PATH || String.raw`C:\Program Files\Google\Chrome\Application\chrome.exe`;
const outDir = resolve(root, 'artifacts/store');
mkdirSync(outDir, { recursive: true });

/* Название страницы — английское: карточка на itch англоязычная. Стоит одной
 * строкой, потому что утверждается последним и может смениться. */
const TITLE = 'THREE BLADES';
const TAGLINE = 'Turn-based tactics roguelite';

const FONTS = `
  @font-face {
    font-family: 'Press Start 2P'; font-style: normal; font-weight: 400;
    src: url('/assets/fonts/press-start-2p-latin.woff2') format('woff2');
    unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+2000-206F;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Press Start 2P', monospace; image-rendering: pixelated; background: #0a0806; }
  .art { position: absolute; inset: 0; background: url('/assets/ui/fon.webp') center 45% / cover no-repeat; }
  .party { position: absolute; background: url('/assets/ui/heroes.webp') center / contain no-repeat;
           filter: drop-shadow(0 8px 20px rgba(0,0,0,.8)); }
  h1 { color: #f0a500; letter-spacing: 2px; text-shadow: 0 4px 0 #2a1c08, 0 0 24px rgba(240,165,0,.4); }
  .tag { color: #ece4d6; }
`;

const COVER = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${FONTS}
  body { width: 630px; height: 500px; position: relative; overflow: hidden; }
  /* Вуаль снизу: отряд стоит на светлом участке арта, без затемнения подпись
     сливается с небом. */
  .veil { position: absolute; inset: 0;
          background: linear-gradient(180deg, rgba(10,8,6,.86) 0%, rgba(10,8,6,.35) 38%, rgba(10,8,6,.92) 100%); }
  .party { left: 50%; transform: translateX(-50%); bottom: 54px; width: 320px; height: 320px; }
  h1 { position: absolute; top: 34px; width: 100%; text-align: center; font-size: 40px; line-height: 1.3; }
  .tag { position: absolute; bottom: 24px; width: 100%; text-align: center; font-size: 13px; line-height: 1.6; }
</style></head><body>
  <div class="art"></div><div class="veil"></div>
  <div class="party"></div>
  <h1>${TITLE}</h1>
  <div class="tag">${TAGLINE}</div>
</body></html>`;

const BANNER = `<!doctype html><html lang="en"><head><meta charset="utf-8"><style>${FONTS}
  body { width: 960px; height: 350px; position: relative; overflow: hidden; }
  .veil { position: absolute; inset: 0;
          background: linear-gradient(90deg, rgba(10,8,6,.92) 0%, rgba(10,8,6,.72) 52%, rgba(10,8,6,.18) 100%); }
  .party { right: 48px; top: 50%; transform: translateY(-50%); width: 300px; height: 300px; }
  .words { position: absolute; left: 56px; top: 50%; transform: translateY(-50%); }
  h1 { font-size: 46px; line-height: 1.3; }
  .tag { margin-top: 22px; font-size: 14px; line-height: 1.9; }
  .meta { margin-top: 18px; font-size: 11px; line-height: 2; color: #b8ab97; }
</style></head><body>
  <div class="art"></div><div class="veil"></div>
  <div class="words">
    <h1>${TITLE}</h1>
    <div class="tag">${TAGLINE}</div>
    <div class="meta">Three heroes · grid battles · 39 foes · 4 bosses<br>Plays in the browser · EN / RU / ES</div>
  </div>
  <div class="party"></div>
</body></html>`;

const server = createStaticServer(root);
await new Promise((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
const origin = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--disable-gpu'] });

for (const [name, html, width, height] of [
  ['cover-630x500', COVER, 630, 500],
  ['banner-960x350', BANNER, 960, 350]
]) {
  const pagePath = resolve(root, `artifacts/store/_${name}.html`);
  writeFileSync(pagePath, html, 'utf8');
  const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await context.newPage();
  await page.goto(`${origin}/artifacts/store/_${name}.html`, { waitUntil: 'networkidle' });
  // Шрифт грузится лениво: снимок до готовности уйдёт с запасной гарнитурой.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  await page.screenshot({ path: resolve(outDir, `${name}.png`) });
  await context.close();
  rmSync(pagePath, { force: true });
  console.log(`${name}.png  ${width}x${height}`);
}

await browser.close();
await new Promise(done => server.close(done));
console.log(`\nГотово: ${outDir}`);
