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
  const campaignRuntime = await page.evaluate(() => {
    GameState.contract = 'mercenaries';
    CampaignExpansion.startCampaign('e2e-campaign-expansion');
    const event = CampaignExpansion.eventForCell({ id: 'e2e-event', region: 1 });
    CampaignExpansion.applyEventEffect({ delayed: 'druid_cache' }, { region: 1 });
    startBattleForCell({ id: 'e2e-volcanic', region: 2, type: 'mission' }, {
      wave: [ENEMY_IDS.SKELETON, ENEMY_IDS.GOBLIN_ARCHER], scenario: 'defense'
    });
    const battle = GameState.currentBattle;
    const battleCheck = {
      scenario: battle.scenario?.id,
      regionalRule: battle.regionalRule,
      ward: battle.scenario?.ward?.hp,
      texture: !!RegionBattleTextures[2]
    };
    startBattleForCell({ id: 'e2e-holdout', region: 1, type: 'mission' }, {
      wave: [ENEMY_IDS.SKELETON, ENEMY_IDS.GOBLIN_ARCHER], scenario: 'holdout'
    });
    const holdout = GameState.currentBattle;
    const holdoutCheck = {
      enemies: holdout.units.filter(unit => !unit.isHero).length,
      nearbyVanguard: holdout.units.some(unit => !unit.isHero && unit.x <= 5),
      reinforcements: holdout.scenario?.waveRounds
    };
    const heroAtExit = { isHero: true, hp: 10, x: GRID_W - 1, sizeW: 1 };
    const liveRitualist = { isHero: false, hp: 10, scenarioTarget: 'ritualist' };
    const deadPrey = { isHero: false, hp: 0, scenarioTarget: 'prey' };
    const rules = {
      eliminate: allEnemiesDead({ units: [heroAtExit, deadPrey] }),
      holdout: CampaignExpansion.isVictory({ round: 5, scenario: { id: 'holdout', roundTarget: 4 } }),
      escape: CampaignExpansion.isVictory({ units: [heroAtExit], scenario: { id: 'escape' } }),
      defense: CampaignExpansion.isVictory({ round: 5, scenario: { id: 'defense', roundTarget: 4, ward: { hp: 1 } } }) && CampaignExpansion.isDefeat({ scenario: { id: 'defense', ward: { hp: 0 } } }),
      ritual: CampaignExpansion.isVictory({ units: [heroAtExit], scenario: { id: 'ritual' } }) && CampaignExpansion.isDefeat({ round: 7, units: [liveRitualist], scenario: { id: 'ritual', roundLimit: 6 } }),
      hunt: CampaignExpansion.isVictory({ units: [heroAtExit, deadPrey], scenario: { id: 'hunt' } }),
      waves: CampaignExpansion.isVictory({ round: 6, scenario: { id: 'waves', roundTarget: 5 } })
    };
    GameState.currentBattle = null;
    return {
      contracts: Object.keys(CampaignExpansion.CONTRACTS).length,
      mutators: GameState.campaignMutators.length,
      scenarios: Object.keys(CampaignExpansion.SCENARIOS).length,
      eventChoices: event.choices.length,
      delayed: GameState.campaignEvents.some(entry => entry.id === 'druid_cache'),
      assets: Object.values(CampaignExpansion.REGION).map(region => region.asset),
      battleCheck, holdoutCheck, rules
    };
  });
  check('campaign offers three distinct starting contracts', campaignRuntime.contracts === 3, JSON.stringify(campaignRuntime));
  check('each run receives two deterministic mutators', campaignRuntime.mutators === 2, JSON.stringify(campaignRuntime));
  check('campaign provides seven scenario objectives', campaignRuntime.scenarios >= 7, JSON.stringify(campaignRuntime));
  check('events contain meaningful three-way choices and delayed consequences', campaignRuntime.eventChoices === 3 && campaignRuntime.delayed, JSON.stringify(campaignRuntime));
  check('regional terrain assets are registered', campaignRuntime.assets.every(asset => asset.startsWith('assets/tiles/region-')), JSON.stringify(campaignRuntime));
  check('volcanic scenario carries regional rule and objective state', campaignRuntime.battleCheck.scenario === 'defense' && campaignRuntime.battleCheck.regionalRule === 'heat' && campaignRuntime.battleCheck.ward > 0 && campaignRuntime.battleCheck.texture, JSON.stringify(campaignRuntime));
  check('holdout starts under pressure and schedules reinforcements', campaignRuntime.holdoutCheck.enemies >= 4 && campaignRuntime.holdoutCheck.nearbyVanguard && campaignRuntime.holdoutCheck.reinforcements?.join(',') === '2,3', JSON.stringify(campaignRuntime.holdoutCheck));
  check('every scenario has an automated victory or failure rule', Object.values(campaignRuntime.rules).every(Boolean), JSON.stringify(campaignRuntime.rules));
  await page.evaluate(() => setCampaignContract('mercenaries'));
  check('contract selection updates its explanatory text', (await page.locator('#menu-contract-copy').textContent())?.length > 20);
  await page.evaluate(() => { showScreen('menu'); initMenuScreen(); });
  await page.getByRole('button', { name: /Новая игра|New Game/i }).click();

  const next = page.getByRole('button', { name: /Далее|Next/i });
  if (await next.count()) await next.click();
  const play = page.getByRole('button', { name: /Играть|Play/i });
  if (await play.count()) await play.click();

  check('new campaign opens directly in the first battle', await page.locator('#battle-screen:not(.hidden)').count() === 1);
  check('world map stays hidden before the first victory', await page.locator('#map-screen.hidden').count() === 1);
  await page.locator('#btn-start-battle').waitFor({ state: 'visible' });
  await page.locator('#btn-battle-briefing-continue').click();

  check('first battle cannot be skipped through the world map', await page.locator('#map-screen.hidden').count() === 1);
  check('deployment is available before combat', await page.locator('#btn-start-battle').count() === 1);
  check('field coaching is visible', await page.locator('#battle-coach-overlay .ftue-coach').count() === 1);
  const deploymentRuntime = await page.evaluate(() => {
    const b = GameState.currentBattle;
    const positions = Object.fromEntries(b.units.filter(unit => unit.isHero).map(unit => [unit.heroId, { x: unit.x, y: unit.y }]));
    const available = [];
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 0; x < GRID_W; x++) {
        if (isDeployCellAvailable(b, x, y)) available.push({ x, y });
      }
    }
    return { positions, available };
  });
  check('opening heroes start two rows lower', deploymentRuntime.positions.seris?.y === 2 && deploymentRuntime.positions.garet?.y === 3 && deploymentRuntime.positions.alira?.y === 4, JSON.stringify(deploymentRuntime));
  check('deployment highlights only valid cells in two left columns', deploymentRuntime.available.length >= 8 && deploymentRuntime.available.every(cell => cell.x <= 1), JSON.stringify(deploymentRuntime));

  await page.locator('#btn-start-battle').click();
  check('combat starts from deployment', await page.locator('#action-buttons .skill-action-btn').count() >= 1);
  check('recommended signature skill is highlighted', await page.locator('.skill-action-btn.ftue-recommended').count() === 1);
  check('combat shows one strong current initiative slot', await page.locator('#initiative-bar .init-slot.current').count() === 1);
  check('combat shows the next initiative slot', await page.locator('#initiative-bar .init-slot.next').count() === 1);
  check('combat names current and next units', await page.locator('#turn-focus-banner:not(.hidden)').count() === 1 && (await page.locator('#turn-focus-banner').textContent())?.includes('→'));
  check('current hero card has a turn chip', await page.locator('.hero-card.active .hero-turn-chip').count() === 1);

  await page.locator('#btn-open-menu').click();
  const speed = page.locator('#battle-speed-toggle');
  check('speed control lives in the pause menu', await speed.isVisible());
  check('speed toggle starts at ×1', (await speed.textContent())?.includes('×1'));
  await speed.click();
  check('speed toggle switches to ×2', (await speed.textContent())?.includes('×2'));
  await page.locator('#btn-menu-continue').click();

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
      actionFontSize: action ? parseFloat(getComputedStyle(action).fontSize) : 0,
      turnBannerVisible: !!document.querySelector('#turn-focus-banner:not(.hidden)'),
      turnBannerWidth: document.querySelector('#turn-focus-banner')?.getBoundingClientRect().width || 0
    };
  });
  check('812×375 has no horizontal overflow', layout.bodyWidth <= layout.viewportWidth, JSON.stringify(layout));
  check('mobile coach stays compact', layout.coachWidth > 0 && layout.coachWidth <= 310, JSON.stringify(layout));
  check('mobile action text is at least 10px', layout.actionFontSize >= 10, JSON.stringify(layout));
  check('mobile keeps the turn banner visible and contained', layout.turnBannerVisible && layout.turnBannerWidth > 0 && layout.turnBannerWidth < 224, JSON.stringify(layout));

  const ambushRuntime = await page.evaluate(() => {
    const ambushCell = { id: 'e2e_ambush', region: 1, type: 'mission' };
    startBattleForCell(ambushCell, {
      wave: [ENEMY_IDS.SKELETON, ENEMY_IDS.BOAR, ENEMY_IDS.GOBLIN_ARCHER],
      skipDeploy: true,
      ambush: true
    });
    const b = GameState.currentBattle;
    const heroes = b.units.filter(unit => unit.isHero && unit.hp > 0);
    const enemies = b.units.filter(unit => !unit.isHero && unit.hp > 0);
    const enemyEdges = enemies.map(unit => {
      const width = unitWidth(unit);
      const height = unitHeight(unit);
      return {
        onEdge: unit.x === 0 || unit.y === 0 || unit.x + width === GRID_W || unit.y + height === GRID_H,
        edge: unit.ambushEdge || ''
      };
    });

    // A direct animation probe verifies that endUnitTurn does not advance the
    // queue while the projectile/impact is still visible.
    const heroIndex = b.units.indexOf(heroes[0]);
    const enemyIndex = b.units.indexOf(enemies[0]);
    b.order = [heroIndex, enemyIndex];
    b.activeIndex = 0;
    b.phase = 'combat';
    b.visualLockUntil = 0;
    startBattleAttackAnimation(heroes[0], enemies[0], { animationSkill: 'basic' }, 1, enemies[0].hp);
    const activeBefore = b.activeIndex;
    endUnitTurn();
    const transitionWaits = b.activeIndex === activeBefore && !!b._turnAdvanceTimer && b.turnTransitionLocked === true;
    const visualWaitMs = Math.max(0, (b.visualLockUntil || 0) - performance.now());
    if (b._turnAdvanceTimer) clearTimeout(b._turnAdvanceTimer);
    b._turnAdvanceTimer = null;
    b.turnTransitionLocked = false;

    return {
      phase: b.phase,
      ambush: b.ambush,
      deploymentLocked: b.deploymentLocked,
      heroPositions: heroes.map(unit => ({ x: unit.x, y: unit.y })),
      enemyEdges,
      distinctEdges: new Set(enemyEdges.map(item => item.edge)).size,
      transitionWaits,
      visualWaitMs
    };
  });
  check('ambush skips deployment and locks the formation', ambushRuntime.phase === 'combat' && ambushRuntime.ambush && ambushRuntime.deploymentLocked, JSON.stringify(ambushRuntime));
  check('ambush heroes start in the center', ambushRuntime.heroPositions.every(pos => pos.x >= 4 && pos.x <= 7 && pos.y >= 2 && pos.y <= 5), JSON.stringify(ambushRuntime));
  check('ambush enemies surround heroes from distinct edges', ambushRuntime.enemyEdges.every(item => item.onEdge) && ambushRuntime.distinctEdges >= 3, JSON.stringify(ambushRuntime));
  check('turn queue waits for the visible attack', ambushRuntime.transitionWaits && ambushRuntime.visualWaitMs > 100, JSON.stringify(ambushRuntime));

  await page.setViewportSize({ width: 1280, height: 720 });
  await page.evaluate(() => {
    GameState.firstBattleCompleted = true;
    GameState.mapIntroShown = true;
    GameState.currentBattle = null;
    GameState.playerPos = { x: 0, y: 0 };
    GameState.screen = 'map';
    showScreen('map');
    renderMap();
  });
  check('regional boss silhouette is visible', await page.locator('.map-boss-silhouette').count() >= 1);
  check('region 1 boss guards the right edge', await page.locator('.map-node[data-node-type="boss"][data-region="1"][data-x="11"]').count() === 1);
  check('region 2 boss guards the left edge', await page.locator('.map-node[data-node-type="boss"][data-region="2"][data-x="0"]').count() === 1);
  check('region 3 boss guards the right edge', await page.locator('.map-node[data-node-type="boss"][data-region="3"][data-x="11"]').count() === 1);
  check('final boss waits in the lower-right corner', await page.locator('.map-node[data-node-type="final"][data-x="11"][data-y="7"]').count() === 1);
  check('regional walls render all segments', await page.locator('.map-wall-bottom').count() === 22 && await page.locator('.map-wall-top').count() === 22);
  check('regional walls expose two marked gateways', await page.locator('.map-gateway-down').count() === 2 && await page.locator('.map-gateway-up').count() === 2);
  check('an adjacent route exists after the first victory', await page.locator('.map-node.map-option').count() > 0);
  const hudText = await page.locator('#topbar-center').textContent();
  check('fantasy land name replaces the numeric region in HUD', hudText?.includes("Leshy's Forest") || hudText?.includes('Лес Лешего'), hudText || '');
  await page.evaluate(() => { GameState.mapIntroShown = false; void showMapIntroduction(); });
  check('map introduction appears after the first victory', await page.locator('#onboarding-modal:not(.hidden)').count() === 1);
  check('map introduction explains route choice', (await page.locator('#onboarding-text').textContent())?.length > 40);
  await page.locator('#onboarding-next').click();
  const landsText = await page.locator('#onboarding-modal').textContent();
  check('map introduction names all three lands', ['Лес Лешего', 'Огненные глубины', 'Затонувшие руины'].every(name => landsText?.includes(name)), landsText || '');
  await page.locator('#onboarding-next').click();
  check('map introduction is stored as shown', await page.evaluate(() => GameState.mapIntroShown === true));
  const linkedRouteCards = page.locator('.map-route-card[data-route-id]:not(.first-battle-route)');
  const linkedRouteCount = await linkedRouteCards.count();
  check('map exposes route cards for hover linking', linkedRouteCount > 0, `count=${linkedRouteCount}`);
  if (linkedRouteCount > 0) {
    const linkedRouteCard = linkedRouteCards.first();
    const linkedRouteId = await linkedRouteCard.getAttribute('data-route-id');
    const linkedMapNode = page.locator(`.map-node[data-node-id="${linkedRouteId}"]`);
    await linkedRouteCard.hover();
    check('route card hover highlights its map cell', await linkedMapNode.evaluate(el => el.classList.contains('route-linked-highlight')), linkedRouteId || '');
    await linkedMapNode.hover();
    check('map cell hover highlights its route card', await linkedRouteCard.evaluate(el => el.classList.contains('route-linked-highlight')), linkedRouteId || '');
  }

  const rewardedGoldGuard = await page.evaluate(() => {
    const originalGold = GameState.gold;
    const originalReward = GameState._lastBattleAdGold;
    const originalClaimed = GameState._lastBattleAdClaimed;
    GameState.gold = 100;
    GameState._lastBattleAdGold = 40;
    GameState._lastBattleAdClaimed = false;
    const first = claimVictoryAdGold();
    const second = claimVictoryAdGold();
    const result = { first, second, gold: GameState.gold, claimed: GameState._lastBattleAdClaimed };
    GameState.gold = originalGold;
    GameState._lastBattleAdGold = originalReward;
    GameState._lastBattleAdClaimed = originalClaimed;
    return result;
  });
  check('victory rewarded gold can only be claimed once',
    rewardedGoldGuard.first === 40 && rewardedGoldGuard.second === null && rewardedGoldGuard.gold === 140 && rewardedGoldGuard.claimed,
    JSON.stringify(rewardedGoldGuard));

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
