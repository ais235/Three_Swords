import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { loadGameRuntimeSource } from './runtime-source.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const index = loadGameRuntimeSource(root);
const require = createRequire(import.meta.url);
const LeshyBoss = require('../src/leshy-boss.js');

const MAP_COLS = 12;
const MAP_ROWS = 8;
const QUICK_SEEDS = ['12345', 'phase4-a', 'phase4-b', 'phase4-c', 'phase4-d'];
const STANDARD_SEEDS = [
  ...QUICK_SEEDS,
  'early-01', 'early-02', 'early-03', 'early-04', 'early-05',
  'normal-01', 'normal-02', 'normal-03', 'normal-04', 'normal-05',
  'hardcore-01', 'hardcore-02', 'hardcore-03', 'hardcore-04', 'hardcore-05',
  'boss-01', 'boss-02', 'boss-03', 'boss-04', 'boss-05',
  'synergy-01', 'synergy-02', 'synergy-03', 'synergy-04', 'synergy-05'
];
const cliArgs = process.argv.slice(2);
const cliSeeds = cliArgs.filter(arg => !arg.startsWith('--'));
const summaryOnly = cliArgs.includes('--summary');
const seeds = cliArgs.includes('--quick') ? QUICK_SEEDS : (cliSeeds.length ? cliSeeds : STANDARD_SEEDS);

