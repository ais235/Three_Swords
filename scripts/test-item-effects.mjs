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
} finally {
  if (browser) await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}

if (failures.length) {
  failures.forEach(failure => console.error(`FAIL ${failure}`));
  process.exit(1);
}
console.log('Item effect tests passed.');
