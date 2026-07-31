/* Three Blades ? Battle rules, canvas rendering, turn flow and combat actions.
 * Extracted from index.html; load order is intentional.
 */
  //══════════ Battle core ══════════
  function clearBattleSpawnFootprint(grid, x, y, width = 1, height = 1) {
    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        if (inBounds(x + dx, y + dy)) grid[y + dy][x + dx] = TILE.GROUND;
      }
    }
  }

  function ambushEnemyEdgeSlots(unit) {
    const width = unitWidth(unit);
    const height = unitHeight(unit);
    const middleX = Math.max(0, Math.min(GRID_W - width, Math.floor((GRID_W - width) / 2)));
    const middleY = Math.max(0, Math.min(GRID_H - height, Math.floor((GRID_H - height) / 2)));
    return [
      { x: 0, y: middleY, edge: 'left' },
      { x: GRID_W - width, y: middleY, edge: 'right' },
      { x: middleX, y: 0, edge: 'top' },
      { x: middleX, y: GRID_H - height, edge: 'bottom' },
      { x: 0, y: 0, edge: 'top-left' },
      { x: GRID_W - width, y: GRID_H - height, edge: 'bottom-right' },
      { x: GRID_W - width, y: 0, edge: 'top-right' },
      { x: 0, y: GRID_H - height, edge: 'bottom-left' }
    ];
  }

  function startBattle(node) {
    GameState.lastSafeSave = deepClone(GameState);
    GameState.battleReviveUsed = false;
    const campaignAmbush = !!GameState.campaignEffects?.nextAmbush;
    if (campaignAmbush) GameState.campaignEffects.nextAmbush = false;
    const scenario = CampaignExpansion.createScenario(node);
    const wave = CampaignExpansion.applyMutatorsToWave(node.enemyWave || [ENEMY_IDS.SKELETON, ENEMY_IDS.SKELETON], node);
    const hasLargeEnemy = wave.some(id => (enemyDef(id).sizeW || 1) > 1 || (enemyDef(id).sizeH || 1) > 1);
    const firstBattle = !!node.firstBattle;
    const isAmbush = !!node.ambush || campaignAmbush;
    const grid = firstBattle ? createFirstBattleGrid() : generateBattleGrid(node.region, { spacious: hasLargeEnemy || node.boss || node.final || isAmbush });
    const units = [];
    const heroes = GameState.heroes.filter(h => h.hp > 0).map((h, i) => makeBattleHero(h, i));
    // A normal battle begins at the left edge. An ambush locks the party into
    // a compact central formation so enemies can close in from several sides.
    const formationByHeroId = isAmbush ? {
      garet: { x: 5, y: 3 },
      alira: { x: 6, y: 3 },
      seris: { x: 5, y: 4 }
    } : {
      seris: { x: 0, y: 2 },
      garet: { x: 1, y: 3 },
      alira: { x: 0, y: 4 }
    };
    if (isAmbush) {
      for (let y = 2; y <= 5; y++) {
        for (let x = 4; x <= 7; x++) clearBattleSpawnFootprint(grid, x, y);
      }
    } else {
      Object.values(formationByHeroId).forEach(({ x, y }) => clearBattleSpawnFootprint(grid, x, y));
    }
    const fallbackSlots = isAmbush
      ? [{ x: 6, y: 4 }, { x: 4, y: 3 }, { x: 4, y: 4 }, { x: 7, y: 3 }, { x: 7, y: 4 }, { x: 5, y: 2 }]
      : [{ x: 1, y: 2 }, { x: 1, y: 4 }, { x: 0, y: 3 }, { x: 0, y: 5 }, { x: 1, y: 5 }, { x: 0, y: 6 }];
    const used = new Set();
    const isFree = (x, y) => inBounds(x, y) && (isAmbush ? x >= 4 && x <= 7 && y >= 2 && y <= 5 : x <= 1) &&
      !tileBlocksMove(grid[y][x], null) && !used.has(x + ',' + y);
    heroes.forEach((hu, i) => {
      let slot = formationByHeroId[hu.heroId];
      if (!slot || !isFree(slot.x, slot.y)) slot = fallbackSlots.find(s => isFree(s.x, s.y));
      if (!slot) {
        const minX = isAmbush ? 4 : 0;
        const maxX = isAmbush ? 7 : 1;
        const minY = isAmbush ? 2 : 0;
        const maxY = isAmbush ? 5 : GRID_H - 1;
        for (let x = minX; x <= maxX && !slot; x++) {
          for (let y = minY; y <= maxY && !slot; y++) {
            if (isFree(x, y)) slot = { x, y };
          }
        }
      }
      if (!slot) slot = isAmbush ? { x: 5 + (i % 2), y: 3 + Math.floor(i / 2) } : { x: 0, y: i % GRID_H };
      hu.x = slot.x;
      hu.y = slot.y;
      used.add(slot.x + ',' + slot.y);
    });
    // Heroes must exist in battle units immediately (for sidebar + board visibility).
    units.push(...heroes);
    const rightXs = [GRID_W - 2, GRID_W - 1, GRID_W - 3, GRID_W - 4, GRID_W - 5];
    const firstEnemySlots = [{ x: 4, y: 3 }, { x: 4, y: 2 }, { x: 5, y: 4 }];
    let ei = 0;
    for (const t of wave) {
      let placed = false;
      const proto = { isHero: false, enemyId: t, sizeW: enemyDef(t).sizeW || 1, sizeH: enemyDef(t).sizeH || 1 };
      if (isAmbush) {
        const edgeSlots = ambushEnemyEdgeSlots(proto);
        const rotation = ei % Math.min(4, edgeSlots.length);
        const rotatedSlots = edgeSlots.slice(rotation).concat(edgeSlots.slice(0, rotation));
        for (const slot of rotatedSlots) {
          if (placed) break;
          clearBattleSpawnFootprint(grid, slot.x, slot.y, unitWidth(proto), unitHeight(proto));
          if (canUnitOccupy({ grid, units }, proto, slot.x, slot.y, { end: true })) {
            const enemy = spawnEnemy(t, slot.x, slot.y);
            enemy.ambushEdge = slot.edge;
            units.push(enemy);
            placed = true;
          }
        }
      } else if (firstBattle && firstEnemySlots[ei]) {
        const slot = firstEnemySlots[ei];
        if (canUnitOccupy({ grid, units }, proto, slot.x, slot.y, { end: true })) {
          units.push(spawnEnemy(t, slot.x, slot.y));
          placed = true;
        }
      }
      for (const rx of rightXs) {
        for (let y = 0; y < GRID_H && !placed; y++) {
          if (canUnitOccupy({ grid, units }, proto, rx, y, { end: true })) {
            units.push(spawnEnemy(t, rx, y));
            placed = true;
          }
        }
      }
      if (!placed) {
        for (let y = 0; y < GRID_H && !placed; y++) {
          for (let x = Math.max(0, GRID_W - unitWidth(proto)); x >= 2 && !placed; x--) {
            if (canUnitOccupy({ grid, units }, proto, x, y, { end: true })) {
              units.push(spawnEnemy(t, x, y));
              placed = true;
            }
          }
        }
      }
      ei++;
    }
    // Holdout must feel like a defence under pressure, not four empty turns.
    // A vanguard starts within a few steps of the left deployment zone.
    if (scenario.id === 'holdout' && !isAmbush) {
      const vanguard = [wave[0], wave[1] || wave[0]].filter(Boolean);
      const vanguardSlots = [{ x: 5, y: 2 }, { x: 5, y: 5 }, { x: 4, y: 3 }, { x: 4, y: 4 }];
      vanguard.forEach((enemyId, index) => {
        const proto = { isHero: false, enemyId, sizeW: enemyDef(enemyId).sizeW || 1, sizeH: enemyDef(enemyId).sizeH || 1 };
        const slot = vanguardSlots.find(point => canUnitOccupy({ grid, units }, proto, point.x, point.y, { end: true }));
        if (slot) units.push(spawnEnemy(enemyId, slot.x, slot.y));
      });
    }
    const objective = firstBattle || (GameState.stats.battles || 0) % 2 === 0 ? 'skillful' : 'flawless';
    GameState.currentBattle = {
      grid, units, phase: 'deploy', round: 1,
      activeIndex: 0, order: [], mode: 'idle',
      selected: null, moveFrom: null, nodeId: node.id,
      battleLog: [], pendingLoot: { gold: 0, items: [] },
      globalBuffs: { watcherDeadMove: 0 }, heroMoved: false, heroActionDone: false, pendingSkill: null, deployDragHeroId: null,
      heroMoveUndo: null,
      firstBattle,
      region: node.region,
      routeCommitment: !!node.routeCommitment,
      ambush: isAmbush,
      deploymentLocked: isAmbush,
      ftueSkillsUsed: { ...(GameState.ftueSkillsUsed || {}) },
      traps: [],
      objective,
      objectiveUsedSkill: false,
      objectiveHeroLost: false,
      scenario
    };
    CampaignExpansion.applyStartBattleEffects(GameState.currentBattle);
    GameState.screen = 'battle';
    GameState.mapNodeId = node.id;
    showScreen('battle');
    resetBattleView();
    updateBattleUI();
    const b0 = GameState.currentBattle;
    b0.battleLog.push({
      text: isAmbush
        ? translateKey('eventAmbushText')
        : 'Heroes are deployed automatically. Drag them into the left 2 columns if needed, then press “Start Battle”.',
      t: 'status'
    });
    if (GameState._pendingBestiaryLogs && GameState._pendingBestiaryLogs.length) {
      GameState._pendingBestiaryLogs.forEach(msg => b0.battleLog.push({ text: msg, t: 'status' }));
      GameState._pendingBestiaryLogs = [];
    }
    renderBattleLog();
    buildInitiative();
    saveGame();
    if (typeof BattleSfx !== 'undefined') BattleSfx.ensureSampleBuffers();
  }

  function unitWidth(u) { return Math.max(1, u && Number.isFinite(u.sizeW) ? u.sizeW : 1); }
  function unitHeight(u) { return Math.max(1, u && Number.isFinite(u.sizeH) ? u.sizeH : 1); }
  function unitCells(u, x = u.x, y = u.y) {
    const cells = [];
    for (let dy = 0; dy < unitHeight(u); dy++) {
      for (let dx = 0; dx < unitWidth(u); dx++) cells.push({ x: x + dx, y: y + dy });
    }
    return cells;
  }
  function pointInUnit(u, x, y) {
    return u && u.hp > 0 && x >= u.x && x < u.x + unitWidth(u) && y >= u.y && y < u.y + unitHeight(u);
  }
  function unitAt(b, x, y) { return b.units.find(u => pointInUnit(u, x, y)); }
  function unitAtExcluding(b, x, y, self) {
    return b.units.find(u => u !== self && pointInUnit(u, x, y));
  }
  function closestUnitCellToPoint(u, x, y) {
    let best = { x: u.x, y: u.y }, bestD = Infinity;
    for (const c of unitCells(u)) {
      const d = Math.abs(c.x - x) + Math.abs(c.y - y);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }
  function unitDistanceFromPoint(u, x, y) {
    const c = closestUnitCellToPoint(u, x, y);
    return Math.abs(c.x - x) + Math.abs(c.y - y);
  }
  function unitDistance(a, b) {
    let best = Infinity;
    for (const ac of unitCells(a)) for (const bc of unitCells(b)) {
      best = Math.min(best, Math.abs(ac.x - bc.x) + Math.abs(ac.y - bc.y));
    }
    return best;
  }

  function selectedDeployHero(b) {
    if (!b || b.phase !== 'deploy') return null;
    return b.units.find(u => u.isHero && u.hp > 0 && u.heroId === b.deployDragHeroId) ||
      b.units.find(u => u.isHero && u.hp > 0) || null;
  }

  function isDeployCellAvailable(b, x, y, hero = selectedDeployHero(b)) {
    return !!(b && b.phase === 'deploy' && !b.deploymentLocked && hero && x >= 0 && x <= 1 &&
      inBounds(x, y) && canUnitOccupy(b, hero, x, y, { end: true }));
  }

  function initiativeCycleUnits(b) {
    if (!b || !Array.isArray(b.order) || !b.order.length) return [];
    const start = Math.max(0, Math.min(b.activeIndex || 0, b.order.length - 1));
    return b.order.slice(start).concat(b.order.slice(0, start))
      .map(unitIndex => b.units[unitIndex])
      .filter(unit => unit && unit.hp > 0);
  }

  function nextHeroInInitiative(b) {
    if (!b || b.phase !== 'combat') return null;
    return initiativeCycleUnits(b).slice(1).find(unit => unit.isHero) || null;
  }
  function heroFlankSupport(attacker, target, b) {
    if (!attacker || !target || !b || !attacker.isHero || target.isHero) return null;
    if (unitDistance(attacker, target) > 1) return null;
    return b.units.find(u =>
      u !== attacker &&
      u.isHero &&
      u.hp > 0 &&
      unitDistance(u, target) <= 1
    ) || null;
  }
  function isHeroFlankAttack(attacker, target, b, opts = {}) {
    if (opts.magic || opts.noFlank) return false;
    return !!heroFlankSupport(attacker, target, b);
  }
  function canUnitOccupy(b, self, x, y, opts = {}) {
    if (!b || !self) return false;
    const ghost = self.enemyId === ENEMY_IDS.GHOST;
    for (const c of unitCells(self, x, y)) {
      if (!inBounds(c.x, c.y)) return false;
      if (!ghost && tileBlocksMove(b.grid[c.y][c.x], self)) return false;
      const occ = unitAtExcluding(b, c.x, c.y, self);
      if (occ) {
        if (ghost) continue;
        if (opts.pass && sameSide(self, occ)) continue;
        return false;
      }
    }
    return true;
  }
  function allEnemiesDead(b) { return !b.units.some(u => !u.isHero && u.hp > 0); }
  function allHeroesDead(b) { return !b.units.some(u => u.isHero && u.hp > 0); }

  function serisAoeBonus(u) {
    if (!u || !u.isHero || u.heroId !== 'seris') return 0;
    const weapon = getEquippedItem(u, 'weapon');
    let bonus = 0;
    if (u.perks && u.perks.includes('aoePlus')) bonus += 1;
    if (weapon && weapon.mods && weapon.mods.aoePlus) bonus += 1;
    return Math.min(2, bonus);
  }

  function damageEnemiesAtCells(b, attacker, cells, dmg, opts = {}) {
    const hit = new Set();
    const exclude = new Set(opts.excludeUnits || []);
    const damageOpts = { ...opts };
    delete damageOpts.excludeUnits;
    cells.forEach(({ x, y }) => {
      if (!inBounds(x, y)) return;
      const t = unitAt(b, x, y);
      if (!t || t.isHero || t.hp <= 0 || hit.has(t) || exclude.has(t)) return;
      hit.add(t);
      dealDamage(attacker, t, dmg, damageOpts);
    });
    return hit.size;
  }

  function applySerisChaosAoe(u) {
    const b = GameState.currentBattle;
    const weapon = getEquippedItem(u, 'weapon');
    if (!b || !u || !weapon || !weapon.mods || !weapon.mods.chaosAoe) return;
    const enemies = b.units.filter(t => !t.isHero && t.hp > 0);
    if (!enemies.length) return;
    const nearestDist = Math.min(...enemies.map(t => unitDistance(u, t)));
    const nearest = enemies.filter(t => unitDistance(u, t) === nearestDist);
    const center = nearest[randInt(0, nearest.length - 1)];
    const radius = 1 + serisAoeBonus(u);
    let cells = [];
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (Math.abs(dx) + Math.abs(dy) <= radius) cells.push({ x: center.x + dx, y: center.y + dy });
      }
    }
    const hits = damageEnemiesAtCells(b, u, cells, 5, { magic: true, sfxImpactOnly: true, noWeaponBonus: true });
    if (hits) pushBattleLog(`🌀 ${u.name}: Chaos Staff AoE`, 'status');
  }

  /** Finish combat when all enemies or all heroes are dead, including DoT between turns. */
  function resolveBattleIfOver() {
    const b = GameState.currentBattle;
    if (!b || b._victoryHandled) return false;
    const clearEndsScenario = !b.scenario || ['eliminate', 'ritual'].includes(b.scenario.id);
    if (CampaignExpansion.isVictory(b) || CampaignExpansion.isDefeat(b) || (allEnemiesDead(b) && clearEndsScenario) || allHeroesDead(b)) { checkBattleEnd(); return true; }
    return false;
  }

  function getSpeed(u) {
    let s = u.speed || 10;
    if (u.activeStatuses) {
      if (u.activeStatuses.find(status => status.type === STATUS.SLOW)) s -= 2;
    }
    if (!u.isHero && GameState.currentBattle?.globalBuffs?.watcherDeadMove > 0) s += 1;
    return s;
  }
  function buildInitiative() {
    const b = GameState.currentBattle;
    if (!b) return;
    b.order = b.units.map((u, i) => i).filter(i => b.units[i].hp > 0)
      .sort((ia, ib) => getSpeed(b.units[ib]) - getSpeed(b.units[ia]));
    b.activeIndex = 0;
  }
  function getActiveUnit() {
    const b = GameState.currentBattle;
    if (!b || !b.order.length) return null;
    const idx = b.order[b.activeIndex];
    return b.units[idx];
  }

  function sameSide(a, b) {
    if (!a || !b) return false;
    return !!a.isHero === !!b.isHero;
  }
  // Movement passability: allies can be crossed, enemies cannot.
  function passableForUnit(b, x, y, self) {
    return canUnitOccupy(b, self, x, y, { pass: true });
  }
  // Stop passability: occupied cells always block, except for GHOST.
  function canEndOnTile(b, x, y, self) {
    return canUnitOccupy(b, self, x, y, { end: true });
  }

  function getMovePoints(u, b) {
    let m = u.move;
    if (u.activeStatuses && u.activeStatuses.find(s => s.type === STATUS.SLOW)) m = Math.max(0, m - 2);
    if (u.activeStatuses && u.activeStatuses.find(s => s.type === STATUS.WEB)) m = 0;
    if (u.activeStatuses && u.activeStatuses.find(s => s.type === STATUS.STUN)) m = 0;
    if (!u.isHero && u.enemyId !== ENEMY_IDS.WATCHER && b && findWatcher(b)) m += 2;
    return m;
  }

  function heroHasMoveOptions(b, u) {
    if (!u || !u.isHero || b.heroMoved) return false;
    if (u.activeStatuses && u.activeStatuses.find(s => s.type === STATUS.BLIND)) return false;
    if (getMovePoints(u, b) <= 0) return false;
    const reach = floodReachable(b, u);
    return Object.keys(reach).some(k => {
      const [kx, ky] = k.split(',').map(Number);
      return kx !== u.x || ky !== u.y;
    });
  }

  function shouldShowAttackHighlights(b, sel) {
    if (!b || b.phase !== 'combat' || !sel || !sel.isHero || b.heroActionDone) return false;
    if (getActiveUnit() !== sel) return false;
    if (sel.activeStatuses && sel.activeStatuses.find(s => s.type === STATUS.BLIND)) return false;
    if (b.mode === 'skill' && !b.pendingSkill) return false;
    // Red targets appear both in move phase and attack/skill phase.
    return b.mode === 'move' || b.mode === 'attack' || b.mode === 'skill';
  }

  function prepareHeroTurnMode(b, u) {
    b.heroMoveUndo = null;
    if (heroHasMoveOptions(b, u)) {
      b.mode = 'move';
      b.heroMoved = false;
    } else {
      b.heroMoved = true;
      b.mode = 'attack';
    }
  }

  function snapshotHeroMoveForUndo(b, u) {
    if (!b || !u || !u.isHero || b.heroMoved || b.heroMoveUndo) return;
    b.heroMoveUndo = { x: u.x, y: u.y, heroId: u.heroId };
  }

  function heroCanUndoMove(b, u) {
    if (!b || b.phase !== 'combat' || !u || !u.isHero || b.heroActionDone) return false;
    if (!b.heroMoved || !b.heroMoveUndo) return false;
    if (b.heroMoveUndo.heroId !== u.heroId) return false;
    if (u.x === b.heroMoveUndo.x && u.y === b.heroMoveUndo.y) return false;
    return true;
  }

  function undoHeroMove() {
    const b = GameState.currentBattle;
    const u = getActiveUnit();
    if (!heroCanUndoMove(b, u)) return;
    const { x, y } = b.heroMoveUndo;
    const fromX = u.x, fromY = u.y;
    u.x = x;
    u.y = y;
    if (typeof BattleSfx !== 'undefined') BattleSfx.unitMoved(u, fromX, fromY, x, y, b.grid);
    b.heroMoveUndo = null;
    b.heroMoved = false;
    b.mode = 'move';
    b.pendingSkill = null;
    syncHeroFromUnit(u);
    pushBattleLog(`↩️ ${u.name}: movement undone`, 'status');
    updateBattleUI();
  }

  function floodReachable(b, u, opts) {
    opts = opts || {};
    const maxCost = getMovePoints(u, b);
    const dist = {};
    const key = (x, y) => x + ',' + y;
    const q = [{ x: u.x, y: u.y, c: 0 }];
    dist[key(u.x, u.y)] = 0;
    while (q.length) {
      const cur = q.shift();
      for (const d of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
        const nx = cur.x + d.x, ny = cur.y + d.y;
        if (!inBounds(nx, ny)) continue;
        if (!passableForUnit(b, nx, ny, u)) continue;
        const tile = b.grid[ny][nx];
        if (tile === TILE.MOUNTAIN) continue;
        const step = opts.ignoreHighCosts ? 1 : tileMoveCost(tile, u);
        const nc = cur.c + step;
        if (nc > maxCost) continue;
        const k = key(nx, ny);
        if (dist[k] === undefined || nc < dist[k]) {
          dist[k] = nc;
          q.push({ x: nx, y: ny, c: nc });
        }
      }
    }
      // Allies can be crossed, but a unit cannot stop on an allied cell.
    for (const k of Object.keys(dist)) {
      const [kx, ky] = k.split(',').map(Number);
      if (kx === u.x && ky === u.y) continue;
      if (!canEndOnTile(b, kx, ky, u)) delete dist[k];
    }
    return dist;
  }

  // Distance-to-target map for movement planning: BFS (cost=1) from target.
  // Used to avoid "stalling" behind obstacles where manhattan distance is misleading.
  function buildTargetDistanceMap(b, target, self) {
    const dist = {};
    if (!target) return dist;
    const key = (x, y) => x + ',' + y;
    const q = [];
    for (const c of unitCells(target)) {
      q.push(c);
      dist[key(c.x, c.y)] = 0;
    }
    while (q.length) {
      const cur = q.shift();
      const base = dist[key(cur.x, cur.y)];
      for (const d of [{ x: 1, y: 0 }, { x: -1, y: 0 }, { x: 0, y: 1 }, { x: 0, y: -1 }]) {
        const nx = cur.x + d.x, ny = cur.y + d.y;
        if (!inBounds(nx, ny)) continue;
        const tile = b.grid[ny][nx];
        if (tile === TILE.MOUNTAIN) continue;
        const targetOwnCell = pointInUnit(target, nx, ny);
        if (!targetOwnCell && !passableForUnit(b, nx, ny, self)) continue;
        const k = key(nx, ny);
        if (dist[k] === undefined) {
          dist[k] = base + 1;
          q.push({ x: nx, y: ny });
        }
      }
    }
    return dist;
  }

  /** Best one-turn cell, including forest/water costs from floodReachable. */
  function pickEnemyMoveCell(b, u, target, opts) {
    if (!target) return null;
    opts = opts || {};
    const ignoreHighCosts = !!opts.ignoreHighCosts || !!(u.aiVar && u.aiVar.forceChase);
    const reachable = floodReachable(b, u, { ignoreHighCosts });
    const dmap = buildTargetDistanceMap(b, target, u);
    let best = null;
    let bestDist = Infinity;
    let bestReachCost = Infinity;
    for (const key of Object.keys(reachable)) {
      const [rx, ry] = key.split(',').map(Number);
      if (rx === u.x && ry === u.y) continue;
      const reachCost = reachable[key];
      const candidate = { ...u, x: rx, y: ry };
      const d = (dmap[key] !== undefined) ? dmap[key] : unitDistance(candidate, target);
      if (d < bestDist || (d === bestDist && reachCost < bestReachCost)) {
        bestDist = d;
        bestReachCost = reachCost;
        best = { x: rx, y: ry };
      }
    }
    return best;
  }

  /** For range > 1: keep distance instead of rushing into melee. */
  function pickRangedEnemyMoveCell(b, u, heroes, inRangeFn, effectiveDmg, opts) {
    opts = opts || {};
    const ignoreHighCosts = !!opts.ignoreHighCosts || !!(u.aiVar && u.aiVar.forceChase);
    const reachable = floodReachable(b, u, { ignoreHighCosts });
    const focus = opts.focusHero || null;

    const pickTargetAt = (ax, ay) => {
      const inR = heroes.filter(h => inRangeFn(ax, ay, h));
      if (!inR.length) return null;
      if (focus && !inR.some(h => h === focus)) return null;
      const damageable = inR.filter(h => effectiveDmg(h) > 0);
      const pool = damageable.length ? damageable : inR;
      return pool.find(h => h.heroId === 'seris')
        || pool.find(h => h.heroId === 'alira')
        || pool.reduce((a, bb) => a.hp < bb.hp ? a : bb);
    };

    let bestAttack = null;
    let bestAttackScore = -Infinity;
    let bestChase = null;
    let bestChaseDist = Infinity;
    let bestChaseReach = Infinity;

    for (const key of Object.keys(reachable)) {
      const [rx, ry] = key.split(',').map(Number);
      const reachCost = reachable[key];
      if (rx === u.x && ry === u.y) continue;
      const tgt = pickTargetAt(rx, ry);
      if (tgt) {
        const dist = unitDistance({ ...u, x: rx, y: ry }, tgt);
        const score = dist * 1000 - reachCost;
        if (score > bestAttackScore) {
          bestAttackScore = score;
          bestAttack = { x: rx, y: ry };
        }
      } else if (!focus) {
        let minD = Infinity;
        for (const h of heroes) {
          const d = unitDistance({ ...u, x: rx, y: ry }, h);
          if (d < minD) minD = d;
        }
        if (minD < bestChaseDist || (minD === bestChaseDist && reachCost < bestChaseReach)) {
          bestChaseDist = minD;
          bestChaseReach = reachCost;
          bestChase = { x: rx, y: ry };
        }
      }
    }
    if (bestAttack) return bestAttack;
    return focus ? null : bestChase;
  }

  /** Watcher stays away from heroes; range 0 means ally buffs only. */
  function pickWatcherStayBackCell(b, u, heroes) {
    const reachable = floodReachable(b, u, {});
    let best = null;
    let bestMinDist = -1;
    let bestReach = Infinity;
    for (const key of Object.keys(reachable)) {
      const [rx, ry] = key.split(',').map(Number);
      const reachCost = reachable[key];
      if (rx === u.x && ry === u.y) continue;
      let minD = Infinity;
      for (const h of heroes) {
        const d = unitDistance({ ...u, x: rx, y: ry }, h);
        if (d < minD) minD = d;
      }
      if (minD > bestMinDist || (minD === bestMinDist && reachCost < bestReach)) {
        bestMinDist = minD;
        bestReach = reachCost;
        best = { x: rx, y: ry };
      }
    }
    return best;
  }

  function enemyMoveOpts(u) {
    const opts = {};
    if (u.enemyId === ENEMY_IDS.BOAR) opts.ignoreHighCosts = true;
    if (u.aiVar && u.aiVar.forceChase) opts.ignoreHighCosts = true;
    return opts;
  }

  function enemyStepToCell(b, u, cell) {
    if (!cell || (cell.x === u.x && cell.y === u.y)) return false;
    const fromX = u.x, fromY = u.y;
    u.x = cell.x;
    u.y = cell.y;
    startUnitMoveAnimation(u, fromX, fromY, u.x, u.y);
    if (typeof BattleSfx !== 'undefined') BattleSfx.unitMoved(u, fromX, fromY, u.x, u.y, b.grid);
    const trapIndex = (b.traps || []).findIndex(t => t.x === u.x && t.y === u.y);
    if (trapIndex >= 0) {
      const trap = b.traps.splice(trapIndex, 1)[0];
      const hpBeforeTrap = u.hp;
      u.hp -= trap.damage;
      startBattleAttackAnimation(u, u, { animationProfile: 'explosion', animationImpactOnly: true }, trap.damage, hpBeforeTrap);
      pushBattleLog(`${u.name}: trap −${trap.damage}`, 'status');
      spawnBattleTextFx(u.x, u.y, `TRAP -${trap.damage}`, '#ffb36b');
      if (trap.slow && u.hp > 0) addStatus(u, STATUS.SLOW, 2);
      if (u.hp <= 0) onUnitDeath(u);
    }
    return true;
  }

  function placeAliraTrapsAfterMove(b, u, fromX, fromY) {
    if (!b || u?.heroId !== 'alira' || !u.perks?.includes('trapDmg')) return;
    b.traps = b.traps || [];
    const add = (x, y) => {
      if (!inBounds(x, y) || b.traps.some(t => t.x === x && t.y === y)) return;
      b.traps.push({ x, y, damage: 4, slow: u.perks.includes('trapSlow') });
    };
    add(fromX, fromY);
    if (u.perks.includes('trapDouble')) add(Math.max(0, fromX - 1), fromY);
    spawnBattleTextFx(fromX, fromY, 'TRAP', '#ffb36b');
  }

  function addStatus(u, type, turns, meta) {
    meta = meta || {};
    const source = meta.source || null;
    if (u && u.isHero && source && !source.isHero && !meta.reflected) {
      const armorItem = getEquippedItem(u, 'armor');
      const reflectChance = armorItem && armorItem.mods && armorItem.mods.reflectStatus;
      if (reflectChance && Math.random() < reflectChance) {
        pushBattleLog(`${u.name}: reflected ${type}`, 'status');
        spawnBattleTextFx(u.x, u.y, 'STATUS REFLECT', '#d8b4ff');
        if (source.hp > 0) {
          addStatus(source, type, turns, { reflected: true, source: u });
          spawnBattleTextFx(source.x, source.y, 'REFLECTED', '#d8b4ff');
        }
        return;
      }
    }
    u.activeStatuses = u.activeStatuses || [];
    const ex = u.activeStatuses.find(s => s.type === type);
    if (ex) { ex.turns = Math.max(ex.turns, turns); }
    else {
      u.activeStatuses.push({ type, turns, meta });
      if (typeof BattleSfx !== 'undefined') BattleSfx.statusApplied(type);
      const statusProfiles = {
        stun: 'shield',
        freeze: 'ice',
        fear: 'shadow',
        web: 'root',
        poison: 'poison',
        burn: 'fire',
        slow: 'ice',
        blind: 'shadow',
        curse: 'shadow'
      };
      const statusProfile = statusProfiles[type];
      if (statusProfile && GameState.currentBattle) {
        const profile = BattleAnimations.profileById(statusProfile);
        const center = battleUnitCenter(u);
        queueBattleFx({
          type: 'impact',
          startedAt: performance.now(),
          duration: battleAnimationMs(340),
          impact: profile.impact,
          color: profile.color,
          x: center.x,
          y: center.y,
          strength: 1,
          damage: 0
        });
      }
    }
  }
  function tickStatusesStart(u) {
    if (!u.activeStatuses) return;
    u.activeStatuses.forEach(s => {
      if (s.type === STATUS.POISON) {
        const hpBeforePoison = u.hp;
        u.hp -= 3;
        startBattleAttackAnimation(u, u, { animationProfile: 'poison', animationImpactOnly: true }, 3, hpBeforePoison);
        pushBattleLog(`${u.name}: poison -3`, 'status');
        spawnBattleTextFx(u.x, u.y, 'POISON -3', '#7dffbf');
        if (typeof BattleSfx !== 'undefined') BattleSfx.playSampledUrl(BSX.status_tick_poison, 0.72);
      }
      if (s.type === STATUS.BURN) {
        const hpBeforeBurn = u.hp;
        u.hp -= 3;
        startBattleAttackAnimation(u, u, { animationProfile: 'fire', animationImpactOnly: true }, 3, hpBeforeBurn);
        pushBattleLog(`${u.name}: burn -3`, 'status');
        spawnBattleTextFx(u.x, u.y, 'BURN -3', '#ff8a4d');
        if (typeof BattleSfx !== 'undefined') BattleSfx.playSampledUrl(BSX.status_tick_burn, 0.72);
      }
    });
    u.activeStatuses = u.activeStatuses.filter(s => {
      if (s.type === STATUS.POISON || s.type === STATUS.BURN) { s.turns--; return s.turns > 0; }
      return true;
    });
    if (u.hp <= 0) onUnitDeath(u);
  }
  function tickStatusesEndTurn(u) {
    if (!u.activeStatuses) return;
    u.activeStatuses.forEach(s => {
      if ([STATUS.STUN, STATUS.FREEZE, STATUS.FEAR, STATUS.SLOW, STATUS.WEB, STATUS.BLIND, STATUS.CURSE, STATUS.BERSERK].includes(s.type)) s.turns--;
    });
    u.activeStatuses = u.activeStatuses.filter(s => s.turns > 0);
  }

  function syncHeroFromUnit(unit) {
    if (!unit.isHero) return;
    const h = GameState.heroes.find(x => x.id === unit.heroId);
    if (h) {
      h.hp = unit.hp; h.mana = unit.mana; h.cds = { ...unit.cds };
      h.activeStatuses = [];
      h.flags = { ...unit.flags };
    }
  }

  function dealDamage(attacker, target, rawDmg, opts) {
    const b = GameState.currentBattle;
    opts = opts || {};
    let dmg = rawDmg;
    let sfxCrit = false;
    // Item mod: weapon attack bonus applied to rawDmg (if not already factored by caller)
    if (attacker.isHero && !opts.noWeaponBonus) {
      const wep = getEquippedItem(attacker, 'weapon');
      if (wep && wep.mods.attack) dmg += wep.mods.attack;
      // firstShotBonus (moon_bow) — only if first attack this round
      if (wep && wep.mods.firstShotBonus && attacker.flags && attacker.flags.firstAttackTurn) {
        dmg = Math.floor(dmg * (1 + wep.mods.firstShotBonus));
        pushBattleLog(`${attacker.name}: First shot x${(1 + wep.mods.firstShotBonus).toFixed(1)}`, 'status');
        spawnBattleTextFx(attacker.x, attacker.y, 'FIRST x' + (1 + wep.mods.firstShotBonus).toFixed(1), '#9ff0ff');
      }
    }
    if (target.isHero && target.heroId === 'garet' && target.flags && target.flags.fireCallMitigateActive) {
      dmg = Math.floor(dmg * 0.5);
      pushBattleLog(`${target.name}: fire guard halves damage`, 'status');
      spawnBattleTextFx(target.x, target.y, 'GUARD -50%', '#ffb36b');
    }
    if (target.isHero && b) {
      const guardian = b.units.find(unit => unit.isHero && unit.heroId === 'garet' && unit.hp > 0 &&
        unit !== target && unit.perks?.includes('guardianCover') && unitDistance(unit, target) <= 1);
      if (guardian) {
        dmg = Math.max(0, dmg - 2);
        spawnBattleTextFx(target.x, target.y, 'COVER -2', '#8bd3ff');
      }
    }
    if (attacker.isHero && attacker.heroId === 'alira' && attacker.flags && attacker.flags.firstAttackTurn) dmg = Math.floor(dmg * 1.5);
    if (attacker.isHero && attacker.perks?.includes('finisher') && target.hp <= target.maxHp * .4) dmg = Math.floor(dmg * 1.3);
    if (attacker.isHero && attacker.heroId === 'alira' && attacker.perks?.includes('moveAttack') && b?.heroMoved) dmg = Math.floor(dmg * 1.2);
    if (attacker.isHero && attacker.heroId === 'seris' && attacker.perks?.includes('spellCharge') && opts.magic) dmg += 3;
    if (attacker.activeStatuses && attacker.activeStatuses.find(s => s.type === STATUS.BERSERK)) dmg = Math.floor(dmg * 2);
    let armor = target.armor + (b && b.grid ? tileDefenseBonus(b.grid[target.y][target.x]) : 0);
    // Perk: auraArmor (Garet): adjacent allies gain +1 armor.
    if (target.isHero && b) {
      const garetAura = b.units.find(u => u.isHero && u.heroId === 'garet' && u.hp > 0 &&
        u.heroId !== target.heroId && u.perks && u.perks.includes('auraArmor'));
      if (garetAura && unitDistance(garetAura, target) <= 1) {
        armor += 1;
        pushBattleLog(`${target.name}: Garet aura +1 armor`, 'status');
        spawnBattleTextFx(target.x, target.y, 'AURA +1 ARM', '#9ff0ff');
      }
    }
    // Item armor bonus from equipped armor slot
    if (target.isHero) {
      const eqArm = getEquippedItem(target, 'armor');
      if (eqArm && eqArm.mods.armor) armor += eqArm.mods.armor;
      const eqWep = getEquippedItem(target, 'weapon');
      if (eqWep && eqWep.mods.armor) armor += eqWep.mods.armor;
    }
    if (attacker.isHero && attacker.heroId === 'garet' && attacker.perks && attacker.perks.includes('armorPierce')) {
      const beforeArmor = armor;
      armor = Math.max(0, armor - 2);
      if (beforeArmor > armor) {
        pushBattleLog(`${attacker.name}: armor pierce -${beforeArmor - armor}`, 'status');
        spawnBattleTextFx(target.x, target.y, 'PIERCE -' + (beforeArmor - armor), '#f5d76e');
      }
    }
    if (attacker.enemyId === ENEMY_IDS.ORC_GUARD && !opts.ignoreOrc) armor = Math.max(0, armor - 2);
    dmg = Math.max(0, dmg - armor);
    if (target.isHero && target.heroId === 'seris' && target.flags && target.flags.mysticShield > 0) {
      const absorb = Math.min(3, target.flags.mysticShield, dmg);
      target.flags.mysticShield -= absorb;
      dmg -= absorb;
      if (absorb > 0) {
        pushBattleLog(`${target.name}: mystic shield absorbed ${absorb}`, 'status');
        spawnBattleTextFx(target.x, target.y, 'SHIELD -' + absorb, '#b7a7ff');
      }
    }
    if (target.enemyId === ENEMY_IDS.GHOST && (!opts.magic)) {
      if (attacker.isHero && (attacker.heroId === 'garet' || attacker.heroId === 'alira')) dmg = 0;
    }
    if (target.enemyId === ENEMY_IDS.DARK_LORD && b?.units.find(u => u.enemyId === ENEMY_IDS.DARK_LORD && u.hp > 0 && u.phase === 3)) {
      if (attacker.isHero && attacker.heroId !== 'seris' && !opts.magic && !opts.artifact) dmg = 0;
    }
    if (target.enemyId === ENEMY_IDS.ICE_ELEM && opts.fire) dmg = Math.floor(dmg * 1.5);
    if (target.enemyId === ENEMY_IDS.SHIELDBEARER) dmg = Math.floor(dmg * 0.75);
    if (Math.random() < 0.25 && target.isHero && target.heroId === 'garet' && !opts.blockIgnore && !opts.magic) {
      pushBattleLog(`[${target.emoji} ${target.name}] Shield block!`, 'status');
      spawnBattleTextFx(target.x, target.y, 'BLOCK', '#8bd3ff');
      startBattleAttackAnimation(attacker, target, opts, 0, target.hp);
      return 0;
    }

    // Perk: crit15 (Garet): 15% chance for x1.5 damage.
    if (attacker.isHero && attacker.perks && attacker.perks.includes('crit15') && Math.random() < 0.15) {
      dmg = Math.floor(dmg * 1.5);
      sfxCrit = true;
      pushBattleLog(`💥 ${attacker.name}: Critical hit!`, 'status');
      spawnBattleTextFx(target.x, target.y, 'CRIT', '#ffd06b');
    }

    // Perk: auraDmg (Garet): adjacent allies gain +10% damage.
    if (attacker.isHero && b) {
      const garetUnit = b.units.find(u => u.isHero && u.heroId === 'garet' && u.hp > 0 &&
        u.heroId !== attacker.heroId && u.perks && u.perks.includes('auraDmg'));
      if (garetUnit && unitDistance(attacker, garetUnit) <= 2) {
        dmg = Math.floor(dmg * 1.1);
        pushBattleLog(`${attacker.name}: Garet aura +10% damage`, 'status');
        spawnBattleTextFx(attacker.x, attacker.y, 'AURA +10%', '#8cffb0');
      }
    }

    if (isHeroFlankAttack(attacker, target, b, opts)) {
      const support = heroFlankSupport(attacker, target, b);
      dmg = Math.floor(dmg * 1.25);
      pushBattleLog(`${attacker.name}: flank with ${support ? support.name : 'ally'} +25% damage`, 'status');
      spawnBattleTextFx(target.x, target.y, 'FLANK +25%', '#ffcf7a');
    }

    // Item mod: dodge (armor): target has 20% dodge chance.
    if (!opts.magic && !opts.blockIgnore) {
      const tArmorItem = target.isHero ? getEquippedItem(target, 'armor') : null;
      if (tArmorItem && tArmorItem.mods.dodge && Math.random() < tArmorItem.mods.dodge) {
        pushBattleLog(`💨 ${target.name} dodged!`, 'status');
        spawnBattleTextFx(target.x, target.y, 'DODGE', '#8bd3ff');
        startBattleAttackAnimation(attacker, target, opts, 0, target.hp);
        return 0;
      }
    }

    const hpBefore = target.hp;
    target.hp -= dmg;
    const attackVisual = startBattleAttackAnimation(attacker, target, opts, dmg, hpBefore);
    if (target.isHero && dmg > 0) {
      GameState.stats.damageTaken = (GameState.stats.damageTaken || 0) + dmg;
    }
    if (dmg > 0) {
      const showDamageNumber = () => spawnDamageFx(target.x, target.y, dmg);
      if (attackVisual.impactDelay > 24) setTimeout(showDamageNumber, attackVisual.impactDelay);
      else showDamageNumber();
      if (b) {
        if (sfxCrit) opts.sfxCrit = true;
        BattleSfx.damageEvent(attacker, target, opts, dmg);
        if (opts) delete opts.sfxCrit;
      }
    }

    // Perk: reflect1 (Garet): target reflects 1 damage to attacker.
    if (target.isHero && target.perks && target.perks.includes('reflect1') && dmg > 0 && !opts.magic) {
      attacker.hp = Math.max(0, attacker.hp - 1);
      pushBattleLog(`🔄 ${target.name}: Reflected 1 damage!`, 'status');
      spawnBattleTextFx(attacker.x, attacker.y, 'REFLECT -1', '#cfd4ff');
    }

    // Item mod: reflectFlat (armor): fixed reflection.
    if (!opts.magic) {
      const tArmItem = target.isHero ? getEquippedItem(target, 'armor') : null;
      if (tArmItem && tArmItem.mods.reflectFlat && dmg > 0) {
        attacker.hp = Math.max(0, attacker.hp - tArmItem.mods.reflectFlat);
        pushBattleLog(`${target.name}: thorns reflected ${tArmItem.mods.reflectFlat}`, 'status');
        spawnBattleTextFx(attacker.x, attacker.y, 'THORNS -' + tArmItem.mods.reflectFlat, '#cfd4ff');
      }
      // Item mod: reflectDmg (armor): reflect 10% physical damage.
      if (tArmItem && tArmItem.mods.reflectDmg && dmg > 0) {
        const reflected = Math.max(1, Math.floor(dmg * tArmItem.mods.reflectDmg));
        attacker.hp = Math.max(0, attacker.hp - reflected);
        pushBattleLog(`${target.name}: mirror reflected ${reflected}`, 'status');
        spawnBattleTextFx(attacker.x, attacker.y, 'MIRROR -' + reflected, '#d8b4ff');
      }
    }

    // Item mod: stunOnHit (weapon): stun on hit.
    if (attacker.isHero && target.hp > 0) {
      const wepItem = getEquippedItem(attacker, 'weapon');
      if (wepItem && wepItem.mods.stunOnHit) {
        addStatus(target, STATUS.STUN, 1);
        pushBattleLog(`${attacker.name}: stun on hit`, 'status');
        spawnBattleTextFx(target.x, target.y, 'STUN', '#ffd06b');
      }
      if (wepItem && wepItem.mods.poisonOnHit) {
        addStatus(target, STATUS.POISON, 2);
        pushBattleLog(`${attacker.name}: poison on hit`, 'status');
        spawnBattleTextFx(target.x, target.y, 'POISON', '#7dffbf');
      }
    }

    // ── Item mod: burnSpell perk + burnSpell weapon ──
    if (attacker.isHero && opts.magic && target.hp > 0) {
      if (attacker.perks && attacker.perks.includes('burnSpell')) {
        addStatus(target, STATUS.BURN, 2);
        pushBattleLog(`${attacker.name}: burn spell`, 'status');
        spawnBattleTextFx(target.x, target.y, 'BURN', '#ff9b42');
      }
    }

    if (attacker.isHero && attacker.heroId === 'alira' && attacker.flags) attacker.flags.firstAttackTurn = false;
    if (attacker.hp <= 0) onUnitDeath(attacker);
    if (target.hp <= 0) onUnitDeath(target);
    if (b) resolveBattleIfOver();
    return dmg;
  }

  function onUnitDeath(u) {
    if (u._deathHandled) return;
    u._deathHandled = true;
    const b = GameState.currentBattle;
    pushBattleLog(`☠️ ${u.emoji} ${u.name} defeated!`, 'enemy');
    if (!u.isHero) {
      GameState.stats.kills += 1;
      GameState._lastBattleKills = (GameState._lastBattleKills || 0) + 1;
      markEnemyDead(u.enemyId);

      // Perk: killHeal (Seris): +5 HP on kill.
      if (b) {
        const serisUnit = b.units.find(uu => uu.isHero && uu.heroId === 'seris' && uu.hp > 0 && uu.perks && uu.perks.includes('killHeal'));
        if (serisUnit) {
          serisUnit.hp = Math.min(serisUnit.maxHp, serisUnit.hp + 5);
          pushBattleLog(`💚 Seris: +5 HP for a kill`, 'status');
          spawnBattleTextFx(serisUnit.x, serisUnit.y, 'HEAL +5', '#7dffbf');
        }
      }
    }

    // Item: revive5 (phoenix armor): revive with 5 HP once per battle.
    if (u.isHero) {
      const armorItem = getEquippedItem(u, 'armor');
      if (armorItem && armorItem.mods.revive5 && !u._reviveUsed) {
        u._reviveUsed = true;
        u.hp = 5;
        u._deathHandled = false;
        pushBattleLog(`🔥 ${u.name}: Phoenix Robe! revived with 5 HP!`, 'status');
        spawnBattleTextFx(u.x, u.y, 'REVIVE 5', '#ffd06b');
        playBattleAbilityFx(u, 'berserk', { glyph: '🔥' });
        return; // Survives due to revive.
      }
      if (b) b.objectiveHeroLost = true;
    }

    const enemyMeta = !u.isHero ? enemyDef(u.enemyId) : null;
    const deathProfile = BattleAnimations.resolveDeath(u, {
      boss: !!enemyMeta?.boss,
      large: unitWidth(u) > 1 || unitHeight(u) > 1,
      color: enemyMeta?.boss ? '#ffd06b' : '#d8d8e8'
    });
    const deathStart = Math.max(performance.now(), u._lastVisualImpactAt || 0);
    u.deathAnimation = {
      ...deathProfile,
      startedAt: deathStart,
      duration: battleAnimationMs(deathProfile.duration),
      direction: u.isHero ? -1 : 1
    };
    const deathCenter = battleUnitCenter(u);
    queueBattleFx({
      type: 'death',
      startedAt: deathStart,
      duration: u.deathAnimation.duration,
      kind: deathProfile.kind,
      color: deathProfile.color,
      x: deathCenter.x,
      y: deathCenter.y
    });

    // Item: deathExplode (death_ring): 3x3 explosion when a hero dies.
    if (u.isHero && b) {
      const artItem = getEquippedItem(u, 'artifact');
      if (artItem && artItem.mods.deathExplode) {
        const dmgVal = artItem.mods.deathExplode;
        for (const t of b.units) {
          if (t.isHero || t.hp <= 0) continue;
          if (unitDistance(u, t) <= 1)
            dealDamage(u, t, dmgVal, { blockIgnore: true, magic: true, noWeaponBonus: true });
        }
        pushBattleLog(`💀 ${u.name}: Death Ring — 3×3 explosion!`, 'status');
        spawnBattleTextFx(u.x, u.y, 'DEATH RING', '#ff8f8f');
        playBattleAbilityFx(u, 'meteor', { radius: 1, glyph: '💀', noPose: true });
      }
    }

    if (!u.isHero && u.enemyId === ENEMY_IDS.ZOMBIE && typeof BattleSfx !== 'undefined') {
      BattleSfx.playSampledUrl(BSX.enemies_zombie_explosion, 0.95);
      playBattleAbilityFx(u, 'zombieExplosion', { radius: 1, glyph: '💥', noPose: true });
    }
    if (typeof BattleSfx !== 'undefined') {
      setTimeout(() => BattleSfx.death(), Math.max(0, deathStart - performance.now()));
    }

    if (!u.isHero && u.enemyId === ENEMY_IDS.ZOMBIE) {
      for (const t of (b ? b.units : [])) {
        if (!t.isHero || t.hp <= 0) continue;
        if (unitDistance(u, t) <= 1) dealDamage(u, t, 5, { blockIgnore: true, magic: true, noWeaponBonus: true });
      }
    }
    if (!u.isHero && u.enemyId === ENEMY_IDS.WATCHER && b) b.globalBuffs.watcherDeadMove = 2;
    resolveBattleIfOver();
  }

  function getXpForBattle(cell) {
    if (cell && cell.id === 'c_0_0' && !GameState.firstBattleCompleted) return 50;
    const region = (cell && cell.region) || GameState.region || 1;
    const base = 30 + (region - 1) * 10;
    const typeBonus = {
      mission:  0,
      dungeon:  20,
      miniboss: 30,
      boss:     70,
      final:    120
    }[cell && (cell.bossType || cell.type)] || 0;
    return base + typeBonus;
  }

  function endBattleVictory() {
    const b = GameState.currentBattle;
    if (!b || b._victoryHandled) return;
    b._victoryHandled = true;
    const cell = getCellById(b.nodeId);
    let gold = cell?.type === 'dungeon' ? randInt(45, 80) : randInt(20, 35);
    if (cell?.type === 'boss') gold = randInt(120, 160);
    if (cell?.type === 'final') gold = 300;
    if (isHardcoreMode()) gold = Math.max(1, Math.round(gold * 0.85));
    if (GameState.contract === 'guardians' && b.routeCommitment) gold = Math.max(1, Math.round(gold * 0.8));
    const objectiveComplete = b.objective === 'skillful' ? b.objectiveUsedSkill : !b.objectiveHeroLost;
    const objectiveBonus = objectiveComplete ? 10 : 0;
    // Gold bonus from amulet_luck artifact
    const goldMult = GameState.heroes.reduce((m, h) => {
      const item = getEquippedItem(h, 'artifact');
      return item && item.mods.goldBonus ? m + item.mods.goldBonus : m;
    }, 1);
    const scenarioBonus = b.scenario?.id !== 'eliminate' ? (b.scenario.rewardGold || 15) : 0;
    if (CampaignExpansion.isMutatorActive('scarce_supplies') && scenarioBonus) gold += 8;
    gold = Math.round(gold * goldMult) + objectiveBonus + scenarioBonus;
    GameState._lastBattleObjective = {
      key: b.objective,
      complete: objectiveComplete,
      bonus: objectiveBonus + scenarioBonus,
      scenario: b.scenario?.id || 'eliminate'
    };
    GameState.gold += gold;
    GameState.stats.battles += 1;
    GameState.stats.goldEarned += gold;
    if (objectiveComplete) GameState.stats.objectivesCompleted = (GameState.stats.objectivesCompleted || 0) + 1;
    if (b.objectiveUsedSkill) GameState.stats.skillfulBattles = (GameState.stats.skillfulBattles || 0) + 1;
    const xpEach = getXpForBattle(cell);

    // Snapshot enemy IDs and battle label BEFORE clearing battle
    const btTypeNames = { mission:'Mission', city:'Town', dungeon:'Dungeon', event:'Event', boss:'Boss', wanderer:'Wanderer', arena:'Arena', final:'Final' };
    GameState._lastBattleLabel = cell ? `Region ${cell.region} · ${btTypeNames[cell.type] || 'Mission'}` : 'Mission complete';
    GameState._lastBattleMeta = cell ? { region: cell.region, type: cell.type } : null;
    GameState._lastBattleEnemyIds = b ? [...new Set(b.units.filter(u => !u.isHero).map(u => u.enemyId))] : [];

    // Snapshot levels before XP for level-up detection
    const levelsBefore = {};
    GameState.heroes.forEach(h => { levelsBefore[h.id] = h.level; });

    GameState.heroes.forEach(h => {
      if (h.hp > 0) {
        h.xp = (h.xp || 0) + xpEach;
        while (h.xp >= h.level * 50 && h.level < 8) {
          h.xp -= h.level * 50;
          h.level++;
          GameState.pendingPerks.push(h.id);
          const heroSkills = HERO_SKILLS[h.id] || [];
          const unlocked = heroSkills.find(s => s.unlockLevel === h.level);
          if (unlocked) {
            if (!GameState.pendingSkillUnlocks) GameState.pendingSkillUnlocks = [];
            GameState.pendingSkillUnlocks.push({ heroId: h.id, skill: unlocked });
          }
        }
      }
    });

    // Detect level-ups after XP
    GameState._lastBattleLevelUps = {};
    GameState.heroes.forEach(h => { if (h.level > levelsBefore[h.id]) GameState._lastBattleLevelUps[h.id] = h.level; });
    GameState._lastBattleProgress = {};
    GameState.heroes.forEach(h => {
      if (h.level <= levelsBefore[h.id]) return;
      const unlockedSkills = (HERO_SKILLS[h.id] || []).filter(s => s.unlockLevel > levelsBefore[h.id] && s.unlockLevel <= h.level);
      GameState._lastBattleProgress[h.id] = {
        fromLevel: levelsBefore[h.id],
        toLevel: h.level,
        perkPoints: h.level - levelsBefore[h.id],
        unlockedSkills: unlockedSkills.map(s => s.name)
      };
    });
    GameState.heroes.forEach(h => { h.activeStatuses = []; });

    if (cell) {
      cell.completed = true;
      if (cell.type === 'boss') {
        GameState.defeatedBosses += 1;
        GameState.regionUnlocked = Math.max(GameState.regionUnlocked, Math.min(3, cell.region + 1));
      }
      if (cell.type === 'boss') {
        GameState.campaignEffects.wardUntilBoss = false;
        GameState.campaignEffects.pactUntilBoss = false;
      }
      applyBattleRewards(cell);
      if (cell.id === 'c_0_0') {
        GameState.firstBattleCompleted = true;
        GameState.ftueSkillsUsed = { ...(b.ftueSkillsUsed || GameState.ftueSkillsUsed || {}) };
      }
    }
    // Store rounds for victory screen
    GameState._lastBattleRounds = b ? b.round : 1;
    saveGame();
    GameState.currentBattle = null;
    GameState.screen = 'victory';
    try {
      showVictoryUI(gold, xpEach);
    } catch (e) {
      console.error('showVictoryUI failed', e);
      showScreen('victory');
    }
    updateRecordsFromState();
    setTimeout(() => showInterstitialAdAtBreak('victory'), 700);
  }

  function isLastBattleDropEquipped() {
    const dropId = GameState._lastBattleDrop?.id;
    if (!dropId) return false;
    return (GameState.heroes || []).some(hero =>
      Object.values(hero.equipment || {}).includes(dropId)
    );
  }

  function markLastBattleDropHandled(itemId) {
    const dropId = GameState._lastBattleDrop?.id;
    if (!dropId || itemId !== dropId) return;
    GameState._lastBattleDropHandled = true;
  }

  function updateVictoryActionButtons() {
    const drop = GameState._lastBattleDrop || null;
    if (drop && typeof GameState._lastBattleDropHandled !== 'boolean') {
      GameState._lastBattleDropHandled = isLastBattleDropEquipped() ||
        !(GameState.inventory || []).includes(drop.id);
    }
    if (drop && GameState._lastBattleDropHandled &&
        (GameState.inventory || []).includes(drop.id) &&
        !isLastBattleDropEquipped()) {
      GameState._lastBattleDropHandled = false;
    }
    const lootNeedsAttention = !!drop &&
      !GameState._lastBattleDropHandled &&
      (GameState.inventory || []).includes(drop.id);
    const hasBag = !!(GameState.inventory && GameState.inventory.length);
    const inventoryButton = document.getElementById('btn-vic-inventory');
    const continueButton = document.getElementById('btn-vic-continue');
    if (inventoryButton) {
      inventoryButton.classList.toggle('vic-btn-inventory-loot', lootNeedsAttention);
      inventoryButton.title = lootNeedsAttention
        ? `${translateKey('openBagEquip')}: ${translateText(drop.name)}`
        : (hasBag ? translateKey('openBag') : translateKey('openBagEmpty'));
      inventoryButton.textContent = lootNeedsAttention ? translateKey('equipLoot') : translateKey('bag');
    }
    if (continueButton) {
      continueButton.classList.toggle('vic-btn-continue-ready', !lootNeedsAttention);
    }
    return { lootNeedsAttention, dropHandled: !!GameState._lastBattleDropHandled };
  }

  // 9: Victory screen with stats
  function showVictoryUI(gold, xp) {
    showScreen('victory');
    if (typeof BattleSfx !== 'undefined') {
      BattleSfx.playSampledUrl(BSX.common_victory, 0.72);
      BattleSfx.playSampledUrl(BSX.ui_victory_screen, 0.78, 0.06);
    }
    const kills = GameState._lastBattleKills || 0;
    const rounds = GameState._lastBattleRounds || 1;
    const label = localizedBattleLabel(GameState._lastBattleMeta) || GameState._lastBattleLabel || translateKey('missionComplete');
    GameState._lastBattleAdGold = gold;
    GameState._lastBattleAdClaimed = false;
    const drop = GameState._lastBattleDrop || null;
    const enemyIds = GameState._lastBattleEnemyIds || [];
    const levelUps = GameState._lastBattleLevelUps || {};
    const progress = GameState._lastBattleProgress || {};
    const objective = GameState._lastBattleObjective || null;
    GameState._lastBattleKills = 0; GameState._lastBattleRounds = 0;

    // ── Particles ──
    const particlesCont = document.getElementById('victory-particles');
    if (particlesCont) {
      const emojis = ['⚔','💰','⭐','⚔','💰','⭐','✨','🏆'];
      particlesCont.innerHTML = Array.from({length: 18}, (_,i) => {
        const op = (0.15 + Math.random() * 0.25).toFixed(2);
        const dur = (3 + Math.random() * 4).toFixed(1);
        const left = (Math.random() * 96).toFixed(1);
        const delay = (Math.random() * 5).toFixed(1);
        const em = emojis[i % emojis.length];
        return `<div class="victory-particle" style="left:${left}%;--op:${op};animation-duration:${dur}s;animation-delay:-${delay}s">${em}</div>`;
      }).join('');
    }

    // ── Topbar (landscape) ──
    const topbar = document.getElementById('victory-topbar');
    if (topbar) topbar.innerHTML = `🏆 ${translateKey('victory')} &nbsp;·&nbsp; <span style="color:var(--text-dim)">${label}</span>`;

    // ── Title area (portrait) ──
    const titleArea = document.getElementById('victory-title-area');
    if (titleArea) titleArea.innerHTML = `
      <div class="victory-trophy">🏆</div>
      <div class="victory-title-text">${translateKey('victory')}</div>
      <div class="victory-subtitle-text">${label.toUpperCase()} · ${translateKey('missionComplete')}</div>`;

    // ── Stats cards ──
    const statsEl = document.getElementById('victory-stats');
    if (statsEl) statsEl.innerHTML = `
      <div class="vic-stat-card" style="border-color:#f0a500">
        <div class="vic-stat-card-icon">💰</div>
        <span class="vic-stat-card-val">+${gold}</span>
        <span class="vic-stat-card-lbl">${translateKey('victoryGold')}</span>
      </div>
      <div class="vic-stat-card" style="border-color:#e74c3c">
        <div class="vic-stat-card-icon">⚔</div>
        <span class="vic-stat-card-val">${kills}</span>
        <span class="vic-stat-card-lbl">${translateKey('victoryKills')}</span>
      </div>
      <div class="vic-stat-card" style="border-color:#4a9eff">
        <div class="vic-stat-card-icon">🔄</div>
        <span class="vic-stat-card-val">${rounds}</span>
        <span class="vic-stat-card-lbl">${translateKey('victoryRounds')}</span>
      </div>`;

    const powerEl = document.getElementById('victory-power');
    if (powerEl) {
      const chips = [];
      GameState.heroes.forEach(h => {
        const prog = progress[h.id];
        if (!prog) return;
        chips.push(`<span class="victory-power-chip">${h.emoji} ${h.name}: <strong>LV ${prog.fromLevel} -> ${prog.toLevel}</strong></span>`);
        if (prog.perkPoints > 0) chips.push(`<span class="victory-power-chip">+${prog.perkPoints} ${translateKey('perkPoint')}</span>`);
        (prog.unlockedSkills || []).forEach(skillName => {
          chips.push(`<span class="victory-power-chip">✦ ${translateKey('newSkill')}: <strong>${translateText(skillName)}</strong></span>`);
        });
      });
      if (drop) chips.push(`<span class="victory-power-chip">${drop.emoji || ''} ${translateKey('victoryLoot')}: <strong>${translateText(drop.name)}</strong></span>`);
      if (objective?.complete) chips.push(`<span class="victory-power-chip">★ ${translateKey('objectiveComplete')}: <strong>+${objective.bonus} ${translateKey('gold')}</strong></span>`);
      if (chips.length) {
        powerEl.classList.add('show');
        powerEl.innerHTML = `<div class="victory-power-title">${translateKey('powerSurge')} · ${translateKey('powerReady')}</div><div class="victory-power-list">${chips.join('')}</div>`;
      } else {
        powerEl.classList.remove('show');
        powerEl.innerHTML = '';
      }
    }

    // ── Hero cards builder ──
    function buildHeroCards() {
      return GameState.heroes.map(h => {
        const hpPct = Math.round((h.hp / h.maxHp) * 100);
        const isLow = hpPct < 40;
        const lvlUp = levelUps[h.id];
        const prog = progress[h.id];
        const xpGained = h.hp > 0 ? `+${xp} XP` : '—';
        const tex = HERO_TEXTURE_PATHS[h.id];
        const iconHtml = tex
          ? `<img src="${tex}" style="width:32px;height:32px;object-fit:contain;border-radius:4px">`
          : `<div class="vic-hero-icon">${h.emoji}</div>`;
        const progressHtml = prog ? `<div class="vic-hero-progress">
          <span>LV ${prog.fromLevel} → ${prog.toLevel}</span>
          <span>+${prog.perkPoints} ${translateText('Perk')}</span>
          ${prog.unlockedSkills.length ? `<span>✦ ${translateText(prog.unlockedSkills[0])}</span>` : ''}
        </div>` : '';
        return `<div class="vic-hero-card${lvlUp ? ' levelup' : ''}">
          ${iconHtml}
          <div class="vic-hero-name">${h.name}</div>
          <div class="vic-hero-xp">${xpGained}</div>
          <div class="vic-hero-hp-bar"><div class="vic-hero-hp-fill${isLow ? ' low' : ''}" style="width:${hpPct}%"></div></div>
          <div class="vic-hero-hp-text">${h.hp}/${h.maxHp}</div>
          ${lvlUp ? `<div class="vic-levelup-badge">${translateKey('levelBadge')} ${lvlUp}!</div>` : ''}
          ${progressHtml}
        </div>`;
      }).join('');
    }
    const heroHtml = buildHeroCards();
    const heroPortrait = document.getElementById('victory-heroes-portrait');
    if (heroPortrait) heroPortrait.innerHTML = heroHtml;
    const heroLandscape = document.getElementById('victory-heroes');
    if (heroLandscape) heroLandscape.innerHTML = heroHtml;

    // ── Loot ──
    const lootEl = document.getElementById('victory-loot');
    if (lootEl && drop) {
      const rarLabel = { common: translateKey('rarityCommon'), rare: translateKey('rarityRare'), epic: translateKey('rarityEpic') };
      const statLine = formatItemMods(drop).join(' · ');
      lootEl.innerHTML = `
        <div class="vic-loot-title">${translateKey('victoryLoot')}</div>
        <div class="vic-loot-item rarity-${drop.rarity}" style="border-color:${drop.rarity==='epic'?'#9b59b6':drop.rarity==='rare'?'#4a9eff':'#2a2a4a'}">
          <div class="vic-loot-icon">${itemIconMarkup(drop, 22)}</div>
          <div class="vic-loot-info">
            <div class="vic-loot-name">${drop.name}</div>
            ${statLine ? `<div class="vic-loot-stat">${statLine}</div>` : ''}
          </div>
          <span class="vic-loot-badge ${drop.rarity||'common'}">${rarLabel[drop.rarity]||''}</span>
        </div>`;
    } else if (lootEl) lootEl.innerHTML = '';

    // ── Bestiary row ──
    const bestiaryEl = document.getElementById('victory-bestiary');
    if (bestiaryEl && enemyIds.length) {
      const icons = enemyIds.map(id => {
        const def = enemyDef(id);
        return def ? `<span class="vic-bestiary-enemy" title="${def.name}">${bestiaryEnemyPortraitHtml(id, 22)}</span>` : '';
      }).filter(Boolean).join('');
      bestiaryEl.innerHTML = `<span class="vic-bestiary-label">${translateKey('victoryStudied')}</span>${icons}`;
      bestiaryEl.style.display = '';
    } else if (bestiaryEl) bestiaryEl.style.display = 'none';

    updateVictoryActionButtons();

    localizeUI(document.getElementById('victory-screen'));

    if (GameState.pendingPerks.length) {
      setTimeout(() => openPerkModal(GameState.pendingPerks.shift()), 400);
    } else if (GameState.pendingSkillUnlocks && GameState.pendingSkillUnlocks.length) {
      setTimeout(processSkillUnlockQueue, 400);
    }
  }

  //══════════ RENDER ══════════
  const canvas = document.getElementById('battle-canvas');
  const ctx = canvas.getContext('2d');
  const BattleView = {
    zoom: 1,
    minZoom: 0.75,
    maxZoom: 2.5,
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    dragMode: 'none',
    lastX: 0,
    lastY: 0,
    moved: false,
    hoverCell: null,
    suppressClickUntil: 0,
    pinchStartDist: 0,
    pinchStartZoom: 1
  };
  function clampBattleView() {
    const scaledW = CANVAS_W * BattleView.zoom;
    const scaledH = CANVAS_H * BattleView.zoom;
    if (scaledW <= CANVAS_W) {
      BattleView.offsetX = (CANVAS_W - scaledW) / 2;
    } else {
      BattleView.offsetX = Math.min(0, Math.max(CANVAS_W - scaledW, BattleView.offsetX));
    }
    if (scaledH <= CANVAS_H) {
      BattleView.offsetY = (CANVAS_H - scaledH) / 2;
    } else {
      BattleView.offsetY = Math.min(0, Math.max(CANVAS_H - scaledH, BattleView.offsetY));
    }
  }
  function resetBattleView() {
    // Auto-fit: start zoom so entire 12x8 grid fills the canvas nicely
    BattleView.zoom = 1;
    BattleView.offsetX = 0;
    BattleView.offsetY = 0;
    BattleView.dragging = false;
    BattleView.moved = false;
    clampBattleView();
  }
  function canvasContentRect() {
    const r = canvas.getBoundingClientRect();
    const sourceAspect = CANVAS_W / CANVAS_H;
    const boxAspect = r.width / Math.max(1, r.height);
    let width = r.width;
    let height = r.height;
    let left = r.left;
    let top = r.top;
    if (boxAspect > sourceAspect) {
      width = r.height * sourceAspect;
      left += (r.width - width) / 2;
    } else if (boxAspect < sourceAspect) {
      height = r.width / sourceAspect;
      top += (r.height - height) / 2;
    }
    return { left, top, width, height };
  }
  function eventToCanvasPx(clientX, clientY) {
    const r = canvasContentRect();
    return {
      x: (clientX - r.left) * (CANVAS_W / r.width),
      y: (clientY - r.top) * (CANVAS_H / r.height)
    };
  }
  function eventToGrid(clientX, clientY) {
    const p = eventToCanvasPx(clientX, clientY);
    const wx = (p.x - BattleView.offsetX) / BattleView.zoom;
    const wy = (p.y - BattleView.offsetY) / BattleView.zoom;
    return { gx: Math.floor(wx / CELL), gy: Math.floor(wy / CELL) };
  }
  function zoomAt(clientX, clientY, nextZoom) {
    const nz = Math.max(BattleView.minZoom, Math.min(BattleView.maxZoom, nextZoom));
    const oz = BattleView.zoom;
    if (Math.abs(nz - oz) < 1e-4) return;
    const p = eventToCanvasPx(clientX, clientY);
    const worldX = (p.x - BattleView.offsetX) / oz;
    const worldY = (p.y - BattleView.offsetY) / oz;
    BattleView.zoom = nz;
    BattleView.offsetX = p.x - worldX * nz;
    BattleView.offsetY = p.y - worldY * nz;
    clampBattleView();
  }
  function clientDist(t1, t2) {
    const dx = t1.clientX - t2.clientX;
    const dy = t1.clientY - t2.clientY;
    return Math.hypot(dx, dy);
  }
  function clientMid(t1, t2) {
    return { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
  }
  const HERO_TEXTURE_PATHS = {
    garet: 'assets/heroes/garet.png',
    alira: 'assets/heroes/alira.png',
    seris: 'assets/heroes/seris.png'
  };
  const HeroTextures = {};
  Object.entries(HERO_TEXTURE_PATHS).forEach(([heroId, src]) => {
    const img = new Image();
    img.src = src;
    HeroTextures[heroId] = img;
  });

  const ENEMY_TEXTURE_PATHS = {
    skeleton: 'assets/enemies/skeleton.png',
    goblin_archer: 'assets/enemies/goblin_archer.png',
    boar: 'assets/enemies/boar.png',
    zombie: 'assets/enemies/zombie.png',
    shaman: 'assets/enemies/shaman.png',
    leshy: 'assets/enemies/leshy.png',
    bandit: 'assets/enemies/bandit.png',
    wolf: 'assets/enemies/wolf.png',
    bandit_thrower: 'assets/enemies/bandit_thrower.png',
    spearman: 'assets/enemies/spearman.png',
    bog_lurker: 'assets/enemies/bog_lurker.png',
    thorn_dryad: 'assets/enemies/thorn_dryad.png',
    rat_swarm: 'assets/enemies/rat_swarm.png',
    cultist: 'assets/enemies/cultist.png',
    hexer: 'assets/enemies/hexer.png',
    shieldbearer: 'assets/enemies/shieldbearer.png',
    crossbowman: 'assets/enemies/crossbowman.png',
    stone_golem: 'assets/enemies/stone_golem.png',
    void_stalker: 'assets/enemies/void_stalker.png',
    blood_knight: 'assets/enemies/blood_knight.png',
    banshee: 'assets/enemies/banshee.png',
    plague_doctor: 'assets/enemies/plague_doctor.png',
    arcane_sentinel: 'assets/enemies/arcane_sentinel.png',
    orc_guard: 'assets/enemies/orc_guard.png',
    suicide: 'assets/enemies/bomber.png',
    spider: 'assets/enemies/spider.png',
    watcher: 'assets/enemies/watcher.png',
    ice_elem: 'assets/enemies/ice_elemental.png',
    dark_knight: 'assets/enemies/dark_knight.png',
    necro: 'assets/enemies/necromancer.png',
    chaos: 'assets/enemies/chaos_beast.png',
    assassin: 'assets/enemies/assassin.png',
    hydra: 'assets/enemies/hydra.png',
    ghost: 'assets/enemies/ghost.png',
    fire_titan: 'assets/enemies/fire_titan.png',
    dark_lord: 'assets/enemies/dark_lord.png'
  };
  const EnemyTextures = {};
  Object.entries(ENEMY_TEXTURE_PATHS).forEach(([enemyId, src]) => {
    const img = new Image();
    img.src = src;
    EnemyTextures[enemyId] = img;
  });
  const TILE_TEXTURE_PATHS = {
    [TILE.GROUND]: 'assets/tiles/ground.png',
    [TILE.FOREST]: 'assets/tiles/forest.png',
    [TILE.MOUNTAIN]: 'assets/tiles/mountain.png',
    [TILE.WATER]: 'assets/tiles/water.png',
    [TILE.FORT]: 'assets/tiles/castle.png'
  };
  const REGION_BATTLE_TEXTURE_PATHS = {
    1: 'assets/tiles/region-forest-glade.png',
    2: 'assets/tiles/region-volcanic-depths.png',
    3: 'assets/tiles/region-sunken-ruins.png'
  };
  const MAP_CASTLE_ICON = 'assets/tiles/castle.png';
  const TileTextures = {};
  Object.entries(TILE_TEXTURE_PATHS).forEach(([tileType, src]) => {
    const img = new Image();
    img.src = src;
    TileTextures[tileType] = img;
  });
  const RegionBattleTextures = {};
  Object.entries(REGION_BATTLE_TEXTURE_PATHS).forEach(([region, src]) => {
    const img = new Image();
    img.src = src;
    RegionBattleTextures[region] = img;
  });
  function getHeroTexture(heroId) {
    const tex = HeroTextures[heroId];
    if (tex && tex.complete && tex.naturalWidth > 0) return tex;
    return null;
  }
  function getEnemyTexture(enemyId) {
    const tex = EnemyTextures[enemyId];
    if (tex && tex.complete && tex.naturalWidth > 0) return tex;
    return null;
  }
  function heroIconHtml(heroId, fallback, cls) {
    const tex = getHeroTexture(heroId);
    if (tex) return `<img src="${HERO_TEXTURE_PATHS[heroId]}" class="${cls || 'hero-icon-large-img'}" alt="${heroId}" />`;
    return `<span class="hero-icon-large">${fallback || '🙂'}</span>`;
  }

  function skillPreviewCells(b, sel) {
    if (!b || !sel || !sel.isHero || !BattleView.hoverCell) return [];
    const { gx, gy } = BattleView.hoverCell;
    if (!inBounds(gx, gy)) return [];
    const skill = b.pendingSkill;
    const cells = [];
    const add = (x, y) => { if (inBounds(x, y)) cells.push({ x, y }); };
    if (skill === 'fireCall' && sel.heroId === 'garet') {
      for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
        if (Math.abs(sel.x - x) + Math.abs(sel.y - y) <= 2) add(x, y);
      }
      return cells;
    }
    if (skill === 'fireball' && sel.heroId === 'seris') {
      const radius = 1 + serisAoeBonus(sel);
      for (let dy = -radius; dy <= radius; dy++) for (let dx = -radius; dx <= radius; dx++) {
        if (Math.abs(dx) + Math.abs(dy) <= radius) add(gx + dx, gy + dy);
      }
      return cells;
    }
    if (skill === 'meteor' && sel.heroId === 'seris') {
      const size = 2 + serisAoeBonus(sel);
      for (let dy = 0; dy < size; dy++) for (let dx = 0; dx < size; dx++) add(gx + dx, gy + dy);
      return cells;
    }
    if (skill === 'freeze' || skill === 'slowArrow' || skill === 'shieldBash' || skill === 'double') {
      add(gx, gy);
      return cells;
    }
    if (b.mode === 'attack') {
      const tgt = unitAt(b, gx, gy);
      if (tgt && !tgt.isHero) add(gx, gy);
    }
    return cells;
  }

  function enemyHoverDangerCells(b) {
    if (!b || !BattleView.hoverCell) return [];
    const enemy = unitAt(b, BattleView.hoverCell.gx, BattleView.hoverCell.gy);
    if (!enemy || enemy.isHero || enemy.hp <= 0) return [];
    const cells = [];
    for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
      if (unitDistanceFromPoint(enemy, x, y) > enemy.range) continue;
      if (enemy.range > 1) {
        if (rangedBlocked(enemy.x, enemy.y, x, y, b.grid, false)) continue;
      }
      cells.push({ x, y });
    }
    return cells;
  }

  function battleHoverPreviewText(b, u) {
    if (!b || !BattleView.hoverCell) return '';
    const active = getActiveUnit();
    if (u && !u.isHero) {
      const parts = [`${translateKey('enemyReach')}: ${u.range}`];
      if (active && active.isHero && b.mode === 'attack' && isHeroFlankAttack(active, u, b)) {
        parts.push(`${translateKey('flankBonus')}: +25%`);
      }
      return parts.join(' · ');
    }
    if (active && active.isHero && (b.mode === 'skill' || b.mode === 'attack')) {
      const cells = skillPreviewCells(b, active);
      if (cells.length) return `${translateKey('preview')}: ${cells.length} ${translateKey('affectedTiles')}`;
    }
    return '';
  }

  function heroDamagePreview(b, attacker, target) {
    if (!b || !attacker || !target || !attacker.isHero || target.isHero) return null;
    const distance = unitDistance(attacker, target);
    const rangeLimitedSkills = ['shieldBash', 'double', 'slowArrow', 'fireball', 'freeze'];
    const rangeLimit = b.pendingSkill === 'shieldBash' ? 1 : attacker.range;
    if ((!b.pendingSkill || rangeLimitedSkills.includes(b.pendingSkill)) && distance > rangeLimit) {
      return { blocked: translateKey('outOfRange') };
    }
    const requiresClearLine = !b.pendingSkill || ['double', 'slowArrow'].includes(b.pendingSkill);
    if (requiresClearLine && attacker.range > 1 && rangedBlocked(attacker.x, attacker.y, target.x, target.y, b.grid, !!attacker.perks?.includes('ignoreCover'))) {
      return { blocked: translateKey('blockedLine') };
    }
    const isFireball = b.pendingSkill === 'fireball';
    const isMagic = isFireball || attacker.heroId === 'seris';
    const isFire = isFireball;
    const tags = [];
    if (b.pendingSkill === 'shieldBash') tags.push(translateKey('damageStunOne'));
    if (b.pendingSkill === 'slowArrow') tags.push(translateKey('damageSlowTwo'));
    if (isFireball) tags.push(translateKey('damageSplash'));
    let raw = isFireball ? 15 : attacker.attack;
    const weapon = getEquippedItem(attacker, 'weapon');
    if (weapon?.mods?.attack) raw += weapon.mods.attack;
    const firstShotMultiplier = attacker.heroId === 'alira' && attacker.flags?.firstAttackTurn ? 1.5 : 1;
    if (firstShotMultiplier > 1) tags.push(translateKey('damageFirstShot'));
    const finisherMultiplier = attacker.perks?.includes('finisher') && target.hp <= target.maxHp * .4 ? 1.3 : 1;
    if (finisherMultiplier > 1) tags.push(translateKey('damageFinisherBonus'));
    const moveMultiplier = attacker.heroId === 'alira' && attacker.perks?.includes('moveAttack') && b.heroMoved ? 1.2 : 1;
    if (moveMultiplier > 1) tags.push(translateKey('damageMoveBonus'));
    const spellCharge = attacker.heroId === 'seris' && attacker.perks?.includes('spellCharge') && isMagic ? 3 : 0;
    if (spellCharge) tags.push(translateKey('damageSpellCharge'));
    const berserkMultiplier = attacker.activeStatuses?.some(s => s.type === STATUS.BERSERK) ? 2 : 1;
    let armor = target.armor + tileDefenseBonus(b.grid[target.y][target.x]);
    if (attacker.heroId === 'garet' && attacker.perks?.includes('armorPierce')) armor = Math.max(0, armor - 2);
    const auraSource = b.units.find(u => u.isHero && u.heroId === 'garet' && u.hp > 0 &&
      u.heroId !== attacker.heroId && u.perks?.includes('auraDmg') && unitDistance(attacker, u) <= 2);
    const auraMultiplier = auraSource ? 1.1 : 1;
    if (auraSource) tags.push(translateKey('damageAura'));
    const flankMultiplier = isHeroFlankAttack(attacker, target, b, { magic: isMagic }) ? 1.25 : 1;
    if (flankMultiplier > 1) tags.push(translateKey('damageFlank'));
    const immuneToPhysical = target.enemyId === ENEMY_IDS.GHOST && !isMagic;
    const darkLordMagicOnly = target.enemyId === ENEMY_IDS.DARK_LORD &&
      b.units.find(u => u.enemyId === ENEMY_IDS.DARK_LORD && u.hp > 0 && u.phase === 3) &&
      attacker.heroId !== 'seris' && !isMagic;
    const burnDamage = isMagic && attacker.perks?.includes('burnSpell') ? 6 : 0;
    const previewContext = {
      rawDamage: raw,
      armor,
      hitCount: 1,
      firstShotMultiplier,
      finisherMultiplier,
      moveMultiplier,
      spellCharge,
      berserkMultiplier,
      immune: immuneToPhysical || darkLordMagicOnly,
      elementalMultiplier: target.enemyId === ENEMY_IDS.ICE_ELEM && isFire ? 1.5 : 1,
      targetMultiplier: target.enemyId === ENEMY_IDS.SHIELDBEARER ? .75 : 1,
      critChance: attacker.perks?.includes('crit15') ? .15 : 0,
      critMultiplier: 1.5,
      auraMultiplier,
      flankMultiplier,
      statusDamage: burnDamage,
      statusLabel: burnDamage ? translateKey('damageBurnTotal') : '',
      targetHp: target.hp,
      tags
    };
    let result;
    if (b.pendingSkill === 'double') {
      result = ThreeBladesCombatPreview.calculateSequence(previewContext, {
        hitCount: 2,
        targetHp: target.hp,
        targetMaxHp: target.maxHp,
        firstShotOnly: true,
        finisherEnabled: attacker.perks?.includes('finisher'),
        finisherMultiplier: 1.3
      });
    } else {
      result = ThreeBladesCombatPreview.calculate(previewContext);
    }
    return result;
  }

  function damagePreviewText(b, attacker, target) {
    const preview = heroDamagePreview(b, attacker, target);
    if (!preview) return '';
    if (preview.blocked) return preview.blocked;
    const amount = preview.minimum === preview.maximum ? preview.minimum : `${preview.minimum}–${preview.maximum}`;
    return `${translateKey('expectedDamage')}: ${amount} · ${translateKey('armorAbsorb')}: ${preview.armorAbsorbed}${preview.guaranteedKill ? ` · ${translateKey('damageGuaranteedKill')}` : preview.possibleKill ? ` · ${translateKey('damagePossibleKill')}` : ''}`;
  }

  function damagePreviewCardHtml(b, attacker, target) {
    const preview = heroDamagePreview(b, attacker, target);
    if (!preview) return '';
    if (preview.blocked) return `<div class="damage-preview-card">${escapeHtml(preview.blocked)}</div>`;
    const amount = preview.minimum === preview.maximum ? preview.minimum : `${preview.minimum}–${preview.maximum}`;
    const hitText = preview.hitCount > 1 ? ` · ${preview.hitCount} ${translateKey('damageHits')}` : '';
    const critText = preview.critChance > 0 ? ` · ${Math.round(preview.critChance * 100)}% ${translateKey('damageCritChance')}` : '';
    const statusText = preview.statusDamage > 0 ? `<div class="damage-preview-status">+${preview.statusDamage} ${preview.statusLabel}</div>` : '';
    const tagsText = preview.tags.length ? `<div class="damage-preview-tags">${preview.tags.map(escapeHtml).join(' · ')}</div>` : '';
    const killText = preview.guaranteedKill
      ? `<span class="damage-kill guaranteed">${translateKey('damageGuaranteedKill')}</span>`
      : preview.possibleKill ? `<span class="damage-kill possible">${translateKey('damagePossibleKill')}</span>` : '';
    return `<div class="damage-preview-card">
      <div class="damage-preview-main">${translateKey('expectedDamage')}: <span>${amount}</span>${hitText}</div>
      <div class="damage-preview-meta">${translateKey('armorAbsorb')}: ${preview.armorAbsorbed}${critText}</div>
      ${preview.immune ? `<div class="damage-preview-warning">${translateKey('damageImmune')}</div>` : ''}
      ${statusText}${tagsText}${killText}
    </div>`;
  }

  function battleTouchPreviewHtml(b, active) {
    const cell = b?.touchPreviewCell;
    if (!cell || !active?.isHero) return '';
    const target = unitAt(b, cell.gx, cell.gy);
    if (!target || target.isHero || target.hp <= 0) return '';
    return `${damagePreviewCardHtml(b, active, target)}
      <div class="battle-tactical-sub" style="text-align:center;color:#ffca6a">${translateKey('tapToConfirm')}</div>`;
  }

  function battleMotionReduced() {
    return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }

  function battleAnimationMs(ms) {
    if (battleMotionReduced()) return Math.max(45, Math.round(ms * 0.18));
    return Math.max(60, Math.round(ms / (GameState.battleSpeed === 2 ? 2 : 1)));
  }

  function battleUnitCenter(unit, x = unit?.x || 0, y = unit?.y || 0) {
    return {
      x: (x + unitWidth(unit) / 2) * CELL,
      y: (y + unitHeight(unit) / 2) * CELL
    };
  }

  function battleFxList(b = GameState.currentBattle) {
    if (!b) return [];
    if (!Array.isArray(b.combatFx)) b.combatFx = [];
    return b.combatFx;
  }

  function queueBattleFx(event) {
    const b = GameState.currentBattle;
    if (!b || !event) return null;
    const fx = {
      startedAt: performance.now(),
      duration: battleAnimationMs(300),
      ...event
    };
    battleFxList(b).push(fx);
    return fx;
  }

  function reserveBattleVisualUntil(timestamp) {
    const b = GameState.currentBattle;
    if (!b || !Number.isFinite(timestamp)) return;
    b.visualLockUntil = Math.max(b.visualLockUntil || 0, timestamp);
  }

  function pushUnitAnimation(unit, key, event) {
    if (!unit) return;
    const list = Array.isArray(unit[key]) ? unit[key] : [];
    const now = performance.now();
    unit[key] = list.filter(anim => now < anim.startedAt + anim.duration + 40);
    unit[key].push(event);
  }

  function startBattleAttackAnimation(attacker, target, opts = {}, damage = 0, hpBefore = target?.hp) {
    if (!attacker || !target || !GameState.currentBattle) return { impactDelay: 0, impactAt: performance.now() };
    const profile = BattleAnimations.resolveAttack(attacker, opts);
    const now = performance.now();
    const offset = battleAnimationMs(opts.animationOffsetMs || 0);
    const startedAt = now + offset;
    const duration = battleAnimationMs(profile.duration);
    const impactDelay = battleAnimationMs(profile.impactDelay);
    const impactAt = startedAt + impactDelay;
    const hitDuration = battleAnimationMs(profile.strength >= 2 ? 240 : 190);
    const source = battleUnitCenter(attacker);
    const destination = battleUnitCenter(target);
    const attackEvent = {
      startedAt,
      duration,
      profile,
      fromX: source.x,
      fromY: source.y,
      targetX: destination.x,
      targetY: destination.y
    };
    if (!opts.animationImpactOnly) pushUnitAnimation(attacker, 'attackAnimations', attackEvent);
    pushUnitAnimation(target, 'hitAnimations', {
      startedAt: impactAt,
      duration: hitDuration,
      profile,
      fromX: source.x,
      fromY: source.y,
      hpBefore
    });
    reserveBattleVisualUntil(Math.max(startedAt + duration, impactAt + hitDuration));
    target._lastVisualImpactAt = Math.max(target._lastVisualImpactAt || 0, impactAt);

    if (profile.projectile && !opts.animationImpactOnly) {
      queueBattleFx({
        type: 'projectile',
        startedAt: startedAt + battleAnimationMs(45),
        duration: Math.max(80, impactAt - startedAt - battleAnimationMs(45)),
        projectile: profile.projectile,
        color: profile.color,
        fromX: source.x,
        fromY: source.y,
        toX: destination.x,
        toY: destination.y,
        strength: profile.strength,
        shotIndex: opts.animationShotIndex || 0
      });
    }
    queueBattleFx({
      type: 'impact',
      startedAt: impactAt,
      duration: battleAnimationMs(profile.strength >= 2 ? 330 : 250),
      impact: profile.impact,
      color: profile.color,
      x: destination.x,
      y: destination.y,
      strength: profile.strength,
      damage
    });
    return { impactDelay: Math.max(0, impactAt - now), impactAt, profile };
  }

  function playBattleAbilityFx(owner, abilityKey, options = {}) {
    if (!owner || !GameState.currentBattle) return null;
    const profile = BattleAnimations.resolveAbility(owner, abilityKey);
    const center = options.target
      ? battleUnitCenter(options.target)
      : options.x != null && options.y != null
        ? { x: (options.x + 0.5) * CELL, y: (options.y + 0.5) * CELL }
        : battleUnitCenter(owner);
    const startedAt = performance.now() + battleAnimationMs(options.delay || 0);
    const abilityDuration = battleAnimationMs(profile.duration);
    if (!options.noPose) {
      pushUnitAnimation(owner, 'attackAnimations', {
        startedAt,
        duration: abilityDuration,
        profile,
        fromX: center.x,
        fromY: center.y,
        targetX: center.x,
        targetY: center.y
      });
    }
    reserveBattleVisualUntil(startedAt + abilityDuration);
    if (options.projectile) {
      queueBattleFx({
        type: 'projectile',
        startedAt: startedAt + battleAnimationMs(70),
        duration: battleAnimationMs(profile.impactDelay || 300),
        projectile: options.projectile,
        color: profile.color,
        fromX: center.x - (options.projectile === 'meteor' ? CELL * 1.8 : 0),
        fromY: center.y - CELL * (options.projectile === 'meteor' ? 3.2 : 2.4),
        toX: center.x,
        toY: center.y,
        strength: profile.strength,
        radius: options.radius || 1
      });
    }
    return queueBattleFx({
      type: 'ability',
      startedAt,
      duration: abilityDuration,
      impact: profile.impact,
      color: profile.color,
      x: center.x,
      y: center.y,
      radius: options.radius || 1,
      strength: profile.strength,
      glyph: options.glyph || ''
    });
  }

  function activeUnitAnimation(unit, key, now) {
    const list = Array.isArray(unit?.[key]) ? unit[key] : [];
    let active = null;
    unit[key] = list.filter(anim => {
      const keep = now < anim.startedAt + anim.duration + 40;
      if (keep && now >= anim.startedAt && now <= anim.startedAt + anim.duration) active = anim;
      return keep;
    });
    return active;
  }

  function unitBattlePose(unit, now = performance.now()) {
    const pose = { dx: 0, dy: 0, rotation: 0, scaleX: 1, scaleY: 1, alpha: 1, filter: 'none' };
    const attack = activeUnitAnimation(unit, 'attackAnimations', now);
    if (attack) {
      const p = Math.max(0, Math.min(1, (now - attack.startedAt) / Math.max(1, attack.duration)));
      const dx = attack.targetX - attack.fromX;
      const dy = attack.targetY - attack.fromY;
      const len = Math.max(1, Math.hypot(dx, dy));
      const nx = dx / len;
      const ny = dy / len;
      const wave = Math.sin(Math.PI * p);
      const motion = attack.profile.motion;
      if (!battleMotionReduced()) {
        if (motion === 'lunge') { pose.dx += nx * CELL * .30 * wave; pose.dy += ny * CELL * .30 * wave; }
        if (motion === 'thrust') { pose.dx += nx * CELL * .38 * wave; pose.dy += ny * CELL * .38 * wave; pose.rotation += nx * .05 * wave; }
        if (motion === 'heavy') {
          const push = p < .32 ? -p / .32 * .10 : Math.sin((p - .32) / .68 * Math.PI) * .36;
          pose.dx += nx * CELL * push; pose.dy += ny * CELL * push;
          pose.scaleY *= 1 - .08 * Math.sin(Math.PI * p);
        }
        if (motion === 'pounce') { pose.dx += nx * CELL * .42 * wave; pose.dy += ny * CELL * .42 * wave - 9 * wave; }
        if (motion === 'recoil') { pose.dx -= nx * 5 * wave; pose.dy -= ny * 5 * wave; pose.rotation -= nx * .045 * wave; }
        if (motion === 'blink') { pose.dx += nx * CELL * .24 * wave; pose.dy += ny * CELL * .24 * wave; pose.alpha *= .55 + .45 * Math.abs(Math.cos(Math.PI * p)); }
        if (motion === 'cast') { pose.scaleX *= 1 + .08 * wave; pose.scaleY *= 1 + .10 * wave; pose.dy -= 3 * wave; }
        if (motion === 'brace') { pose.scaleX *= 1 + .10 * wave; pose.scaleY *= 1 - .06 * wave; }
        if (motion === 'teleport') { pose.alpha *= .2 + .8 * Math.abs(Math.cos(Math.PI * p)); pose.scaleX *= 1 - .2 * wave; }
      }
      if (['cast', 'brace', 'teleport'].includes(motion)) pose.filter = `brightness(${1 + .8 * wave}) saturate(1.35)`;
    }

    const hit = activeUnitAnimation(unit, 'hitAnimations', now);
    if (hit) {
      const p = Math.max(0, Math.min(1, (now - hit.startedAt) / Math.max(1, hit.duration)));
      const center = battleUnitCenter(unit);
      const dx = center.x - hit.fromX;
      const dy = center.y - hit.fromY;
      const len = Math.max(1, Math.hypot(dx, dy));
      const wave = Math.sin(Math.PI * p);
      if (!battleMotionReduced()) {
        pose.dx += dx / len * CELL * .13 * wave * Math.min(1.5, hit.profile.strength);
        pose.dy += dy / len * CELL * .13 * wave * Math.min(1.5, hit.profile.strength);
        pose.rotation += dx / len * .07 * wave;
      }
      if (p < .48) pose.filter = `brightness(${2.2 - p * 1.5}) saturate(1.8)`;
    }

    const death = unit?.deathAnimation;
    if (death && now >= death.startedAt) {
      const p = Math.max(0, Math.min(1, (now - death.startedAt) / Math.max(1, death.duration)));
      if (death.kind === 'enemy') {
        pose.dy += 12 * p;
        pose.rotation += death.direction * .18 * p;
        pose.scaleX *= 1 - .5 * p;
        pose.scaleY *= 1 - .36 * p;
        pose.alpha *= 1 - Math.pow(p, 1.5);
        pose.filter = `grayscale(${p}) brightness(${1.8 - .8 * p})`;
      } else if (death.kind === 'hero') {
        pose.dy += 9 * p;
        pose.rotation -= .48 * p;
        pose.scaleY *= 1 - .14 * p;
        pose.alpha *= p < .58 ? 1 : 1 - (p - .58) / .42;
        pose.filter = `grayscale(${Math.min(1, p * 1.5)}) brightness(${1.45 - .55 * p})`;
      } else {
        const shake = battleMotionReduced() ? 0 : Math.sin(p * Math.PI * 12) * (1 - p) * 4;
        pose.dx += shake;
        pose.scaleX *= 1 + Math.sin(p * Math.PI * 5) * .045 * (1 - p);
        pose.scaleY *= 1 + Math.sin(p * Math.PI * 5) * .045 * (1 - p);
        pose.alpha *= 1 - Math.pow(p, 2.2);
        pose.filter = `brightness(${1.8 - .65 * p}) saturate(${1.4 - .4 * p})`;
      }
    }
    return pose;
  }

  function displayedUnitHp(unit, now = performance.now()) {
    const future = (unit?.hitAnimations || [])
      .filter(anim => now < anim.startedAt && Number.isFinite(anim.hpBefore))
      .sort((a, z) => a.startedAt - z.startedAt)[0];
    return future ? future.hpBefore : unit.hp;
  }

  function isUnitDeathAnimating(unit, now = performance.now()) {
    const death = unit?.deathAnimation;
    return !!death && now < death.startedAt + death.duration;
  }

  function activeDeathAnimationRemaining(b, now = performance.now()) {
    if (!b) return 0;
    return b.units.reduce((max, unit) => {
      const death = unit.deathAnimation;
      if (!death) return max;
      return Math.max(max, death.startedAt + death.duration - now);
    }, 0);
  }

  function drawBattleProjectile(ctx2, fx, p) {
    const eased = p * p * (3 - 2 * p);
    const x = fx.fromX + (fx.toX - fx.fromX) * eased;
    const y = fx.fromY + (fx.toY - fx.fromY) * eased - Math.sin(Math.PI * p) * (fx.projectile === 'axe' ? 10 : 4);
    const angle = Math.atan2(fx.toY - fx.fromY, fx.toX - fx.fromX);
    ctx2.save();
    ctx2.translate(x, y);
    ctx2.rotate(angle);
    ctx2.shadowColor = fx.color;
    ctx2.shadowBlur = 10;
    if (fx.projectile === 'rain') {
      ctx2.rotate(Math.PI / 2 - angle);
      ctx2.strokeStyle = fx.color; ctx2.fillStyle = fx.color; ctx2.lineWidth = 2;
      for (let i = -3; i <= 3; i++) {
        const offsetX = i * 13;
        const offsetY = Math.abs(i % 2) * 17 - (i % 3) * 5;
        ctx2.beginPath(); ctx2.moveTo(offsetX, offsetY - 16); ctx2.lineTo(offsetX, offsetY + 10); ctx2.stroke();
        ctx2.beginPath(); ctx2.moveTo(offsetX, offsetY + 13); ctx2.lineTo(offsetX - 4, offsetY + 5); ctx2.lineTo(offsetX + 4, offsetY + 5); ctx2.closePath(); ctx2.fill();
      }
    } else if (fx.projectile === 'meteor') {
      ctx2.rotate(-angle);
      const radius = 13 + 5 * (fx.strength || 1);
      const grad = ctx2.createRadialGradient(0, 0, 2, 0, 0, radius);
      grad.addColorStop(0, '#fff7c7'); grad.addColorStop(.35, '#ff8a42'); grad.addColorStop(1, '#8c2418');
      ctx2.fillStyle = grad; ctx2.beginPath(); ctx2.arc(0, 0, radius, 0, Math.PI * 2); ctx2.fill();
      ctx2.strokeStyle = 'rgba(255,138,66,.72)'; ctx2.lineWidth = 9;
      ctx2.beginPath(); ctx2.moveTo(-42, -54); ctx2.lineTo(-8, -10); ctx2.stroke();
    } else if (fx.projectile === 'arrow') {
      ctx2.strokeStyle = fx.color; ctx2.fillStyle = fx.color; ctx2.lineWidth = 3;
      ctx2.beginPath(); ctx2.moveTo(-15, 0); ctx2.lineTo(12, 0); ctx2.stroke();
      ctx2.beginPath(); ctx2.moveTo(14, 0); ctx2.lineTo(6, -5); ctx2.lineTo(6, 5); ctx2.closePath(); ctx2.fill();
    } else if (fx.projectile === 'axe') {
      ctx2.rotate(p * Math.PI * 8);
      ctx2.font = '22px serif'; ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle'; ctx2.fillText('🪓', 0, 0);
    } else if (fx.projectile === 'root') {
      ctx2.strokeStyle = fx.color; ctx2.lineWidth = 5; ctx2.lineCap = 'round';
      ctx2.beginPath(); ctx2.moveTo(-18, 0); ctx2.quadraticCurveTo(-5, -7, 12, 0); ctx2.stroke();
      ctx2.fillStyle = '#d8ffad'; ctx2.beginPath(); ctx2.arc(13, 0, 4, 0, Math.PI * 2); ctx2.fill();
    } else if (fx.projectile === 'shadow') {
      ctx2.strokeStyle = fx.color; ctx2.lineWidth = 9; ctx2.globalAlpha = .72;
      ctx2.beginPath(); ctx2.moveTo(-20, 0); ctx2.lineTo(12, 0); ctx2.stroke();
    } else {
      const radius = fx.projectile === 'fire' ? 10 : 7;
      const grad = ctx2.createRadialGradient(0, 0, 1, 0, 0, radius);
      grad.addColorStop(0, '#ffffff'); grad.addColorStop(.35, fx.color); grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx2.fillStyle = grad; ctx2.beginPath(); ctx2.arc(0, 0, radius, 0, Math.PI * 2); ctx2.fill();
      if (fx.projectile === 'ice') {
        ctx2.strokeStyle = '#d9f8ff'; ctx2.lineWidth = 2;
        ctx2.beginPath(); ctx2.moveTo(-10, 0); ctx2.lineTo(10, 0); ctx2.stroke();
      }
    }
    ctx2.restore();
  }

  function drawBattleImpact(ctx2, fx, p) {
    const radius = (10 + 25 * p) * (fx.strength || 1);
    ctx2.save();
    ctx2.translate(fx.x, fx.y);
    ctx2.globalAlpha = Math.max(0, 1 - p);
    ctx2.strokeStyle = fx.color;
    ctx2.fillStyle = fx.color;
    ctx2.shadowColor = fx.color;
    ctx2.shadowBlur = 12;
    ctx2.lineWidth = Math.max(2, 5 - p * 3);
    if (['slash', 'shadow', 'bite', 'pierce'].includes(fx.impact)) {
      ctx2.beginPath();
      if (fx.impact === 'bite') {
        ctx2.arc(-5, 0, radius * .55, -1.15, 1.15);
        ctx2.arc(5, 0, radius * .55, Math.PI - 1.15, Math.PI + 1.15);
      } else {
        ctx2.arc(0, 0, radius, -.9, .7);
      }
      ctx2.stroke();
    } else if (fx.impact === 'root') {
      for (let i = -2; i <= 2; i++) {
        ctx2.beginPath(); ctx2.moveTo(i * 6, 12); ctx2.lineTo(i * 5, -radius * (.6 + Math.abs(i) * .1)); ctx2.stroke();
      }
    } else if (fx.impact === 'ice') {
      for (let i = 0; i < 6; i++) {
        ctx2.rotate(Math.PI / 3); ctx2.beginPath(); ctx2.moveTo(5, 0); ctx2.lineTo(radius, 0); ctx2.stroke();
      }
    } else if (fx.impact === 'fire' || fx.impact === 'explosion' || fx.impact === 'smash') {
      ctx2.beginPath(); ctx2.arc(0, 0, radius, 0, Math.PI * 2); ctx2.stroke();
      for (let i = 0; i < 8; i++) {
        const a = i * Math.PI / 4;
        ctx2.fillRect(Math.cos(a) * radius, Math.sin(a) * radius, 4, 4);
      }
    } else {
      ctx2.beginPath(); ctx2.arc(0, 0, radius, 0, Math.PI * 2); ctx2.stroke();
    }
    ctx2.restore();
  }

  function drawBattleAbility(ctx2, fx, p) {
    ctx2.save();
    ctx2.translate(fx.x, fx.y);
    const wave = Math.sin(Math.PI * p);
    const radius = CELL * (.35 + (fx.radius || 1) * .6 * p);
    ctx2.globalAlpha = Math.max(0, 1 - p * .8);
    ctx2.strokeStyle = fx.color;
    ctx2.fillStyle = fx.color;
    ctx2.shadowColor = fx.color;
    ctx2.shadowBlur = 15;
    ctx2.lineWidth = 3;
    ctx2.beginPath(); ctx2.arc(0, 0, radius, 0, Math.PI * 2); ctx2.stroke();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4 + p * 1.4;
      const r = 8 + radius * wave;
      ctx2.fillRect(Math.cos(a) * r - 2, Math.sin(a) * r - 2, 4, 4);
    }
    if (fx.glyph) {
      ctx2.font = `${Math.round(18 + 10 * wave)}px serif`;
      ctx2.textAlign = 'center'; ctx2.textBaseline = 'middle'; ctx2.fillText(fx.glyph, 0, 0);
    }
    ctx2.restore();
  }

  function drawBattleDeathParticles(ctx2, fx, p) {
    ctx2.save();
    ctx2.globalAlpha = Math.max(0, 1 - p);
    ctx2.fillStyle = fx.color;
    ctx2.shadowColor = fx.color;
    ctx2.shadowBlur = 8;
    const count = fx.kind === 'boss' ? 18 : fx.kind === 'hero' ? 10 : 7;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + (i % 3) * .37;
      const speed = 12 + (i % 5) * 5 + (fx.kind === 'boss' ? 18 : 0);
      const x = fx.x + Math.cos(a) * speed * p;
      const y = fx.y + Math.sin(a) * speed * p - 18 * p * p;
      const size = fx.kind === 'boss' ? 5 : 3;
      ctx2.fillRect(x - size / 2, y - size / 2, size, size);
    }
    ctx2.restore();
  }

  function drawBattleCombatFx(ctx2, b) {
    const now = performance.now();
    const list = battleFxList(b);
    b.combatFx = list.filter(fx => now < fx.startedAt + fx.duration + 20);
    b.combatFx.forEach(fx => {
      if (now < fx.startedAt) return;
      const p = Math.max(0, Math.min(1, (now - fx.startedAt) / Math.max(1, fx.duration)));
      if (fx.type === 'projectile') drawBattleProjectile(ctx2, fx, p);
      else if (fx.type === 'impact') drawBattleImpact(ctx2, fx, p);
      else if (fx.type === 'ability') drawBattleAbility(ctx2, fx, p);
      else if (fx.type === 'death') drawBattleDeathParticles(ctx2, fx, p);
    });
  }

  function startUnitMoveAnimation(unit, fromX, fromY, toX, toY) {
    if (!unit || (fromX === toX && fromY === toY)) return;
    const distance = Math.max(1, Math.abs(toX - fromX) + Math.abs(toY - fromY));
    unit.moveAnimation = {
      fromX, fromY, toX, toY,
      startedAt: performance.now(),
      duration: battleDelay(Math.min(620, 180 + distance * 85))
    };
  }

  function unitVisualPosition(unit) {
    const a = unit?.moveAnimation;
    if (!a) return { x: unit.x, y: unit.y };
    const progress = Math.min(1, (performance.now() - a.startedAt) / Math.max(1, a.duration));
    const eased = 1 - Math.pow(1 - progress, 3);
    if (progress >= 1) {
      unit.moveAnimation = null;
      return { x: unit.x, y: unit.y };
    }
    return {
      x: a.fromX + (a.toX - a.fromX) * eased,
      y: a.fromY + (a.toY - a.fromY) * eased
    };
  }

  function drawBattle() {
    const b = GameState.currentBattle;
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    if (!b) return;
    clampBattleView();
    ctx.save();
    ctx.translate(BattleView.offsetX, BattleView.offsetY);
    ctx.scale(BattleView.zoom, BattleView.zoom);
    const sel = b.selected;
    const blind = sel && sel.activeStatuses && sel.activeStatuses.find(s => s.type === STATUS.BLIND);
    const heroCanMoveNow = sel && sel.isHero && b.phase === 'combat' && getActiveUnit() === sel && !blind && heroHasMoveOptions(b, sel);
    const reach = heroCanMoveNow && b.mode === 'move' ? floodReachable(b, sel) : null;
    const deployHero = selectedDeployHero(b);
    const deployPulse = 0.5 + Math.sin(performance.now() * 0.004) * 0.12;

    for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
      const px = x * CELL, py = y * CELL;
      const t = b.grid[y][x];
      const tex = TileTextures[t];
      if (tex && tex.complete && tex.naturalWidth > 0) {
        ctx.drawImage(tex, px, py, CELL, CELL);
      } else {
        ctx.fillStyle = '#2a2a3a';
        ctx.fillRect(px, py, CELL, CELL);
      }
      ctx.strokeStyle = '#1a1a2e';
      ctx.strokeRect(px, py, CELL, CELL);
      if (!tex || !tex.complete || tex.naturalWidth === 0) {
        ctx.font = '28px serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(TILE_EMOJI[t] || '🟫', px + CELL / 2, py + CELL / 2);
      }
      if (b.phase === 'deploy' && !b.deploymentLocked && x <= 1) {
        const available = isDeployCellAvailable(b, x, y, deployHero);
        ctx.save();
        if (available) {
          ctx.fillStyle = `rgba(42,190,210,${deployPulse})`;
          ctx.fillRect(px + 2, py + 2, CELL - 4, CELL - 4);
          ctx.strokeStyle = 'rgba(167,247,255,.96)';
          ctx.lineWidth = 2;
          ctx.setLineDash([7, 4]);
          ctx.strokeRect(px + 4, py + 4, CELL - 8, CELL - 8);
          ctx.setLineDash([]);
          ctx.fillStyle = 'rgba(225,253,255,.94)';
          ctx.beginPath();
          ctx.arc(px + CELL / 2, py + CELL / 2, 4, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = 'rgba(20,55,75,.2)';
          ctx.fillRect(px + 2, py + 2, CELL - 4, CELL - 4);
        }
        ctx.restore();
      }
      const terrain = terrainInfo(t, sel || undefined);
      if (shouldDrawTerrainMarkers() && (terrain.defense > 0 || terrain.moveCost > 1 || terrain.blocksMove)) {
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = 'rgba(7,10,20,0.58)';
        ctx.fillRect(px + 4, py + 4, 22, 14);
        ctx.font = '9px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = terrain.blocksMove ? '#e8c860' : terrain.defense > 0 ? '#8fd7ff' : '#b7f0b1';
        const mark = terrain.blocksMove ? 'X' : terrain.defense > 0 ? `+${terrain.defense}` : `>${terrain.moveCost}`;
        ctx.fillText(mark, px + 15, py + 11);
        ctx.restore();
      }
      if (sel && pointInUnit(sel, x, y)) {
        ctx.fillStyle = 'rgba(255,255,0,0.25)';
        ctx.fillRect(px, py, CELL, CELL);
      }
      if (reach && reach[x + ',' + y] !== undefined && !(sel && sel.x === x && sel.y === y)) {
        if (blind) { /* skip */ }
        else {
          ctx.fillStyle = 'rgba(60,120,255,0.35)';
          ctx.fillRect(px, py, CELL, CELL);
        }
      }
    }

    const regionalTexture = RegionBattleTextures[b.region];
    if (regionalTexture?.complete && regionalTexture.naturalWidth > 0) {
      ctx.save();
      ctx.globalAlpha = 0.12;
      ctx.globalCompositeOperation = 'soft-light';
      ctx.drawImage(regionalTexture, 0, 0, CANVAS_W, CANVAS_H);
      ctx.restore();
    }
    if (['escape', 'hunt'].includes(b.scenario?.id)) {
      const px = (GRID_W - 1) * CELL;
      ctx.save();
      ctx.fillStyle = 'rgba(86, 230, 164, .18)';
      ctx.fillRect(px + 4, 4, CELL - 8, CANVAS_H - 8);
      ctx.strokeStyle = '#7fffd4'; ctx.lineWidth = 3; ctx.setLineDash([8, 5]);
      ctx.strokeRect(px + 5, 5, CELL - 10, CANVAS_H - 10); ctx.setLineDash([]);
      ctx.fillStyle = '#d9fff0'; ctx.font = '19px serif'; ctx.textAlign = 'center';
      ctx.fillText('🚩', px + CELL / 2, CELL / 2);
      ctx.restore();
    }
    if (b.scenario?.id === 'defense' && b.scenario.ward) {
      const ward = b.scenario.ward;
      const px = ward.x * CELL, py = ward.y * CELL;
      ctx.save();
      ctx.fillStyle = 'rgba(110,180,255,.2)'; ctx.fillRect(px + 5, py + 5, CELL - 10, CELL - 10);
      ctx.strokeStyle = '#8bd3ff'; ctx.lineWidth = 3; ctx.strokeRect(px + 6, py + 6, CELL - 12, CELL - 12);
      ctx.fillStyle = '#e8fbff'; ctx.font = '26px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🛡️', px + CELL / 2, py + CELL / 2);
      ctx.restore();
    }

    (b.traps || []).forEach(trap => {
      const cx = trap.x * CELL + CELL / 2;
      const cy = trap.y * CELL + CELL / 2;
      ctx.save();
      ctx.fillStyle = 'rgba(255,150,55,.2)';
      ctx.strokeStyle = '#ff9b42';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#ffd06b';
      ctx.font = 'bold 12px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TRAP', cx, cy);
      ctx.restore();
    });

    if (shouldShowAttackHighlights(b, sel)) {
      for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
        const dist = unitDistanceFromPoint(sel, x, y);
        if (dist <= sel.range && sel.range > 0) {
          const tgt = unitAt(b, x, y);
          if (tgt && !tgt.isHero) {
            if (sel.range > 1 && rangedBlocked(sel.x, sel.y, x, y, b.grid, false)) continue;
            ctx.fillStyle = 'rgba(255,60,60,0.35)';
            ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
          }
        }
      }
    }

    if (b.phase === 'deploy' && !b.deploymentLocked) {
      ctx.save();
      const zoneLabel = translateKey('deployZone').toUpperCase();
      ctx.font = 'bold 10px Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(5,18,34,.9)';
      ctx.fillRect(5, 5, CELL * 2 - 10, 20);
      ctx.strokeStyle = 'rgba(167,247,255,.9)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(5, 5, CELL * 2 - 10, 20);
      ctx.fillStyle = '#c8f8ff';
      ctx.fillText(zoneLabel, CELL, 15);
      ctx.restore();
    }

    const dangerCells = enemyHoverDangerCells(b);
    dangerCells.forEach(c => {
      ctx.fillStyle = 'rgba(231,76,60,0.16)';
      ctx.fillRect(c.x * CELL, c.y * CELL, CELL, CELL);
      ctx.strokeStyle = 'rgba(231,76,60,0.55)';
      ctx.strokeRect(c.x * CELL + 4, c.y * CELL + 4, CELL - 8, CELL - 8);
    });

    const previewCells = skillPreviewCells(b, sel);
    previewCells.forEach(c => {
      ctx.fillStyle = 'rgba(240,165,0,0.24)';
      ctx.fillRect(c.x * CELL, c.y * CELL, CELL, CELL);
      ctx.strokeStyle = 'rgba(255,226,122,0.75)';
      ctx.lineWidth = 2;
      ctx.strokeRect(c.x * CELL + 3, c.y * CELL + 3, CELL - 6, CELL - 6);
      ctx.lineWidth = 1;
    });

    // Strong turn focus: broad fill + double outline stays visible on noisy tiles.
    const activeU = b.phase === 'combat' ? getActiveUnit() : null;
    if (activeU && activeU.hp > 0) {
      const apx = activeU.x * CELL, apy = activeU.y * CELL;
      const aw = unitWidth(activeU) * CELL, ah = unitHeight(activeU) * CELL;
      const pulse = 0.62 + Math.sin(performance.now() * 0.006) * 0.22;
      ctx.save();
      ctx.fillStyle = activeU.isHero ? `rgba(74,158,255,${0.13 + pulse * 0.08})` : `rgba(231,76,60,${0.11 + pulse * 0.07})`;
      ctx.fillRect(apx + 2, apy + 2, aw - 4, ah - 4);
      ctx.shadowColor = '#ffd95a';
      ctx.shadowBlur = 18 + pulse * 6;
      ctx.strokeStyle = `rgba(255,217,90,${pulse})`;
      ctx.lineWidth = 5;
      ctx.strokeRect(apx + 3, apy + 3, aw - 6, ah - 6);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = activeU.isHero ? '#7ed3ff' : '#ff796e';
      ctx.lineWidth = 2;
      ctx.strokeRect(apx + 8, apy + 8, aw - 16, ah - 16);
      ctx.restore();
    }

    const combatDrawNow = performance.now();
    b.units.filter(u => u.hp > 0 || isUnitDeathAnimating(u, combatDrawNow)).sort((a, b) => a.y !== b.y ? a.y - b.y : a.x - b.x).forEach(u => {
      const visualPos = unitVisualPosition(u);
      const px = visualPos.x * CELL, py = visualPos.y * CELL;
      const footprintW = unitWidth(u) * CELL;
      const footprintH = unitHeight(u) * CELL;
      const centerX = px + footprintW / 2;
      const pose = unitBattlePose(u, combatDrawNow);
      if (b.phase === 'deploy' && u.isHero && u.heroId === b.deployDragHeroId) {
        ctx.save();
        ctx.fillStyle = 'rgba(240,165,0,.18)';
        ctx.strokeStyle = '#ffd45c';
        ctx.lineWidth = 3;
        ctx.fillRect(px + 2, py + 2, footprintW - 4, footprintH - 4);
        ctx.strokeRect(px + 2, py + 2, footprintW - 4, footprintH - 4);
        ctx.restore();
      }
      let show = true;
      if (u.enemyId === ENEMY_IDS.ASSASSIN && u.hp > 0) {
        const t = b.grid[u.y][u.x];
        const nearM = [[-1,0],[1,0],[0,-1],[0,1]].some(([dx,dy]) => inBounds(u.x+dx,u.y+dy) && b.grid[u.y+dy][u.x+dx]===TILE.MOUNTAIN);
        if (t === TILE.FOREST || nearM) show = false;
      }
      if (show) {
        if (!u.isHero && unitWidth(u) > 1) {
          ctx.save();
          const isLeshy = u.enemyId === ENEMY_IDS.LESHY;
          ctx.strokeStyle = isLeshy ? 'rgba(143, 224, 107, 0.95)' : 'rgba(255, 190, 80, 0.75)';
          ctx.lineWidth = 2;
          if (isLeshy) {
            ctx.shadowColor = '#66d36e';
            ctx.shadowBlur = 12;
          }
          ctx.strokeRect(px + 2, py + 2, footprintW - 4, footprintH - 4);
          ctx.fillStyle = isLeshy ? 'rgba(76, 175, 80, 0.12)' : 'rgba(255, 190, 80, 0.08)';
          ctx.fillRect(px + 2, py + 2, footprintW - 4, footprintH - 4);
          ctx.restore();
        }
        // Sprite size: 1.2× cell. Bottom of sprite sits 2px above HP bar.
        const BAR_TOP  = footprintH - 8;
        const spriteBottom = BAR_TOP - 2;

        // Idle breathing: vertical stretch anchored at feet — body grows upward, feet stay fixed
        const now = combatDrawNow;
        const phase = (visualPos.x * 1.7 + visualPos.y * 3.1 + (u.isHero ? 0 : 5.3));
        const scaleY = 1 + Math.sin(now * 0.0016 + phase) * 0.028; // ±2.8% vertical stretch

        const spriteW = u.isHero
          ? Math.round(CELL * BATTLE_SPRITE_MULT_HERO)
          : Math.round(footprintW * BATTLE_SPRITE_MULT_ENEMY);
        const spriteH = u.isHero
          ? Math.round(CELL * BATTLE_SPRITE_MULT_HERO)
          : Math.round(CELL * (unitWidth(u) > 1 ? 1.35 : BATTLE_SPRITE_MULT_ENEMY));
        // Feet anchor: py + spriteBottom stays fixed; top grows/shrinks upward
        const feetY = py + spriteBottom;                        // absolute Y of feet

        if (u.isHero) {
          const hTex = getHeroTexture(u.heroId);
          if (hTex) {
            ctx.save();
            ctx.globalAlpha = pose.alpha;
            ctx.filter = pose.filter;
            ctx.translate(centerX + pose.dx, feetY + pose.dy);
            ctx.rotate(pose.rotation);
            ctx.scale(pose.scaleX, scaleY * pose.scaleY);
            ctx.drawImage(hTex, -spriteW / 2, -spriteH, spriteW, spriteH);
            ctx.restore();
          } else {
            ctx.save();
            ctx.globalAlpha = pose.alpha;
            ctx.filter = pose.filter;
            ctx.translate(centerX + pose.dx, feetY + pose.dy);
            ctx.rotate(pose.rotation);
            ctx.scale(pose.scaleX, scaleY * pose.scaleY);
            ctx.font = '38px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(u.sprite, 0, 0);
            ctx.restore();
          }
        } else {
          const eTex = getEnemyTexture(u.enemyId);
          if (eTex) {
            ctx.save();
            ctx.globalAlpha = pose.alpha;
            ctx.filter = pose.filter;
            ctx.translate(centerX + pose.dx, feetY + pose.dy);
            ctx.rotate(pose.rotation);
            ctx.scale(-pose.scaleX, scaleY * pose.scaleY);
            ctx.drawImage(eTex, -spriteW / 2, -spriteH, spriteW, spriteH);
            ctx.restore();
          } else {
            ctx.save();
            ctx.globalAlpha = pose.alpha;
            ctx.filter = pose.filter;
            ctx.translate(centerX + pose.dx, feetY + pose.dy);
            ctx.rotate(pose.rotation);
            ctx.scale(pose.scaleX, scaleY * pose.scaleY);
            ctx.font = '38px serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'alphabetic';
            ctx.fillText(u.emoji, 0, 0);
            ctx.restore();
          }
        }

        if (!u.isHero && u.scenarioTarget && u.hp > 0) {
          ctx.save();
          ctx.fillStyle = '#ffe16a';
          ctx.shadowColor = '#ffb300'; ctx.shadowBlur = 10;
          ctx.font = '19px serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(u.scenarioTarget === 'ritualist' ? '🔮' : '🎯', centerX, py + 10);
          ctx.restore();
        }

        // 2: HP bar + hp text
        if (u.hp > 0) {
        const visibleHp = displayedUnitHp(u, combatDrawNow);
        const barW = footprintW - 6, barH = 4, bx = px + 3, by = py + footprintH - 7;
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(bx, by, barW, barH);
        const hpFrac = Math.max(0, Math.min(1, visibleHp / u.maxHp));
        ctx.fillStyle = hpFrac > 0.5 ? '#2ecc71' : hpFrac > 0.25 ? '#f39c12' : '#e74c3c';
        ctx.fillRect(bx, by, Math.round(barW * hpFrac), barH);
        // HP text — integer coords, no stroke (stroke blurs small text)
        const hpText = `${visibleHp}/${u.maxHp}`;
        ctx.font = '10px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        const textW = ctx.measureText(hpText).width;
        const tx = Math.round(centerX);
        const ty = by - 1;
        ctx.fillStyle = 'rgba(0,0,0,0.72)';
        ctx.fillRect(Math.round(tx - textW / 2 - 2), ty - 10, Math.round(textW + 4), 10);
        ctx.fillStyle = '#ffffff';
        ctx.fillText(hpText, tx, ty);

        // 15: Compact status icons — up to 3 in bottom-left corner
        if (u.activeStatuses && u.activeStatuses.length) {
          const icons = { stun:'⚡', freeze:'❄', fear:'!', web:'🕸', poison:'☠', burn:'🔥', slow:'🐢', blind:'👁', curse:'💀', berserk:'💢', stealth:'🌑' };
          const shown = u.activeStatuses.slice(0, 3);
          ctx.font = '11px serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'alphabetic';
          shown.forEach((s, i) => ctx.fillText(icons[s.type] || '·', px + 2 + i * 13, py + CELL - 11));
        }
        }
      }
    });
    if (activeU && activeU.hp > 0) {
      const visualPos = unitVisualPosition(activeU);
      const apx = visualPos.x * CELL;
      const apy = visualPos.y * CELL;
      const aw = unitWidth(activeU) * CELL;
      const ah = unitHeight(activeU) * CELL;
      const label = `▶ ${translateKey('turnNow').toUpperCase()}: ${translateText(activeU.name)}`;
      ctx.save();
      ctx.font = 'bold 11px Arial, sans-serif';
      const labelW = Math.min(aw + 54, Math.max(88, ctx.measureText(label).width + 16));
      const labelX = Math.max(2, Math.min(CANVAS_W - labelW - 2, apx + aw / 2 - labelW / 2));
      const labelY = apy >= 28 ? apy - 25 : apy + ah + 4;
      ctx.fillStyle = 'rgba(5,9,22,.94)';
      ctx.fillRect(labelX, labelY, labelW, 20);
      ctx.strokeStyle = '#ffd95a';
      ctx.lineWidth = 2;
      ctx.strokeRect(labelX, labelY, labelW, 20);
      ctx.fillStyle = activeU.isHero ? '#b9e8ff' : '#ffaaa2';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, labelX + labelW / 2, labelY + 10, labelW - 10);
      ctx.restore();
    }
    drawBattleCombatFx(ctx, b);
    ctx.restore();
  }

  function renderInitiative() {
    const bar = document.getElementById('initiative-bar');
    const focus = document.getElementById('turn-focus-banner');
    const b = GameState.currentBattle;
    bar.innerHTML = '';
    if (!b) {
      if (focus) focus.classList.add('hidden');
      return;
    }
    const active = getActiveUnit();
    const cycle = b.phase === 'combat' ? initiativeCycleUnits(b) : b.order.map(unitIdx => b.units[unitIdx]).filter(u => u && u.hp > 0);
    cycle.forEach((u, turnStep) => {
      const d = document.createElement('div');
      d.className = 'init-slot ' + (u.isHero ? 'hero' : 'enemy') +
        (u === active && b.phase === 'combat' ? ' active current' : '') +
        (turnStep === 1 && b.phase === 'combat' ? ' next' : '');
      d.dataset.turnStep = String(turnStep);
      const imgSrc = u.isHero ? HERO_TEXTURE_PATHS[u.heroId] : ENEMY_TEXTURE_PATHS[u.enemyId];
      if (imgSrc) {
        const img = document.createElement('img');
        img.src = imgSrc;
        if (!u.isHero) img.style.transform = 'scaleX(-1)';
        d.appendChild(img);
      } else {
        d.textContent = u.isHero ? u.sprite : u.emoji;
      }
      const tipLines = [
        u.name,
        `HP: ${u.hp}/${u.maxHp}`,
        `⚔ Attack: ${u.attack}`,
        u.armor ? `🛡 Armor: ${u.armor}` : '',
        `👟 Move: ${u.move}`,
        u.range > 1 ? `🎯 Range: ${u.range}` : '',
      ].filter(Boolean);
      d.title = tipLines.join('\n');
      bar.appendChild(d);
    });
    if (focus) {
      const next = cycle[1] || null;
      if (b.phase !== 'combat' || !active) {
        focus.classList.add('hidden');
        focus.innerHTML = '';
      } else {
        focus.classList.remove('hidden');
        focus.innerHTML = `
          <span class="turn-focus-unit now"><small>${translateKey('turnNow')}</small><strong>${escapeHtml(translateText(active.name))}</strong></span>
          <span class="turn-focus-arrow">→</span>
          <span class="turn-focus-unit"><small>${translateKey('turnNext')}</small><strong>${next ? escapeHtml(translateText(next.name)) : '—'}</strong></span>`;
      }
    }
  }

  function renderBattleLog() {
    const el = document.getElementById('battle-log');
    const b = GameState.currentBattle;
    const lines = b ? b.battleLog : [];
    el.innerHTML = lines.slice(-80).map(l => {
      const cls = l.t === 'hero' ? 'l-hero' : l.t === 'enemy' ? 'l-enemy' : 'l-status';
      return `<div class="${cls}">${translateText(l.text)}</div>`;
    }).join('');
    el.scrollTop = el.scrollHeight;
  }
  function pushBattleLog(text, t) {
    const b = GameState.currentBattle;
    if (b) {
      b.battleLog.push({ text: translateText(text), t: t || 'status' });
      renderBattleLog();
    }
  }

  // 12: Skull death animation
  function canvasToScreen(canvasPx_x, canvasPx_y) {
    const rect = canvasContentRect();
    const scaleX = rect.width / CANVAS_W;
    const scaleY = rect.height / CANVAS_H;
    return {
      sx: rect.left + canvasPx_x * scaleX,
      sy: rect.top + canvasPx_y * scaleY
    };
  }

  function spawnSkullFx(gx, gy) {
    const layer = document.getElementById('fx-layer');
    const cx = (gx * CELL + CELL / 2) * BattleView.zoom + BattleView.offsetX;
    const cy = (gy * CELL + CELL / 2) * BattleView.zoom + BattleView.offsetY;
    const { sx, sy } = canvasToScreen(cx, cy);
    const d = document.createElement('div');
    d.className = 'fx-skull';
    d.textContent = '💀';
    d.style.left = sx + 'px';
    d.style.top = (sy - 16) + 'px';
    layer.appendChild(d);
    setTimeout(() => d.remove(), 750);
  }

  function spawnDamageFx(x, y, n) {
    const layer = document.getElementById('fx-layer');
    const cx = (x * CELL + CELL / 2) * BattleView.zoom + BattleView.offsetX;
    const cy = (y * CELL) * BattleView.zoom + BattleView.offsetY;
    const { sx, sy } = canvasToScreen(cx, cy);
    const d = document.createElement('div');
    d.className = 'fx-dmg';
    d.style.color = '#ff5555';
    d.style.left = sx + 'px';
    d.style.top = sy + 'px';
    d.textContent = '-' + n;
    layer.appendChild(d);
    setTimeout(() => d.remove(), 900);
  }

  function spawnImpactFx(attacker, target, opts, damage) {
    const layer = document.getElementById('fx-layer');
    if (!layer || !target) return;
    const cx = (target.x * CELL + CELL / 2) * BattleView.zoom + BattleView.offsetX;
    const cy = (target.y * CELL + CELL / 2) * BattleView.zoom + BattleView.offsetY;
    const { sx, sy } = canvasToScreen(cx, cy);
    const impact = document.createElement('div');
    const kind = opts?.magic ? ' is-magic' : (attacker?.range > 1 ? ' is-ranged' : '');
    const strong = damage >= 10 || opts?.fire ? ' is-strong' : '';
    impact.className = `fx-impact${kind}${strong}`;
    impact.style.left = `${sx}px`;
    impact.style.top = `${sy}px`;
    layer.appendChild(impact);
    setTimeout(() => impact.remove(), battleDelay(320));
    if (strong) {
      const wrap = document.getElementById('battle-wrap');
      wrap?.classList.remove('impact-shake');
      void wrap?.offsetWidth;
      wrap?.classList.add('impact-shake');
      setTimeout(() => wrap?.classList.remove('impact-shake'), battleDelay(180));
    }
  }

  function battleDelay(ms) {
    return Math.max(20, Math.round(ms / (GameState.battleSpeed === 2 ? 2 : 1)));
  }

  function bindBattleSpeedToggle() {
    const btn = document.getElementById('battle-speed-toggle');
    if (!btn) return;
    const updateLabel = () => {
      const value = `×${GameState.battleSpeed === 2 ? 2 : 1}`;
      btn.textContent = `${translateKey('battleSpeed')}: ${value}`;
      btn.title = btn.textContent;
    };
    updateLabel();
    btn.onclick = () => {
      GameState.battleSpeed = GameState.battleSpeed === 2 ? 1 : 2;
      updateLabel();
      saveGame();
    };
  }

  function spawnBattleTextFx(x, y, text, color) {
    const layer = document.getElementById('fx-layer');
    if (!layer) return;
    const cx = (x * CELL + CELL / 2) * BattleView.zoom + BattleView.offsetX;
    const cy = (y * CELL + CELL * 0.25) * BattleView.zoom + BattleView.offsetY;
    const { sx, sy } = canvasToScreen(cx, cy);
    const d = document.createElement('div');
    d.className = 'fx-dmg';
    d.style.color = color || '#f0e68c';
    d.style.left = sx + 'px';
    d.style.top = sy + 'px';
    d.textContent = text;
    layer.appendChild(d);
    setTimeout(() => d.remove(), 900);
  }

  let rafId = 0;
  function loop() {
    if (GameState.adPaused) {
      rafId = requestAnimationFrame(loop);
      return;
    }
    drawBattle();
    rafId = requestAnimationFrame(loop);
  }

  //══════════ BATTLE: turn flow, fire, deploy ══════════
  function countDeployedHeroes(b) {
    return b.units.filter(u => u.isHero && u.hp > 0 && u.x >= 0).length;
  }
  function beginCombatFromDeploy() {
    const b = GameState.currentBattle;
    if (!b || b.phase !== 'deploy') return;
    if (countDeployedHeroes(b) < 1) {
      void showGameAlert(translateKey('placeHeroFirst'));
      return;
    }
    b.phase = 'combat';
    b.heroMoved = false;
    b.heroActionDone = false;
    b.heroMoveUndo = null;
    b.battleLog.push({ text: 'Battle!', t: 'status' });
    renderBattleLog();
    buildInitiative();
    b.activeIndex = 0;
    b.units.filter(u => u.enemyId === ENEMY_IDS.DARK_LORD && u.phase === 1).forEach(dl => {
      if (!dl.aiVar.initSummon) {
        dl.aiVar.initSummon = true;
        let cnt = 0;
        for (let y = 0; y < GRID_H && cnt < 4; y++) for (let x = GRID_W - 2; x < GRID_W && cnt < 4; x++) {
          const guardProto = { isHero: false, enemyId: ENEMY_IDS.ORC_GUARD, sizeW: 1, sizeH: 1 };
          if (canUnitOccupy(b, guardProto, x, y, { end: true })) { b.units.push(spawnEnemy(ENEMY_IDS.ORC_GUARD, x, y)); cnt++; }
        }
        playBattleAbilityFx(dl, 'darkLordSummon', { radius: 2, glyph: '☠' });
        buildInitiative();
      }
    });
    const fu = getActiveUnit();
    const watcher = findWatcher(b);
    if (watcher) {
      playBattleAbilityFx(watcher, 'watcherAura', { radius: 2, glyph: '👁' });
      if (typeof BattleSfx !== 'undefined') BattleSfx.playSampledUrl(BSX.enemies_watcher_buff, 0.55);
    }
    if (fu && !fu.isHero) setTimeout(() => runEnemyTurn(), battleDelay(120));
    else {
      prepareHeroTurnMode(b, fu);
      updateBattleUI();
    }
  }
  function applyGroundEffects(u) {
    const b = GameState.currentBattle;
    if (!b) return;
    const t = b.grid[u.y][u.x];
    if (t === TILE.FIRE) {
      const hpBeforeFire = u.hp;
      u.hp -= 3;
      startBattleAttackAnimation(u, u, { animationProfile: 'fire', animationImpactOnly: true }, 3, hpBeforeFire);
      pushBattleLog(`🔥 ${u.emoji} burns in fire (−3)`, 'status');
      if (typeof BattleSfx !== 'undefined') BattleSfx.playSampledUrl(BSX.status_tick_burn, 0.5);
      if (u.hp <= 0) onUnitDeath(u);
    }
  }
  function spawnScenarioWave(b, enemyIds, mode = 'edge') {
    (enemyIds || []).forEach((enemyId, index) => {
      const proto = { isHero: false, enemyId, sizeW: enemyDef(enemyId).sizeW || 1, sizeH: enemyDef(enemyId).sizeH || 1 };
      const edgeSlots = [
        { x: GRID_W - unitWidth(proto), y: index % GRID_H },
        { x: GRID_W - unitWidth(proto), y: GRID_H - 1 - (index % GRID_H) },
        { x: Math.max(0, GRID_W - unitWidth(proto) - 1), y: Math.floor(GRID_H / 2) }
      ];
      const pressureSlots = [
        { x: 5, y: 1 + (index * 3) % 6 },
        { x: 4, y: 2 + (index * 2) % 4 },
        { x: 6, y: index % GRID_H }
      ];
      const slots = mode === 'pressure' ? pressureSlots.concat(edgeSlots) : edgeSlots;
      const slot = slots.find(point => canUnitOccupy(b, proto, point.x, point.y, { end: true }));
      if (slot) b.units.push(spawnEnemy(enemyId, slot.x, slot.y));
    });
  }

  function applyScenarioRoundStart(b) {
    const outcome = CampaignExpansion.onRoundStarted(b);
    if (outcome.spawn?.length) {
      spawnScenarioWave(b, outcome.spawn, outcome.spawnMode);
      buildInitiative();
    }
    if (outcome.log) pushBattleLog(outcome.log, 'status');
    if (CampaignExpansion.isDefeat(b)) {
      spawnBattleTextFx(4, 3, 'OBJECTIVE LOST', '#ff6b6b');
      checkBattleEnd();
    }
  }
  function advanceSingleTurn() {
    const b = GameState.currentBattle;
    if (!b || !b.order.length) return null;
    b.activeIndex++;
    if (b.activeIndex >= b.order.length) {
      b.activeIndex = 0;
      b.round++;
      b.units.forEach(u => { if (u.isHero) { u.flags = u.flags || {}; u.flags.firstAttackTurn = true; } });
      if (b.globalBuffs.watcherDeadMove > 0) b.globalBuffs.watcherDeadMove--;
      buildInitiative();
      applyScenarioRoundStart(b);
    }
    let guard = 0;
    while (guard++ < 32) {
      const u = getActiveUnit();
      if (!u) return null;
      if (u.hp > 0) return u;
      b.activeIndex++;
      if (b.activeIndex >= b.order.length) {
        b.activeIndex = 0;
        b.round++;
        buildInitiative();
        applyScenarioRoundStart(b);
      }
    }
    return null;
  }
  function endUnitTurn() {
    const b = GameState.currentBattle;
    if (!b) return;
    const visualRemaining = Math.max(0, (b.visualLockUntil || 0) - performance.now());
    if (visualRemaining > 8) {
      if (b._turnAdvanceTimer) return;
      const battleRef = b;
      b.turnTransitionLocked = true;
      b._turnAdvanceTimer = setTimeout(() => {
        if (GameState.currentBattle !== battleRef || battleRef.phase !== 'combat') return;
        battleRef._turnAdvanceTimer = null;
        battleRef.turnTransitionLocked = false;
        endUnitTurn();
      }, visualRemaining + battleAnimationMs(120));
      updateBattleUI();
      return;
    }
    b.visualLockUntil = 0;
    b.turnTransitionLocked = false;
    const prev = getActiveUnit();
    if (prev) {
      tickStatusesEndTurn(prev);
      if (prev.isHero) syncHeroFromUnit(prev);
    }
    b.heroMoved = false;
    b.heroActionDone = false;
    b.heroMoveUndo = null;
    b.selected = null;
    b.mode = 'idle';
    b.pendingSkill = null;

    let turnGuard = 0;
    const maxTurnSkips = Math.max(12, (b.units.length || 0) * 4);
    for (;;) {
      if (++turnGuard > maxTurnSkips) {
        console.error('endUnitTurn: turn queue guard exceeded');
        pushBattleLog('Turn order error: turn passed to heroes', 'status');
        const guardHero = getActiveUnit();
        if (guardHero && guardHero.isHero) prepareHeroTurnMode(b, guardHero);
        else b.mode = 'move';
        updateBattleUI();
        return;
      }
      const nu = advanceSingleTurn();
      if (!nu) { resolveBattleIfOver(); return; }
      if (resolveBattleIfOver()) return;
      if (nu.isHero && nu.heroId === 'garet' && nu.flags) nu.flags.fireCallMitigateActive = false;
      tickStatusesStart(nu);
      if (b.grid[nu.y] && b.grid[nu.y][nu.x] === TILE.FIRE) applyGroundEffects(nu);
      if (nu.hp <= 0) {
        if (!nu._deathHandled) onUnitDeath(nu);
        if (resolveBattleIfOver()) return;
        continue;
      }
      if (nu.isHero) {
        let manaGain = 2;
        // Item: manaRegen from crystal artifact
        const manaArt = getEquippedItem(nu, 'artifact');
        if (manaArt && manaArt.mods.manaRegen) manaGain += manaArt.mods.manaRegen;
        nu.mana = Math.min(nu.maxMana, (nu.mana || 0) + manaGain);
        if (manaArt && manaArt.mods.manaRegen) {
          pushBattleLog(`${nu.name}: Mana Crystal +${manaArt.mods.manaRegen} mana`, 'status');
          spawnBattleTextFx(nu.x, nu.y, 'MANA +' + manaArt.mods.manaRegen, '#8bd3ff');
        }
        Object.keys(nu.cds || {}).forEach(k => { if (nu.cds[k] > 0) nu.cds[k]--; });
        const hh = GameState.heroes.find(x => x.id === nu.heroId);
        if (hh) hh.cds = { ...nu.cds };
      }
      if (nu.activeStatuses && nu.activeStatuses.find(s => s.type === STATUS.STUN || s.type === STATUS.FREEZE || s.type === STATUS.FEAR)) {
        pushBattleLog(`${nu.emoji} skips a turn (stun/freeze)`, 'status');
        continue;
      }
      if (nu.isHero && typeof BattleSfx !== 'undefined') BattleSfx.heroTurnEnter(nu);
      if (!nu.isHero) {
        setTimeout(() => runEnemyTurn(), battleDelay(80));
        updateBattleUI();
        return;
      }
      prepareHeroTurnMode(b, nu);
      updateBattleUI();
      return;
    }
  }
  function checkBattleEnd() {
    const b = GameState.currentBattle;
    if (!b || b._victoryHandled) return;
    const scenarioWon = CampaignExpansion.isVictory(b);
    const scenarioLost = CampaignExpansion.isDefeat(b);
    const deathRemaining = activeDeathAnimationRemaining(b);
    const clearEndsScenario = !b.scenario || ['eliminate', 'ritual'].includes(b.scenario.id);
    const clearVictory = allEnemiesDead(b) && clearEndsScenario;
    if ((clearVictory || allHeroesDead(b) || scenarioWon || scenarioLost) && deathRemaining > 20) {
      if (!b._deathEndTimer) {
        b._deathEndTimer = setTimeout(() => {
          b._deathEndTimer = null;
          checkBattleEnd();
        }, deathRemaining + 35);
      }
      return;
    }
    if (scenarioWon || clearVictory) {
      const node = getCellById(b.nodeId);
      if (node?.type === 'final') {
        endBattleVictory();
        CampaignExpansion.recordCompletedRun('victory');
        updateRecordsFromState({ finished: true });
        saveGame();
        showScreen('ending');
        renderEndingSummary();
        return;
      }
      endBattleVictory();
      return;
    }
    if (scenarioLost || allHeroesDead(b)) {
      CampaignExpansion.recordCompletedRun('defeat');
      if (typeof BattleSfx !== 'undefined') {
        BattleSfx.playSampledUrl(BSX.common_defeat, 0.75);
        BattleSfx.playSampledUrl(BSX.ui_defeat_screen, 0.8, 0.05);
      }
      GameState.screen = 'gameover';
      renderGameOverUI();
      showScreen('gameover');
    }
  }

  function renderEndingSummary() {
    const root = document.getElementById('ending-stats');
    if (!root) return;
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - (GameState.runStartedAt || Date.now())) / 60000));
    const builds = GameState.heroes.map(hero => {
      const perkNames = (hero.perks || []).map(p => {
        const desc = PERK_DESCRIPTIONS[p];
        return desc ? (desc[currentLanguage()] || desc.en || p) : p;
      }).slice(0, 3);
      const gear = Object.values(hero.equipment || {}).filter(Boolean).map(id => translateText(itemById(id)?.name || id));
      return `<div class="ending-build"><strong>${hero.emoji} ${hero.name} · LV ${hero.level}</strong><span>${perkNames.join(' · ') || '—'}</span><small>${gear.join(' · ') || translateKey('emptyBag')}</small></div>`;
    }).join('');
    const resultCodeSource = JSON.stringify({
      seed: GameState.testSeed || 'random',
      difficulty: GameState.difficulty,
      turn: GameState.turn,
      stats: GameState.stats,
      heroes: GameState.heroes.map(h => ({ id:h.id, level:h.level, perks:h.perksApplied || [] }))
    });
    const resultCode = hashSeed(resultCodeSource).toString(36).toUpperCase().padStart(7, '0');
    const contract = CampaignExpansion.CONTRACTS[GameState.contract];
    const contractLine = contract ? `${contract.icon} ${CampaignExpansion.loc(contract.name)}` : '—';
    const mutatorLine = (GameState.campaignMutators || []).map(id => {
      const mutator = CampaignExpansion.MUTATORS[id];
      return mutator ? `${mutator.icon} ${CampaignExpansion.loc(mutator.name)}` : id;
    }).join(' · ');
    root.innerHTML = `<div class="ending-summary-grid">
      <div><strong>${translateKey('statBattles')}</strong><span>${GameState.stats.battles}</span></div>
      <div><strong>${translateKey('gold')}</strong><span>${GameState.gold}</span></div>
      <div><strong>${translateKey('runTime')}</strong><span>${elapsedMinutes} min</span></div>
      <div><strong>${translateKey('survivors')}</strong><span>${GameState.heroes.filter(h => h.hp > 0).length}/3</span></div>
      <div><strong>${translateKey('statObjectives')}</strong><span>${GameState.stats.objectivesCompleted || 0}/${GameState.stats.battles || 0}</span></div>
      <div><strong>${translateKey('statDamageTaken')}</strong><span>${GameState.stats.damageTaken || 0}</span></div>
      <div><strong>${translateKey('statSkillBattles')}</strong><span>${GameState.stats.skillfulBattles || 0}</span></div>
    </div><div class="ending-build-title">${translateKey('heroBuilds')}</div>${builds}
    <div class="ending-seed">${translateKey('difficulty')}: ${translateKey(isHardcoreMode() ? 'hardcore' : 'normal')} · ${translateKey('runSeed')}: ${escapeHtml(GameState.testSeed || 'random')} · ${translateKey('runCode')}: <strong>${resultCode}</strong><br>${currentLanguage() === 'ru' ? 'Контракт' : 'Contract'}: ${contractLine}<br>${currentLanguage() === 'ru' ? 'Правила похода' : 'Run rules'}: ${mutatorLine || '—'}</div>`;
  }

  function renderGameOverUI() {
    const statsEl = document.getElementById('go-stats');
    if (!statsEl) return;
    const titleEl = document.querySelector('#gameover-screen .gameover-title');
    const subEl = document.querySelector('#gameover-screen .gameover-sub');
    const reviveBtn = document.getElementById('btn-ad-revive');
    const loadBtn = document.getElementById('btn-load-last');
    const restartBtn = document.getElementById('btn-go-title');
    if (titleEl) titleEl.textContent = translateKey('defeat');
    if (subEl) subEl.textContent = translateKey('defeatSub');
    if (reviveBtn) reviveBtn.textContent = translateKey('reviveAd');
    if (loadBtn) loadBtn.textContent = translateKey('loadLast');
    if (restartBtn) restartBtn.textContent = translateKey('restart');
    statsEl.innerHTML = `
      <div class="gameover-stat">
        <div class="gameover-stat-val">${GameState.stats.battles}</div>
        <div class="gameover-stat-label">${translateKey('statBattles')}</div>
      </div>
      <div class="gameover-stat">
        <div class="gameover-stat-val">${GameState.stats.kills}</div>
        <div class="gameover-stat-label">${translateKey('statEnemies')}</div>
      </div>
      <div class="gameover-stat">
        <div class="gameover-stat-val">${GameState.gold}</div>
        <div class="gameover-stat-label">${translateKey('gold')}</div>
      </div>`;
  }

  function localizedNodeType(type) {
    const keys = {
      mission: 'nodeMission',
      city: 'nodeCity',
      dungeon: 'nodeDungeon',
      event: 'nodeEvent',
      boss: 'nodeBoss',
      wanderer: 'nodeWanderer',
      arena: 'nodeArena',
      final: 'nodeFinal'
    };
    return translateKey(keys[type] || 'nodeMission');
  }

  function localizedBattleLabel(meta) {
    if (!meta || !meta.region) return translateKey('missionComplete');
    return `${translateKey('region')} ${meta.region} · ${localizedNodeType(meta.type)}`;
  }

  //══════════ AI ══════════
  function priorityTarget(b) {
    const heroes = b.units.filter(u => u.isHero && u.hp > 0);
    const mage = heroes.find(h => h.heroId === 'seris');
    if (mage) return mage;
    const arch = heroes.find(h => h.heroId === 'alira');
    if (arch) return arch;
    return heroes[0];
  }
  function findWatcher(b) {
    return b.units.find(u => !u.isHero && u.enemyId === ENEMY_IDS.WATCHER && u.hp > 0);
  }
  function aiChooseTarget(b, self) {
    const heroes = b.units.filter(u => u.isHero && u.hp > 0);
    if (!heroes.length) return null;
    if (self && [ENEMY_IDS.ASSASSIN, ENEMY_IDS.VOID_STALKER, ENEMY_IDS.WOLF].includes(self.enemyId)) {
      return heroes.reduce((a, h) => (a.hp < h.hp ? a : h));
    }
    const w = findWatcher(b);
    if (w) {
      let best = null, bd = 999;
      for (const h of heroes) {
        const d = Math.abs(h.x - w.x) + Math.abs(h.y - w.y);
        if (d < bd) { bd = d; best = h; }
      }
      if (best) return best;
    }
    return priorityTarget(b);
  }
  function enemyPassable(b, x, y, self) {
    return canUnitOccupy(b, self, x, y, { pass: true });
  }
  function runEnemyTurn() {
    if (GameState.adPaused) {
      GameState.pendingEnemyTurnAfterAd = true;
      return;
    }
    const b = GameState.currentBattle;
    if (!b || b.phase !== 'combat') return;
    const u = getActiveUnit();
    if (!u || u.isHero || u.hp <= 0) { endUnitTurn(); return; }
    let enemyTurnEnded = false;
    const finishEnemyTurn = () => {
      if (enemyTurnEnded) return;
      enemyTurnEnded = true;
      // Persist minimal distance to heroes for anti-stall logic on the next turn.
      try {
        const heroesNow = b.units.filter(h => h.isHero && h.hp > 0);
        if (heroesNow.length) {
          let dMin = 999;
          for (const h of heroesNow) {
            const d = unitDistance(u, h);
            if (d < dMin) dMin = d;
          }
          u.aiVar = u.aiVar || {};
          u.aiVar.prevMinHeroDist = dMin;
          u.aiVar.forceChase = false;
        }
      } catch (e) {}
      endUnitTurn();
    };
    try {

    // Special AI for specific enemy types
    if (u.enemyId === ENEMY_IDS.DARK_LORD) { darkLordAi(u); finishEnemyTurn(); return; }
    if (u.enemyId === ENEMY_IDS.FIRE_TITAN) { fireTitanAi(u); finishEnemyTurn(); return; }
    if (u.enemyId === ENEMY_IDS.LESHY) { leshyAi(u); finishEnemyTurn(); return; }
    if (u.enemyId === ENEMY_IDS.SUICIDE) { bomberAi(u); finishEnemyTurn(); return; }

    // Shaman: heal lowest HP ally every other turn
    if (u.enemyId === ENEMY_IDS.SHAMAN) {
      u.aiVar = u.aiVar || {};
      u.aiVar.healCd = (u.aiVar.healCd || 0) - 1;
      if (u.aiVar.healCd <= 0) {
        const wounded = b.units.filter(x => !x.isHero && x.hp > 0 && x.hp < x.maxHp)
          .sort((a, z) => a.hp - z.hp)[0];
        if (wounded) {
          const heal = Math.floor(wounded.maxHp * 0.3);
          wounded.hp = Math.min(wounded.maxHp, wounded.hp + heal);
          playBattleAbilityFx(u, 'shamanHeal', { target: wounded, glyph: '✚' });
          pushBattleLog(`🧙 ${u.name} heals ${wounded.emoji} ${wounded.name} for ${heal}`, 'enemy');
          if (typeof BattleSfx !== 'undefined') BattleSfx.playSampledUrl(BSX.enemies_shaman_heal, 0.75);
          u.aiVar.healCd = 2;
          finishEnemyTurn(); return;
        }
      }
    }

    // Plague doctor: small heal to lowest HP ally every 3 turns (support enemy, kill priority)
    if (u.enemyId === ENEMY_IDS.PLAGUE_DOCTOR) {
      u.aiVar = u.aiVar || {};
      u.aiVar.healCd = (u.aiVar.healCd || 0) - 1;
      if (u.aiVar.healCd <= 0) {
        const wounded = b.units.filter(x => !x.isHero && x.hp > 0 && x.hp < x.maxHp)
          .sort((a, z) => (a.hp / a.maxHp) - (z.hp / z.maxHp))[0];
        if (wounded) {
          const heal = 6;
          wounded.hp = Math.min(wounded.maxHp, wounded.hp + heal);
          playBattleAbilityFx(u, 'plagueHeal', { target: wounded, glyph: '✚' });
          pushBattleLog(`🧪 ${u.name} heals ${wounded.emoji} ${wounded.name} for ${heal}`, 'enemy');
          if (typeof BattleSfx !== 'undefined') BattleSfx.playSampledUrl(BSX.enemies_shaman_heal, 0.65);
          u.aiVar.healCd = 3;
          finishEnemyTurn(); return;
        }
      }
    }

    const heroes = b.units.filter(h => h.isHero && h.hp > 0);
    if (!heroes.length) { finishEnemyTurn(); return; }

    if (u.enemyId === ENEMY_IDS.NECRO) {
      u.aiVar = u.aiVar || {};
      u.aiVar.raiseCd = (u.aiVar.raiseCd || 0) - 1;
      if (u.aiVar.raiseCd <= 0 && (u.aiVar.raiseCount || 0) < 4) {
        let raised = false;
        for (let t = 0; t < 40 && !raised; t++) {
          const x = randInt(Math.max(0, u.x - 2), Math.min(GRID_W - 1, u.x + 2));
          const y = randInt(Math.max(0, u.y - 2), Math.min(GRID_H - 1, u.y + 2));
          const skelProto = { isHero: false, enemyId: ENEMY_IDS.SKELETON, sizeW: 1, sizeH: 1 };
          if (canUnitOccupy(b, skelProto, x, y, { end: true })) {
            b.units.push(spawnEnemy(ENEMY_IDS.SKELETON, x, y));
            playBattleAbilityFx(u, 'necroRaise', { x, y, glyph: '☠' });
            if (typeof BattleSfx !== 'undefined') BattleSfx.playSampledUrl(BSX.enemies_necro_raise, 0.78);
            pushBattleLog(`🔮 ${u.name} raises a skeleton!`, 'enemy');
            u.aiVar.raiseCd = 3;
            u.aiVar.raiseCount = (u.aiVar.raiseCount || 0) + 1;
            buildInitiative();
            raised = true;
          }
        }
        if (raised) { finishEnemyTurn(); return; }
      }
    }

    if (u.enemyId === ENEMY_IDS.HYDRA && u.hp < u.maxHp) {
      const heal = Math.min(4, u.maxHp - u.hp);
      u.hp += heal;
      playBattleAbilityFx(u, 'hydraRegenerate', { glyph: '✚' });
      pushBattleLog(`🐍 ${u.name} regenerates +${heal} HP`, 'enemy');
    }

    if (u.enemyId === ENEMY_IDS.WATCHER) {
      if (getMovePoints(u, b) > 0) {
        const backCell = pickWatcherStayBackCell(b, u, heroes);
        if (backCell) enemyStepToCell(b, u, backCell);
      }
      finishEnemyTurn();
      return;
    }

    // Anti-stall: if last turn the enemy didn't get closer to any hero, it will temporarily
    // ignore high terrain costs (water/forest) to keep pressure on the player.
    u.aiVar = u.aiVar || {};
    let curMinHeroDist = 999;
    for (const h of heroes) {
      const d = unitDistance(u, h);
      if (d < curMinHeroDist) curMinHeroDist = d;
    }
    u.aiVar.forceChase = (u.aiVar.prevMinHeroDist !== undefined && curMinHeroDist >= u.aiVar.prevMinHeroDist);

    if (u.enemyId === ENEMY_IDS.CHAOS) {
      u.bossVar = u.bossVar || { aoeTurn: 0 };
      u.bossVar.aoeTurn = (u.bossVar.aoeTurn || 0) + 1;
      const nearby = heroes.filter(h => unitDistance(u, h) <= 1);
      if (nearby.length) {
        if (typeof BattleSfx !== 'undefined') BattleSfx.playSampledUrl(BSX.enemies_chaos_attack, 0.82);
        playBattleAbilityFx(u, 'chaosAoe', { radius: 1, glyph: '🌀' });
        nearby.forEach(h => {
          dealDamage(u, h, 7, { magic: true, sfxImpactOnly: true, animationProfile: 'aoe', animationImpactOnly: true, animationOffsetMs: 190 });
          if (h.hp > 0 && u.bossVar.aoeTurn % 2 === 0) addStatus(h, STATUS.CURSE, 1);
        });
        pushBattleLog(`🌀 ${u.name} warps space around itself`, 'enemy');
      }
    }

    const inRange = (ax, ay, tgt) => {
      const candidate = { ...u, x: ax, y: ay };
      const targetCell = closestUnitCellToPoint(tgt, ax, ay);
      const d = unitDistance(candidate, tgt);
      return d > 0 && d <= u.range && (u.range === 1 || !rangedBlocked(ax, ay, targetCell.x, targetCell.y, b.grid, false));
    };

    const doEnemyAttack = (tgt) => {
      aiAttack(u, tgt);
    };

    // Choose target: priority first, fallback nearest
    const target = aiChooseTarget(b, u);

    // Expected damage this unit can deal to a hero (ignoring procs/perks)
    const effectiveDmg = (tgt) => Math.max(0, u.attack - tgt.armor);

    // Helper: pick best in-range target — prefer damageable heroes, then priority order
    const bestInRangeTarget = (ax, ay) => {
      const inR = heroes.filter(h => inRange(ax, ay, h));
      if (!inR.length) return null;
      const damageable = inR.filter(h => effectiveDmg(h) > 0);
      const pool = damageable.length ? damageable : inR; // fall back if all armoured
      return pool.find(h => h.heroId === 'seris')
        || pool.find(h => h.heroId === 'alira')
        || pool.reduce((a, b) => a.hp < b.hp ? a : b); // lowest HP
    };

    const isRanged = u.range > 1;

      // Already in attack range: ranged units first try to step back to max distance.
    const preTarget = bestInRangeTarget(u.x, u.y);
    if (preTarget) {
      if (isRanged && getMovePoints(u, b) > 0) {
        const distNow = unitDistance(u, preTarget);
        if (distNow < u.range) {
          const kiteCell = pickRangedEnemyMoveCell(b, u, heroes, inRange, effectiveDmg, { focusHero: preTarget });
          if (kiteCell) enemyStepToCell(b, u, kiteCell);
        }
      }
      const attackTarget = bestInRangeTarget(u.x, u.y);
      if (attackTarget) {
        doEnemyAttack(attackTarget);
        finishEnemyTurn();
        return;
      }
    }

    // Move: flood-fill with forest and water costs, same as heroes.
    if (getMovePoints(u, b) > 0) {
      const heroesSorted = [...heroes].sort((a, b) => {
        const da = effectiveDmg(a), db = effectiveDmg(b);
        if (da !== db) return db - da;
        return unitDistance(u, a) - unitDistance(u, b);
      });
      const moveOpts = enemyMoveOpts(u);
      let moveCell = null;
      if (isRanged) moveCell = pickRangedEnemyMoveCell(b, u, heroes, inRange, effectiveDmg, moveOpts);
      if (!moveCell) moveCell = pickEnemyMoveCell(b, u, target, moveOpts);
      if (!moveCell) {
        for (const h of heroesSorted) {
          moveCell = isRanged
            ? pickRangedEnemyMoveCell(b, u, heroes, inRange, effectiveDmg, moveOpts)
            : pickEnemyMoveCell(b, u, h, moveOpts);
          if (moveCell) break;
        }
      }
      if (moveCell) enemyStepToCell(b, u, moveCell);
    }

    // After moving, attack nearest in-range hero (respecting priority)
    const tgtAfterMove = bestInRangeTarget(u.x, u.y);
    if (tgtAfterMove) {
      doEnemyAttack(tgtAfterMove);
    }
    finishEnemyTurn();
    } catch (err) {
      console.error('runEnemyTurn', err);
      pushBattleLog('Enemy turn failed', 'status');
      finishEnemyTurn();
    }
  }

  function findLeshySummonCell(b, leshy, enemyId) {
    const proto = { isHero: false, enemyId, sizeW: 1, sizeH: 1 };
    const candidates = [];
    const left = Math.max(0, leshy.x - 3);
    const right = Math.min(GRID_W - 1, leshy.x + unitWidth(leshy) + 2);
    const top = Math.max(0, leshy.y - 3);
    const bottom = Math.min(GRID_H - 1, leshy.y + unitHeight(leshy) + 2);
    for (let y = top; y <= bottom; y++) {
      for (let x = left; x <= right; x++) {
        const dx = x < leshy.x ? leshy.x - x : Math.max(0, x - (leshy.x + unitWidth(leshy) - 1));
        const dy = y < leshy.y ? leshy.y - y : Math.max(0, y - (leshy.y + unitHeight(leshy) - 1));
        const distance = dx + dy;
        if (distance > 0 && distance <= 3 && canUnitOccupy(b, proto, x, y, { end: true })) {
          candidates.push({ x, y, distance });
        }
      }
    }
    if (!candidates.length) return null;
    candidates.sort((a, z) => a.distance - z.distance || a.y - z.y || a.x - z.x);
    const nearestDistance = candidates[0].distance;
    const nearest = candidates.filter(cell => cell.distance === nearestDistance);
    return nearest[randInt(0, nearest.length - 1)];
  }

  function leshyAi(u) {
    const b = GameState.currentBattle;
    if (!b) return;
    u.bossVar = u.bossVar || { turn: 0, summonCooldown: 0, summonSerial: 0, phase2: false };
    const v = u.bossVar;
    v.turn = (v.turn || 0) + 1;
    const livingSummons = b.units.filter(unit => !unit.isHero && unit.hp > 0 && unit.summonedByLeshy);
    const plan = LeshyBoss.planTurn({
      turn: v.turn,
      hp: u.hp,
      maxHp: u.maxHp,
      livingSummons: livingSummons.length,
      summonCooldown: v.summonCooldown,
      phase2: v.phase2
    });
    v.phase2 = plan.phase2;
    v.summonCooldown = plan.nextCooldown;

    if (plan.empowerSummons) {
      livingSummons.forEach(summon => {
        if (summon.leshyEmpowered) return;
        summon.attack += LeshyBoss.PROFILE.phaseAttackBonus;
        summon.leshyEmpowered = true;
      });
      pushBattleLog(`🌿 ${translateText(u.name)}: ${translateKey('leshyAwakens')}`, 'enemy');
      spawnBattleTextFx(u.x, u.y, '+2 ATK', '#8fe06b');
      playBattleAbilityFx(u, 'leshyAwaken', { radius: 2, glyph: '🌿' });
      if (typeof BattleSfx !== 'undefined') BattleSfx.playSampledUrl(BSX.enemies_chaos_attack, 0.65);
    }

    let summoned = 0;
    const summonTypes = LeshyBoss.summonTypes(v.summonSerial, plan.summonCount);
    summonTypes.forEach(enemyId => {
      const cell = findLeshySummonCell(b, u, enemyId);
      if (!cell) return;
      const summon = spawnEnemy(enemyId, cell.x, cell.y);
      summon.summonedByLeshy = true;
      if (v.phase2) {
        summon.attack += LeshyBoss.PROFILE.phaseAttackBonus;
        summon.leshyEmpowered = true;
      }
      b.units.push(summon);
      summoned++;
      pushBattleLog(`🌱 ${translateText(u.name)} ${translateKey('leshySummons')} ${translateText(summon.name)}`, 'enemy');
    });
    v.summonSerial = (v.summonSerial || 0) + summoned;
    if (summoned > 0) {
      if (typeof BattleSfx !== 'undefined') BattleSfx.playSampledUrl(BSX.enemies_necro_raise, 0.72);
      playBattleAbilityFx(u, 'leshySummon', { radius: 2, glyph: '🌱' });
      buildInitiative();
      return;
    }

    const heroes = b.units.filter(hero => hero.isHero && hero.hp > 0);
    const target = heroes
      .filter(hero => {
        if (unitDistance(u, hero) > u.range) return false;
        const targetCell = closestUnitCellToPoint(hero, u.x, u.y);
        return !rangedBlocked(u.x, u.y, targetCell.x, targetCell.y, b.grid, false);
      })
      .sort((a, z) => a.hp - z.hp || unitDistance(u, a) - unitDistance(u, z))[0];
    if (target) {
      aiAttack(u, target);
    } else if (!v.waitingShown) {
      v.waitingShown = true;
      pushBattleLog(`🌳 ${translateText(u.name)} ${translateKey('leshyNoTarget')}`, 'status');
    }
  }

  function bomberAi(u) {
    const b = GameState.currentBattle;
    const heroes = b.units.filter(h => h.isHero && h.hp > 0);
    if (!heroes.length) return;
    let nearest = heroes[0];
    let bd = 999;
    for (const h of heroes) {
      const d = unitDistance(u, h);
      if (d < bd) { bd = d; nearest = h; }
    }
    if (bd <= 1) {
      if (typeof BattleSfx !== 'undefined') BattleSfx.playSampledUrl(BSX.enemies_suicide_explosion, 0.95);
      playBattleAbilityFx(u, 'bomberExplosion', { radius: 1, glyph: '💥' });
      for (const h of heroes) {
        if (unitDistance(u, h) <= 1) dealDamage(u, h, 20, { blockIgnore: true, sfxImpactOnly: true, animationProfile: 'explosion', animationImpactOnly: true, animationOffsetMs: 180 });
      }
      pushBattleLog(`💥 ${u.name} explodes!`, 'enemy');
      u.hp = 0;
      onUnitDeath(u);
      return;
    }
    if (getMovePoints(u, b) > 0) {
      const moveCell = pickEnemyMoveCell(b, u, nearest, enemyMoveOpts(u));
      if (moveCell) enemyStepToCell(b, u, moveCell);
    }
    if (typeof BattleSfx !== 'undefined') {
      let dMin = 999;
      for (const h of heroes) {
        const d = unitDistance(u, h);
        if (d < dMin) dMin = d;
      }
      if (dMin === 2) BattleSfx.playSampledUrl(BSX.enemies_suicide_attack, 0.45);
    }
  }

  function aiAttack(attacker, target) {
    let dmg = attacker.attack;
    if (attacker.enemyId === ENEMY_IDS.SPEARMAN) {
      const d = unitDistance(attacker, target);
      if (d === 1) dmg += 3;
    }
    if (attacker.enemyId === ENEMY_IDS.DARK_LORD) {
      if (attacker.phase === 2) dmg = 18;
      else if (attacker.phase === 3) dmg = attacker.attack + 6;
    }
    const mul = (!attacker.isHero && target.isHero && [ENEMY_IDS.ASSASSIN, ENEMY_IDS.VOID_STALKER].includes(attacker.enemyId))
      ? (() => {
        const backs = [{ x: target.x, y: target.y + 1 }, { x: target.x, y: target.y - 1 }, { x: target.x - 1, y: target.y }, { x: target.x + 1, y: target.y }];
        const isBack = backs.some(p => p.x === attacker.x && p.y === attacker.y);
        if (!isBack) return 1;
        if (attacker.enemyId === ENEMY_IDS.ASSASSIN) return 2;
        return 1.5;
      })()
      : 1;
    let heads = 1;
    if (attacker.enemyId === ENEMY_IDS.HYDRA) heads = 3;
    for (let h = 0; h < heads; h++) {
      if (target.hp <= 0) break;
      dealDamage(attacker, target, Math.floor(dmg * mul), {
        magic: attacker.enemyId === ENEMY_IDS.GHOST,
        sfxImpactOnly: h > 0,
        animationSkill: 'basic',
        animationShotIndex: h,
        animationOffsetMs: h * 125
      });
      if (!attacker.isHero && attacker.hp > 0) {
        if (attacker.enemyId === ENEMY_IDS.BLOOD_KNIGHT) attacker.hp = Math.min(attacker.maxHp, attacker.hp + 3);
      }
      if (attacker.enemyId === ENEMY_IDS.SPIDER && target.hp > 0) addStatus(target, STATUS.WEB, 2, { source: attacker });
      if (attacker.enemyId === ENEMY_IDS.ICE_ELEM && target.hp > 0) addStatus(target, STATUS.FREEZE, 1, { source: attacker });
      if (attacker.enemyId === ENEMY_IDS.HYDRA && target.hp > 0) addStatus(target, STATUS.POISON, 2, { source: attacker });
      if (attacker.enemyId === ENEMY_IDS.THORN_DRYAD && target.hp > 0) addStatus(target, STATUS.SLOW, 1, { source: attacker });
      if (attacker.enemyId === ENEMY_IDS.BOG_LURKER && target.hp > 0 && Math.random() < 0.35) addStatus(target, STATUS.SLOW, 1, { source: attacker });
      if (attacker.enemyId === ENEMY_IDS.RAT_SWARM && target.hp > 0 && Math.random() < 0.45) addStatus(target, STATUS.POISON, 1, { source: attacker });
      if (attacker.enemyId === ENEMY_IDS.CULTIST && target.hp > 0 && Math.random() < 0.30) addStatus(target, STATUS.CURSE, 1, { source: attacker });
      if (attacker.enemyId === ENEMY_IDS.HEXER && target.hp > 0 && Math.random() < 0.35) addStatus(target, STATUS.BLIND, 1, { source: attacker });
      if (attacker.enemyId === ENEMY_IDS.BANSHEE && target.hp > 0 && Math.random() < 0.25) addStatus(target, STATUS.STUN, 1, { source: attacker });
      if (attacker.enemyId === ENEMY_IDS.PLAGUE_DOCTOR && target.hp > 0) addStatus(target, STATUS.POISON, 2, { source: attacker });
      if (attacker.enemyId === ENEMY_IDS.VOID_STALKER && target.hp > 0 && Math.random() < 0.25) addStatus(target, STATUS.CURSE, 1, { source: attacker });
      if (attacker.enemyId === ENEMY_IDS.STONE_GOLEM && target.hp > 0 && Math.random() < 0.25) addStatus(target, STATUS.STUN, 1, { source: attacker });
      if (attacker.enemyId === ENEMY_IDS.ARCANE_SENTINEL && target.hp > 0 && Math.random() < 0.25) addStatus(target, STATUS.FREEZE, 1, { source: attacker });
    }
    pushBattleLog(`[${attacker.emoji}] hits [${target.emoji}]`, 'enemy');
  }

  function darkLordAi(u) {
    const b = GameState.currentBattle;
    u.turnCount = (u.turnCount || 0) + 1;
    const guards = b.units.filter(x => !x.isHero && x.enemyId === ENEMY_IDS.ORC_GUARD && x.hp > 0);
    if (u.phase === 1) {
      if (guards.length === 0) { u.phase = 2; }
      else return;
    }
    else if (u.phase === 2) {
      u.teleportCd = (u.teleportCd || 0) + 1;
      if (u.teleportCd % 2 === 0) {
        let moved = false;
        const oldX = u.x, oldY = u.y;
        for (let t = 0; t < 20; t++) {
          const x = randInt(0, GRID_W - 1), y = randInt(0, GRID_H - 1);
          if (canUnitOccupy(b, u, x, y, { end: true })) { u.x = x; u.y = y; moved = true; break; }
        }
        if (moved) {
          playBattleAbilityFx(u, 'darkLordTeleport', { x: oldX, y: oldY, glyph: '✦' });
          playBattleAbilityFx(u, 'darkLordTeleport', { x: u.x, y: u.y, glyph: '✦', noPose: true, delay: 110 });
          if (typeof BattleSfx !== 'undefined') BattleSfx.playSampledUrl(BSX.enemies_dark_lord_teleport, 0.85);
        }
      }
      const tgt = priorityTarget(b);
      if (tgt && unitDistance(u, tgt) <= 1) aiAttack(u, tgt);
      u.aoeCd = (u.aoeCd || 0) + 1;
      if (u.aoeCd % 3 === 0) {
        if (typeof BattleSfx !== 'undefined') BattleSfx.playSampledUrl(BSX.enemies_dark_lord_aoe, 0.82);
        playBattleAbilityFx(u, 'darkLordAoe', { radius: 1, glyph: '◉' });
        b.units.forEach(t => {
          if (t.isHero && t.hp > 0 && unitDistance(u, t) === 1) {
            dealDamage(u, t, 12, { magic: true, sfxImpactOnly: true, animationProfile: 'shadow', animationImpactOnly: true, animationOffsetMs: 180 });
            addStatus(t, STATUS.BLIND, 1);
          }
        });
      }
      u.summonCd = (u.summonCd || 0) + 1;
      if (u.summonCd % 4 === 0) {
        playBattleAbilityFx(u, 'darkLordSummon', { radius: 2, glyph: '☠' });
        if (typeof BattleSfx !== 'undefined') {
          BattleSfx.playSampledUrl(BSX.enemies_dark_lord_summon, 0.78);
          BattleSfx.playSampledUrl(BSX.enemies_necro_raise, 0.55, 0.08);
        }
        for (let k = 0; k < 2; k++) {
          for (let y = 0; y < GRID_H; y++) for (let x = GRID_W - 2; x < GRID_W; x++) {
            const skelProto = { isHero: false, enemyId: ENEMY_IDS.SKELETON, sizeW: 1, sizeH: 1 };
            if (canUnitOccupy(b, skelProto, x, y, { end: true })) { b.units.push(spawnEnemy(ENEMY_IDS.SKELETON, x, y)); break; }
          }
        }
      }
      if (u.hp <= 80) u.phase = 3;
    }
    else if (u.phase === 3) {
      const tgt = priorityTarget(b);
      if (tgt) aiAttack(u, tgt);
      const heroes = b.units.filter(h => h.isHero && h.hp > 0);
      if (heroes.length) addStatus(heroes[randInt(0, heroes.length - 1)], STATUS.CURSE, 2);
    }
  }

  function fireTitanAi(u) {
    const b = GameState.currentBattle;
    const nFire = u.hp < u.maxHp * 0.5 ? 4 : 2;
    for (let k = 0; k < nFire; k++) {
      const x = randInt(0, GRID_W - 1), y = randInt(0, GRID_H - 1);
      b.grid[y][x] = TILE.FIRE;
    }
    u.bossVar.aoeCounter = (u.bossVar.aoeCounter || 0) + 1;
    if (u.bossVar.aoeCounter % 3 === 0) {
      if (typeof BattleSfx !== 'undefined') BattleSfx.playSampledUrl(BSX.enemies_fire_titan_aoe, 0.88);
      playBattleAbilityFx(u, 'fireTitanAoe', { radius: 2, glyph: '🔥' });
      b.units.forEach(t => {
        if (t.isHero && t.hp > 0 && unitDistance(u, t) <= 1) {
          dealDamage(u, t, 10, { fire: true, magic: true, sfxImpactOnly: true, animationProfile: 'fire', animationImpactOnly: true, animationOffsetMs: 220 });
        }
      });
    }
    const tgt = priorityTarget(b);
    if (tgt) {
      if (unitDistance(u, tgt) <= u.range) {
        aiAttack(u, tgt);
      } else {
        const moveCell = pickEnemyMoveCell(b, u, tgt);
        if (moveCell) enemyStepToCell(b, u, moveCell);
        if (unitDistance(u, tgt) <= u.range) aiAttack(u, tgt);
      }
    }
  }

  //══════════ Hero UI & actions ══════════
  function heroAttackSummary(b, u) {
    const enemies = b.units.filter(t => !t.isHero && t.hp > 0);
    const ignoreCover = !!(u.perks && u.perks.includes('ignoreCover'));
    let inRange = 0;
    let blocked = 0;
    let nearest = null;
    enemies.forEach(t => {
      const dist = unitDistance(u, t);
      if (!nearest || dist < nearest.dist) nearest = { unit: t, dist };
      if (dist <= u.range) {
        const lineBlocked = u.range > 1 && rangedBlocked(u.x, u.y, t.x, t.y, b.grid, ignoreCover);
        if (lineBlocked) blocked++;
        else inRange++;
      }
    });
    return { inRange, blocked, nearest, total: enemies.length };
  }

  function markFtueSkillUsed(heroId, skillKey) {
    const b = GameState.currentBattle;
    if (!b || !b.firstBattle) return;
    const expected = { garet: 'shieldBash', alira: 'doubleShot', seris: 'fireball' };
    if (expected[heroId] !== skillKey) return;
    b.ftueSkillsUsed = b.ftueSkillsUsed || {};
    b.ftueSkillsUsed[heroId] = true;
    GameState.ftueSkillsUsed = { ...b.ftueSkillsUsed };
  }

  function ftueCoachHtml(b, u) {
    if (!b || !b.firstBattle || !GameState.ftueHintsEnabled) return '';
    const used = b.ftueSkillsUsed || {};
    const completed = ['garet', 'alira', 'seris'].filter(id => used[id]).length;
    let titleKey = 'ftueDeployTitle';
    let textKey = 'ftueDeployText';
    if (b.phase === 'combat' && u && u.isHero) {
      if (completed >= 3) {
        titleKey = 'ftueSkillsDoneTitle';
        textKey = 'ftueSkillsDoneText';
      } else if (u.heroId === 'garet' && !used.garet) {
        titleKey = 'ftueGaretTitle';
        textKey = 'ftueGaretText';
      } else if (u.heroId === 'alira' && !used.alira) {
        titleKey = 'ftueAliraTitle';
        textKey = 'ftueAliraText';
      } else if (u.heroId === 'seris' && !used.seris) {
        titleKey = 'ftueSerisTitle';
        textKey = 'ftueSerisText';
      } else {
        titleKey = 'ftueSkillsDoneTitle';
        textKey = 'ftueSkillsDoneText';
      }
    }
    return `<div class="ftue-coach" data-ftue-hero="${u?.heroId || 'deploy'}">
      <div class="ftue-coach-title">${translateKey(titleKey)}</div>
      <div class="ftue-coach-text">${translateKey(textKey)}</div>
      <div class="ftue-coach-foot">
        <span class="ftue-coach-progress">${translateKey('ftueProgress')}: ${completed}/3</span>
        <button type="button" class="ftue-coach-skip" id="btn-ftue-skip">${translateKey('ftueSkip')}</button>
      </div>
    </div>`;
  }

  function battleObjectiveHtml(b) {
    if (!b?.objective) return '';
    const key = b.objective === 'flawless' ? 'objectiveFlawless' : 'objectiveSkillful';
    const scenario = CampaignExpansion.scenarioStatus(b);
    const scenarioHtml = scenario ? `<div class="battle-briefing-objective scenario-${scenario.id}">
      <span class="battle-briefing-icon">${scenario.icon}</span>
      <div><strong>${escapeHtml(scenario.label)}</strong><span>${escapeHtml(scenario.short)}</span></div>
    </div>` : '';
    const briefingTitle = currentLanguage() === 'ru' ? 'ЦЕЛИ БОЯ' : (currentLanguage() === 'es' ? 'OBJETIVOS' : 'BATTLE OBJECTIVES');
    const briefingContinue = currentLanguage() === 'ru' ? 'К РАССТАНОВКЕ' : (currentLanguage() === 'es' ? 'COLOCAR HÉROES' : 'DEPLOY HEROES');
    return `<div class="battle-briefing-card">
      <div class="battle-briefing-title">${briefingTitle}</div>
      ${scenarioHtml}
      <div class="battle-briefing-objective is-bonus">
        <span class="battle-briefing-icon">★</span>
        <div><strong>${translateKey('optionalObjective')} · +10 ${translateKey('gold')}</strong><span>${translateKey(key)}</span></div>
      </div>
      <button type="button" class="btn btn-primary battle-briefing-continue" id="btn-battle-briefing-continue">${briefingContinue}</button>
    </div>`;
  }

  function renderBattleBriefing(b) {
    const briefing = document.getElementById('battle-briefing');
    if (!briefing) return;
    const visible = b?.phase === 'deploy' && !b.briefingDismissed;
    const screen = document.getElementById('battle-screen');
    briefing.classList.toggle('hidden', !visible);
    screen?.classList.toggle('briefing-open', visible);
    briefing.innerHTML = visible ? battleObjectiveHtml(b) : '';
    const continueBtn = document.getElementById('btn-battle-briefing-continue');
    if (continueBtn) continueBtn.onclick = () => {
      b.briefingDismissed = true;
      briefing.classList.add('hidden');
      screen?.classList.remove('briefing-open');
    };
  }

  function bindFtueCoachSkip() {
    const btn = document.getElementById('btn-ftue-skip');
    if (!btn) return;
    btn.onclick = () => {
      GameState.ftueHintsEnabled = false;
      saveGame();
      updateBattleUI();
    };
  }

  function renderFtueCoachOverlay(b, unit) {
    const overlay = document.getElementById('battle-coach-overlay');
    if (!overlay) return;
    overlay.innerHTML = ftueCoachHtml(b, unit);
    bindFtueCoachSkip();
  }

  function highlightFtueRecommendedSkill(b, unit) {
    document.querySelectorAll('.skill-action-btn.ftue-recommended').forEach(el => el.classList.remove('ftue-recommended'));
    if (b?.phase === 'combat' && unit?.isHero) {
      const used = b.ftueSkillsUsed || {};
      const skillId = unit.heroId === 'garet' && !used.garet ? 'sk-shield'
        : unit.heroId === 'alira' && !used.alira ? 'sk-double'
        : unit.heroId === 'seris' && !used.seris ? 'sk-fb'
        : '';
      if (skillId) document.getElementById(skillId)?.classList.add('ftue-recommended');
    }
  }

  function battleActionHintHtml(b, u) {
    if (!b || !u || !u.isHero || b.phase !== 'combat') return '';
    const summary = heroAttackSummary(b, u);
    let tone = 'warn';
    let main = translateKey('noTargets');
    let sub = translateKey('skipOrMove');

    if (b.heroActionDone) {
      tone = 'good';
      main = translateKey('turnDone');
      sub = translateKey('enemyTurn');
    } else if (b.pendingSkill) {
      tone = 'good';
      main = translateKey('selectTarget');
      sub = `${translateKey('preview')}: ${translateText(b.pendingSkill)}`;
    } else if (summary.inRange > 0) {
      tone = 'good';
      main = `${translateKey('attackReady')}: ${summary.inRange}`;
      sub = summary.blocked > 0 ? `${summary.blocked} ${translateKey('lineBlocked')}` : translateKey('selectTarget');
    } else if (summary.blocked > 0) {
      tone = 'bad';
      main = translateKey('attackBlocked');
      sub = `${summary.blocked} ${translateKey('lineBlocked')}`;
    } else if (b.mode === 'move' && !b.heroMoved) {
      const moveLeft = getMovePoints(u, b);
      tone = moveLeft > 0 ? 'warn' : 'bad';
      main = `${translateKey('moveLeft')}: ${moveLeft}`;
      sub = summary.nearest ? `${translateKey('nearestEnemy')}: ${summary.nearest.dist}` : translateKey('noTargets');
    } else {
      tone = 'bad';
      main = translateKey('attackOut');
      sub = summary.nearest ? `${translateKey('nearestEnemy')}: ${summary.nearest.dist}` : translateKey('noTargets');
    }

    return `<div class="battle-tactical-strip ${tone}">
      <div class="battle-tactical-kicker">${translateKey('tactical')}</div>
      <div class="battle-tactical-main">${escapeHtml(main)}</div>
      <div class="battle-tactical-sub">${escapeHtml(sub)}</div>
    </div>`;
  }

  function updateBattleUI() {
    const b = GameState.currentBattle;
    const left = document.getElementById('battle-left-heroes');
    const deployHint = document.getElementById('deploy-hint');
    const title = document.getElementById('unit-title');
    const stats = document.getElementById('unit-stats');
    const actions = document.getElementById('action-buttons');
    if (!b) return;
    // Initiative is DOM-heavy and only changes together with the battle UI.
    // Canvas effects keep animating in loop(); the HUD does not need to be
    // reconstructed 60 times per second on desktop or mobile.
    renderInitiative();
    bindBattleSpeedToggle();
    const coachActiveUnit = getActiveUnit();
    renderFtueCoachOverlay(b, coachActiveUnit?.isHero ? coachActiveUnit : null);
    if (left) {
      const roleLabel = { garet: translateText('Warrior'), alira: translateText('Archer'), seris: translateText('Mage') };
      const activeHero = b.phase === 'combat' && getActiveUnit()?.isHero ? getActiveUnit() : null;
      const nextHero = nextHeroInInitiative(b);
      left.innerHTML = b.units.filter(u => u.isHero).map(h => {
        const alive = h.hp > 0;
        const active = activeHero === h ? 'active' : '';
        const upcoming = !active && nextHero === h ? 'next-hero' : '';
        const turnChip = active
          ? `<span class="hero-turn-chip">${translateKey('turnNow')}</span>`
          : upcoming ? `<span class="hero-turn-chip" title="${translateKey('nextHero')}">${translateKey('turnNext')}</span>` : '';
        const hpPct = alive ? Math.max(0, Math.min(100, Math.round((h.hp / h.maxHp) * 100))) : 0;
        const mpPct = h.maxMana ? Math.max(0, Math.min(100, Math.round((h.mana / h.maxMana) * 100))) : 0;
        const manaBar = h.maxMana ? `<div class="bar-wrap"><div class="bar-label"><span>MP</span><span>${h.mana}/${h.maxMana}</span></div><div class="bar"><div class="bar-fill-mp" style="width:${mpPct}%"></div></div></div>` : '';
        const hh = GameState.heroes.find(x => x.id === h.heroId) || h;
        const cds = hh.cds || {};
        const heroSkillDefs = HERO_SKILLS[h.heroId] || [];
        const heroLvl = hh.level || 1;
        const skillsHtml = heroSkillDefs.map(skDef => {
          const locked = heroLvl < skDef.unlockLevel;
          const ready = !locked && (!cds[skDef.key] || cds[skDef.key] <= 0);
          const cls = locked ? 'locked' : (ready ? 'ready' : 'used');
          const tip = locked ? `${translateText(skDef.name)} (${currentLanguage() === 'es' ? 'nv.' : 'lv.'}${skDef.unlockLevel})` : translateText(skDef.name);
          return `<div class="skill-btn ${cls}" title="${tip}" style="${locked ? 'opacity:0.3' : ''}">${locked ? '🔒' : skDef.icon}</div>`;
        }).join('');
        const moveLeft = getMovePoints(h, b);
        const statsLine = `<div class="hero-mini-stats">🛡${h.armor} ⚔${h.attack} 👟${moveLeft}/${h.move}${h.maxMana ? ` 🔮${h.mana}/${h.maxMana}` : ''}</div>`;
        const deadStyle = alive ? '' : 'opacity:0.4;';
        return `<div class="hero-card ${active} ${upcoming}" style="${deadStyle}">
          ${turnChip}
          <div class="hero-card-top">
            ${heroIconHtml(h.heroId, h.sprite)}
            <div><div class="hero-card-name">${h.name}</div><div class="hero-card-class">${roleLabel[h.heroId] || ''}</div></div>
          </div>
          <div class="hero-mobile-resources">
            <div class="bar-wrap"><div class="bar-label"><span>HP</span><span>${h.hp}/${h.maxHp}</span></div><div class="bar"><div class="bar-fill-hp" style="width:${hpPct}%"></div></div></div>
            ${manaBar}
          </div>
          ${statsLine}
          <div class="skills-row">${skillsHtml}</div>
          <div style="font-size:9px;color:var(--text-dim);margin-top:3px">${heroEquipIcons(hh)}</div>
        </div>`;
      }).join('');
    }
    // 4: Simplified deploy phase
    if (b.phase === 'deploy') {
      deployHint.classList.remove('hidden');
      const modeBadge = document.getElementById('mode-badge');
      if (modeBadge) { modeBadge.className = 'm-move'; modeBadge.textContent = `↔ ${translateText('DEPLOYMENT')}`; modeBadge.classList.remove('hidden'); }
      title.textContent = currentLanguage() === 'ru' ? 'Коснитесь героя → клетки' : translateText('Click hero → drag');
      stats.innerHTML = '';
      renderBattleBriefing(b);
      actions.innerHTML = `<button class="btn btn-primary skill-action-btn" id="btn-start-battle" style="width:100%">
        <span class="skill-action-icon">⚔</span>
        <span class="skill-action-name">${translateText('Start Battle')}</span>
        <span class="skill-action-meta">${translateText('DEPLOYMENT')}</span>
      </button>`;
      const sb = document.getElementById('btn-start-battle');
      if (sb) sb.onclick = () => beginCombatFromDeploy();
      return;
    }
    deployHint.classList.add('hidden');
    const u = getActiveUnit();
    const modeBadge = document.getElementById('mode-badge');

    if (!u) {
      if (modeBadge) { modeBadge.className = 'm-enemy hidden'; modeBadge.textContent = '—'; }
      title.textContent = '—'; stats.innerHTML = ''; actions.innerHTML = '';
      return;
    }
    if (!u.isHero) {
      if (modeBadge) { modeBadge.className = 'm-enemy'; modeBadge.textContent = `${u.emoji} ${translateKey('enemyTurn')}`; modeBadge.classList.remove('hidden'); }
      title.textContent = '';
      stats.innerHTML = '';
      actions.innerHTML = '';
      return;
    }
    b.selected = u;
    // 3: Mode indicator
    if (modeBadge) {
      modeBadge.classList.remove('hidden');
      if (b.heroActionDone) { modeBadge.className = 'm-done'; modeBadge.textContent = translateKey('turnDone'); }
      else if (b.pendingSkill) { modeBadge.className = 'm-skill'; modeBadge.textContent = translateKey('chooseTarget'); }
      else if (b.mode === 'move' && !b.heroMoved) { modeBadge.className = 'm-move'; modeBadge.textContent = translateKey('battleMove'); }
      else if (b.mode === 'attack' || b.heroMoved) { modeBadge.className = 'm-attack'; modeBadge.textContent = translateKey('battleAttack'); }
      else { modeBadge.className = 'm-move'; modeBadge.textContent = '◈'; }
    }
    title.innerHTML = '';
    stats.innerHTML = '';
    const hh = GameState.heroes.find(x => x.id === u.heroId);
    renderBattleBriefing(b);
    let html = '';
    html += battleTouchPreviewHtml(b, u);
    html += battleActionHintHtml(b, u);
    if (!b.heroActionDone) {
      if (heroCanUndoMove(b, u)) {
        html += `<button class="btn btn-gold battle-utility-btn" id="btn-undo-move" title="${translateKey('undoMoveTitle')}" style="margin-bottom:2px">${translateKey('undoMove')}</button>`;
      }
      // 6: Skill buttons with cooldown, level-lock, and tooltips
      const hh2 = GameState.heroes.find(x => x.id === u.heroId) || u;
      const heroLevel = hh2.level || 1;
      const skillMakeBtn = (id, skillKey, icon, label, cdVal, extra) => {
        const skDef = (HERO_SKILLS[u.heroId] || []).find(s => s.key === skillKey);
        const unlockLvl = skDef ? skDef.unlockLevel : 1;
        const locked = heroLevel < unlockLvl;
        const lvlPrefix = currentLanguage() === 'es' ? 'nv.' : 'lv.';
        const metaStr = skDef ? (skDef.cost ? `MP: ${skDef.cost}` : skDef.cd ? `${translateKey('cooldownShort')}: ${skDef.cd}` : '') : '';
        const tooltipText = skDef ? `${translateText(skDef.name)} (${lvlPrefix}${unlockLvl})&#10;${localizeContent(skDef.desc)}${metaStr ? '&#10;' + metaStr : ''}` : translateText(label);
        const actionName = skDef ? translateText(skDef.name) : translateText(label);
        if (locked) {
          return `<button class="btn skill-action-btn is-locked" id="${id}" title="${translateKey('unlocksAtLevel')} ${unlockLvl}&#10;${skDef ? localizeContent(skDef.desc) : ''}" style="cursor:not-allowed">
            <span class="skill-action-icon">🔒</span>
            <span class="skill-action-name">${actionName}</span>
            <span class="skill-action-meta">${lvlPrefix}${unlockLvl}</span>
          </button>`;
        }
        const disabled = cdVal > 0 || (extra && extra.mpFail);
        const currentMp = extra && typeof extra.mpCost === 'number' ? `MP ${u.mana}/${extra.mpCost}` : '';
        const meta = cdVal > 0 ? `CD ${cdVal}` : currentMp || metaStr || translateKey('ready');
        const disabledCls = disabled ? ' is-disabled' : '';
        return `<button class="btn skill-action-btn${disabledCls}" id="${id}" title="${tooltipText.replace(/"/g,'&quot;')}">
          <span class="skill-action-icon">${icon}</span>
          <span class="skill-action-name">${actionName}</span>
          <span class="skill-action-meta">${meta}</span>
        </button>`;
      };
      if (u.heroId === 'garet') {
        html += skillMakeBtn('sk-shield',  'shieldBash', '🛡', 'Shield Bash',  u.cds.shieldBash, null);
        html += skillMakeBtn('sk-firecall','fireCall',   '🔥', 'Call Fire',  u.cds.fireCall,   null);
        html += skillMakeBtn('sk-berz',    'berserk',    '💪', 'Berserk',     u.cds.berserk,    null);
      }
      if (u.heroId === 'alira') {
        html += skillMakeBtn('sk-double','doubleShot','🏹','Double Shot', u.cds.doubleShot, null);
        html += skillMakeBtn('sk-slow',  'slowArrow', '🐢','Slowing Arrow',  u.cds.slowArrow,  null);
        html += skillMakeBtn('sk-rain',  'arrowRain', '🌧','Arrow Rain',     u.cds.arrowRain,  null);
      }
      if (u.heroId === 'seris') {
        html += skillMakeBtn('sk-fb',  'fireball', '🔥','Fireball', u.cds.fireball, { mpFail: u.mana < 3, mpCost: 3 });
        html += skillMakeBtn('sk-fr',  'freeze',   '🧊','Freeze',   u.cds.freeze,   { mpFail: u.mana < 4, mpCost: 4 });
        html += skillMakeBtn('sk-met', 'meteor',   '☄', 'Meteor',   u.cds.meteor,   { mpFail: u.mana < 8, mpCost: 8 });
        if (u.perks?.includes('teleport') && !b.teleportUsed) {
          html += `<button class="btn skill-action-btn" id="sk-teleport"><span class="skill-action-icon">✦</span><span class="skill-action-name">Teleport</span><span class="skill-action-meta">1×</span></button>`;
        }
      }
      if (heroHasMoveOptions(b, u) && !b.heroMoved) html += `<button class="btn battle-utility-btn" id="btn-skip-move">${translateKey('skipMove')}</button>`;
      html += `<button class="btn battle-utility-btn" id="btn-wait">${translateKey('waitTurn')}</button>`;
      const usableConsumables = combatConsumableItems().filter(item => canUseConsumableOnHero(item, u));
      if (usableConsumables.length) {
        const consumableCount = usableConsumables.reduce((sum, item) => sum + getConsumableCount(item.id), 0);
        html += `<div class="battle-consumable-section"><div class="battle-consumable-label">${translateKey('battleConsumables')}</div><button class="btn battle-utility-btn" id="btn-battle-consumables">${translateKey('battleConsumables')} · ${consumableCount}</button></div>`;
      }
    }
    // 10: Inventory button always visible in battle
    html += `<button class="btn battle-utility-btn" id="btn-battle-inv" style="margin-top:4px">${translateKey('battleInventory')}</button>`;
    actions.innerHTML = html;
    highlightFtueRecommendedSkill(b, u);
    const bind = (id, fn) => { const el = document.getElementById(id); if (el) el.onclick = fn; };
    bindFtueCoachSkip();
    const heroLvl2 = (GameState.heroes.find(x => x.id === u.heroId) || u).level || 1;
    const skLocked = (key) => { const s = (HERO_SKILLS[u.heroId] || []).find(x => x.key === key); return s && heroLvl2 < s.unlockLevel; };
    bind('btn-undo-move', () => undoHeroMove());
    bind('btn-skip-move', () => { b.heroMoved = true; b.mode = 'attack'; updateBattleUI(); });
    bind('btn-wait', () => { if (typeof BattleSfx !== 'undefined') BattleSfx.playSampledUrl(BSX.ui_end_turn, 0.75); b.heroActionDone = true; endUnitTurn(); });
    bind('btn-battle-consumables', () => openBattleConsumables());
    bind('sk-shield', () => { if (skLocked('shieldBash') || u.cds.shieldBash > 0) return; b.pendingSkill = 'shieldBash'; b.mode = 'skill'; updateBattleUI(); });
    bind('sk-firecall', () => { if (skLocked('fireCall') || u.cds.fireCall > 0) return; b.pendingSkill = 'fireCall'; b.mode = 'skill'; updateBattleUI(); });
    bind('sk-berz', () => { if (skLocked('berserk') || u.cds.berserk > 0) return; b.objectiveUsedSkill = true; if (typeof BattleSfx !== 'undefined') BattleSfx.playSampledUrl(BSX.heroes_garet_berserk, 0.9); playBattleAbilityFx(u, 'berserk', { glyph: '💢' }); addStatus(u, STATUS.BERSERK, 3); u.armor = Math.max(0, Math.floor(u.armor * 0.5)); u.cds.berserk = 6; b.heroActionDone = true; endUnitTurn(); });
    bind('sk-double', () => { if (skLocked('doubleShot') || u.cds.doubleShot > 0) return; b.pendingSkill = 'double'; b.mode = 'skill'; updateBattleUI(); });
    bind('sk-slow', () => { if (skLocked('slowArrow') || u.cds.slowArrow > 0) return; b.pendingSkill = 'slowArrow'; b.mode = 'skill'; updateBattleUI(); });
    bind('sk-rain', () => { if (skLocked('arrowRain') || u.cds.arrowRain > 0) return; b.objectiveUsedSkill = true; if (typeof BattleSfx !== 'undefined') BattleSfx.playSampledUrl(BSX.heroes_alira_arrow_rain, 0.92); playBattleAbilityFx(u, 'arrowRain', { radius: 2, glyph: '🏹', projectile: 'rain' }); const b2 = GameState.currentBattle; let rainShot = 0; b2.units.forEach(t => { if (!t.isHero && t.hp > 0 && unitDistanceFromPoint(t, u.x, u.y) <= 1) dealDamage(u, t, u.attack, { animationSkill: 'arrowRain', animationShotIndex: rainShot, animationOffsetMs: 100 + rainShot++ * 90 }); }); u.cds.arrowRain = 5; b.heroActionDone = true; endUnitTurn(); });
    bind('sk-fb', () => { if (skLocked('fireball') || u.mana < 3 || u.cds.fireball > 0) return; b.pendingSkill = 'fireball'; b.mode = 'skill'; updateBattleUI(); });
    bind('sk-fr', () => { if (skLocked('freeze') || u.mana < 4 || u.cds.freeze > 0) return; b.pendingSkill = 'freeze'; b.mode = 'skill'; updateBattleUI(); });
    bind('sk-met', () => { if (skLocked('meteor') || u.mana < 8 || u.cds.meteor > 0) return; b.pendingSkill = 'meteor'; b.mode = 'skill'; updateBattleUI(); });
    bind('sk-teleport', () => { if (b.teleportUsed) return; b.pendingSkill = 'teleport'; b.mode = 'skill'; updateBattleUI(); });
    // 10: Inventory from battle
    bind('btn-battle-inv', () => {
      GameState._returnToVictory = false;
      GameState._returnToBattle = true;
      GameState._returnToCity = false;
      showScreen('inventory');
      renderInventoryScreen();
    });
  }

  function performHeroAttack(u, target) {
    const b = GameState.currentBattle;
    const usedSkill = b.pendingSkill;
    if (usedSkill) b.objectiveUsedSkill = true;
    const targetCell = closestUnitCellToPoint(target, u.x, u.y);
    const dist = unitDistanceFromPoint(target, u.x, u.y);
    if (dist > u.range) return;
    if (u.range > 1 && rangedBlocked(u.x, u.y, targetCell.x, targetCell.y, b.grid, u.perks && u.perks.includes('ignoreCover'))) return;
    let base = u.attack;
    if (u.heroId === 'alira' && u.flags && u.flags.firstAttackTurn && typeof BattleSfx !== 'undefined') {
      BattleSfx.playSampledUrl(BSX.heroes_alira_bow_draw, 0.62);
    }
    if (b.pendingSkill === 'double') {
      if (typeof BattleSfx !== 'undefined') BattleSfx.playSampledUrl(BSX.heroes_alira_double_shot, 0.88);
      dealDamage(u, target, base, { sfxSkipWind: true, animationSkill: 'double', animationShotIndex: 0 });
      if (target.hp > 0) dealDamage(u, target, base, { sfxImpactOnly: true, sfxSkipWind: true, animationSkill: 'double', animationShotIndex: 1, animationOffsetMs: 160 });
      u.cds.doubleShot = 2;
    } else {
      dealDamage(u, target, base, { magic: u.heroId === 'seris', animationSkill: usedSkill || 'basic' });
    }
    if (b.pendingSkill === 'shieldBash' && target.hp > 0) { addStatus(target, STATUS.STUN, 1); u.cds.shieldBash = 3; }
    if (usedSkill === 'shieldBash') markFtueSkillUsed(u.heroId, 'shieldBash');
    if (usedSkill === 'double') markFtueSkillUsed(u.heroId, 'doubleShot');
    pushBattleLog(`[${u.sprite} ${u.name}] attacks [${target.emoji}]`, 'hero');
    b.pendingSkill = null;
    b.heroActionDone = true;
    b.mode = 'idle';
    syncHeroFromUnit(u);
    endUnitTurn();
  }
  function moveDeployHeroToCell(b, heroUnit, gx, gy) {
    if (!b || !heroUnit) return false;
    if (!inBounds(gx, gy) || gx > 1) return false;
    if (!canEndOnTile(b, gx, gy, heroUnit)) return false;
    heroUnit.x = gx;
    heroUnit.y = gy;
    return true;
  }

  function canvasBattleClick(gx, gy) {
    const b = GameState.currentBattle;
    if (!b || !inBounds(gx, gy)) return;
    if (b.phase === 'deploy') {
      // On deploy: tap a hero to select it, then tap a free tile in first two columns to move.
      const hit = unitAt(b, gx, gy);
      if (hit && hit.isHero) {
        b.deployDragHeroId = hit.heroId;
        updateBattleUI();
        return;
      }
      const selected = b.units.find(x => x.isHero && x.heroId === b.deployDragHeroId) ||
        b.units.find(x => x.isHero && x.heroId === GameState.heroes[GameState.selectedHeroDeploy]?.id) ||
        b.units.find(x => x.isHero);
      let mover = selected;
      // Safety: if selected hero unit is missing (edge case), recreate it
      if (!mover) {
        const list = GameState.heroes.filter(h => h.hp > 0);
        const h = list[GameState.selectedHeroDeploy] || list[0];
        if (!h) return;
        mover = makeBattleHero(h, 0);
        b.units.push(mover);
      }
      if (!moveDeployHeroToCell(b, mover, gx, gy)) return;
      saveGame();
      updateBattleUI();
      return;
    }
    const active = getActiveUnit();
    if (!active || !active.isHero) return;
    const u = active;
    const blind = u.activeStatuses && u.activeStatuses.find(s => s.type === STATUS.BLIND);

    // 1: Smart contextual click — no need to manually switch modes
    if (!b.heroActionDone && b.mode !== 'skill') {
      const clickedUnit = unitAt(b, gx, gy);
      const isEnemy = clickedUnit && !clickedUnit.isHero;
      const isEmpty = !clickedUnit;

      // Click on enemy in range => attack (unless blind)
      if (isEnemy && !blind) {
        const dist = Math.abs(u.x - gx) + Math.abs(u.y - gy);
        const inRange = dist <= u.range && (u.range === 1 || !rangedBlocked(u.x, u.y, gx, gy, b.grid, false));
        if (inRange) {
          b.mode = 'attack';
          b.pendingSkill = null;
          performHeroAttack(u, clickedUnit);
          return;
        }
        // Enemy out of range but hero can still move — try to move closer
        if (!b.heroMoved && !blind) {
          const reach = floodReachable(b, u);
          if (reach[gx + ',' + gy] !== undefined) {
            // Moving onto enemy cell is not valid, but we can move adjacent
            // fallthrough to movement below
          }
        }
      }
      // Click on empty reachable cell => move
      if (isEmpty && !b.heroMoved && !blind) {
        const reach = floodReachable(b, u);
        if (reach[gx + ',' + gy] !== undefined) {
          snapshotHeroMoveForUndo(b, u);
          const fromX = u.x, fromY = u.y;
          u.x = gx; u.y = gy;
          startUnitMoveAnimation(u, fromX, fromY, gx, gy);
          if (typeof BattleSfx !== 'undefined') BattleSfx.unitMoved(u, fromX, fromY, gx, gy, b.grid);
          placeAliraTrapsAfterMove(b, u, fromX, fromY);
          b.heroMoved = true;
          b.mode = 'attack'; // automatically switch to attack mode after moving
          syncHeroFromUnit(u);
          if (resolveBattleIfOver()) return;
          updateBattleUI();
          return;
        }
      }
      // Click on empty cell when already moved => do nothing
      if (isEmpty && b.heroMoved) return;
    }

    if (b.mode === 'move' && !b.heroMoved && !blind) {
      const reach = floodReachable(b, u);
      if (reach[gx + ',' + gy] === undefined) return;
      snapshotHeroMoveForUndo(b, u);
      const fromX = u.x, fromY = u.y;
      u.x = gx; u.y = gy;
      startUnitMoveAnimation(u, fromX, fromY, gx, gy);
      if (typeof BattleSfx !== 'undefined') BattleSfx.unitMoved(u, fromX, fromY, gx, gy, b.grid);
      placeAliraTrapsAfterMove(b, u, fromX, fromY);
      b.heroMoved = true;
      b.mode = 'attack';
      syncHeroFromUnit(u);
      if (resolveBattleIfOver()) return;
      updateBattleUI();
      return;
    }
    if ((b.mode === 'attack' || b.mode === 'skill') && !b.heroActionDone) {
      if (b.pendingSkill === 'teleport' && u.heroId === 'seris') {
        if (unitAt(b, gx, gy) || !canEndOnTile(b, gx, gy, u) || Math.abs(u.x - gx) + Math.abs(u.y - gy) > 4) return;
        const fromX = u.x, fromY = u.y;
        playBattleAbilityFx(u, 'teleport', { x: fromX, y: fromY, glyph: '✦' });
        u.x = gx; u.y = gy;
        startUnitMoveAnimation(u, fromX, fromY, gx, gy);
        playBattleAbilityFx(u, 'teleport', { x: gx, y: gy, glyph: '✦', noPose: true, delay: 110 });
        b.teleportUsed = true;
        b.objectiveUsedSkill = true;
        b.pendingSkill = null;
        b.heroMoved = true;
        b.mode = 'attack';
        spawnBattleTextFx(gx, gy, 'TELEPORT', '#c9a8ff');
        if (typeof BattleSfx !== 'undefined') BattleSfx.unitMoved(u, fromX, fromY, gx, gy, b.grid);
        if (resolveBattleIfOver()) return;
        updateBattleUI();
        return;
      }
      if (b.pendingSkill === 'fireCall' && u.heroId === 'garet') {
        b.objectiveUsedSkill = true;
        if (typeof BattleSfx !== 'undefined') BattleSfx.playSampledUrl(BSX.heroes_garet_fire_call, 0.95);
        playBattleAbilityFx(u, 'fireCall', { radius: 2, glyph: '🔥' });
        b.units.filter(e => !e.isHero && e.hp > 0).forEach(e => {
          if (unitDistanceFromPoint(e, u.x, u.y) <= 2) dealDamage(u, e, Math.max(1, Math.floor(u.attack * 0.5)), { fire: true, magic: true, sfxImpactOnly: true, animationSkill: 'fireCall', animationImpactOnly: true, animationOffsetMs: 170 });
        });
        u.flags = u.flags || {};
        u.flags.fireCallMitigateActive = true;
        u.cds.fireCall = 4;
        pushBattleLog(`[${u.sprite}] Call Fire!`, 'hero');
        b.heroActionDone = true; endUnitTurn(); return;
      }
      const tgt = unitAt(b, gx, gy);
      if (!tgt || tgt.isHero) return;
      if (b.pendingSkill === 'fireball' && u.heroId === 'seris') {
        if (u.mana < 3) return;
        if (Math.abs(u.x - gx) + Math.abs(u.y - gy) > u.range) return;
        b.objectiveUsedSkill = true;
        if (typeof BattleSfx !== 'undefined') BattleSfx.playSampledUrl(BSX.heroes_seris_fireball, 0.95);
        u.mana -= 3; u.cds.fireball = 2;
        const splashRadius = 1 + serisAoeBonus(u);
        dealDamage(u, tgt, 15, { fire: true, magic: true, sfxImpactOnly: true, animationSkill: 'fireball' });
        const splashCells = [];
        for (let dy = -splashRadius; dy <= splashRadius; dy++) {
          for (let dx = -splashRadius; dx <= splashRadius; dx++) {
            if (Math.abs(dx) + Math.abs(dy) <= splashRadius && !(dx === 0 && dy === 0)) splashCells.push({ x: gx + dx, y: gy + dy });
          }
        }
        damageEnemiesAtCells(b, u, splashCells, 7, { fire: true, magic: true, sfxImpactOnly: true, excludeUnits: [tgt], animationSkill: 'fireball', animationImpactOnly: true, animationOffsetMs: 285 });
        applySerisChaosAoe(u);
        markFtueSkillUsed(u.heroId, 'fireball');
        b.heroActionDone = true; endUnitTurn(); return;
      }
      if (b.pendingSkill === 'freeze' && u.heroId === 'seris') {
        if (u.mana < 4) return;
        if (Math.abs(u.x - gx) + Math.abs(u.y - gy) > u.range) return;
        b.objectiveUsedSkill = true;
        u.mana -= 4; u.cds.freeze = 3;
        startBattleAttackAnimation(u, tgt, { animationSkill: 'freeze' }, 0, tgt.hp);
        const freezeWeapon = getEquippedItem(u, 'weapon');
        const freezeTurns = (u.perks && u.perks.includes('freeze2')) || (freezeWeapon && freezeWeapon.mods && freezeWeapon.mods.freeze2) ? 2 : 1;
        addStatus(tgt, STATUS.FREEZE, freezeTurns);
        if (u.perks?.includes('fear')) {
          b.units.filter(enemy => !enemy.isHero && enemy.hp > 0 && enemy !== tgt && unitDistance(enemy, tgt) <= 1)
            .forEach(enemy => addStatus(enemy, STATUS.FEAR, 1));
        }
        pushBattleLog(`🧊 ${tgt.name} frozen`, 'status');
        applySerisChaosAoe(u);
        b.heroActionDone = true; endUnitTurn(); return;
      }
      if (b.pendingSkill === 'meteor' && u.heroId === 'seris') {
        if (u.mana < 8) return;
        b.objectiveUsedSkill = true;
        if (typeof BattleSfx !== 'undefined') BattleSfx.playSampledUrl(BSX.heroes_seris_meteor, 1);
        u.mana -= 8; u.cds.meteor = 6;
        const meteorSize = 2 + serisAoeBonus(u);
        const meteorCells = [];
        for (let dy = 0; dy < meteorSize; dy++) for (let dx = 0; dx < meteorSize; dx++) meteorCells.push({ x: gx + dx, y: gy + dy });
        playBattleAbilityFx(u, 'meteor', { x: gx + (meteorSize - 1) / 2, y: gy + (meteorSize - 1) / 2, radius: meteorSize, glyph: '☄', projectile: 'meteor' });
        damageEnemiesAtCells(b, u, meteorCells, 30, { fire: true, magic: true, sfxImpactOnly: true, animationSkill: 'meteor', animationImpactOnly: true, animationOffsetMs: 260 });
        applySerisChaosAoe(u);
        b.heroActionDone = true; endUnitTurn(); return;
      }
      if (b.pendingSkill === 'shieldBash') {
        if (unitDistanceFromPoint(tgt, u.x, u.y) > 1) return;
        performHeroAttack(u, tgt);
        return;
      }
      if (b.pendingSkill === 'slowArrow') {
        if (Math.abs(u.x - gx) + Math.abs(u.y - gy) > u.range || rangedBlocked(u.x, u.y, gx, gy, b.grid, false)) return;
        b.objectiveUsedSkill = true;
        if (typeof BattleSfx !== 'undefined') BattleSfx.playSampledUrl(BSX.heroes_alira_slow_arrow, 0.85);
        dealDamage(u, tgt, u.attack, { sfxImpactOnly: true, animationSkill: 'slowArrow' });
        addStatus(tgt, STATUS.SLOW, 2);
        u.cds.slowArrow = 3;
        b.heroActionDone = true; endUnitTurn(); return;
      }
      performHeroAttack(u, tgt);
    }
  }
