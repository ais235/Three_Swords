import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const index = readFileSync(resolve(root, 'index.html'), 'utf8');

const MAP_COLS = 12;
const MAP_ROWS = 8;
const DEFAULT_SEEDS = ['12345', 'phase4-a', 'phase4-b', 'phase4-c', 'phase4-d'];
const seeds = process.argv.slice(2).length ? process.argv.slice(2) : DEFAULT_SEEDS;

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
      miniBoss: /miniBoss:\s*true/.test(body),
      boss: /boss:\s*true/.test(body),
      sizeW: number('sizeW') || 1
    };
  }
  return defs;
}

const IDS = parseEnemyIds();
const DEFS = parseEnemyDefs(IDS);

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
    3: [IDS.NECRO, IDS.CHAOS, IDS.ASSASSIN, IDS.HYDRA, IDS.GHOST,
      IDS.VOID_STALKER, IDS.BLOOD_KNIGHT, IDS.BANSHEE, IDS.PLAGUE_DOCTOR, IDS.ARCANE_SENTINEL]
  };
  if (cell.type === 'boss') {
    if (cell.region === 1) return [IDS.SHAMAN];
    if (cell.region === 2) return [IDS.FIRE_TITAN];
    return [IDS.HYDRA];
  }
  if (cell.type === 'final') return [IDS.DARK_LORD];
  const pool = pools[cell.region];
  let cnt = cell.type === 'dungeon' ? 4 : cell.type === 'arena' ? 1 : 3;
  if (cell.region === 1) {
    if (cell.type === 'mission') cnt = 4;
    if (cell.type === 'dungeon') cnt = 5;
  }
  const wave = [];
  for (let i = 0; i < cnt; i++) wave.push(pool[randInt(rng, 0, pool.length - 1)]);
  return wave;
}

function threat(id) {
  const d = DEFS[id];
  if (!d) return 0;
  let score = d.hp + d.attack * 6 + d.armor * 4 + d.range * 3 + d.move * 2 + d.speed;
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
      const score = wave.reduce((sum, id) => sum + threat(id), 0);
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
console.table(rows);

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
