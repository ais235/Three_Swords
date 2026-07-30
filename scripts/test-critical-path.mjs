import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createStaticServer } from './static-server.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const failures = [];
const pass = name => console.log(`PASS ${name}`);
const check = (name, condition, details = '') => {
  if (condition) pass(name);
  else failures.push(`${name}${details ? `: ${details}` : ''}`);
};

const server = createStaticServer(root);
await new Promise((resolveListen, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolveListen);
});
const address = server.address();
const url = `http://127.0.0.1:${address.port}/index.html?seed=e2e-critical-path`;

let browser;
try {
  browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--disable-gpu', '--no-first-run', '--no-default-browser-check']
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'ru-RU' });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  const httpErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('Failed to load resource')) consoleErrors.push(message.text());
  });
  page.on('response', response => {
    const responseUrl = response.url();
    if (response.status() >= 400 && !responseUrl.endsWith('/sdk.js') && !responseUrl.endsWith('/favicon.ico')) {
      httpErrors.push(`${response.status()} ${responseUrl}`);
    }
  });

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  const animationRuntime = await page.evaluate(() => ({
    loaded: typeof globalThis.BattleAnimations?.resolveAttack === 'function',
    enemyProfiles: Object.keys(globalThis.BattleAnimations?.ENEMY || {}).length,
    deathProfiles: ['hero', 'enemy', 'boss'].map(kind => kind === 'hero'
      ? globalThis.BattleAnimations?.resolveDeath({ isHero: true }, {}).kind
      : globalThis.BattleAnimations?.resolveDeath({ isHero: false }, { boss: kind === 'boss' }).kind)
  }));
  check('battle animation runtime loads in the browser', animationRuntime.loaded, JSON.stringify(animationRuntime));
  check('browser runtime exposes all enemy animation profiles', animationRuntime.enemyProfiles >= 36, JSON.stringify(animationRuntime));
  check('browser runtime keeps three death styles', animationRuntime.deathProfiles.join(',') === 'hero,enemy,boss', JSON.stringify(animationRuntime));
  await page.getByRole('button', { name: /Новая игра|New Game/i }).click();

  const next = page.getByRole('button', { name: /Далее|Next/i });
  if (await next.count()) await next.click();
  const play = page.getByRole('button', { name: /Играть|Play/i });
  if (await play.count()) await play.click();

  check('onboarding reaches the world map', await page.locator('#map-screen:not(.hidden)').count() === 1);
  check('required first battle route is visible', await page.locator('#btn-first-battle-route').count() === 1);
  check('regional boss silhouette is visible', await page.locator('.map-boss-silhouette').count() >= 1);
  check('region 1 boss guards the right edge', await page.locator('.map-node[data-node-type="boss"][data-region="1"][data-x="11"]').count() === 1);
  check('region 2 boss guards the left edge', await page.locator('.map-node[data-node-type="boss"][data-region="2"][data-x="0"]').count() === 1);
  check('region 3 boss guards the right edge', await page.locator('.map-node[data-node-type="boss"][data-region="3"][data-x="11"]').count() === 1);
  check('final boss waits in the lower-right corner', await page.locator('.map-node[data-node-type="final"][data-x="11"][data-y="7"]').count() === 1);
  check('regional walls render all segments', await page.locator('.map-wall-bottom').count() === 22 && await page.locator('.map-wall-top').count() === 22);
  check('regional walls expose two marked gateways', await page.locator('.map-gateway-down').count() === 2 && await page.locator('.map-gateway-up').count() === 2);

  const adjacent = page.locator('.map-node.map-option').first();
  check('an adjacent route exists', await adjacent.count() === 1);
  await adjacent.click();
  await page.locator('#btn-start-battle').waitFor({ state: 'visible' });

  check('first battle cannot be skipped by route click', await page.locator('#btn-start-battle').isVisible());
  check('deployment is available before combat', await page.locator('#btn-start-battle').count() === 1);
  check('field coaching is visible', await page.locator('#battle-coach-overlay .ftue-coach').count() === 1);

  await page.locator('#btn-start-battle').click();
  check('combat starts from deployment', await page.locator('#action-buttons .skill-action-btn').count() >= 1);
  check('recommended signature skill is highlighted', await page.locator('.skill-action-btn.ftue-recommended').count() === 1);

  const speed = page.locator('#battle-speed-toggle');
  check('speed toggle starts at ×1', (await speed.textContent())?.trim() === '×1');
  await speed.click();
  check('speed toggle switches to ×2', (await speed.textContent())?.trim() === '×2');

  await page.setViewportSize({ width: 812, height: 375 });
  await page.waitForTimeout(100);
  const layout = await page.evaluate(() => {
    const coach = document.querySelector('#battle-coach-overlay');
    const action = document.querySelector('#action-buttons .skill-action-btn');
    return {
      viewportWidth: innerWidth,
      bodyWidth: document.body.scrollWidth,
      bodyHeight: document.body.scrollHeight,
      coachWidth: coach?.getBoundingClientRect().width || 0,
      actionFontSize: action ? parseFloat(getComputedStyle(action).fontSize) : 0
    };
  });
  check('812×375 has no horizontal overflow', layout.bodyWidth <= layout.viewportWidth, JSON.stringify(layout));
  check('mobile coach stays compact', layout.coachWidth > 0 && layout.coachWidth <= 310, JSON.stringify(layout));
  check('mobile action text is at least 10px', layout.actionFontSize >= 10, JSON.stringify(layout));
  check('runtime has no page errors', pageErrors.length === 0, pageErrors.join(' | '));
  check('runtime has no console errors', consoleErrors.length === 0, consoleErrors.join(' | '));
  check('runtime assets load without HTTP errors', httpErrors.length === 0, httpErrors.join(' | '));

  await context.close();
} catch (error) {
  failures.push(`critical path execution: ${error.stack || error.message}`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}

if (failures.length) {
  failures.forEach(failure => console.error(`FAIL ${failure}`));
  process.exit(1);
}

console.log('Critical path browser test passed.');
