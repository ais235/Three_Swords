/* Three Blades ? Campaign state, saves, map generation and unit factories.
 * Extracted from index.html; load order is intentional.
 */
  //══════════ SECTION 3: GAME_STATE helpers ══════════
  const GameState = {
    screen: 'map',
    region: 1,
    turn: 1,
    gold: 20,
    heroes: [],
    currentBattle: null,
    worldMap: [],
    log: [],
    inventory: [],
    consumables: {},
    adsAvailable: true,
    lastAdTime: 0,
    mapNodeId: null,
    pendingPerks: [],
    selectedHeroDeploy: 0,
    mapGrid: [],
    mapLayoutVersion: WorldMapTopology.LAYOUT_VERSION,
    mapFogVisited: [],
    playerPos: { x: 0, y: 0 },
    regionUnlocked: 1,
    shopStock: [],
    cityState: { adUpgradeUsed: false, secretRevealed: false, secretItemId: null },
    difficulty: 'normal',
    stats: { battles: 0, kills: 0, goldEarned: 0, objectivesCompleted: 0, damageTaken: 0, skillfulBattles: 0 },
    pendingNegativeEvent: null,
    adMeta: { lastShownAt: 0, lastBonusGoldAt: 0 },
    adPaused: false,
    pendingEnemyTurnAfterAd: false,
    defeatedBosses: 0,
    hardFlags: { skipDeployNextBattle: false },
    arenaDoneByRegion: {},
    wandererUsedByRegion: {},
    activeCityNode: null,
    cityNpcTab: 'trader',
    cityTraderTab: 'buy',
    battleReviveUsed: false,
    lastSafeSave: null,
    bestiary: {},
    bestiaryKills: {},
    pendingSkillUnlocks: [],
    firstBattleCompleted: false,
    ftueHintsEnabled: true,
    ftueSkillsUsed: {},
    battleSpeed: 1,
    runStartedAt: 0,
    testSeed: TEST_SEED || null,
    contract: 'hunters',
    campaignMutators: [],
    campaignEvents: [],
    campaignEffects: {},
    cityFavorClaimed: {},
    runHistory: [],
    _lastBattleDrop: null,
    _lastBattleDropHandled: true,
    _lastBattleAdClaimed: false
  };

  function deepClone(o) { return JSON.parse(JSON.stringify(o)); }
  function initHeroesFromTemplate() {
    GameState.heroes = baseHeroTemplate().map(h => {
      const x = deepClone(h);
      x.activeStatuses = [];
      return x;
    });
  }
  const YandexServices = {
    sdk: null,
    player: null,
    cloudReady: false,
    saveTimer: null,
    pendingSave: null,
    lastCloudSaveAt: 0,
    interstitialLastAt: 0,
    interstitialOpen: false
  };

  function defaultRecords() {
    return { maxGold: 0, enemiesDefeated: 0, bestVictoryTurns: null, updatedAt: 0 };
  }

  function loadRecords() {
    try {
      const raw = localStorage.getItem(RECORDS_KEY) || localStorage.getItem('threeBladesBest');
      if (!raw) return defaultRecords();
      const data = JSON.parse(raw);
      return {
        maxGold: Math.max(Number(data.maxGold ?? data.gold ?? 0) || 0, 0),
        enemiesDefeated: Math.max(Number(data.enemiesDefeated ?? data.kills ?? 0) || 0, 0),
        bestVictoryTurns: Number.isFinite(Number(data.bestVictoryTurns)) ? Number(data.bestVictoryTurns) : null,
        updatedAt: Number(data.updatedAt || 0) || 0
      };
    } catch (_) {
      return defaultRecords();
    }
  }

  function saveRecords(records) {
    try {
      localStorage.setItem(RECORDS_KEY, JSON.stringify(records));
      localStorage.setItem('threeBladesBest', JSON.stringify({ gold: records.maxGold || 0, kills: records.enemiesDefeated || 0 }));
    } catch (_) {}
  }

  function updateRecordsFromState(opts = {}) {
    const records = loadRecords();
    let changed = false;
    const gold = Number(GameState.gold || 0) || 0;
    const kills = Number(GameState.stats?.kills || 0) || 0;
    if (gold > (records.maxGold || 0)) { records.maxGold = gold; changed = true; }
    if (kills > (records.enemiesDefeated || 0)) { records.enemiesDefeated = kills; changed = true; }
    if (opts.finished) {
      const turns = Math.max(1, Number(GameState.turn || 1) || 1);
      if (!records.bestVictoryTurns || turns < records.bestVictoryTurns) {
        records.bestVictoryTurns = turns;
        changed = true;
      }
    }
    if (changed) {
      records.updatedAt = Date.now();
      saveRecords(records);
      submitLeaderboards(records);
    }
    return records;
  }

  function createSaveSnapshot() {
    const snap = deepClone(GameState);
    snap.adPaused = false;
    snap.pendingEnemyTurnAfterAd = false;
    snap.savedAt = Date.now();
    snap.saveVersion = CLOUD_SAVE_VERSION;
    return snap;
  }

  function applySaveSnapshot(o) {
    Object.assign(GameState, o);
    if (!GameState.heroes || !GameState.heroes.length) initHeroesFromTemplate();
    if (!GameState.mapGrid || GameState.mapGrid.length !== MAP_CELL_TOTAL) buildWorldMap();
    else {
      migrateWorldMapTopology();
      if (!Array.isArray(GameState.mapFogVisited)) GameState.mapFogVisited = [];
      if (GameState.mapFogVisited.length === 0) {
        GameState.mapGrid.forEach(c => { if (c.visited) mapFogVisitedAdd(c.y, c.x); });
      }
    }
    ensureCurrentCellFogVisited();
    if (!GameState.bestiary) GameState.bestiary = {};
    if (!GameState.bestiaryKills) GameState.bestiaryKills = {};
    if (!GameState.pendingSkillUnlocks) GameState.pendingSkillUnlocks = [];
    if (typeof GameState.firstBattleCompleted !== 'boolean') GameState.firstBattleCompleted = (GameState.stats?.battles || 0) > 0;
    if (typeof GameState.ftueHintsEnabled !== 'boolean') GameState.ftueHintsEnabled = !GameState.firstBattleCompleted;
    if (!GameState.ftueSkillsUsed || typeof GameState.ftueSkillsUsed !== 'object') GameState.ftueSkillsUsed = {};
    GameState.battleSpeed = Number(GameState.battleSpeed) === 2 ? 2 : 1;
    GameState.runStartedAt = Number(GameState.runStartedAt) || Date.now();
    if (!GameState.consumables || typeof GameState.consumables !== 'object') GameState.consumables = {};
    // Old saves can be loaded before the campaign module has initialised.
    if (typeof CampaignExpansion !== 'undefined') CampaignExpansion.ensureState();
    if (!GameState.stats || typeof GameState.stats !== 'object') GameState.stats = { battles: 0, kills: 0, goldEarned: 0 };
    GameState.stats.objectivesCompleted = Number(GameState.stats.objectivesCompleted) || 0;
    GameState.stats.damageTaken = Number(GameState.stats.damageTaken) || 0;
    GameState.stats.skillfulBattles = Number(GameState.stats.skillfulBattles) || 0;
    GameState.heroes.forEach(h => { h.activeStatuses = []; });
    GameState.adPaused = false;
    GameState.pendingEnemyTurnAfterAd = false;
    sanitizeAllHeroEquipment();
    updateRecordsFromState();
    return true;
  }

  function localSaveTimestamp() {
    try {
      const s = localStorage.getItem(SAVE_KEY) || localStorage.getItem(LEGACY_SAVE_KEY);
      return s ? (JSON.parse(s).savedAt || 0) : 0;
    } catch (_) { return 0; }
  }

  function persistLocalSave(snapshot) {
    const serialized = JSON.stringify(snapshot);
    try {
      localStorage.setItem(SAVE_KEY, serialized);
      localStorage.removeItem(LEGACY_SAVE_KEY);
      return true;
    } catch (firstError) {
      // Older builds wrote the same campaign twice. Free that duplicate before
      // retrying a save that has legitimately grown during a long run.
      try {
        localStorage.removeItem(LEGACY_SAVE_KEY);
        localStorage.setItem(SAVE_KEY, serialized);
        return true;
      } catch (retryError) {
        console.warn(retryError || firstError);
        return false;
      }
    }
  }

  function queueCloudSave(snap, flush = false) {
    if (!YandexServices.player) return;
    YandexServices.pendingSave = snap || createSaveSnapshot();
    clearTimeout(YandexServices.saveTimer);
    const delay = flush ? 0 : 1500;
    YandexServices.saveTimer = setTimeout(() => flushCloudSave(flush), delay);
  }

  async function flushCloudSave(flush = false) {
    const player = YandexServices.player;
    const snap = YandexServices.pendingSave;
    if (!player || !snap) return;
    YandexServices.pendingSave = null;
    try {
      await player.setData({ save: snap, records: loadRecords(), saveVersion: CLOUD_SAVE_VERSION }, !!flush);
      YandexServices.lastCloudSaveAt = Date.now();
      YandexServices.cloudReady = true;
    } catch (e) {
      console.warn('Cloud save failed', e);
    }
  }

  async function initYandexPlayer(sdk) {
    try {
      const player = await sdk.getPlayer();
      YandexServices.player = player;
      const data = await player.getData(['save', 'records']);
      if (data && data.records) {
        const localRecords = loadRecords();
        if ((data.records.updatedAt || 0) > (localRecords.updatedAt || 0)) saveRecords(data.records);
      }
      if (data && data.save && (data.save.savedAt || 0) > localSaveTimestamp()) {
        persistLocalSave(data.save);
        if (ActiveScreen === 'menu') updateMenuMeta();
      }
      YandexServices.cloudReady = true;
    } catch (e) {
      console.warn('Yandex player unavailable', e);
    }
  }

  function submitLeaderboards(records = loadRecords()) {
    const lb = window.ysdk?.leaderboards;
    if (!lb?.setScore) return;
    const calls = [];
    if (records.maxGold > 0) calls.push([LEADERBOARDS.maxGold, records.maxGold, 'maxGold']);
    if (records.enemiesDefeated > 0) calls.push([LEADERBOARDS.enemiesDefeated, records.enemiesDefeated, 'enemiesDefeated']);
    if (records.bestVictoryTurns) {
      calls.push([LEADERBOARDS.fastVictory, Math.max(1, FAST_VICTORY_BASE_SCORE - records.bestVictoryTurns), `turns:${records.bestVictoryTurns}`]);
    }
    calls.forEach(([name, score, extra]) => {
      try {
        const res = lb.setScore(name, score, String(extra || ''));
        if (res && typeof res.catch === 'function') res.catch(() => {});
      } catch (_) {}
    });
  }

  function saveGame() {
    const snap = createSaveSnapshot();
    if (persistLocalSave(snap)) {
      updateRecordsFromState();
      queueCloudSave(snap);
    }
  }
  function loadGame() {
    try {
      const s = localStorage.getItem(SAVE_KEY) || localStorage.getItem(LEGACY_SAVE_KEY);
      if (s) {
        const o = JSON.parse(s);
        return applySaveSnapshot(o);
      }
    } catch (e) { console.warn(e); }
    return false;
  }
  function randInt(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function inBounds(x, y) { return x >= 0 && x < GRID_W && y >= 0 && y < GRID_H; }

  // A*: intentionally kept short and dependency-free.
  function astar(grid, start, end, passable, costFn) {
    const h = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
    const key = p => p.x + ',' + p.y;
    const open = [start];
    const came = {};
    const g = { [key(start)]: 0 };
    const f = { [key(start)]: h(start, end) };
    while (open.length) {
      open.sort((a, b) => (f[key(a)] || 1e9) - (f[key(b)] || 1e9));
      const cur = open.shift();
      if (cur.x === end.x && cur.y === end.y) {
        const path = [];
        let k = key(cur);
        while (k) {
          const [xx, yy] = k.split(',').map(Number);
          path.push({ x: xx, y: yy });
          k = came[k];
        }
        return path.reverse();
      }
      for (const d of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
        const nx = cur.x + d.x, ny = cur.y + d.y;
        if (!inBounds(nx, ny) || !passable(nx, ny)) continue;
        const nk = key({ x: nx, y: ny });
        const step = costFn ? costFn(nx, ny) : 1;
        const tg = (g[key(cur)] || 0) + step;
        if (tg < (g[nk] ?? 1e9)) {
          came[nk] = key(cur);
          g[nk] = tg;
          f[nk] = tg + h({ x: nx, y: ny }, end);
          if (!open.find(o => o.x === nx && o.y === ny)) open.push({ x: nx, y: ny });
        }
      }
    }
    return null;
  }

  //══════════ Map generation (cellular + clusters + passage) ══════════
  function carvePassage(grid) {
    for (let y = 0; y < GRID_H; y++) {
      grid[y][1] = TILE.GROUND;
      grid[y][GRID_W - 2] = TILE.GROUND;
    }
    for (let x = 1; x < GRID_W - 1; x++) grid[Math.floor(GRID_H / 2)][x] = TILE.GROUND;
  }
  function carveLargeCreatureLanes(grid) {
    for (let y = 0; y < GRID_H; y++) {
      for (let x = 3; x < GRID_W; x++) {
        if (grid[y][x] === TILE.MOUNTAIN || grid[y][x] === TILE.WATER) grid[y][x] = TILE.GROUND;
      }
    }
    for (const y of [1, 3, 5, 6]) {
      if (y >= GRID_H) continue;
      for (let x = 2; x < GRID_W; x++) grid[y][x] = TILE.GROUND;
    }
  }
  function generateBattleGrid(region, opts = {}) {
    const grid = [];
    for (let y = 0; y < GRID_H; y++) {
      grid[y] = [];
      for (let x = 0; x < GRID_W; x++) grid[y][x] = TILE.GROUND;
    }
    const spacious = !!opts.spacious;
    const density = spacious ? 0.045 : 0.175 + region * 0.04;
    let noise = [];
    for (let y = 0; y < GRID_H; y++) {
      noise[y] = [];
      for (let x = 0; x < GRID_W; x++) noise[y][x] = Math.random() < 0.5 ? 1 : 0;
    }
    for (let it = 0; it < 3; it++) {
      const n2 = noise.map(row => row.slice());
      for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
        let s = 0;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          s += inBounds(nx, ny) ? noise[ny][nx] : 0;
        }
        n2[y][x] = s >= 5 ? 1 : 0;
      }
      noise = n2;
    }
    for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
      if (noise[y][x] && Math.random() < density) grid[y][x] = TILE.FOREST;
    }
    const clusters = spacious ? 1 : 2 + region;
    for (let c = 0; c < clusters; c++) {
      const cx = randInt(2, GRID_W - 3), cy = randInt(1, GRID_H - 2);
      const r = randInt(1, 2);
      for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
        if (inBounds(x, y) && Math.random() < 0.3) {
          if (Math.random() < 0.55) grid[y][x] = TILE.MOUNTAIN;
          else grid[y][x] = TILE.WATER;
        }
      }
    }
    for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
      if (x < 2 || x >= GRID_W - 2) grid[y][x] = grid[y][x] === TILE.MOUNTAIN ? TILE.GROUND : grid[y][x];
    }
    carvePassage(grid);
    if (spacious) carveLargeCreatureLanes(grid);
    const fortX = Math.floor(GRID_W / 2);
    const fortY = Math.floor(GRID_H / 2);
    grid[fortY][fortX] = TILE.FORT;
    return grid;
  }

  function createFirstBattleGrid() {
    const grid = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(TILE.GROUND));
    // One readable tactical landmark without blocking the first contact.
    grid[3][3] = TILE.FORT;
    grid[1][4] = TILE.FOREST;
    return grid;
  }

  function tileBlocksMove(t, unit) {
    if (t === TILE.MOUNTAIN) return unit && unit.enemyId === ENEMY_IDS.GHOST ? false : true;
    return false;
  }
  function tileMoveCost(t, unit) {
    if (t === TILE.FOREST) return 3;
    if (t === TILE.WATER) {
      if (unit && unit.heroId === 'seris') return 1;
      return 3;
    }
    return 1;
  }
  function tileDefenseBonus(t) {
    if (t === TILE.FOREST) return 2;
    if (t === TILE.FORT) return 4;
    return 0;
  }
  function terrainInfo(t, unit) {
    const names = {
      [TILE.GROUND]: 'terrainGround',
      [TILE.FOREST]: 'terrainForest',
      [TILE.MOUNTAIN]: 'terrainMountain',
      [TILE.WATER]: 'terrainWater',
      [TILE.FORT]: 'terrainFort',
      [TILE.FIRE]: 'terrainFire'
    };
    const effects = [];
    const def = tileDefenseBonus(t);
    const cost = tileMoveCost(t, unit);
    if (def > 0) effects.push(`+${def} ${translateKey('armor')} ${translateKey('terrainCover')}`);
    if (t === TILE.FOREST) effects.push(translateKey('terrainBlocksSight'));
    if (t === TILE.MOUNTAIN) effects.push(translateKey('terrainBlocksMove'));
    if (cost > 1) effects.push(`${translateKey('terrainSlows')}: ${cost}`);
    return {
      name: translateKey(names[t] || 'terrainGround'),
      defense: def,
      moveCost: cost,
      blocksMove: t === TILE.MOUNTAIN,
      blocksSight: t === TILE.FOREST || t === TILE.MOUNTAIN,
      effects
    };
  }
  function shouldDrawTerrainMarkers() {
    return window.innerWidth >= 900 && window.innerHeight >= 500;
  }
  function hasForestBetween(ax, ay, bx, by, grid) {
    const dx = Math.sign(bx - ax), dy = Math.sign(by - ay);
    let x = ax, y = ay;
    while (x !== bx || y !== by) {
      if (inBounds(x, y) && grid[y][x] === TILE.FOREST && (x !== bx || y !== by)) {
        if (Math.abs(bx - ax) >= Math.abs(by - ay)) x += dx; else y += dy;
        continue;
      }
      if (Math.abs(bx - ax) >= Math.abs(by - ay)) x += dx; else y += dy;
    }
    return false;
  }
  function rangedBlocked(ax, ay, tx, ty, grid, ignoreForestForTarget) {
    if (grid[ty][tx] === TILE.FOREST && ignoreForestForTarget) return false;
    const steps = Math.max(Math.abs(tx - ax), Math.abs(ty - ay));
    if (steps === 0) return false;
    for (let i = 1; i < steps; i++) {
      const px = Math.round(ax + (tx - ax) * i / steps);
      const py = Math.round(ay + (ty - ay) * i / steps);
      if (inBounds(px, py) && grid[py][px] === TILE.MOUNTAIN) return true;
      if (inBounds(px, py) && grid[py][px] === TILE.FOREST) return true;
    }
    return false;
  }

  //══════════ Unit factory ══════════
  function makeBattleHero(h, idx) {
    const src = GameState.heroes.find(x => x.id === h.id) || h;
    const u = deepClone(src);
    u.isHero = true;
    u.heroId = h.id;
    u.x = -1; u.y = -1;
    // Speed comes from hero config (Warrior:13, Archer:11, Mage:9) plus perks.
    u.cds = { ...(u.cds || {}), shieldBash: u.cds?.shieldBash || 0, fireCall: u.cds?.fireCall || 0, berserk: u.cds?.berserk || 0,
      doubleShot: u.cds?.doubleShot || 0, slowArrow: u.cds?.slowArrow || 0, arrowRain: u.cds?.arrowRain || 0,
      fireball: u.cds?.fireball || 0, freeze: u.cds?.freeze || 0, meteor: u.cds?.meteor || 0 };
    u.flags = { firstAttackTurn: true, mysticShield: src.flags?.mysticShield ?? 3, ...(u.flags || {}) };
    u.activeStatuses = [];
    u.sprite = u.emoji;
    return u;
  }
  function calculatePartyPower() {
    return GameState.heroes.reduce((sum, h) => {
      return sum + h.attack + h.armor + h.maxHp / 10 + h.range + h.speed / 2;
    }, 0);
  }
  function isHardcoreMode() {
    return GameState.difficulty === 'hardcore';
  }

  // Fixed stats for bosses — do NOT scale with partyPower
  const BOSS_PROFILES = {
    [ENEMY_IDS.LESHY]:       { hp: LeshyBoss.PROFILE.hp, attack: LeshyBoss.PROFILE.attack, armor: LeshyBoss.PROFILE.armor },
    [ENEMY_IDS.DARK_KNIGHT]: { hp: 65,  attack: 14, armor: 5 },
    [ENEMY_IDS.FIRE_TITAN]:  { hp: 110, attack: 16, armor: 4 },
    // The region-3 boss attacks three times and regenerates, so its base hit is
    // lower than the Titan's while its full turn remains a real boss threat.
    [ENEMY_IDS.HYDRA]:       { hp: 70,  attack: 10, armor: 3 },
    [ENEMY_IDS.DARK_LORD]:   { hp: 180, attack: 20, armor: 6 }
  };

  function scaleEnemy(base, partyPower, region) {
    const scale = Math.max(1, Math.min(2.5,
      (partyPower / 70) * (1 + (region - 1) * 0.1)
    ));
    return {
      hp:     Math.round(base.hp     * scale),
      attack: Math.round(base.attack * scale * 0.65),
      armor:  Math.round(base.armor  * scale * 0.5)
    };
  }

  function spawnEnemy(type, x, y) {
    const d = enemyDef(type);
    const region = GameState.region || 1;
    const pp = calculatePartyPower();

    let hp, attack, armor;
    if (BOSS_PROFILES[type]) {
      // Bosses: fixed stats
      ({ hp, attack, armor } = BOSS_PROFILES[type]);
    } else {
      // Regular enemies: scale with partyPower
      ({ hp, attack, armor } = scaleEnemy(d, pp, region));
    }
    if (isHardcoreMode()) {
      const bossMul = BOSS_PROFILES[type] ? 1.18 : 1.22;
      hp = Math.ceil(hp * bossMul);
      attack = Math.ceil(attack * (BOSS_PROFILES[type] ? 1.12 : 1.18));
      armor = Math.ceil(armor * 1.12);
    }

    const u = {
      isHero: false, enemyId: type, name: d.name, emoji: d.emoji,
      x, y, hp, maxHp: hp, armor, attack,
      move: d.move, range: d.range, speed: d.speed, activeStatuses: [],
      sizeW: d.sizeW || 1, sizeH: d.sizeH || 1,
      aiVar: {}
    };
    if (type === ENEMY_IDS.HYDRA) { u.heads = 3; u.headHp = d.headHp; }
    if (type === ENEMY_IDS.LESHY) { u.bossVar = { turn: 0, summonCooldown: 0, summonSerial: 0, phase2: false }; }
    if (type === ENEMY_IDS.DARK_LORD) { u.phase = 1; u.turnCount = 0; u.teleportCd = 0; u.aoeCd = 0; u.summonCd = 0; u.aiVar = {}; }
    if (type === ENEMY_IDS.FIRE_TITAN) { u.bossVar = { aoeCounter: 0 }; }
    if (type === ENEMY_IDS.CHAOS) { u.bossVar = { aoeTurn: 0 }; }
    u.aiVar = u.aiVar || {};
    markBestiarySeen(type);
    return u;
  }

  function regionFromMapRow(y) {
    return WorldMapTopology.regionForRow(y);
  }

  function buildWorldMap() {
    const grid = [];
    for (let y = 0; y < MAP_ROWS; y++) {
      for (let x = 0; x < MAP_COLS; x++) {
        const region = regionFromMapRow(y);
        grid.push({
          id: `c_${x}_${y}`, x, y, region,
          type: 'locked', completed: false, visited: false, emoji: '🔒'
        });
      }
    }
    const byRegion = {
      1: { rows: [0, 1, 2], mission: 20, city: 4, dungeon: 4, event: 6 },
      2: { rows: [3, 4, 5], mission: 16, city: 3, dungeon: 4, event: 5, wanderer: 3, arena: 3 },
      3: { rows: [6, 7], mission: 8, city: 2, dungeon: 3, event: 3, wanderer: 2, arena: 3 }
    };
    const pick = (cells, n) => {
      const arr = cells.slice();
      const out = [];
      while (arr.length && out.length < n) out.push(arr.splice(randInt(0, arr.length - 1), 1)[0]);
      return out;
    };
    for (const region of [1, 2, 3]) {
      const conf = byRegion[region];
      const cells = grid.filter(c => conf.rows.includes(c.y));
      const free = cells.slice();
      const assignAt = (kind, emoji, point) => {
        const cell = free.find(c => c.x === point.x && c.y === point.y);
        if (!cell) throw new Error(`Missing map anchor for ${kind} at ${point.x},${point.y}`);
        cell.type = kind;
        cell.emoji = emoji;
        free.splice(free.indexOf(cell), 1);
      };
      const assign = (kind, count, emoji) => {
        pick(free, count).forEach(c => {
          c.type = kind; c.emoji = emoji;
          free.splice(free.indexOf(c), 1);
        });
      };
      assignAt('boss', '💀', WorldMapTopology.REGION_BOSS_ANCHORS[region]);
      if (region === 3) assignAt('final', '👑', WorldMapTopology.FINAL_ANCHOR);
      assign('mission', conf.mission, '⚔️');
      assign('city', conf.city, '🏘️');
      assign('dungeon', conf.dungeon, '🗺️');
      assign('event', conf.event, '❓');
      if (conf.wanderer) assign('wanderer', conf.wanderer, '✨');
      if (conf.arena) assign('arena', conf.arena, '🕳️');
      free.forEach(c => { c.type = 'mission'; c.emoji = '⚔️'; });
    }
    GameState.mapGrid = grid;
    GameState.mapLayoutVersion = WorldMapTopology.LAYOUT_VERSION;
    GameState.playerPos = { x: 0, y: 0 };
    GameState.mapFogVisited = [];
    mapFogVisitedAdd(0, 0);
    const start = GameState.mapGrid.find(c => c.x === 0 && c.y === 0);
    start.type = 'mission';
    start.emoji = '⚔️';
    GameState.mapGrid.forEach(cell => {
      cell.routeCommitment = ['event', 'dungeon', 'wanderer', 'arena'].includes(cell.type) && ((cell.x * 3 + cell.y * 5) % 4 === 0);
      if (['mission', 'dungeon'].includes(cell.type)) cell.scenarioPreview = CampaignExpansion.scenarioForPreview(cell);
    });
    GameState.regionUnlocked = 1;
    GameState.defeatedBosses = 0;
    GameState.worldMap = [];
  }

  function migrateWorldMapTopology() {
    if (!Array.isArray(GameState.mapGrid) || GameState.mapGrid.length !== MAP_CELL_TOTAL) return false;
    if (Number(GameState.mapLayoutVersion) === WorldMapTopology.LAYOUT_VERSION) return false;

    const defeated = Math.max(0, Number(GameState.defeatedBosses) || 0);
    const finalWasCompleted = GameState.mapGrid.some(cell => cell.type === 'final' && cell.completed);

    GameState.mapGrid.forEach(cell => {
      cell.region = regionFromMapRow(cell.y);
      if (cell.type === 'boss' || cell.type === 'final') {
        cell.type = 'mission';
        cell.emoji = '⚔️';
        delete cell.enemyWavePreview;
      }
    });

    for (const region of [1, 2, 3]) {
      const anchor = WorldMapTopology.REGION_BOSS_ANCHORS[region];
      const cell = GameState.mapGrid.find(node => node.x === anchor.x && node.y === anchor.y);
      if (!cell) continue;
      cell.type = 'boss';
      cell.emoji = '💀';
      cell.completed = defeated >= region;
      delete cell.enemyWavePreview;
    }

    const final = GameState.mapGrid.find(node =>
      node.x === WorldMapTopology.FINAL_ANCHOR.x && node.y === WorldMapTopology.FINAL_ANCHOR.y
    );
    if (final) {
      final.type = 'final';
      final.emoji = '👑';
      final.completed = finalWasCompleted;
      delete final.enemyWavePreview;
    }

    const start = GameState.mapGrid.find(cell => cell.x === 0 && cell.y === 0);
    if (start) {
      start.type = 'mission';
      start.emoji = '⚔️';
    }
    GameState.mapLayoutVersion = WorldMapTopology.LAYOUT_VERSION;
    return true;
  }
