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
await new Promise((ok, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', ok); });
let browser;
try {
  browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--disable-gpu'] });
  const page = await browser.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/index.html?seed=item-effects`, { waitUntil: 'domcontentloaded' });
  const result = await page.evaluate(() => {
    initHeroesFromTemplate();
    const garet = GameState.heroes.find(hero => hero.id === 'garet');
    garet.equipment = { weapon: 'steel_sword', armor: null, artifact: null };
    recalcHeroFromEquipment(garet);
    const attackOnce = garet.attack;
    recalcHeroFromEquipment(garet);
    const attackTwice = garet.attack;

    garet.equipment.armor = 'dark_mantle';
    recalcHeroFromEquipment(garet);
    const mantle = { attack: garet.attack, armor: garet.armor, maxHp: garet.maxHp };
    recalcHeroFromEquipment(garet);
    const mantleStable = { attack: garet.attack, armor: garet.armor, maxHp: garet.maxHp };
    garet.equipment.armor = null;
    recalcHeroFromEquipment(garet);
    const afterMantle = { attack: garet.attack, armor: garet.armor, maxHp: garet.maxHp };

    applyPermanentHeroStat(garet, 'attack', 1);
    recalcHeroFromEquipment(garet);
    const permanentAttack = garet.attack;

    const alira = GameState.heroes.find(hero => hero.id === 'alira');
    const seris = GameState.heroes.find(hero => hero.id === 'seris');
    alira.equipment = { weapon: 'shadow_bow', armor: null, artifact: null };
    seris.equipment = { weapon: null, armor: null, artifact: 'crown' };
    const shadowHero = makeBattleHero(alira, 0);
    const crownOwner = makeBattleHero(seris, 1);
    shadowHero.x = 0; shadowHero.y = 0;
    crownOwner.x = 1; crownOwner.y = 0;
    GameState.currentBattle = { phase: 'combat', units: [shadowHero, crownOwner], grid: Array.from({ length: 10 }, () => Array(16).fill(TILE.GROUND)), order: [0], activeIndex: 0, heroMoved: false, heroActionDone: false, mode: 'move', pendingSkill: null, visualLockUntil: 0, globalBuffs: { watcherDeadMove: 0 }, battleLog: [], fx: [] };
    const ignoresCover = heroIgnoresCover(shadowHero);
    const crownAttack = crownAuraBonus(shadowHero, 'attack');
    const crownArmor = crownAuraBonus(shadowHero, 'armor');

    garet.equipment = { weapon: null, armor: null, artifact: 'hourglass' };
    const hourHero = makeBattleHero(garet, 0);
    hourHero.x = 0; hourHero.y = 0; hourHero.flags.hourglassReady = true;
    GameState.currentBattle = { phase: 'combat', units: [hourHero], grid: Array.from({ length: 10 }, () => Array(16).fill(TILE.GROUND)), order: [0], activeIndex: 0, heroMoved: true, heroActionDone: true, mode: 'idle', pendingSkill: null, visualLockUntil: 0, globalBuffs: { watcherDeadMove: 0 }, battleLog: [], fx: [] };
    endUnitTurn();
    const hourglass = { used: hourHero.flags.hourglassUsed, ready: hourHero.flags.hourglassReady, actionDone: GameState.currentBattle.heroActionDone };

    garet.equipment = { weapon: null, armor: null, artifact: 'portal_stone' };
    const portalHero = makeBattleHero(garet, 0);
    portalHero.x = 0; portalHero.y = 0;
    GameState.currentBattle = { phase: 'combat', units: [portalHero], grid: Array.from({ length: 10 }, () => Array(16).fill(TILE.GROUND)), order: [0], activeIndex: 0, heroMoved: false, heroActionDone: false, mode: 'skill', pendingSkill: 'artifactTeleport', visualLockUntil: 0, globalBuffs: { watcherDeadMove: 0 }, battleLog: [], fx: [] };
    canvasBattleClick(8, 5);
    const portal = { x: portalHero.x, y: portalHero.y, used: portalHero.flags.portalStoneUsed, actionDone: GameState.currentBattle.heroActionDone };

    garet.equipment = { weapon: null, armor: 'runic_shield', artifact: null };
    const shieldHero = makeBattleHero(garet, 0);
    const enemy = { isHero: false, hp: 10, activeStatuses: [], x: 1, y: 0, name: 'enemy' };
    const oldRandom = Math.random;
    Math.random = () => 0;
    addStatus(shieldHero, STATUS.CURSE, 1, { source: enemy });
    Math.random = oldRandom;
    const reflection = { heroStatuses: shieldHero.activeStatuses.length, enemyStatus: enemy.activeStatuses[0]?.type };

    return { attackOnce, attackTwice, mantle, mantleStable, afterMantle, permanentAttack, ignoresCover, crownAttack, crownArmor, hourglass, portal, reflection };
  });

  check('equipment attack is counted once', result.attackOnce === 9 && result.attackTwice === 9, JSON.stringify(result));
  check('Dark Mantle is stable and reversible', JSON.stringify(result.mantle) === JSON.stringify(result.mantleStable) && result.mantle.maxHp === 25 && result.afterMantle.maxHp === 30, JSON.stringify(result));
  check('permanent bonuses survive equipment recalculation', result.permanentAttack === 10, JSON.stringify(result));
  check('Shadow Bow ignores cover', result.ignoresCover === true, JSON.stringify(result));
  check('Crown aura grants attack and armor to allies', result.crownAttack === 2 && result.crownArmor === 1, JSON.stringify(result));
  check('Hourglass grants exactly one extra action', result.hourglass.used && !result.hourglass.ready && !result.hourglass.actionDone, JSON.stringify(result));
  check('Portal Stone moves without consuming the attack', result.portal.x === 8 && result.portal.y === 5 && result.portal.used && !result.portal.actionDone, JSON.stringify(result));
  check('Runic Shield reflects hostile statuses', result.reflection.heroStatuses === 0 && result.reflection.enemyStatus === 'curse', JSON.stringify(result));
  const archerProgression = await page.evaluate(() => {
    const ids = ['crossbow_war', 'coal_bow', 'siege_crossbow', 'current_bow', 'harpoon_crossbow'];
    const bows = Object.fromEntries(ids.map(id => {
      const item = itemById(id);
      return [id, { price: item.price, attack: item.mods.attack, range: item.mods.range }];
    }));
    const scoutEye = formatItemMods(itemById('seer_eye')).map(translateText);
    return { bows, scoutEye };
  });
  check('archer weapon prices buy a real power or range advantage',
    archerProgression.bows.coal_bow.attack > archerProgression.bows.crossbow_war.attack
      && archerProgression.bows.current_bow.attack > archerProgression.bows.siege_crossbow.attack
      && archerProgression.bows.harpoon_crossbow.attack > archerProgression.bows.current_bow.attack,
    JSON.stringify(archerProgression.bows));
  check('Scout Eye exposes a localized player-facing effect',
    archerProgression.scoutEye.some(line => /точн.*состав.*враг/i.test(line))
      && archerProgression.scoutEye.every(line => !/previewEnemies/i.test(line)),
    JSON.stringify(archerProgression.scoutEye));

  const dragResult = await page.evaluate(() => {
    const nativeMatchMedia = window.matchMedia;
    window.matchMedia = () => ({ matches: true, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    initHeroesFromTemplate();
    GameState.inventory = ['steel_sword', 'poison_blade'];
    const garet = GameState.heroes.find(hero => hero.id === 'garet');
    garet.equipment = { weapon: 'steel_sword', armor: null, artifact: null };
    recalcHeroFromEquipment(garet);
    showScreen('inventory');
    renderInventoryScreen();
    const drag = (source, target) => {
      const dataTransfer = new DataTransfer();
      source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer }));
      target.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer }));
      target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
      source.dispatchEvent(new DragEvent('dragend', { bubbles: true, dataTransfer }));
    };
    drag(document.querySelector('[data-inventory-index="1"]'), document.getElementById('eq-slot-weapon'));
    const afterReplace = {
      equipped: garet.equipment.weapon,
      steelCopies: GameState.inventory.filter(id => id === 'steel_sword').length,
      poisonCopies: GameState.inventory.filter(id => id === 'poison_blade').length,
      saved: JSON.parse(localStorage.getItem(SAVE_KEY)).heroes.find(hero => hero.id === 'garet').equipment.weapon
    };
    drag(document.getElementById('eq-slot-weapon'), document.getElementById('bag-grid'));
    const afterUnequip = {
      equipped: garet.equipment.weapon,
      poisonCopies: GameState.inventory.filter(id => id === 'poison_blade').length
    };
    renderInventoryScreen();
    drag(document.querySelector('[data-inventory-index="0"]'), document.getElementById('eq-slot-armor'));
    const wrongSlot = {
      armor: garet.equipment.armor,
      inventorySize: GameState.inventory.length,
      feedback: document.getElementById('inv-slot-info').textContent
    };
    document.querySelector('[data-hero-tab="alira"]')?.click();
    const alira = GameState.heroes.find(hero => hero.id === 'alira');
    renderInventoryScreen();
    drag(document.querySelector('[data-inventory-index="0"]'), document.getElementById('eq-slot-weapon'));
    const wrongClass = { equipped: alira.equipment?.weapon || null, inventorySize: GameState.inventory.length };
    window.matchMedia = () => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    renderInventoryScreen();
    document.querySelector('#bag-grid .inv-item-card')?.click();
    const mobileFallback = {
      draggableCards: document.querySelectorAll('#bag-grid .inv-item-card[draggable="true"]').length,
      equipButton: !!document.getElementById('inv-equip-btn')
    };
    window.matchMedia = nativeMatchMedia;
    return { afterReplace, afterUnequip, wrongSlot, wrongClass, mobileFallback };
  });
  check('dragging a duplicate replaces gear without losing either copy', dragResult.afterReplace.equipped === 'poison_blade' && dragResult.afterReplace.steelCopies === 2 && dragResult.afterReplace.poisonCopies === 0, JSON.stringify(dragResult));
  check('drag equip is persisted immediately', dragResult.afterReplace.saved === 'poison_blade', JSON.stringify(dragResult));
  check('dragging equipped gear back to the bag unequips it', dragResult.afterUnequip.equipped === null && dragResult.afterUnequip.poisonCopies === 1, JSON.stringify(dragResult));
  check('wrong equipment slot rejects the drop with feedback', dragResult.wrongSlot.armor === null && dragResult.wrongSlot.inventorySize === 3 && dragResult.wrongSlot.feedback.length > 0, JSON.stringify(dragResult));
  check('wrong hero class rejects the drop', dragResult.wrongClass.equipped === null && dragResult.wrongClass.inventorySize === 3, JSON.stringify(dragResult));
  check('coarse pointer keeps click-to-equip and disables dragging', dragResult.mobileFallback.draggableCards === 0 && dragResult.mobileFallback.equipButton, JSON.stringify(dragResult));
  await page.evaluate(() => {
    const nativeMatchMedia = window.matchMedia;
    window.matchMedia = () => ({ matches: true, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
    initHeroesFromTemplate();
    GameState.inventory = ['poison_blade'];
    const garet = GameState.heroes.find(hero => hero.id === 'garet');
    garet.equipment = { weapon: 'steel_sword', armor: null, artifact: null };
    recalcHeroFromEquipment(garet);
    showScreen('inventory');
    renderInventoryScreen();
    document.querySelector('[data-hero-tab="garet"]')?.click();
    const dataTransfer = new DataTransfer();
    const source = document.querySelector('[data-inventory-index="0"]');
    const target = document.getElementById('eq-slot-weapon');
    source.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer }));
    target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer }));
    window.matchMedia = nativeMatchMedia;
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  const persistedAfterReload = await page.evaluate(() => GameState.heroes.find(hero => hero.id === 'garet')?.equipment?.weapon);
  check('dragged equipment survives F5 reload', persistedAfterReload === 'poison_blade', String(persistedAfterReload));
  const nativeDragReady = await page.evaluate(() => {
    initHeroesFromTemplate();
    GameState.inventory = ['steel_sword'];
    const garet = GameState.heroes.find(hero => hero.id === 'garet');
    garet.equipment = { weapon: 'poison_blade', armor: null, artifact: null };
    recalcHeroFromEquipment(garet);
    showScreen('inventory');
    renderInventoryScreen();
    document.querySelector('[data-hero-tab="garet"]')?.click();
    return matchMedia('(hover: hover) and (pointer: fine)').matches && document.getElementById('eq-slot-weapon')?.draggable;
  });
  check('desktop browser exposes equipped gear as draggable', nativeDragReady === true, String(nativeDragReady));
  if (nativeDragReady) {
    await page.locator('#eq-slot-weapon').dragTo(page.locator('#bag-grid'));
    const nativeUnequip = await page.evaluate(() => {
      const garet = GameState.heroes.find(hero => hero.id === 'garet');
      return { equipped: garet.equipment.weapon, poisonCopies: GameState.inventory.filter(id => id === 'poison_blade').length };
    });
    check('native mouse drag unequips gear into the bag', nativeUnequip.equipped === null && nativeUnequip.poisonCopies === 1, JSON.stringify(nativeUnequip));
  }
  // ── Scaling contract: defensive investment must not arm the enemy ──
  const scaling = await page.evaluate(() => {
    initHeroesFromTemplate();
    const garet = GameState.heroes.find(hero => hero.id === 'garet');
    const before = { power: calculatePartyPower(), skeleton: spawnEnemy(ENEMY_IDS.SKELETON, 0, 0) };
    // Runic Shield is pure armour: no attack, no max HP, so it must be invisible
    // to the scaling formula. This is the whole point of the rewrite.
    garet.equipment = { weapon: null, armor: 'runic_shield', artifact: null };
    recalcHeroFromEquipment(garet);
    const afterArmor = { power: calculatePartyPower(), skeleton: spawnEnemy(ENEMY_IDS.SKELETON, 0, 0) };
    garet.equipment = { weapon: 'tide_trident', armor: null, artifact: null };
    recalcHeroFromEquipment(garet);
    const afterWeapon = { power: calculatePartyPower(), skeleton: spawnEnemy(ENEMY_IDS.SKELETON, 0, 0) };
    GameState.region = 3;
    const regionThree = spawnEnemy(ENEMY_IDS.SKELETON, 0, 0);
    GameState.region = 1;
    return {
      armorKeepsPower: afterArmor.power === before.power,
      armorKeepsEnemyHp: afterArmor.skeleton.hp === before.skeleton.hp,
      weaponRaisesEnemyHp: afterWeapon.skeleton.hp > before.skeleton.hp,
      attackIsRegional: before.skeleton.attack === afterWeapon.skeleton.attack,
      regionThreeHitsHarder: regionThree.attack > before.skeleton.attack
    };
  });
  check('pure armor purchases no longer raise party power', scaling.armorKeepsPower && scaling.armorKeepsEnemyHp, JSON.stringify(scaling));
  check('enemy attack is authored per region, not by party power', scaling.attackIsRegional && scaling.regionThreeHitsHarder, JSON.stringify(scaling));
  check('enemy HP still answers offensive investment', scaling.weaponRaisesEnemyHp, JSON.stringify(scaling));

  // ── Region 3 epics carry rules, not just numbers ──
  const uniqueMods = await page.evaluate(() => {
    const byId = id => ITEM_POOL.find(item => item.id === id);
    const epicsR3 = ITEM_POOL.filter(item => item.minRegion === 3 && item.rarity === 'epic');
    const statOnly = new Set(['attack', 'armor', 'range', 'move', 'maxHp', 'mana']);
    return {
      everyEpicHasARule: epicsR3.every(item => Object.keys(item.mods).some(key => !statOnly.has(key))),
      trident: !!byId('tide_trident').mods.cleave,
      harpoon: !!byId('harpoon_crossbow').mods.pullOnHit,
      tideStaff: !!byId('tide_staff').mods.chainFreeze,
      deepShell: !!byId('deep_shell').mods.firstHitWard,
      deepRobe: !!byId('deep_robe').mods.manaOnHit,
      localizedRu: (() => {
        setGameLanguage('ru');
        const text = localizeArsenalItem(byId('deep_shell'), 'desc');
        setGameLanguage('en');
        return !/[A-Za-z]{4,}/.test(text);
      })()
    };
  });
  check('every region 3 epic carries a rule, not only stats', uniqueMods.everyEpicHasARule, JSON.stringify(uniqueMods));
  check('region 3 epics expose their unique mods', uniqueMods.trident && uniqueMods.harpoon && uniqueMods.tideStaff && uniqueMods.deepShell && uniqueMods.deepRobe, JSON.stringify(uniqueMods));
  check('new item rules are translated, not left in English', uniqueMods.localizedRu, JSON.stringify(uniqueMods));

  const combatMods = await page.evaluate(() => {
    initHeroesFromTemplate();
    const cell = GameState.mapGrid?.find(node => node.type === 'mission') || { id: 'c_0_0', x: 0, y: 0, region: 1, type: 'mission' };
    const garet = GameState.heroes.find(hero => hero.id === 'garet');
    garet.equipment = { weapon: null, armor: 'deep_shell', artifact: 'tide_heart' };
    recalcHeroFromEquipment(garet);
    startBattleForCell(cell, { skipDeploy: true });
    const battle = GameState.currentBattle;
    const hero = battle.units.find(unit => unit.isHero && unit.heroId === 'garet');
    const enemy = battle.units.find(unit => !unit.isHero);
    hero.hp = hero.maxHp;

    // firstHitWard: the first hit of the round is absorbed, the second is not.
    const warded = dealDamage(enemy, hero, 40, { blockIgnore: true, magic: true });
    const second = dealDamage(enemy, hero, 40, { blockIgnore: true, magic: true });

    // pierce: the same raw hit lands harder through armour.
    const alira = battle.units.find(unit => unit.isHero && unit.heroId === 'alira');
    enemy.armor = 4;
    enemy.hp = 900; enemy.maxHp = 900;
    alira.equipment = { weapon: 'shadow_bow', armor: null, artifact: null };
    alira.flags.firstAttackTurn = false;
    const plain = dealDamage(alira, enemy, 20, { noCleave: true, noWeaponBonus: true });
    alira.equipment = { weapon: 'siege_crossbow', armor: null, artifact: null };
    alira.flags.firstAttackTurn = false;
    const pierced = dealDamage(alira, enemy, 20, { noCleave: true });

    // Taunt overrides the threat score even for a distant, fragile mage.
    const seris = battle.units.find(unit => unit.isHero && unit.heroId === 'seris');
    hero.x = enemy.x; hero.y = Math.max(0, enemy.y - 1);
    seris.x = Math.max(0, enemy.x - 1); seris.y = enemy.y;
    const beforeTaunt = aiChooseTarget(battle, enemy);
    hero.flags.tauntRound = battle.round;
    const afterTaunt = aiChooseTarget(battle, enemy);

    // Incoming preview exposes Garet's shield block instead of hiding it.
    const incoming = enemyDamagePreview(battle, enemy, hero);
    return {
      warded, second,
      plain, pierced,
      beforeTauntId: beforeTaunt?.heroId, afterTauntId: afterTaunt?.heroId,
      blockChance: incoming?.blockChance,
      avoidChance: incoming?.avoidChance,
      minimum: incoming?.minimum
    };
  });
  check('Deep Shell absorbs the first hit of a round only', combatMods.warded === 0 && combatMods.second > 0, JSON.stringify(combatMods));
  check('Siege Crossbow pierce beats flat armor', combatMods.pierced > combatMods.plain, JSON.stringify(combatMods));
  check('Challenge overrides enemy target scoring', combatMods.afterTauntId === 'garet' && combatMods.beforeTauntId !== undefined, JSON.stringify(combatMods));
  check('incoming damage preview exposes Garet shield block', combatMods.blockChance === 0.25 && combatMods.avoidChance >= 0.25 && combatMods.minimum === 0, JSON.stringify(combatMods));

  // Readability rule: the previewed number must equal the number the roll produces.
  const previewParity = await page.evaluate(() => {
    const battle = GameState.currentBattle;
    const alira = battle.units.find(unit => unit.isHero && unit.heroId === 'alira');
    const enemy = battle.units.find(unit => !unit.isHero);
    enemy.armor = 5; enemy.hp = 900; enemy.maxHp = 900;
    // Equipment stats live in the persistent hero stats, so equip through the
    // production path rather than poking the battle copy.
    const persistent = GameState.heroes.find(hero => hero.id === 'alira');
    persistent.equipment = { weapon: 'siege_crossbow', armor: null, artifact: null };
    recalcHeroFromEquipment(persistent);
    alira.equipment = { ...persistent.equipment };
    alira.attack = persistent.attack;
    alira.flags.firstAttackTurn = false;
    battle.pendingSkill = null;
    battle.heroMoved = false;
    // Isolate the exchange: no flank support, no Garet auras.
    alira.x = 0; alira.y = 0; enemy.x = 0; enemy.y = 3;
    battle.units.filter(unit => unit.isHero && unit !== alira).forEach((hero, index) => { hero.x = 11; hero.y = 7 - index; });
    const preview = heroDamagePreview(battle, alira, enemy);
    const dealt = dealDamage(alira, enemy, alira.attack, { noCleave: true });
    return { previewed: preview?.regularPerHit, dealt, attack: alira.attack, armor: enemy.armor, tags: preview?.tags || [] };
  });
  check('damage preview matches the actual roll with a weapon equipped', previewParity.previewed === previewParity.dealt, JSON.stringify(previewParity));
  check('pierce is reported in the preview tags', previewParity.tags.some(tag => /(Пробитие|pierce|Perfora)/i.test(tag)), JSON.stringify(previewParity));
  // ── Elite affixes ────────────────────────────────────────────────────────
  const elites = await page.evaluate(() => {
    startNewGame();
    GameState.regionUnlocked = 3;
    const cells = GameState.mapGrid.filter(cell => ['mission', 'dungeon'].includes(cell.type));
    cells.forEach(cell => { if (!cell.enemyWavePreview) cell.enemyWavePreview = generateEnemyWaveForCell(cell); });
    const waveFor = cell => CampaignExpansion.applyMutatorsToWave(cell.enemyWavePreview,
      { id: cell.id, region: cell.region, type: cell.type, boss: false, final: false });
    const perRegion = {};
    let capRespected = true;
    let bossesSpared = true;
    for (const region of [1, 2, 3]) {
      const regionCells = cells.filter(cell => cell.region === region);
      let elite = 0;
      regionCells.forEach(cell => {
        const wave = waveFor(cell);
        const affixes = eliteAffixesForWave(cell, wave);
        const count = affixes.filter(Boolean).length;
        if (count > ELITE_AFFIX_CAP[region]) capRespected = false;
        affixes.forEach((affix, index) => {
          if (!affix) return;
          const def = enemyDef(wave[index]);
          if (def.boss || def.miniBoss) bossesSpared = false;
        });
        elite += count;
      });
      perRegion[region] = { cells: regionCells.length, elite };
    }
    const sample = cells.find(cell => eliteAffixesForWave(cell, waveFor(cell)).some(Boolean));
    const first = eliteAffixesForWave(sample, waveFor(sample));
    const again = eliteAffixesForWave(sample, waveFor(sample));

    // Stat affix reaches the spawned body, behavioural affixes reach combat.
    GameState.heroes.forEach(hero => { hero.hp = hero.maxHp; });
    startBattleForCell({ id: 'affix-test', region: 3, type: 'mission' }, {
      wave: [ENEMY_IDS.GHOST, ENEMY_IDS.GHOST], skipDeploy: true
    });
    const battle = GameState.currentBattle;
    const plain = battle.units.find(unit => !unit.isHero);
    const baseline = { hp: plain.maxHp, armor: plain.armor, move: plain.move };
    const armored = applyEliteAffix(spawnEnemy(ENEMY_IDS.GHOST, 0, 0), 'armored');
    const swift = applyEliteAffix(spawnEnemy(ENEMY_IDS.GHOST, 0, 0), 'swift');

    const hero = battle.units.find(unit => unit.isHero && unit.heroId === 'garet');
    hero.armor = 0;
    const venom = battle.units[battle.units.length - 1];
    venom.affix = 'venomous';
    venom.x = hero.x + 1; venom.y = hero.y;
    aiAttack(venom, hero);
    const poisoned = hero.activeStatuses.some(status => status.type === STATUS.POISON);

    // Warlord lifts the damage of a neighbouring enemy.
    const attacker = battle.units.find(unit => !unit.isHero && unit !== venom);
    attacker.affix = null;
    hero.hp = hero.maxHp = 200;
    attacker.x = hero.x + 1; attacker.y = hero.y;
    venom.affix = null;
    const withoutWarlord = dealDamage(attacker, hero, 10, { blockIgnore: true });
    venom.affix = 'warlord';
    venom.x = attacker.x; venom.y = attacker.y + 1;
    const withWarlord = dealDamage(attacker, hero, 10, { blockIgnore: true });
    return {
      perRegion, capRespected, bossesSpared,
      deterministic: JSON.stringify(first) === JSON.stringify(again),
      armoredArmor: armored.armor - baseline.armor,
      armoredHp: armored.maxHp > baseline.hp,
      swiftMove: swift.move - baseline.move,
      poisoned, withoutWarlord, withWarlord
    };
  });
  check('elite affixes never land on a boss or mini-boss', elites.bossesSpared, JSON.stringify(elites));
  check('elite affixes respect the per-region cap', elites.capRespected, JSON.stringify(elites));
  check('elite affixes are deterministic per cell', elites.deterministic, JSON.stringify(elites));
  check('elite density escalates across the campaign',
    elites.perRegion[3].elite / elites.perRegion[3].cells > elites.perRegion[1].elite / elites.perRegion[1].cells,
    JSON.stringify(elites.perRegion));
  check('armored and swift affixes reach the spawned body',
    elites.armoredArmor === 3 && elites.armoredHp && elites.swiftMove === 2, JSON.stringify(elites));
  check('venomous affix poisons on hit', elites.poisoned, JSON.stringify(elites));
  check('warlord affix lifts a neighbour damage', elites.withWarlord === elites.withoutWarlord + 2, JSON.stringify(elites));

} finally {
  if (browser) await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}

if (failures.length) {
  failures.forEach(failure => console.error(`FAIL ${failure}`));
  process.exit(1);
}
console.log('Item effect tests passed.');
