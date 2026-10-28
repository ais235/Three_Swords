import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';
import { createStaticServer } from './static-server.mjs';

const topology = createRequire(import.meta.url)('../src/map-topology.js');

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
      texture: !!RegionBattleTextures[2],
      initialFire: battle.grid.flat().filter(tile => tile === TILE.FIRE).length
    };
    battle.round = 2;
    const heatWarningOutcome = CampaignExpansion.onRoundStarted(battle);
    const collapseWarning = battle.heatWarnings?.find(warning => warning.type === 'collapse');
    const lavaWarning = battle.heatWarnings?.find(warning => warning.type === 'lava');
    const collapseTarget = battle.units.find(unit => unit.isHero);
    const lavaTarget = battle.units.find(unit => unit.isHero && unit !== collapseTarget);
    const collapseHpBefore = collapseTarget?.hp;
    const lavaHpBefore = lavaTarget?.hp;
    if (collapseWarning && collapseTarget) { collapseTarget.x = collapseWarning.x; collapseTarget.y = collapseWarning.y; }
    if (lavaWarning && lavaTarget) { lavaTarget.x = lavaWarning.x; lavaTarget.y = lavaWarning.y; }
    battle.round = 3;
    const heatCollapseOutcome = CampaignExpansion.onRoundStarted(battle);
    battleCheck.heatWarningVisible = !!collapseWarning && !!lavaWarning && heatWarningOutcome.log.includes('⚠');
    battleCheck.collapseCreated = !!collapseWarning && battle.grid[collapseWarning.y][collapseWarning.x] === TILE.MOUNTAIN;
    battleCheck.collapseLogged = heatCollapseOutcome.log.length > 0;
    battleCheck.collapsePushedWithDamage = !!collapseTarget && collapseTarget.hp < collapseHpBefore && (collapseTarget.hp <= 0 || collapseTarget.x !== collapseWarning.x || collapseTarget.y !== collapseWarning.y);
    battleCheck.lavaTriggeredWithDamage = !!lavaTarget && lavaTarget.hp < lavaHpBefore && battle.grid[lavaWarning.y][lavaWarning.x] === TILE.FIRE;
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
    const rootBoss = GameState.mapGrid.find(cell => cell.region === 1 && cell.type === 'boss');
    const regionOneCells = GameState.mapGrid
      .filter(cell => cell.region === 1 && cell.id !== rootBoss?.id)
      .map(cell => ({ cell, distance: WorldMapTopology.shortestDistance(cell, rootBoss) }))
      .sort((a, z) => a.distance - z.distance);
    const nearRootCell = regionOneCells[0]?.cell;
    const farRootCell = regionOneCells[regionOneCells.length - 1]?.cell;
    const nearPlan = CampaignExpansion.forestRootPlan(nearRootCell);
    const farPlan = CampaignExpansion.forestRootPlan(farRootCell);
    startBattleForCell(nearRootCell, { wave: [ENEMY_IDS.SKELETON], scenario: 'eliminate' });
    const rootBattle = GameState.currentBattle;
    const roots = rootBattle.units.filter(unit => unit.enemyId === ENEMY_IDS.ROOT_SENTINEL);
    const rootGroundUsesRegionalTile = roots.length > 0 && regionalBattleTextureForCell(rootBattle, roots[0].x, roots[0].y) === RegionBattleTextures[1];
    startBattleForCell(rootBoss, { wave: [ENEMY_IDS.LESHY], scenario: 'eliminate' });
    const bossBattle = GameState.currentBattle;
    const leshy = bossBattle.units.find(unit => unit.enemyId === ENEMY_IDS.LESHY);
    const bossRoots = bossBattle.units.filter(unit => unit.enemyId === ENEMY_IDS.ROOT_SENTINEL);
    const rootCheck = {
      nearPlan, farPlan,
      normalRoots: roots.length,
      rootStats: roots[0] ? { hp: roots[0].maxHp, move: roots[0].move, range: roots[0].range, attack: roots[0].attack } : null,
      bossRoots: bossRoots.length,
      bossRootPositions: bossRoots.map(root => ({ x: root.x, y: root.y, distance: unitDistance(root, leshy) })),
      bossRing: bossRoots.every(root => unitDistance(root, leshy) <= 1),
      rootTexture: !!EnemyTextures[ENEMY_IDS.ROOT_SENTINEL],
      rootGroundUsesRegionalTile
    };
    startBattleForCell({ id: 'e2e-fire-rise', region: 2, type: 'mission' }, { wave: [ENEMY_IDS.SKELETON], scenario: 'eliminate' });
    const fireRiseBattle = GameState.currentBattle;
    fireRiseBattle.round = 2;
    CampaignExpansion.onRoundStarted(fireRiseBattle);
    fireRiseBattle.round = 3;
    CampaignExpansion.onRoundStarted(fireRiseBattle);
    const risenFire = fireRiseBattle.units.find(unit => unit.enemyId === ENEMY_IDS.FIRE_ELEMENTAL && unit.hp > 0);
    const fireHpBeforeHeal = risenFire?.hp;
    if (risenFire) {
      risenFire.hp -= 5;
      applyGroundEffects(risenFire);
    }
    const fireRiseCheck = {
      count: fireRiseBattle.units.filter(unit => unit.enemyId === ENEMY_IDS.FIRE_ELEMENTAL && unit.hp > 0).length,
      onFire: fireRiseBattle.units.filter(unit => unit.enemyId === ENEMY_IDS.FIRE_ELEMENTAL && unit.hp > 0)
        .every(unit => fireRiseBattle.grid[unit.y][unit.x] === TILE.FIRE),
      fireHealing: !!risenFire && risenFire.hp === fireHpBeforeHeal - 2,
      regionalTile: !!risenFire && regionalBattleTextureForCell(fireRiseBattle, risenFire.x, risenFire.y) === RegionBattleTextures[2]
    };
    startBattleForCell({ id: 'e2e-tide-rise', region: 3, type: 'mission' }, { wave: [ENEMY_IDS.GHOST], scenario: 'eliminate' });
    const tideBattle = GameState.currentBattle;
    tideBattle.round = 2;
    const tideWarningOutcome = CampaignExpansion.onRoundStarted(tideBattle);
    const warnedTide = [...(tideBattle.tideWarnings || [])];
    tideBattle.round = 3;
    CampaignExpansion.onRoundStarted(tideBattle);
    const waterElementals = tideBattle.units.filter(unit => unit.enemyId === ENEMY_IDS.WATER_ELEMENTAL && unit.hp > 0);
    const risenWater = waterElementals[0];
    const pushedHero = tideBattle.units.find(unit => unit.isHero);
    let pushed = false;
    if (risenWater && pushedHero) {
      tideBattle.units.filter(unit => unit !== risenWater && unit !== pushedHero).forEach(unit => { unit.hp = 0; });
      risenWater.x = 4; risenWater.y = 3;
      pushedHero.x = 5; pushedHero.y = 3;
      tideBattle.grid[3][4] = TILE.WATER;
      tideBattle.grid[3][5] = TILE.GROUND;
      tideBattle.grid[3][6] = TILE.GROUND;
      aiAttack(risenWater, pushedHero);
      pushed = pushedHero.x !== 5 || pushedHero.y !== 3;
    }
    const tideCheck = {
      warned: warnedTide.length >= 2 && tideWarningOutcome.log.includes('⚠'),
      flooded: warnedTide.every(tile => tideBattle.grid[tile.y][tile.x] === TILE.WATER),
      elementals: waterElementals.length,
      onWater: waterElementals.every(unit => unit === risenWater || tideBattle.grid[unit.y][unit.x] === TILE.WATER),
      pushed,
      regionalTile: warnedTide.length > 0 && regionalBattleTextureForCell(tideBattle, warnedTide[0].x, warnedTide[0].y) === RegionBattleTextures[3]
    };
    const regionalTextureSizes = Object.values(RegionBattleTextures).map(texture => [texture.naturalWidth, texture.naturalHeight]);
    const fireBoss = GameState.mapGrid.find(cell => cell.region === 2 && cell.type === 'boss');
    startBattleForCell(fireBoss, { wave: [ENEMY_IDS.FIRE_TITAN], scenario: 'eliminate' });
    const fireBossBattle = GameState.currentBattle;
    const titan = fireBossBattle.units.find(unit => unit.enemyId === ENEMY_IDS.FIRE_TITAN);
    const fireGuards = fireBossBattle.units.filter(unit => unit.enemyId === ENEMY_IDS.FIRE_ELEMENTAL && unit.bossGuardian);
    const fireHero = fireBossBattle.units.find(unit => unit.isHero);
    const titanHp = titan.hp;
    dealDamage(fireHero, titan, 30, { magic: true, blockIgnore: true, noWeaponBonus: true });
    const titanShieldedDamage = titanHp - titan.hp;
    titan.hp = titanHp;
    fireGuards.forEach(unit => { unit.hp = 0; });
    dealDamage(fireHero, titan, 30, { magic: true, blockIgnore: true, noWeaponBonus: true });
    const titanOpenDamage = titanHp - titan.hp;
    const fireBossCheck = { guards: fireGuards.length, elementalTiles: fireGuards.every(unit => fireBossBattle.grid[unit.y][unit.x] === TILE.FIRE), shieldedDamage: titanShieldedDamage, openDamage: titanOpenDamage };
    const waterBoss = GameState.mapGrid.find(cell => cell.region === 3 && cell.type === 'boss');
    startBattleForCell(waterBoss, { wave: [ENEMY_IDS.HYDRA], scenario: 'eliminate' });
    const waterBossBattle = GameState.currentBattle;
    const hydra = waterBossBattle.units.find(unit => unit.enemyId === ENEMY_IDS.HYDRA);
    const waterGuards = waterBossBattle.units.filter(unit => unit.enemyId === ENEMY_IDS.WATER_ELEMENTAL && unit.bossGuardian);
    const waterHero = waterBossBattle.units.find(unit => unit.isHero);
    const hydraHp = hydra.hp;
    dealDamage(waterHero, hydra, 30, { magic: true, blockIgnore: true, noWeaponBonus: true });
    const hydraShieldedDamage = hydraHp - hydra.hp;
    hydra.hp = hydraHp;
    waterGuards.forEach(unit => { unit.hp = 0; });
    dealDamage(waterHero, hydra, 30, { magic: true, blockIgnore: true, noWeaponBonus: true });
    const hydraOpenDamage = hydraHp - hydra.hp;
    const waterBossCheck = { guards: waterGuards.length, elementalTiles: waterGuards.every(unit => waterBossBattle.grid[unit.y][unit.x] === TILE.WATER), hydra: !!hydra, titan: !!titan, shieldedDamage: hydraShieldedDamage, openDamage: hydraOpenDamage };
    const elementalBestiaryCheck = [ENEMY_IDS.FIRE_ELEMENTAL, ENEMY_IDS.WATER_ELEMENTAL].every(id =>
      ENEMY_BESTIARY_DATA[id]?.tactic && ENEMY_BESTIARY_DATA[id]?.weakness && EnemyTextures[id]);
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
      battleCheck, holdoutCheck, spreadRows, rootCheck, fireRiseCheck, tideCheck, regionalTextureSizes, fireBossCheck, waterBossCheck, elementalBestiaryCheck, rules
    };
  });
  check('campaign offers three distinct starting contracts', campaignRuntime.contracts === 3, JSON.stringify(campaignRuntime));
  check('each run receives two deterministic mutators', campaignRuntime.mutators === 2, JSON.stringify(campaignRuntime));
  check('campaign provides seven scenario objectives', campaignRuntime.scenarios >= 7, JSON.stringify(campaignRuntime));
  check('events contain meaningful three-way choices and delayed consequences', campaignRuntime.eventChoices === 3 && campaignRuntime.delayed, JSON.stringify(campaignRuntime));
  check('regional terrain assets are registered', campaignRuntime.assets.every(asset => asset.startsWith('assets/tiles/region-')), JSON.stringify(campaignRuntime));
  check('volcanic scenario carries regional rule and objective state', campaignRuntime.battleCheck.scenario === 'defense' && campaignRuntime.battleCheck.regionalRule === 'heat' && campaignRuntime.battleCheck.ward > 0 && campaignRuntime.battleCheck.texture, JSON.stringify(campaignRuntime));
  check('region 2 battles begin with visible fire tiles', campaignRuntime.battleCheck.initialFire >= 2, JSON.stringify(campaignRuntime.battleCheck));
  check('region 2 collapse and lava warn one round before triggering', campaignRuntime.battleCheck.heatWarningVisible && campaignRuntime.battleCheck.collapseCreated && campaignRuntime.battleCheck.collapseLogged, JSON.stringify(campaignRuntime.battleCheck));
  check('collapse damages and pushes exposed units while lava burns them', campaignRuntime.battleCheck.collapsePushedWithDamage && campaignRuntime.battleCheck.lavaTriggeredWithDamage, JSON.stringify(campaignRuntime.battleCheck));
  check('holdout starts under pressure and schedules reinforcements', campaignRuntime.holdoutCheck.enemies >= 4 && campaignRuntime.holdoutCheck.nearbyVanguard && campaignRuntime.holdoutCheck.reinforcementRounds?.join(',') === '2,3', JSON.stringify(campaignRuntime.holdoutCheck));
  check('scenario reinforcements only enter from the battlefield edge', campaignRuntime.holdoutCheck.reinforcementsSpawned === 2 && campaignRuntime.holdoutCheck.reinforcementsOnEdge, JSON.stringify(campaignRuntime.holdoutCheck));
  check('normal enemies use the battlefield height', Math.max(...campaignRuntime.spreadRows) - Math.min(...campaignRuntime.spreadRows) >= 4, JSON.stringify(campaignRuntime.spreadRows));
  check('forest roots scale up near Leshy and behave as static adjacent attackers', campaignRuntime.rootCheck.nearPlan.count >= campaignRuntime.rootCheck.farPlan.count && campaignRuntime.rootCheck.normalRoots === campaignRuntime.rootCheck.nearPlan.count && campaignRuntime.rootCheck.rootStats?.hp > 0 && campaignRuntime.rootCheck.rootStats?.move === 0 && campaignRuntime.rootCheck.rootStats?.range === 1 && campaignRuntime.rootCheck.rootTexture, JSON.stringify(campaignRuntime.rootCheck));
  check('forest roots replace their ground with the forest regional tile', campaignRuntime.rootCheck.rootGroundUsesRegionalTile, JSON.stringify(campaignRuntime.rootCheck));
  check('Leshy starts protected by a four-root ring', campaignRuntime.rootCheck.bossRoots === 4 && campaignRuntime.rootCheck.bossRing, JSON.stringify(campaignRuntime.rootCheck));
  check('warned lava can raise a fire elemental that heals on fire', campaignRuntime.fireRiseCheck.count === 1 && campaignRuntime.fireRiseCheck.onFire && campaignRuntime.fireRiseCheck.fireHealing, JSON.stringify(campaignRuntime.fireRiseCheck));
  check('lava cells use the volcanic regional tile', campaignRuntime.fireRiseCheck.regionalTile, JSON.stringify(campaignRuntime.fireRiseCheck));
  check('the tide warns, floods connected cells and raises a pushing water elemental', campaignRuntime.tideCheck.warned && campaignRuntime.tideCheck.flooded && campaignRuntime.tideCheck.elementals === 1 && campaignRuntime.tideCheck.onWater && campaignRuntime.tideCheck.pushed, JSON.stringify(campaignRuntime.tideCheck));
  check('tide cells use the sunken ruins regional tile', campaignRuntime.tideCheck.regionalTile, JSON.stringify(campaignRuntime.tideCheck));
  check('regional battle tiles are optimized to 128x128', campaignRuntime.regionalTextureSizes.every(size => size[0] === 128 && size[1] === 128), JSON.stringify(campaignRuntime.regionalTextureSizes));
  check('regional bosses start with two elemental guards on matching terrain', campaignRuntime.fireBossCheck.guards === 2 && campaignRuntime.fireBossCheck.elementalTiles && campaignRuntime.waterBossCheck.guards === 2 && campaignRuntime.waterBossCheck.elementalTiles && campaignRuntime.waterBossCheck.hydra && campaignRuntime.waterBossCheck.titan, JSON.stringify({ fire: campaignRuntime.fireBossCheck, water: campaignRuntime.waterBossCheck }));
  check('elemental guards reduce boss damage until destroyed', campaignRuntime.fireBossCheck.shieldedDamage < campaignRuntime.fireBossCheck.openDamage && campaignRuntime.waterBossCheck.shieldedDamage < campaignRuntime.waterBossCheck.openDamage, JSON.stringify({ fire: campaignRuntime.fireBossCheck, water: campaignRuntime.waterBossCheck }));
  check('new elementals have portraits and complete bestiary entries', campaignRuntime.elementalBestiaryCheck, JSON.stringify(campaignRuntime));
  check('every scenario has an automated victory or failure rule', Object.values(campaignRuntime.rules).every(Boolean), JSON.stringify(campaignRuntime.rules));
  const eventAudit = await page.evaluate(() => {
    const saved = deepClone(GameState);
    const failures = [];
    let choices = 0;
    const fail = (id, message) => failures.push(`${id}: ${message}`);
    try {
      Object.entries(CampaignExpansion.EVENTS).forEach(([region, events]) => events.forEach(event => event[4].forEach((choice, choiceIndex) => {
        choices++;
        const id = `${event[0]}:${choiceIndex}`;
        const effect = choice[2] || {};
        initHeroesFromTemplate();
        GameState.gold = 100;
        GameState.inventory = [];
        GameState.consumables = { healing: 0, mana: 0 };
        GameState.campaignEvents = [];
        GameState.campaignEffects = { nextScenario: null, nextAmbush: false, ambushProtection: false, wardUntilBoss: false, wardArmor: 0, wardBonuses: {}, pactUntilBoss: false, pactAttack: 0, manaCrystal: false, hunterIntel: false, scoutedNodeIds: [] };
        GameState.mapFogVisited = [];
        GameState.playerPos = { x: 0, y: 0 };
        const beforeHeroes = deepClone(GameState.heroes);
        const beforeInventory = GameState.inventory.length;
        CampaignExpansion.applyEventEffect(effect, { id: `audit-${id}`, region: Number(region) });
        if (GameState.gold !== Math.max(0, 100 + (Number(effect.gold) || 0))) fail(id, `gold ${GameState.gold}`);
        if (effect.heal && !GameState.heroes.every((hero, index) => hero.hp === Math.min(hero.maxHp, beforeHeroes[index].hp + effect.heal))) fail(id, 'healing mismatch');
        if (effect.hp && !GameState.heroes.every((hero, index) => hero.hp === Math.max(1, beforeHeroes[index].hp + effect.hp))) fail(id, 'party damage mismatch');
        if (effect.item && GameState.inventory.length !== beforeInventory + 1) fail(id, 'item missing');
        if (effect.potion && GameState.consumables.healing !== effect.potion) fail(id, 'potions missing');
        if (effect.reveal && GameState.mapFogVisited.length < 2) fail(id, 'map not revealed');
        if (effect.intel && !(GameState.campaignEffects.scoutedNodeIds || []).length) fail(id, 'enemy intel missing');
        if (effect.nextScenario && GameState.campaignEffects.nextScenario !== effect.nextScenario) fail(id, 'scenario not stored');
        if (effect.ambush && !GameState.campaignEffects.nextAmbush) fail(id, 'ambush not stored');
        if (effect.clearAmbush && !GameState.campaignEffects.ambushProtection) fail(id, 'ambush protection missing');
        if (effect.ward) {
          const bonuses = GameState.campaignEffects.wardBonuses || {};
          const values = Object.values(bonuses);
          const expectedRecipients = effect.wardTarget === 'weakestArmor' ? 1 : GameState.heroes.length;
          if (values.length !== expectedRecipients || values.some(value => value !== Number(effect.ward))) fail(id, `ward ${JSON.stringify(bonuses)}`);
        }
        if (effect.pact && GameState.campaignEffects.pactAttack !== 2) fail(id, 'pact attack mismatch');
        if (effect.mana && !GameState.campaignEffects.manaCrystal) fail(id, 'mana effect missing');
        if (effect.delayed && !GameState.campaignEvents.some(entry => entry.id === effect.delayed)) fail(id, 'delayed consequence missing');
        if ((Number(effect.gold) || 0) < 0) {
          const cost = -Number(effect.gold);
          GameState.gold = cost - 1;
          GameState.inventory = [];
          GameState.consumables = { healing: 0 };
          const blockedBefore = JSON.stringify({ gold: GameState.gold, inventory: GameState.inventory, consumables: GameState.consumables });
          const validation = CampaignExpansion.validateEventEffect(effect);
          CampaignExpansion.applyEventEffect(effect, { id: `blocked-${id}`, region: Number(region) });
          const blockedAfter = JSON.stringify({ gold: GameState.gold, inventory: GameState.inventory, consumables: GameState.consumables });
          if (validation.ok || blockedAfter !== blockedBefore) fail(id, 'insufficient gold was not blocked');
        }
      })));

      initHeroesFromTemplate();
      GameState.heroes.filter(hero => hero.maxMana).forEach(hero => { hero.mana = Math.max(0, hero.maxMana - 2); });
      GameState.campaignEffects = { nextScenario: null, nextAmbush: false, ambushProtection: false, wardUntilBoss: false, wardArmor: 0, wardBonuses: {}, pactUntilBoss: false, pactAttack: 0, manaCrystal: false, hunterIntel: false, scoutedNodeIds: [] };
      CampaignExpansion.applyEventEffect({ ward: 2, pact: true, mana: true }, { id: 'audit-battle-buffs', region: 2 });
      const buffUnits = GameState.heroes.map((hero, index) => makeBattleHero(hero, index));
      const buffBefore = buffUnits.map(unit => ({ armor: unit.armor, attack: unit.attack, mana: unit.mana }));
      CampaignExpansion.applyStartBattleEffects({ units: buffUnits, scenario: { id: 'eliminate' }, grid: generateBattleGrid(2) });
      const battleBuffsWork = buffUnits.every((unit, index) => unit.armor === buffBefore[index].armor + 2 && unit.attack === buffBefore[index].attack + 2)
        && buffUnits.filter(unit => unit.maxMana).every(unit => unit.mana === buffBefore[buffUnits.indexOf(unit)].mana + 1);

      const scoutNode = GameState.mapGrid.find(node => ['mission', 'dungeon'].includes(node.type) && node.id !== getCurrentCell()?.id);
      GameState.campaignEffects.scoutedNodeIds = scoutNode ? [scoutNode.id] : [];
      const scoutedIntelWorks = !!scoutNode && mapNodeIntel(scoutNode).composition.startsWith('👁');

      initHeroesFromTemplate();
      GameState.gold = 100;
      GameState.turn = 2;
      GameState.campaignEvents = [
        { id: 'miners_gratitude', region: 2, at: 2, resolved: false },
        { id: 'spirit_tide', region: 3, at: 2, resolved: false }
      ];
      GameState._campaignNotice = '';
      CampaignExpansion.resolveDelayedEvents();
      const queuedNotices = GameState._campaignNotice.split('\n').filter(Boolean).length === 2;

      GameState.campaignEffects = { nextAmbush: true, ambushProtection: true, wardBonuses: {}, scoutedNodeIds: [] };
      startBattleForCell({ id: 'audit-protected-ambush', region: 1, type: 'mission', ambush: true }, { wave: [ENEMY_IDS.SKELETON], scenario: 'eliminate' });
      const protectionWorks = !GameState.currentBattle.ambush && !GameState.campaignEffects.ambushProtection && !GameState.campaignEffects.nextAmbush;
      return { choices, failures, queuedNotices, protectionWorks, battleBuffsWork, scoutedIntelWorks };
    } finally {
      Object.keys(GameState).forEach(key => delete GameState[key]);
      Object.assign(GameState, saved);
    }
  });
  check('all 36 event choices apply every advertised immediate and delayed effect', eventAudit.choices === 36 && eventAudit.failures.length === 0, JSON.stringify(eventAudit));
  check('paid event choices reject insufficient gold without granting rewards', eventAudit.failures.every(failure => !failure.includes('insufficient gold')), JSON.stringify(eventAudit));
  check('event ambush protection guarantees the next battle starts normally', eventAudit.protectionWorks, JSON.stringify(eventAudit));
  check('event armor, attack and mana bonuses reach the actual battle units', eventAudit.battleBuffsWork, JSON.stringify(eventAudit));
  check('event reconnaissance reveals exact enemy lineups only on scouted cells', eventAudit.scoutedIntelWorks, JSON.stringify(eventAudit));
  check('simultaneous delayed consequences keep every notification', eventAudit.queuedNotices, JSON.stringify(eventAudit));
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
  check('all special battlefield markers have localized explanations', await page.evaluate(() => ['wardMarker', 'wardTooltip', 'exitMarker', 'exitTooltip', 'trapMarker', 'trapTooltip', 'huntTargetTooltip', 'ritualTargetTooltip', 'collapseWarning', 'lavaWarning', 'tideWarning', 'collapseWarningTooltip', 'lavaWarningTooltip', 'tideWarningTooltip'].every(key => translateKey(key) !== key)));
  await page.evaluate(() => setCampaignContract('mercenaries'));
  check('contract selection updates its explanatory text', (await page.locator('#menu-contract-copy').textContent())?.length > 20);
  await page.evaluate(() => { showScreen('menu'); initMenuScreen(); });
  await page.getByRole('button', { name: /Новая игра|New Game/i }).click();

  const next = page.getByRole('button', { name: /Далее|Next/i });
  if (await next.count()) await next.click();
  const play = page.getByRole('button', { name: /Играть|Play/i });
  if (await play.count()) await play.click();

  await page.locator('#battle-screen:not(.hidden)').waitFor({ state: 'visible' });
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
    const firstEnemy = b.units.find(unit => !unit.isHero && unit.hp > 0);
    return { positions, available, enemyIds, firstEnemy: firstEnemy ? { x: firstEnemy.x, y: firstEnemy.y, name: firstEnemy.name } : null };
  });
  check('opening battle still includes the bandit thrower', deploymentRuntime.enemyIds.includes('bandit_thrower'), JSON.stringify(deploymentRuntime.enemyIds));
  check('opening heroes start two rows lower', deploymentRuntime.positions.seris?.y === 2 && deploymentRuntime.positions.garet?.y === 3 && deploymentRuntime.positions.alira?.y === 4, JSON.stringify(deploymentRuntime));
  check('deployment highlights only valid cells in two left columns', deploymentRuntime.available.length >= 8 && deploymentRuntime.available.every(cell => cell.x <= 1), JSON.stringify(deploymentRuntime));
  check('mission objective stays visible in the battle top bar', await page.locator('#battle-objective-top:not(.hidden)').count() === 1 && ((await page.locator('#battle-objective-top').textContent()) || '').trim().length > 8);
  check('inventory and bestiary are available beside the battle menu', await page.locator('#btn-battle-inventory:not(.hidden)').count() === 1 && await page.locator('#btn-battle-bestiary:not(.hidden)').count() === 1);
  check('battle has only the top inventory command', await page.locator('#btn-battle-inv').count() === 0 && /Инвентарь|Inventory/i.test((await page.locator('#btn-battle-inventory').textContent()) || ''));
  // Иконка стала элементом с CSS-маской вместо эмодзи, но проверяем то же самое:
  // ровно одна, а не задвоенная при перерисовке кнопки.
  const bestiaryTop = await page.evaluate(() => {
    const btn = document.getElementById('btn-battle-bestiary');
    return { icons: btn.querySelectorAll('.ico').length, text: (btn.textContent || '').trim() };
  });
  check('battle bestiary button has one book icon',
    bestiaryTop.icons === 1 && /Бестиарий|Bestiary/i.test(bestiaryTop.text), JSON.stringify(bestiaryTop));
  const desktopTopButtonFit = await page.evaluate(() => {
    const hud = document.getElementById('hud-top').getBoundingClientRect();
    return ['btn-battle-inventory', 'btn-battle-bestiary', 'btn-open-menu'].map(id => {
      const el = document.getElementById(id);
      const rect = el.getBoundingClientRect();
      // Зазор между надписью и краем кнопки. Кнопки одеты в нарисованную плашку,
      // и её рамка нарисована внутри рамочной коробки: если строка выше своего
      // места, она садится на нижнюю планку и обрезается ею. Снаружи кнопка при
      // этом остаётся ровно на месте, поэтому проверять только её положение в
      // панели мало.
      const range = document.createRange();
      range.selectNodeContents(el);
      const text = range.getBoundingClientRect();
      return { id, top: rect.top - hud.top, bottom: hud.bottom - rect.bottom, height: rect.height,
        labelTop: Math.round(text.top - rect.top), labelBottom: Math.round(rect.bottom - text.bottom) };
    });
  });
  check('desktop top button borders stay inside the HUD', desktopTopButtonFit.every(item => item.top >= 2 && item.bottom >= 2), JSON.stringify(desktopTopButtonFit));
  check('desktop top button labels sit inside their plaque',
    desktopTopButtonFit.every(item => item.labelTop >= 3 && item.labelBottom >= 3), JSON.stringify(desktopTopButtonFit));
  const enemyClientPoint = deploymentRuntime.firstEnemy ? await page.evaluate(({ x, y }) => {
    const rect = canvasContentRect();
    const canvasX = BattleView.offsetX + (x + 0.5) * CELL * BattleView.zoom;
    const canvasY = BattleView.offsetY + (y + 0.5) * CELL * BattleView.zoom;
    return {
      x: rect.left + canvasX * (rect.width / CANVAS_W),
      y: rect.top + canvasY * (rect.height / CANVAS_H)
    };
  }, deploymentRuntime.firstEnemy) : null;
  const enemyHoverDebug = enemyClientPoint ? await page.evaluate(point => {
      document.getElementById('battle-canvas').dispatchEvent(new MouseEvent('mousemove', {
        clientX: point.x, clientY: point.y, bubbles: true
      }));
      const grid = eventToGrid(point.x, point.y);
      const unit = unitAt(GameState.currentBattle, grid.gx, grid.gy);
      const tooltip = document.getElementById('tooltip');
      return { grid, unit: unit?.name || '', display: tooltip.style.display, text: tooltip.textContent || '' };
    }, enemyClientPoint) : null;
  const deployEnemyTooltip = (await page.locator('#tooltip').textContent()) || '';
  check('enemy stats and ability are inspectable before combat starts', await page.locator('#tooltip').isVisible() && /HP:\s*\d+\/\d+/.test(deployEnemyTooltip) && /Атака|Attack/i.test(deployEnemyTooltip) && deployEnemyTooltip.trim().split('\n').filter(Boolean).length >= 5, JSON.stringify(enemyHoverDebug));

  await page.locator('#btn-battle-bestiary').click();
  await page.locator('#bestiary-screen:not(.hidden)').waitFor({ state: 'visible' });
  check('battle top bar opens the bestiary', await page.locator('#bestiary-screen:not(.hidden)').count() === 1);
  await page.locator('#btn-bestiary-back').click();
  await page.locator('#battle-screen:not(.hidden)').waitFor({ state: 'visible' });
  await page.locator('#btn-battle-inventory').click();
  await page.locator('#inventory-screen:not(.hidden)').waitFor({ state: 'visible' });
  check('battle top bar opens the inventory', await page.locator('#inventory-screen:not(.hidden)').count() === 1);
  await page.locator('#btn-close-inv').click();
  await page.locator('#battle-screen:not(.hidden)').waitFor({ state: 'visible' });
  check('inventory returns to the same deployment', await page.locator('#battle-screen:not(.hidden)').count() === 1 && await page.locator('#btn-start-battle').count() === 1);

  await page.locator('#btn-start-battle').click();
  check('combat starts from deployment', await page.locator('#action-buttons .skill-action-btn').count() >= 1);
  check('recommended signature skill is highlighted', await page.locator('.skill-action-btn.ftue-recommended').count() === 1);
  check('combat shows one strong current initiative slot', await page.locator('#initiative-bar .init-slot.current').count() === 1);
  check('combat shows the next initiative slot', await page.locator('#initiative-bar .init-slot.next').count() === 1);
  check('combat names current and next units', await page.locator('#turn-focus-banner:not(.hidden)').count() === 1 && (await page.locator('#turn-focus-banner').textContent())?.includes('→'));
  check('current hero card has a turn chip', await page.locator('.hero-card.active .hero-turn-chip').count() === 1);

  // Мёртвое нажатие по врагу вне дальности: новичок первым делом жмёт по тому,
  // кого хочет ударить. Раньше обработчик в этом случае заканчивался молча, и
  // это читалось как «игра не реагирует».
  const deadClick = await page.evaluate(() => {
    const b = GameState.currentBattle;
    const hero = b.units.find(unit => unit.isHero && unit.hp > 0);
    const enemy = b.units.find(unit => !unit.isHero && unit.hp > 0);
    if (!hero || !enemy) return { skipped: true };
    /* Ставим врага гарантированно дальше дальности героя и не даём ходить, */
    /* чтобы проверялся именно отказ, а не шаг навстречу. */
    enemy.x = Math.min(GRID_W - 1, hero.x + hero.range + 3);
    enemy.y = hero.y;
    b.activeIndex = Math.max(0, b.order.indexOf(b.units.indexOf(hero)));
    b.heroActionDone = false;
    b.heroMoved = true;
    b.pendingSkill = null;
    b.mode = 'attack';
    b.phase = 'combat';
    const logBefore = (document.getElementById('battle-log')?.textContent || '').length;
    const rect = canvasContentRect();
    const canvasX = BattleView.offsetX + (enemy.x + 0.5) * CELL * BattleView.zoom;
    const canvasY = BattleView.offsetY + (enemy.y + 0.5) * CELL * BattleView.zoom;
    document.getElementById('battle-canvas').dispatchEvent(new MouseEvent('click', {
      clientX: rect.left + canvasX * (rect.width / CANVAS_W),
      clientY: rect.top + canvasY * (rect.height / CANVAS_H),
      bubbles: true
    }));
    const strip = document.querySelector('.battle-tactical-strip');
    return {
      hint: b.deniedHint ? b.deniedHint.main + ' / ' + b.deniedHint.sub : null,
      stripText: (strip?.textContent || '').replace(/s+/g, ' ').trim(),
      stripTone: strip ? strip.className : '',
      logGrew: (document.getElementById('battle-log')?.textContent || '').length > logBefore,
      enemyHp: enemy.hp
    };
  });
  check('dead click on an out-of-range enemy explains itself',
    deadClick.skipped || (!!deadClick.hint && deadClick.logGrew && /bad/.test(deadClick.stripTone)
      && deadClick.stripText.includes(deadClick.hint.split(' / ')[0])), JSON.stringify(deadClick));

  // Заклинание по области целится в клетку, а не в тело: смысл площадного удара
  // в том, чтобы встать между двумя монстрами. Раньше клик по пустой клетке
  // отсекался общей проверкой «под курсором должен быть враг».
  const fireballOnEmpty = await page.evaluate(() => {
    const b = GameState.currentBattle;
    const seris = b.units.find(unit => unit.isHero && unit.heroId === 'seris');
    const enemies = b.units.filter(unit => !unit.isHero && unit.hp > 0);
    if (!seris || enemies.length < 2) return { skipped: true };
    // Двое врагов по бокам от пустой клетки: цель на две клетки правее мага,
    // враги слева и справа от неё по горизонтали — так расстановка не зависит
    // от того, у какого края поля стоит маг.
    const cx = seris.x + 2;
    const cy = seris.y;
    enemies[0].x = cx - 1; enemies[0].y = cy;
    enemies[1].x = cx + 1; enemies[1].y = cy;
    seris.mana = 9;
    seris.cds = seris.cds || {};
    seris.cds.fireball = 0;
    // order хранит индексы юнитов, а activeIndex — позицию в order, не в units.
    b.activeIndex = Math.max(0, b.order.indexOf(b.units.indexOf(seris)));
    b.heroActionDone = false;
    b.pendingSkill = 'fireball';
    b.mode = 'skill';
    const before = enemies.slice(0, 2).map(e => e.hp);
    const emptyCell = !b.units.some(unit => unit.x === cx && unit.y === cy);
    canvasBattleClick(cx, cy);
    const after = enemies.slice(0, 2).map(e => e.hp);
    return { emptyCell, before, after, hurt: after.filter((hp, i) => hp < before[i]).length };
  });
  check('area spell can be aimed at an empty cell',
    fireballOnEmpty.skipped || (fireballOnEmpty.emptyCell && fireballOnEmpty.hurt === 2),
    JSON.stringify(fireballOnEmpty));

  // Подсветка и удар считаются одной функцией, поэтому область обязана быть
  // центрирована на клетке под курсором, а не построена от её угла.
  const meteorShape = await page.evaluate(() => {
    const b = GameState.currentBattle;
    const seris = b.units.find(unit => unit.isHero && unit.heroId === 'seris');
    if (!seris) return { skipped: true };
    const cells = aoeCellsFor('meteor', seris, 5, 5);
    const xs = cells.map(c => c.x);
    const ys = cells.map(c => c.y);
    return {
      count: cells.length,
      centred: Math.min(...xs) < 5 && Math.max(...xs) > 5 && Math.min(...ys) < 5 && Math.max(...ys) > 5,
      hasCentre: cells.some(c => c.x === 5 && c.y === 5)
    };
  });
  check('meteor area is centred on the aimed cell',
    meteorShape.skipped || (meteorShape.centred && meteorShape.hasCentre), JSON.stringify(meteorShape));

  await page.locator('#btn-open-menu').click();
  const speed = page.locator('#battle-speed-toggle');
  check('speed control lives in the pause menu', await speed.isVisible());
  check('speed toggle starts at ×1', (await speed.textContent())?.includes('×1'));
  await speed.click();
  check('speed toggle switches to ×2', (await speed.textContent())?.includes('×2'));
  await page.locator('#btn-menu-continue').click();

  await page.evaluate(() => {
    const b = GameState.currentBattle;
    const garet = b.units.find(unit => unit.isHero && unit.heroId === 'garet');
    const hero = GameState.heroes.find(unit => unit.id === 'garet');
    hero.level = 5;
    garet.level = 5;
    b.order = [b.units.indexOf(garet)];
    b.activeIndex = 0;
    b.phase = 'combat';
    b.selected = garet;
    b.mode = 'attack';
    b.pendingSkill = null;
    b.heroActionDone = false;
    updateBattleUI();
  });
  const shieldSkill = page.locator('#sk-shield');
  await shieldSkill.click();
  const selectedSkill = await page.evaluate(() => {
    const b = GameState.currentBattle;
    return { pending: b.pendingSkill, mode: b.mode, selected: document.querySelector('#sk-shield')?.classList.contains('is-selected') };
  });
  await page.locator('#sk-shield').click();
  const cancelledSkill = await page.evaluate(() => {
    const b = GameState.currentBattle;
    return { pending: b.pendingSkill, mode: b.mode, actionDone: b.heroActionDone, cooldown: getActiveUnit().cds.shieldBash, selected: document.querySelector('#sk-shield')?.classList.contains('is-selected') };
  });
  check('targeted skill selects on first press', selectedSkill.pending === 'shieldBash' && selectedSkill.mode === 'skill' && selectedSkill.selected, JSON.stringify(selectedSkill));
  check('second targeted-skill press returns to ordinary attack without cost', cancelledSkill.pending === null && cancelledSkill.mode === 'attack' && !cancelledSkill.actionDone && cancelledSkill.cooldown === 0 && !cancelledSkill.selected, JSON.stringify(cancelledSkill));

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
  const mobileTopButtonFit = await page.evaluate(() => {
    const hud = document.getElementById('hud-top').getBoundingClientRect();
    return ['btn-battle-inventory', 'btn-battle-bestiary', 'btn-open-menu'].map(id => {
      const rect = document.getElementById(id).getBoundingClientRect();
      return { id, top: rect.top - hud.top, bottom: hud.bottom - rect.bottom, height: rect.height };
    });
  });
  check('mobile top button borders stay inside the HUD', mobileTopButtonFit.every(item => item.top >= 2 && item.bottom >= 2), JSON.stringify(mobileTopButtonFit));
  const objectiveFitByMode = await page.evaluate(() => {
    const b = GameState.currentBattle;
    const original = { scenario: b.scenario, round: b.round };
    const scenarios = {
      eliminate: { id: 'eliminate', icon: '⚔' },
      holdout: { id: 'holdout', icon: '🛡', roundTarget: 4 },
      waves: { id: 'waves', icon: '🌊', roundTarget: 5 },
      escape: { id: 'escape', icon: '🚩' },
      defense: { id: 'defense', icon: '🏰', roundTarget: 4, ward: { hp: 24, maxHp: 24 } },
      ritual: { id: 'ritual', icon: '🕯', roundLimit: 6 },
      hunt: { id: 'hunt', icon: '🎯' }
    };
    const result = {};
    Object.entries(scenarios).forEach(([id, scenario]) => {
      b.scenario = scenario; b.round = 3; updateHud();
      const el = document.getElementById('battle-objective-top');
      result[id] = { text: el.textContent, width: el.clientWidth, scroll: el.scrollWidth, visible: !el.classList.contains('hidden') };
    });
    b.scenario = original.scenario; b.round = original.round; updateHud();
    return result;
  });
  check('all seven battle objectives fit the mobile top bar', Object.values(objectiveFitByMode).every(item => item.visible && item.text.length > 5 && item.scroll <= item.width + 1), JSON.stringify(objectiveFitByMode));

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
  check('map exposes the Arsenal entry point', await page.locator('#btn-map-arsenal').count() === 1);
  await page.locator('#btn-map-arsenal').click();
  await page.locator('#arsenal-screen:not(.hidden)').waitFor({ state: 'visible' });
  const arsenalLayout = await page.evaluate(() => {
    const screen = document.getElementById('arsenal-screen');
    const back = document.getElementById('btn-arsenal-back');
    const tabs = [...document.querySelectorAll('[data-arsenal-slot]')];
    const tabTexts = tabs.map(el => el.textContent.trim());
    const tabIcons = tabs.map(el => el.querySelectorAll('.ico').length);
    const rect = back.getBoundingClientRect();
    return { backVisible: !!(rect.width && rect.height) && rect.bottom <= window.innerHeight, tabTexts, tabIcons, title: screen.querySelector('.bestiary-bar-title')?.textContent.trim() };
  });
  check('Arsenal back button fits inside the viewport', arsenalLayout.backVisible, JSON.stringify(arsenalLayout));
  // Подписи по-русски, и у каждой вкладки ровно одна иконка. Раньше здесь
  // сверялась строка вместе с эмодзи; эмодзи в кнопках заменены на элементы.
  check('Arsenal Russian navigation is localized',
    /Арсенал/.test(arsenalLayout.title || '')
    && arsenalLayout.tabTexts.join('|') === 'Оружие|Броня|Артефакты'
    && arsenalLayout.tabIcons.join('') === '111', JSON.stringify(arsenalLayout));
  await page.locator('#btn-arsenal-back').click();
  await page.locator('#map-screen:not(.hidden)').waitFor({ state: 'visible' });
  check('regional boss silhouette is visible', await page.locator('.map-boss-silhouette').count() >= 1);
  check('region 1 boss guards the right edge', await page.locator('.map-node[data-node-type="boss"][data-region="1"][data-x="11"]').count() === 1);
  check('region 2 boss guards the left edge', await page.locator('.map-node[data-node-type="boss"][data-region="2"][data-x="0"]').count() === 1);
  check('region 3 boss guards the right edge', await page.locator('.map-node[data-node-type="boss"][data-region="3"][data-x="11"]').count() === 1);
  check('final boss waits in the lower-right corner', await page.locator('.map-node[data-node-type="final"][data-x="11"][data-y="7"]').count() === 1);
  // Segment count follows the wall table rather than a constant: regions now
  // carry internal walls, so hardcoding 22 would only encode the old layout.
  const expectedWallSegments = topology.WALL_ROWS.reduce((sum, wall) => sum + (topology.COLS - wall.open.length), 0);
  check('every wall renders a segment on both of its sides',
    await page.locator('.map-wall-seg-bottom').count() === expectedWallSegments &&
    await page.locator('.map-wall-seg-top').count() === expectedWallSegments,
    `${await page.locator('.map-wall-seg-bottom').count()}/${await page.locator('.map-wall-seg-top').count()} vs ${expectedWallSegments}`);
  check('regional walls expose two marked gateways', await page.locator('.map-gateway-mark-down').count() === 2 && await page.locator('.map-gateway-mark-up').count() === 2);
  check('internal walls make the party commit to a corridor', expectedWallSegments > 22, String(expectedWallSegments));
  check('an adjacent route exists after the first victory', await page.locator('.map-node.map-option').count() > 0);
  const explorationMarks = await page.evaluate(() => {
    const distant = GameState.mapGrid.find(node => node.id === 'c_7_0');
    const boss = GameState.mapGrid.find(node => node.type === 'boss' && node.region === 1);
    const saved = { distantVisited: distant.visited, bossCompleted: boss.completed };
    distant.visited = true;
    boss.completed = true;
    renderMap();
    const distantEl = document.querySelector(`[data-node-id="${distant.id}"]`);
    const bossEl = document.querySelector(`[data-node-id="${boss.id}"]`);
    const result = {
      distantVisible: distantEl?.classList.contains('visible'),
      distantExplored: distantEl?.classList.contains('explored'),
      distantStamp: getComputedStyle(distantEl, '::after').content.includes('✓'),
      bossMarked: bossEl?.classList.contains('boss-defeated'),
      bossSkull: bossEl?.textContent.includes('☠')
    };
    distant.visited = saved.distantVisited;
    boss.completed = saved.bossCompleted;
    renderMap();
    return result;
  });
  check('visited map cells remain visible with a progress mark', explorationMarks.distantVisible && explorationMarks.distantExplored && explorationMarks.distantStamp, JSON.stringify(explorationMarks));
  check('defeated bosses are marked with a skull', explorationMarks.bossMarked && explorationMarks.bossSkull, JSON.stringify(explorationMarks));
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
  /* Запрет на прокрутку был здесь подпоркой под «ничего не обрезано». Он же
     и ломал панель: блок сведений стоял нерастяжимым и выдавливал «Рюкзак»,
     «Арсенал» и «Бестиарий» за нижний край на 1024x640 и ниже. Теперь блок
     умеет прокручиваться, а проверка спрашивает то, что и хотела спросить:
     содержимое помещается целиком. Досягаемость кнопок закрывает
     test-tap-targets.mjs. */
  check('selected map cell summary is visible without scrolling', mapInfoFit.visible && mapInfoFit.scrollHeight <= mapInfoFit.clientHeight + 1, JSON.stringify(mapInfoFit));
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
  const noSaveExitState = await page.evaluate(() => {
    GameState.gold = 3;
    GameState.turn = 2;
    document.getElementById('btn-menu-exit').click();
    return { gold: GameState.gold, turn: GameState.turn, stored: JSON.parse(localStorage.getItem(SAVE_KEY)).gold };
  });
  check('exit without saving restores the last durable checkpoint', noSaveExitState.gold === 437 && noSaveExitState.turn === 19 && noSaveExitState.stored === 437, JSON.stringify(noSaveExitState));
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
