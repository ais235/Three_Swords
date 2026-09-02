import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createStaticServer } from './static-server.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const failures = [];
const check = (name, condition, details = '') => condition
  ? console.log(`PASS ${name}`)
  : failures.push(`${name}${details ? `: ${details}` : ''}`);

const server = createStaticServer(root);
await new Promise((ok, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', ok); });
const address = server.address();
let browser;
try {
  browser = await chromium.launch({ executablePath: chromePath, headless: true, args: ['--disable-gpu'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto(`http://127.0.0.1:${address.port}/index.html?seed=perk-audit`, { waitUntil: 'domcontentloaded' });

  const result = await page.evaluate(() => {
    const tokenById = {
      d1:'guardianCover', d3:'reflect1', a1:'finisher', a2:'armorPierce', a3:'crit15',
      l1:'auraArmor', l2:'auraDmg', m3:'ignoreCover', s2:'moveAttack',
      t1:'trapDmg', t2:'trapSlow', t3:'trapDouble', r1:'spellCharge', r2:'aoePlus',
      r3:'burnSpell', c1:'freeze2', c2:'fear', y2:'killHeal', y3:'teleport',
      d4:'unbreakable', a4:'execution', l4:'banner', m4:'deadeye', s4:'windrunner',
      t4:'minefield', r4:'incinerate', c4:'deepFreeze', y4:'wellspring'
    };
    const statById = {
      d2:['armor',1], l3:['speed',1], m1:['range',1], m2:['attack',3],
      s1:['move',1], s3:['speed',2], c3:['maxMana',2], y1:['maxMana',3]
    };
    const application = [];
    Object.entries(PERK_TREES).forEach(([heroId, branches]) => {
      Object.values(branches).flat().forEach(perk => {
        const hero = deepClone(baseHeroTemplate().find(item => item.id === heroId));
        hero.perks = [];
        hero.baseStats = Object.fromEntries(EQUIPMENT_STAT_KEYS.map(key => [key, Number(hero[key]) || 0]));
        const stat = statById[perk.id];
        const before = stat ? Number(hero[stat[0]]) || 0 : 0;
        perk.apply(hero);
        const ok = stat ? hero[stat[0]] === before + stat[1] : hero.perks.includes(tokenById[perk.id]);
        application.push({ id: perk.id, ok, stat: stat?.[0] || tokenById[perk.id] });
      });
    });

    initHeroesFromTemplate();
    GameState.stats = { battles: 0, kills: 0, goldEarned: 0, objectivesCompleted: 0, damageTaken: 0 };
    startBattleForCell({ id: 'perk-audit-battle', region: 1, type: 'mission' }, {
      wave: [ENEMY_IDS.SKELETON, ENEMY_IDS.SKELETON, ENEMY_IDS.BOAR], scenario: 'holdout'
    });
    const b = GameState.currentBattle;
    b.phase = 'combat';
    b.grid = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(TILE.GROUND));
    const garet = b.units.find(unit => unit.heroId === 'garet');
    const alira = b.units.find(unit => unit.heroId === 'alira');
    const seris = b.units.find(unit => unit.heroId === 'seris');
    const enemies = b.units.filter(unit => !unit.isHero);
    [garet, alira, seris].forEach(hero => { hero.perks = []; hero.armor = 0; hero.flags = hero.flags || {}; });
    enemies.forEach((enemy, index) => { enemy.x = 7 + index; enemy.y = 2 + index; enemy.hp = enemy.maxHp = 200; enemy.armor = 0; });
    garet.x = 2; garet.y = 3; alira.x = 3; alira.y = 3; seris.x = 3; seris.y = 4;
    const originalRandom = Math.random;
    Math.random = () => .99;
    const hit = (attacker, target, raw, opts = {}) => {
      target.hp = target.maxHp = 200; target.armor = opts.armor || 0; target.activeStatuses = [];
      attacker.flags = attacker.flags || {}; attacker.flags.firstAttackTurn = false;
      return dealDamage(attacker, target, raw, opts.damageOpts || { blockIgnore: true, noWeaponBonus: true });
    };
    const enemy = enemies[0];

    alira.perks = [];
    const baselineOnAlly = hit(enemy, alira, 10);
    garet.perks = ['guardianCover'];
    const coveredAlly = hit(enemy, alira, 10);

    garet.perks = ['reflect1']; garet.hp = garet.maxHp = 100; enemy.hp = enemy.maxHp = 200;
    dealDamage(enemy, garet, 10, { blockIgnore: true, noWeaponBonus: true });
    const reflected = enemy.hp === 199;

    garet.perks = ['finisher']; enemy.hp = 80; enemy.maxHp = 200; enemy.armor = 0;
    const finisher = dealDamage(garet, enemy, 10, { blockIgnore: true, noWeaponBonus: true });
    garet.perks = ['armorPierce'];
    const pierced = hit(garet, enemy, 10, { armor: 5 });
    garet.perks = ['crit15']; Math.random = () => 0;
    const critical = hit(garet, enemy, 10);
    Math.random = () => .99;

    garet.perks = ['auraArmor'];
    const armoredAura = hit(enemy, alira, 10);
    garet.perks = ['auraDmg'];
    const damageAura = hit(alira, enemy, 10);

    b.grid[enemy.y][enemy.x] = TILE.FOREST;
    b.grid[enemy.y][enemy.x - 1] = TILE.GROUND;
    const targetForestBlocked = rangedBlocked(alira.x, alira.y, enemy.x, enemy.y, b.grid, false);
    const targetForestIgnored = !rangedBlocked(alira.x, alira.y, enemy.x, enemy.y, b.grid, true);
    b.grid[enemy.y][enemy.x - 1] = TILE.MOUNTAIN;
    const middleObstacleStillBlocks = rangedBlocked(alira.x, alira.y, enemy.x, enemy.y, b.grid, true);
    b.grid = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(TILE.GROUND));

    garet.perks = [];
    alira.perks = ['moveAttack']; b.heroMoved = true;
    const movingShot = hit(alira, enemy, 10);
    b.heroMoved = false;

    alira.perks = ['trapDmg', 'trapSlow', 'trapDouble']; b.traps = [];
    alira.x = 5; alira.y = 4; b.grid[4][3] = TILE.MOUNTAIN;
    placeAliraTrapsAfterMove(b, alira, 4, 4);
    const trapCount = b.traps.length;
    const trap = b.traps[0]; enemy.x = trap.x - 1; enemy.y = trap.y; enemy.hp = 20; enemy.activeStatuses = [];
    enemyStepToCell(b, enemy, { x: trap.x, y: trap.y });
    const trapWorks = enemy.hp === 16 && enemy.activeStatuses.some(status => status.type === STATUS.SLOW && status.turns === 2);

    seris.perks = ['spellCharge'];
    const spellCharge = hit(seris, enemy, 10, { damageOpts: { magic: true, blockIgnore: true, noWeaponBonus: true } });
    seris.perks = ['aoePlus'];
    const aoeBonus = serisAoeBonus(seris);
    seris.perks = ['burnSpell'];
    hit(seris, enemy, 10, { damageOpts: { magic: true, blockIgnore: true, noWeaponBonus: true } });
    const burns = enemy.activeStatuses.some(status => status.type === STATUS.BURN && status.turns === 2);

    seris.perks = ['killHeal']; seris.hp = 5; seris.maxHp = 15;
    enemy.hp = 0; enemy._deathHandled = false; onUnitDeath(enemy);
    const killHeal = seris.hp === 10;

    alira.perks = []; alira.level = 5; alira.x = 1; alira.y = 3; alira.attack = 8;
    alira.cds.arrowRain = 0; alira.flags.firstAttackTurn = false;
    enemies.forEach((target, index) => { target._deathHandled = false; target.hp = target.maxHp = 50; target.armor = 0; target.x = index < 2 ? 4 + index : 9; target.y = index < 2 ? 3 : 7; });
    b.order = [b.units.indexOf(alira)]; b.activeIndex = 0; b.selected = alira; b.mode = 'skill'; b.pendingSkill = 'arrowRain'; b.heroActionDone = false;
    const hpBeforeRain = enemies.map(target => target.hp);
    canvasBattleClick(4, 3);
    const arrowRain = {
      first: enemies[0].hp < hpBeforeRain[0], second: enemies[1].hp < hpBeforeRain[1], distant: enemies[2].hp === hpBeforeRain[2], cd: alira.cds.arrowRain
    };
    alira.cds.arrowRain = 0; b.pendingSkill = 'arrowRain'; b.mode = 'skill'; b.heroActionDone = false;
    canvasBattleClick(1, 0);
    arrowRain.emptyPreserved = alira.cds.arrowRain === 0 && !b.heroActionDone;

    seris.level = 5; seris.x = 2; seris.y = 5; seris.mana = 20; seris.maxMana = 20; seris.perks = ['freeze2', 'fear'];
    enemies[0].x = 4; enemies[0].y = 5; enemies[0].hp = 50; enemies[0].activeStatuses = [];
    enemies[1].x = 5; enemies[1].y = 5; enemies[1].hp = 50; enemies[1].activeStatuses = [];
    enemies[2].x = 9; enemies[2].y = 7; enemies[2].hp = 50; enemies[2].activeStatuses = [];
    b.order = [b.units.indexOf(seris)]; b.activeIndex = 0; b.selected = seris; b.mode = 'skill'; b.pendingSkill = 'freeze'; b.heroActionDone = false;
    canvasBattleClick(4, 5);
    const freezeAndFear = enemies[0].activeStatuses.some(status => status.type === STATUS.FREEZE && status.turns === 2)
      && enemies[1].activeStatuses.some(status => status.type === STATUS.FEAR && status.turns === 1);

    seris.perks = ['teleport']; seris.x = 2; seris.y = 5;
    b.order = [b.units.indexOf(seris)]; b.activeIndex = 0; b.selected = seris; b.mode = 'skill'; b.pendingSkill = 'teleport'; b.heroActionDone = false; b.heroMoved = false; b.teleportUsed = false;
    canvasBattleClick(2, 2);
    const teleport = seris.x === 2 && seris.y === 2 && b.teleportUsed && b.heroMoved && !b.heroActionDone;

    Math.random = originalRandom;
    return {
      application,
      combat: {
        guardianCover: baselineOnAlly - coveredAlly === 2,
        reflect: reflected,
        finisher: finisher === 13,
        armorPierce: pierced === 7,
        crit: critical === 15,
        auraArmor: baselineOnAlly - armoredAura === 1,
        auraDamage: damageAura === 11,
        ignoreCover: targetForestBlocked && targetForestIgnored && middleObstacleStillBlocks,
        moveAttack: movingShot === 12,
        traps: trapCount === 2 && trapWorks,
        spellCharge: spellCharge === 13,
        aoePlus: aoeBonus === 1,
        burnSpell: burns,
        freezeAndFear,
        killHeal,
        teleport,
        arrowRain
      }
    };
  });

  result.application.forEach(item => check(`perk ${item.id} applies its declared ${item.stat}`, item.ok, JSON.stringify(item)));
  Object.entries(result.combat).forEach(([name, value]) => {
    const ok = typeof value === 'object'
      ? value.first && value.second && value.distant && value.cd === 5 && value.emptyPreserved
      : value;
    check(`perk runtime: ${name}`, ok, JSON.stringify(value));
  });
} finally {
  if (browser) await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}

if (failures.length) {
  failures.forEach(item => console.error(`FAIL ${item}`));
  process.exitCode = 1;
} else console.log('Hero perk audit passed.');
