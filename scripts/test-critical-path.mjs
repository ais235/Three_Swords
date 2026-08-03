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
    const unitsBeforeReinforcements = holdout.units.length;
    holdout.round = holdout.scenario.waveRounds[0];
    const reinforcementOutcome = CampaignExpansion.onRoundStarted(holdout);
    spawnScenarioWave(holdout, reinforcementOutcome.spawn, reinforcementOutcome.spawnMode);
    const reinforcements = holdout.units.slice(unitsBeforeReinforcements);
    const holdoutCheck = {
      enemies: holdout.units.filter(unit => !unit.isHero).length,
      nearbyVanguard: holdout.units.some(unit => !unit.isHero && unit.x <= 5),
      reinforcementRounds: holdout.scenario?.waveRounds,
      reinforcementsSpawned: reinforcements.length,
      reinforcementsOnEdge: reinforcements.every(unit => unit.x === 0 || unit.y === 0
        || unit.x + (unit.sizeW || 1) === GRID_W
        || unit.y + (unit.sizeH || 1) === GRID_H)
    };
    startBattleForCell({ id: 'e2e-spread', region: 1, type: 'mission' }, {
      wave: [ENEMY_IDS.SKELETON, ENEMY_IDS.GOBLIN_ARCHER, ENEMY_IDS.BOAR, ENEMY_IDS.BANDIT],
      scenario: 'eliminate'
    });
    const spreadRows = GameState.currentBattle.units
      .filter(unit => !unit.isHero)
      .map(unit => unit.y);
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
      battleCheck, holdoutCheck, spreadRows, rules
    };
  });
  check('campaign offers three distinct starting contracts', campaignRuntime.contracts === 3, JSON.stringify(campaignRuntime));
  check('each run receives two deterministic mutators', campaignRuntime.mutators === 2, JSON.stringify(campaignRuntime));
  check('campaign provides seven scenario objectives', campaignRuntime.scenarios >= 7, JSON.stringify(campaignRuntime));
  check('events contain meaningful three-way choices and delayed consequences', campaignRuntime.eventChoices === 3 && campaignRuntime.delayed, JSON.stringify(campaignRuntime));
  check('regional terrain assets are registered', campaignRuntime.assets.every(asset => asset.startsWith('assets/tiles/region-')), JSON.stringify(campaignRuntime));
  check('volcanic scenario carries regional rule and objective state', campaignRuntime.battleCheck.scenario === 'defense' && campaignRuntime.battleCheck.regionalRule === 'heat' && campaignRuntime.battleCheck.ward > 0 && campaignRuntime.battleCheck.texture, JSON.stringify(campaignRuntime));
  check('holdout starts under pressure and schedules reinforcements', campaignRuntime.holdoutCheck.enemies >= 4 && campaignRuntime.holdoutCheck.nearbyVanguard && campaignRuntime.holdoutCheck.reinforcementRounds?.join(',') === '2,3', JSON.stringify(campaignRuntime.holdoutCheck));
  check('scenario reinforcements only enter from the battlefield edge', campaignRuntime.holdoutCheck.reinforcementsSpawned === 2 && campaignRuntime.holdoutCheck.reinforcementsOnEdge, JSON.stringify(campaignRuntime.holdoutCheck));
  check('normal enemies use the battlefield height', Math.max(...campaignRuntime.spreadRows) - Math.min(...campaignRuntime.spreadRows) >= 4, JSON.stringify(campaignRuntime.spreadRows));
  check('every scenario has an automated victory or failure rule', Object.values(campaignRuntime.rules).every(Boolean), JSON.stringify(campaignRuntime.rules));
  const wardCell = await page.evaluate(() => {
    startBattleForCell({ id: 'e2e-ward-tooltip', region: 2, type: 'mission' }, {
      wave: [ENEMY_IDS.SKELETON], scenario: 'defense'
    });
    GameState.currentBattle.phase = 'combat';
    updateBattleUI();
    return { ...GameState.currentBattle.scenario.ward };
  });
  const wardCanvasBox = await page.locator('#battle-canvas').boundingBox();
  if (wardCanvasBox) {
    await page.mouse.move(
      wardCanvasBox.x + ((wardCell.x + 0.5) / 12) * wardCanvasBox.width,
      wardCanvasBox.y + ((wardCell.y + 0.5) / 8) * wardCanvasBox.height
    );
  }
  const wardTooltipText = await page.locator('#tooltip').textContent();
  check('the defense shield explains itself on hover', /ОБЕРЕГ|WARD/i.test(wardTooltipText || '') && /24\/24/.test(wardTooltipText || ''), wardTooltipText || '');
  check('all special battlefield markers have localized explanations', await page.evaluate(() => ['wardMarker', 'wardTooltip', 'exitMarker', 'exitTooltip', 'trapMarker', 'trapTooltip', 'huntTargetTooltip', 'ritualTargetTooltip'].every(key => translateKey(key) !== key)));
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
    const enemyIds = b.units.filter(unit => !unit.isHero).map(unit => unit.enemyId);
    return { positions, available, enemyIds };
  });
  check('opening battle still includes the bandit thrower', deploymentRuntime.enemyIds.includes('bandit_thrower'), JSON.stringify(deploymentRuntime.enemyIds));
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
  const infoBeforeHover = await page.locator('#map-cell-info').textContent();
  await page.locator('.map-node.map-option').first().hover();
  const infoAfterHover = await page.locator('#map-cell-info').textContent();
  check('map hover shows only the hovered cell details', infoAfterHover?.trim() && infoAfterHover !== infoBeforeHover, infoAfterHover || '');
  const seerEyePreview = await page.evaluate(() => {
    const optionElement = document.querySelector('.map-node.map-option[data-node-type="mission"], .map-node.map-option[data-node-type="dungeon"], .map-node.map-option[data-node-type="boss"]');
    const nodeId = optionElement?.dataset.nodeId;
    const node = GameState.mapGrid.find(cell => cell.id === nodeId);
    const savedArtifacts = GameState.heroes.map(hero => hero.equipment?.artifact || null);
    GameState.heroes.forEach(hero => {
      hero.equipment = hero.equipment || {};
      if (hero.equipment.artifact === 'seer_eye') hero.equipment.artifact = null;
    });
    renderMap();
    document.querySelector(`.map-node[data-node-id="${nodeId}"]`)?.dispatchEvent(new MouseEvent('mouseenter'));
    const genericText = document.getElementById('map-cell-info').textContent;
    GameState.heroes[0].equipment.artifact = 'seer_eye';
    renderMap();
    document.querySelector(`.map-node[data-node-id="${nodeId}"]`)?.dispatchEvent(new MouseEvent('mouseenter'));
    const exactText = document.getElementById('map-cell-info').textContent;
    const exactNames = [...new Set((node.enemyWavePreview || []).map(enemyId => translateText(enemyDef(enemyId).name)))];
    const info = document.getElementById('map-cell-info');
    const fits = info.scrollHeight <= info.clientHeight + 1;
    GameState.heroes.forEach((hero, index) => { hero.equipment.artifact = savedArtifacts[index]; });
    renderMap();
    return { genericText, exactText, exactNames, fits };
  });
  check('Scout Eye replaces generic threat intel with the exact enemy lineup', seerEyePreview.exactNames.length > 0 && seerEyePreview.exactNames.every(name => seerEyePreview.exactText.includes(name)) && seerEyePreview.exactNames.some(name => !seerEyePreview.genericText.includes(name)), JSON.stringify(seerEyePreview));
  check('Scout Eye exact lineup still fits without scrolling', seerEyePreview.fits, JSON.stringify(seerEyePreview));
  check('map cell summary omits redundant campaign data', !['Локация активна', 'До босса', 'Корни:', 'Благосклонность городов', 'Дикие стаи'].some(text => infoAfterHover?.includes(text)), infoAfterHover || '');
  const mapInfoFit = await page.locator('#map-cell-info').evaluate(el => ({
    visible: getComputedStyle(el).display !== 'none',
    scrollHeight: el.scrollHeight,
    clientHeight: el.clientHeight,
    overflowY: getComputedStyle(el).overflowY
  }));
  check('selected map cell summary is visible without scrolling', mapInfoFit.visible && mapInfoFit.scrollHeight <= mapInfoFit.clientHeight + 1 && mapInfoFit.overflowY !== 'auto' && mapInfoFit.overflowY !== 'scroll', JSON.stringify(mapInfoFit));
  const locationTitle = (await page.locator('#map-panel-title').textContent())?.trim();
  check('selected map cell shows a proper place name', !!locationTitle && !/^LOCATION|^ЛОКАЦИЯ$/i.test(locationTitle), locationTitle || '');
  check('map objective is separated into a labelled row', await page.locator('#map-cell-info .cell-info-objective small').count() === 1, infoAfterHover || '');
  check('map no longer renders the three route cards', await page.locator('.map-route-card').count() === 0);
  const routeToEnter = page.locator('.map-node.map-option').first();
  const routePosition = await routeToEnter.evaluate(el => ({ x: Number(el.dataset.x), y: Number(el.dataset.y) }));
  const partyBeforeRouteClick = await page.evaluate(() => ({ ...GameState.playerPos }));
  await routeToEnter.click();
  const partyAfterFirstRouteClick = await page.evaluate(() => ({ ...GameState.playerPos }));
  check('first map-cell click only selects the destination', JSON.stringify(partyAfterFirstRouteClick) === JSON.stringify(partyBeforeRouteClick), JSON.stringify({ partyBeforeRouteClick, partyAfterFirstRouteClick }));
  check('first map-cell click visibly highlights the destination', await routeToEnter.evaluate(el => el.classList.contains('map-selected') && el.getAttribute('aria-selected') === 'true'));
  await routeToEnter.click();
  const partyAfterSecondRouteClick = await page.evaluate(() => ({ ...GameState.playerPos }));
  check('second map-cell click enters the selected destination', partyAfterSecondRouteClick.x === routePosition.x && partyAfterSecondRouteClick.y === routePosition.y, JSON.stringify({ routePosition, partyAfterSecondRouteClick }));

  const cityShopPersistence = await page.evaluate(() => {
    const city = GameState.mapGrid.find(node => node.type === 'city' && node.region === 1);
    GameState.cityShopStocks = {};
    GameState.shopStock = [];
    GameState.cityState = { adUpgradeUsed: false, secretRevealed: false, secretItemId: null };
    GameState.activeCityNode = null;
    GameState.gold = 100;
    enterCity(city);
    const firstStock = (GameState.shopStock.stock || GameState.shopStock).map(item => item.id).join(',');
    const firstSecret = GameState.cityState.secretItemId;
    const goldBeforeReturn = GameState.gold;
    showScreen('map');
    enterCity(city);
    const secondStock = (GameState.shopStock.stock || GameState.shopStock).map(item => item.id).join(',');
    const secondSecret = GameState.cityState.secretItemId;
    const goldAfterReturn = GameState.gold;
    const stateBeforePaidReroll = GameState.cityShopStocks[city.id];
    document.getElementById('btn-reroll-shop').click();
    return {
      firstStock, secondStock, firstSecret, secondSecret, goldBeforeReturn, goldAfterReturn,
      paidRerollCost: goldAfterReturn - GameState.gold,
      paidRerollReplacedState: stateBeforePaidReroll !== GameState.cityShopStocks[city.id]
    };
  });
  check('leaving and re-entering a city preserves its shop without charging gold', cityShopPersistence.firstStock === cityShopPersistence.secondStock && cityShopPersistence.firstSecret === cityShopPersistence.secondSecret && cityShopPersistence.goldBeforeReturn === cityShopPersistence.goldAfterReturn, JSON.stringify(cityShopPersistence));
  check('shop stock changes only through the paid reroll', cityShopPersistence.paidRerollCost === 20 && cityShopPersistence.paidRerollReplacedState, JSON.stringify(cityShopPersistence));

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

  const savedExitState = await page.evaluate(() => {
    GameState.currentBattle = null;
    GameState.gold = 437;
    GameState.turn = 19;
    GameState.firstBattleCompleted = true;
    GameState.lastSafeSave = { gold: 111, currentBattle: { oversized: true }, lastSafeSave: { nested: true } };
    showScreen('map');
    document.getElementById('btn-menu-save-exit').click();
    const stored = JSON.parse(localStorage.getItem(SAVE_KEY));
    return {
      gold: stored.gold,
      turn: stored.turn,
      nestedSafeSaveRemoved: stored.lastSafeSave?.lastSafeSave === null,
      safeBattleRemoved: stored.lastSafeSave?.currentBattle === null,
      bytes: localStorage.getItem(SAVE_KEY).length
    };
  });
  check('save and exit writes a compact non-recursive campaign snapshot', savedExitState.gold === 437 && savedExitState.turn === 19 && savedExitState.nestedSafeSaveRemoved && savedExitState.safeBattleRemoved && savedExitState.bytes < 1000000, JSON.stringify(savedExitState));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#btn-continue').click();
  const stateAfterReload = await page.evaluate(() => ({ gold: GameState.gold, turn: GameState.turn, screen: GameState.screen }));
  check('F5 followed by Continue restores the saved campaign', stateAfterReload.gold === 437 && stateAfterReload.turn === 19 && stateAfterReload.screen === 'map', JSON.stringify(stateAfterReload));

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
