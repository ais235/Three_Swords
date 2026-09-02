import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createStaticServer } from './static-server.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const failures = [];
const check = (name, condition, details = '') => {
  if (condition) console.log(`PASS ${name}`);
  else failures.push(`${name}${details ? `: ${details}` : ''}`);
};

const server = createStaticServer(root);
await new Promise((resolveListen, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolveListen);
});

let browser;
try {
  const url = `http://127.0.0.1:${server.address().port}/index.html?seed=release-full-campaign`;
  browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--disable-gpu', '--no-first-run', '--no-default-browser-check']
  });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 }, locale: 'ru-RU' });
  const page = await context.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', error => pageErrors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('Failed to load resource')) consoleErrors.push(message.text());
  });
  await page.goto(url, { waitUntil: 'domcontentloaded' });

  await page.evaluate(() => {
    GameState.contract = 'guardians';
    startNewGame();
  });
  check('new campaign starts in battle', await page.locator('#battle-screen:not(.hidden)').count() === 1);

  // After a region boss the victory screen also asks for the next region's
  // reward, then confirms it. Both own the screen and must be answered before
  // Continue is reachable, so the release test drives them like a player would.
  async function settleLevelUpChoices() {
    await page.waitForTimeout(500);
    let idleChecks = 0;
    for (let guard = 0; guard < 32; guard++) {
      if (await page.locator('#game-prompt-modal:not(.hidden)').count()) {
        idleChecks = 0;
        await page.locator('#game-prompt-ok').click();
        await page.waitForTimeout(30);
        continue;
      }
      if (await page.locator('#game-alert-modal:not(.hidden)').count()) {
        idleChecks = 0;
        await page.locator('#game-alert-ok').click();
        await page.waitForTimeout(30);
        continue;
      }
      if (await page.locator('#perk-modal:not(.hidden)').count()) {
        idleChecks = 0;
        const available = page.locator('#perk-modal .perk-skill.available');
        if (!await available.count()) throw new Error('perk modal has no available choice');
        await available.first().click();
        await page.locator('#perk-confirm-btn').click();
        await page.locator('#confirm-yes').click();
        await page.waitForTimeout(30);
        continue;
      }
      if (await page.locator('#skill-unlock-modal:not(.hidden)').count()) {
        idleChecks = 0;
        await page.locator('#btn-skill-unlock-ok').click();
        await page.waitForTimeout(30);
        continue;
      }
      idleChecks++;
      if (idleChecks >= 3) return;
      await page.waitForTimeout(250);
    }
    throw new Error('level-up choice queue did not settle');
  }

  // This release test accelerates combat resolution while preserving the real
  // battle completion, rewards, unlock, story, save and ending code paths.
  for (const region of [1, 2, 3]) {
    const state = await page.evaluate(regionNumber => {
      const node = GameState.mapGrid.find(cell => cell.type === 'boss' && cell.region === regionNumber);
      if (!node) return { missing: true };
      GameState.regionUnlocked = Math.max(GameState.regionUnlocked, regionNumber);
      GameState.playerPos = { x: node.x, y: node.y };
      GameState.heroes.forEach(hero => { hero.hp = hero.maxHp; });
      startBattleForCell(node, { skipDeploy: true });
      GameState.currentBattle.units.filter(unit => !unit.isHero).forEach(unit => { unit.hp = 0; });
      checkBattleEnd();
      return {
        defeatedBosses: GameState.defeatedBosses,
        regionUnlocked: GameState.regionUnlocked,
        pendingStoryScene: GameState.pendingStoryScene,
        screen: GameState.screen
      };
    }, region);
    check(`region ${region} boss completes through production path`,
      !state.missing && state.defeatedBosses === region && state.pendingStoryScene === `region${region}`,
      JSON.stringify(state));
    check(`region ${region} unlock progression is correct`, state.regionUnlocked === Math.min(3, region + 1), JSON.stringify(state));

    await settleLevelUpChoices();
    await page.locator('#btn-vic-continue').click();
    await page.locator('#story-modal:not(.hidden)').waitFor({ state: 'visible' });
    check(`region ${region} story uses a generated hero portrait`,
      (await page.locator('#story-portrait').getAttribute('src'))?.startsWith('assets/portraits/'));
    check(`region ${region} story has meaningful dialogue`, (await page.locator('#story-text').textContent())?.length > 45);
    for (let line = 0; line < 3; line++) await page.locator('#story-next').click();
    check(`region ${region} story is recorded as seen`,
      await page.evaluate(sceneId => GameState.storyScenesSeen.includes(sceneId) && GameState.pendingStoryScene === null, `region${region}`));
  }

  const finale = await page.evaluate(() => {
    const node = GameState.mapGrid.find(cell => cell.type === 'final');
    GameState.playerPos = { x: node.x, y: node.y };
    GameState.heroes.forEach(hero => { hero.hp = hero.maxHp; });
    startBattleForCell(node, { skipDeploy: true });
    GameState.currentBattle.units.filter(unit => !unit.isHero).forEach(unit => { unit.hp = 0; });
    checkBattleEnd();
    return {
      screen: GameState.screen,
      finalCompleted: node.completed,
      historyResult: GameState.runHistory?.[0]?.result,
      saved: JSON.parse(localStorage.getItem(SAVE_KEY) || '{}')
    };
  });
  await settleLevelUpChoices();
  await page.locator('#story-modal:not(.hidden)').waitFor({ state: 'visible' });
  check('final battle reaches the ending screen', finale.screen === 'ending' && finale.finalCompleted);
  check('victory is written to run history', finale.historyResult === 'victory');
  check('final completion is persisted in the save', finale.saved.mapGrid?.some(cell => cell.type === 'final' && cell.completed));
  check('epilogue starts with a hero portrait', (await page.locator('#story-portrait').getAttribute('src'))?.includes('garet-dialog.png'));
  for (let line = 0; line < 4; line++) await page.locator('#story-next').click();
  check('epilogue returns to the campaign summary', await page.locator('#ending-screen:not(.hidden)').count() === 1);
  check('ending copy names the consequences for the three lands', (await page.locator('#ending-epilogue').textContent())?.length > 120);
  check('ending summary contains the final builds', await page.locator('.ending-build').count() === 3);
  check('full campaign has no page errors', pageErrors.length === 0, pageErrors.join(' | '));
  check('full campaign has no console errors', consoleErrors.length === 0, consoleErrors.join(' | '));

  await context.close();
} catch (error) {
  failures.push(`full campaign execution: ${error.stack || error.message}`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}

if (failures.length) {
  failures.forEach(failure => console.error(`FAIL ${failure}`));
  process.exit(1);
}

console.log('Full campaign release path passed.');