function hashSeed(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function createSeededRandom(seed) {
  let state = seed >>> 0;
  return function seededRandom() {
    state = (state + 0x6D2B79F5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function parseEnemyIds() {
  const block = index.match(/const ENEMY_IDS = \{([\s\S]*?)\n\s*\};/);
  if (!block) throw new Error('ENEMY_IDS block not found');
  return Object.fromEntries([...block[1].matchAll(/([A-Z0-9_]+):\s*'([^']+)'/g)]
    .map(match => [match[1], match[2]]));
}

function parseEnemyDefs(ids) {
  const defs = {};
  for (const match of index.matchAll(/\[D\.([A-Z0-9_]+)\]:\s*\{([^}]+)\}/g)) {
    const key = match[1];
    const body = match[2];
    const number = name => {
      const found = body.match(new RegExp(`${name}:\\s*([0-9.]+)`));
      return found ? Number(found[1]) : 0;
    };
    defs[ids[key]] = {
      key,
      hp: number('hp'),
      armor: number('armor'),
      attack: number('attack'),
      move: number('move'),
      range: number('range'),
      speed: number('speed'),
      heads: number('heads') || 1,
      miniBoss: /miniBoss:\s*true/.test(body),
      boss: /boss:\s*true/.test(body),
      sizeW: number('sizeW') || 1
    };
  }
  return defs;
}

function parseBossProfiles(ids) {
  const block = index.match(/const BOSS_PROFILES = \{([\s\S]*?)\n\s*\};/);
  if (!block) throw new Error('BOSS_PROFILES block not found');
  const profiles = {};
  for (const match of block[1].matchAll(/\[ENEMY_IDS\.([A-Z0-9_]+)\]:\s*\{([^}]+)\}/g)) {
    const body = match[2];
    const number = name => {
      const literal = body.match(new RegExp(`${name}:\\s*([0-9.]+)`))?.[1];
      if (literal) return Number(literal);
      if (body.includes(`${name}: LeshyBoss.PROFILE.${name}`)) return LeshyBoss.PROFILE[name];
      return 0;
    };
    profiles[ids[match[1]]] = { hp: number('hp'), attack: number('attack'), armor: number('armor') };
  }
  return profiles;
}

const IDS = parseEnemyIds();
const DEFS = parseEnemyDefs(IDS);
const BOSS_PROFILES = parseBossProfiles(IDS);
const ordinaryWaveViolations = [];

function randInt(rng, a, b) {
  return a + Math.floor(rng() * (b - a + 1));
}

function regionFromMapRow(y) {
  if (y <= 2) return 1;
  if (y <= 5) return 2;
  return 3;
}

function buildWorldMap(rng) {
  const grid = [];
  for (let y = 0; y < MAP_ROWS; y++) {
    for (let x = 0; x < MAP_COLS; x++) {
      grid.push({ id: `c_${x}_${y}`, x, y, region: regionFromMapRow(y), type: 'locked' });
    }
  }
  const byRegion = {
    1: { rows: [0, 1, 2], mission: 20, city: 4, dungeon: 4, event: 6, boss: 0, bossPlaced: 1, bossMinDistance: 6 },
    2: { rows: [3, 4, 5], mission: 16, city: 3, dungeon: 4, event: 5, boss: 0, bossPlaced: 1, bossMinDistance: 7, wanderer: 3, arena: 3 },
    3: { rows: [6, 7], mission: 8, city: 2, dungeon: 3, event: 3, boss: 0, bossPlaced: 1, bossMinDistance: 6, wanderer: 2, final: 1, arena: 3 }
  };
  const regionEntrance = { 1: { x: 0, y: 0 }, 2: { x: 0, y: 3 }, 3: { x: 0, y: 6 } };
  const pick = (cells, n) => {
    const arr = cells.slice();
    const out = [];
    while (arr.length && out.length < n) out.push(arr.splice(randInt(rng, 0, arr.length - 1), 1)[0]);
    return out;
  };
  for (const region of [1, 2, 3]) {
    const conf = byRegion[region];
    const free = grid.filter(c => conf.rows.includes(c.y));
    const assign = (kind, count, opts = {}) => {
      const origin = opts.origin || regionEntrance[region] || { x: 0, y: conf.rows[0] };
      const minDistance = opts.minDistance || 0;
      let candidates = free;
      if (minDistance > 0) {
        candidates = free.filter(c => Math.abs(c.x - origin.x) + Math.abs(c.y - origin.y) >= minDistance);
        if (candidates.length < count) candidates = free;
      }
      pick(candidates, count).forEach(c => {
        c.type = kind;
        free.splice(free.indexOf(c), 1);
      });
    };
    assign('boss', conf.bossPlaced || 0, { origin: regionEntrance[region], minDistance: conf.bossMinDistance || 0 });
    assign('mission', conf.mission);
    assign('city', conf.city);
    assign('dungeon', conf.dungeon);
    assign('event', conf.event);
    assign('boss', conf.boss);
    if (conf.wanderer) assign('wanderer', conf.wanderer);
    if (conf.arena) assign('arena', conf.arena);
    if (conf.final) assign('final', conf.final);
    free.forEach(c => { c.type = 'mission'; });
  }
  const start = grid.find(c => c.x === 0 && c.y === 0);
  start.type = 'mission';
  return grid;
}

function waveForCell(rng, cell) {
  const pools = {
    1: [IDS.SKELETON, IDS.GOBLIN_ARCHER, IDS.BOAR, IDS.ZOMBIE, IDS.SHAMAN,
      IDS.BANDIT, IDS.WOLF, IDS.BANDIT_THROWER, IDS.SPEARMAN, IDS.BOG_LURKER, IDS.THORN_DRYAD, IDS.RAT_SWARM],
    2: [IDS.ORC_GUARD, IDS.SPIDER, IDS.SUICIDE, IDS.ICE_ELEM, IDS.WATCHER, IDS.DARK_KNIGHT,
      IDS.CULTIST, IDS.HEXER, IDS.SHIELDBEARER, IDS.CROSSBOWMAN, IDS.STONE_GOLEM],
    3: [IDS.NECRO, IDS.CHAOS, IDS.ASSASSIN, IDS.GHOST,
      IDS.VOID_STALKER, IDS.BLOOD_KNIGHT, IDS.BANSHEE, IDS.PLAGUE_DOCTOR, IDS.ARCANE_SENTINEL]
  };
  if (cell.type === 'boss') {
    if (cell.region === 1) return [IDS.LESHY];
    if (cell.region === 2) return [IDS.FIRE_TITAN];
    return [IDS.HYDRA];
  }
  if (cell.type === 'final') return [IDS.DARK_LORD];
  const pool = pools[cell.region];
  let cnt = cell.type === 'dungeon' ? 4 : cell.type === 'arena' ? 1 : 3;
  if (cell.region === 2 && cell.type === 'mission') cnt = 4;
  if (cell.region === 3 && cell.type === 'mission') cnt = 4;
  if (cell.region === 3 && cell.type === 'dungeon') cnt = 4;
  const countGroup = (wave, ids) => wave.filter(id => ids.includes(id)).length;
  const volatile = [IDS.SUICIDE, IDS.PLAGUE_DOCTOR];
  const ranged = [IDS.GOBLIN_ARCHER, IDS.BANDIT_THROWER, IDS.CROSSBOWMAN, IDS.HEXER, IDS.BANSHEE];
  const healers = [IDS.SHAMAN, IDS.PLAGUE_DOCTOR];
  const summoners = [IDS.NECRO, IDS.SHAMAN];
  const controllers = [IDS.SPIDER, IDS.ICE_ELEM, IDS.HEXER, IDS.BANSHEE, IDS.ARCANE_SENTINEL];
  const assassins = [IDS.ASSASSIN, IDS.VOID_STALKER, IDS.BLOOD_KNIGHT];
  const heavyElites = [IDS.BLOOD_KNIGHT, IDS.ARCANE_SENTINEL, IDS.STONE_GOLEM];
  const allows = (wave, candidate) => {
    if (wave.filter(id => id === candidate).length >= 2) return false;
    if (volatile.includes(candidate) && countGroup(wave, volatile) >= 1) return false;
    if (ranged.includes(candidate) && countGroup(wave, ranged) >= 2) return false;
    if (healers.includes(candidate) && countGroup(wave, healers) >= 1) return false;
    if (summoners.includes(candidate) && countGroup(wave, summoners) >= 1) return false;
    if (controllers.includes(candidate) && countGroup(wave, controllers) >= 2) return false;
    if (assassins.includes(candidate) && countGroup(wave, assassins) >= 2) return false;
    if (heavyElites.includes(candidate) && countGroup(wave, heavyElites) >= 1) return false;
    return true;
  };
  const wave = [];
  for (let i = 0; i < cnt; i++) {
    const allowed = pool.filter(candidate => allows(wave, candidate));
    const candidates = allowed.length ? allowed : pool.filter(candidate => wave.filter(id => id === candidate).length < 2);
    const pick = candidates[randInt(rng, 0, candidates.length - 1)];
    wave.push(pick);
  }
  return wave;
}

function synergyThreat(wave) {
  const count = id => wave.filter(x => x === id).length;
  let bonus = 0;
  const healer = count(IDS.SHAMAN) + count(IDS.PLAGUE_DOCTOR);
  const tank = count(IDS.ORC_GUARD) + count(IDS.SHIELDBEARER) + count(IDS.STONE_GOLEM);
  const control = count(IDS.SPIDER) + count(IDS.ICE_ELEM) + count(IDS.HEXER) + count(IDS.BANSHEE);
  const assassin = count(IDS.ASSASSIN) + count(IDS.VOID_STALKER) + count(IDS.BLOOD_KNIGHT);
  const summoner = count(IDS.NECRO) + count(IDS.SHAMAN);
  const ranged = count(IDS.GOBLIN_ARCHER) + count(IDS.BANDIT_THROWER) + count(IDS.CROSSBOWMAN) + count(IDS.HEXER) + count(IDS.BANSHEE);
  if (healer && tank) bonus += 45;
  if (control && assassin) bonus += 55;
  if (summoner && tank) bonus += 40;
  if (ranged >= 2) bonus += 20 * (ranged - 1);
  if (count(IDS.SUICIDE) + count(IDS.PLAGUE_DOCTOR) > 1) bonus += 80;
  return bonus;
}

function threat(id) {
  const base = DEFS[id];
  if (!base) return 0;
  const profile = BOSS_PROFILES[id];
  const d = profile ? { ...base, ...profile } : base;
  if (!d) return 0;
  // Hydra's three heads are three real attacks in aiAttack(), not cosmetic text.
  let score = d.hp + d.attack * 6 * d.heads + d.armor * 4 + d.range * 3 + d.move * 2 + d.speed;
  if (d.miniBoss) score *= 1.25;
  if (d.boss) score *= 1.5;
  if (d.sizeW > 1) score *= 1.12;
  return Math.round(score);
}

function summarize(seed) {
  const rng = createSeededRandom(hashSeed(seed));
  const grid = buildWorldMap(rng);
  const rows = [];
  for (const region of [1, 2, 3]) {
    const cells = grid.filter(c => c.region === region && ['mission', 'dungeon', 'boss', 'final', 'arena'].includes(c.type));
    const byType = new Map();
    for (const cell of cells) {
      const wave = waveForCell(rng, cell);
      if (['mission', 'dungeon', 'arena'].includes(cell.type) && wave.includes(IDS.HYDRA)) {
        ordinaryWaveViolations.push(`${seed}:${cell.id}: regional boss hydra in ${cell.type}`);
      }
      const score = wave.reduce((sum, id) => sum + threat(id), 0) + synergyThreat(wave);
      const bucket = byType.get(cell.type) || { count: 0, total: 0, max: 0, examples: [] };
      bucket.count += 1;
      bucket.total += score;
      bucket.max = Math.max(bucket.max, score);
      if (bucket.examples.length < 2) bucket.examples.push(wave.join('+'));
      byType.set(cell.type, bucket);
    }
    for (const [type, bucket] of [...byType.entries()].sort()) {
      rows.push({
        seed,
        region,
        type,
        count: bucket.count,
        avgThreat: Math.round(bucket.total / bucket.count),
        maxThreat: bucket.max,
        examples: bucket.examples.join(' | ')
      });
    }
  }
  return rows;
}

const rows = seeds.flatMap(summarize);
if (!summaryOnly) console.table(rows);

const missionAverages = rows.filter(row => row.type === 'mission')
  .reduce((acc, row) => {
    acc[row.region] = acc[row.region] || [];
    acc[row.region].push(row.avgThreat);
    return acc;
  }, {});

const curve = Object.entries(missionAverages).map(([region, values]) => {
  const avg = Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  return `R${region}:${avg}`;
}).join(' ');

console.log(`Mission threat curve ${curve}`);

const regionalMedian = region => {
  const values = rows.filter(row => row.type === 'mission' && row.region === region).map(row => row.avgThreat).sort((a, b) => a - b);
  return values[Math.floor(values.length / 2)] || 0;
};
const curveOk = regionalMedian(2) > regionalMedian(1) && regionalMedian(3) > regionalMedian(2);
if (!curveOk) {
  console.error(`FAIL non-growing mission medians: R1=${regionalMedian(1)} R2=${regionalMedian(2)} R3=${regionalMedian(3)}`);
  process.exit(1);
}
console.log(`PASS growing mission medians: R1=${regionalMedian(1)} R2=${regionalMedian(2)} R3=${regionalMedian(3)}`);

if (ordinaryWaveViolations.length) {
  ordinaryWaveViolations.forEach(message => console.error(`FAIL ${message}`));
  process.exit(1);
}
console.log('PASS regional boss units are absent from ordinary region 3 waves');

const maxThreatFor = (region, type) => Math.max(0, ...rows
  .filter(row => row.region === region && row.type === type)
  .map(row => row.maxThreat));
const threatCaps = [
  { region: 1, type: 'mission', cap: 380 },
  { region: 1, type: 'dungeon', cap: 520 },
  { region: 2, type: 'mission', cap: 760 },
  { region: 2, type: 'dungeon', cap: 820 },
  { region: 3, type: 'mission', cap: 850 },
  { region: 3, type: 'dungeon', cap: 900 }
];
let capFailed = false;
for (const rule of threatCaps) {
  const maximum = maxThreatFor(rule.region, rule.type);
  if (maximum > rule.cap) {
    capFailed = true;
    console.error(`FAIL R${rule.region} ${rule.type} threat ${maximum} exceeds cap ${rule.cap}`);
  } else {
    console.log(`PASS R${rule.region} ${rule.type} max threat ${maximum}/${rule.cap}`);
  }
}
if (capFailed) process.exit(1);
