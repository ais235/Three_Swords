(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorldMapTopology = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const COLS = 12;
  const ROWS = 8;
  const LAYOUT_VERSION = 3;

  // Act proportions. Layout 2 gave the tutorial region the most room (3 rows)
  // and the finale the least (2 rows), so the campaign got shorter and simpler
  // exactly where it should have escalated. Region 1 is now the short act.
  const REGION_ROWS = Object.freeze({ 1: [0, 1], 2: [2, 3, 4], 3: [5, 6, 7] });

  const REGION_BOSS_ANCHORS = Object.freeze({
    1: Object.freeze({ x: 11, y: 0 }),
    2: Object.freeze({ x: 0, y: 3 }),
    3: Object.freeze({ x: 11, y: 6 })
  });
  const FINAL_ANCHOR = Object.freeze({ x: 11, y: 7 });

  const REGION_GATEWAYS = Object.freeze([
    Object.freeze({
      fromRegion: 1,
      toRegion: 2,
      from: Object.freeze({ x: 11, y: 1 }),
      to: Object.freeze({ x: 11, y: 2 })
    }),
    Object.freeze({
      fromRegion: 2,
      toRegion: 3,
      from: Object.freeze({ x: 0, y: 4 }),
      to: Object.freeze({ x: 0, y: 5 })
    })
  ]);

  /** Every horizontal wall on the board, keyed by the row it sits under.
   *  `open` lists the columns a party may step through, and a wall may only be
   *  crossed straight down or straight up — never diagonally.
   *
   *  Only four rows carry a wall, and that is deliberate. A first pass put one
   *  under every row; because a diagonal step is by definition a row change, that
   *  silently removed diagonal movement from the entire map. Region 1 is now fully
   *  open — it is the short opening act — and regions 2 and 3 are each split once,
   *  which keeps the corridor commitment while diagonals work everywhere else. */
  const WALL_ROWS = Object.freeze([
    Object.freeze({ above: 1, open: Object.freeze([11]), regional: true }),
    Object.freeze({ above: 2, open: Object.freeze([1, 2, 7, 8]), regional: false }),
    Object.freeze({ above: 4, open: Object.freeze([0]), regional: true }),
    Object.freeze({ above: 6, open: Object.freeze([4, 5, 10, 11]), regional: false })
  ]);

  function regionForRow(y) {
    if (y <= 1) return 1;
    if (y <= 4) return 2;
    return 3;
  }

  function wallAboveRow(row) {
    return WALL_ROWS.find(wall => wall.above === row) || null;
  }

  function samePoint(a, b) {
    return !!a && !!b && a.x === b.x && a.y === b.y;
  }

  function isGatewayTransition(a, b) {
    return REGION_GATEWAYS.some(gateway =>
      (samePoint(a, gateway.from) && samePoint(b, gateway.to)) ||
      (samePoint(a, gateway.to) && samePoint(b, gateway.from))
    );
  }

  function movementAllowed(a, b) {
    if (!a || !b) return false;
    if (a.y === b.y) return true;
    const wall = wallAboveRow(Math.min(a.y, b.y));
    if (!wall) return true;
    // A wall is crossed straight or not at all: no diagonal slipping past a gate.
    if (a.x !== b.x) return false;
    return wall.open.includes(a.x);
  }

  function isNeighbor(a, b) {
    if (!a || !b || samePoint(a, b)) return false;
    if (Math.abs(a.x - b.x) > 1 || Math.abs(a.y - b.y) > 1) return false;
    return movementAllowed(a, b);
  }

  function wallClasses(cell) {
    if (!cell) return [];
    const classes = [];
    const below = wallAboveRow(cell.y);
    if (below && !below.open.includes(cell.x)) {
      classes.push('map-wall-bottom');
      if (below.regional) classes.push('map-wall-bottom-regional');
    }
    const above = wallAboveRow(cell.y - 1);
    if (above && !above.open.includes(cell.x)) {
      classes.push('map-wall-top');
      if (above.regional) classes.push('map-wall-top-regional');
    }
    if (samePoint(cell, REGION_GATEWAYS[0].from) || samePoint(cell, REGION_GATEWAYS[1].from)) {
      classes.push('map-gateway-down');
    }
    if (samePoint(cell, REGION_GATEWAYS[0].to) || samePoint(cell, REGION_GATEWAYS[1].to)) {
      classes.push('map-gateway-up');
    }
    return classes;
  }

  function bossZoneContains(region, point) {
    if (!point) return false;
    const rows = REGION_ROWS[region];
    if (!rows) return false;
    const anchor = region === 3 ? FINAL_ANCHOR : REGION_BOSS_ANCHORS[region];
    return point.x === anchor.x && rows.includes(point.y);
  }

  function shortestDistance(start, target) {
    if (!start || !target) return 0;
    if (samePoint(start, target)) return 0;
    const key = point => `${point.x},${point.y}`;
    const queue = [{ x: start.x, y: start.y, region: Number(start.region) || regionForRow(start.y), steps: 0 }];
    const seen = new Set([key(start)]);
    while (queue.length) {
      const current = queue.shift();
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const next = {
            x: current.x + dx,
            y: current.y + dy
          };
          if (next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS) continue;
          next.region = regionForRow(next.y);
          if (!isNeighbor(current, next)) continue;
          if (seen.has(key(next))) continue;
          if (samePoint(next, target)) return current.steps + 1;
          seen.add(key(next));
          queue.push({ ...next, steps: current.steps + 1 });
        }
      }
    }
    return 0;
  }

  return Object.freeze({
    COLS,
    ROWS,
    LAYOUT_VERSION,
    REGION_ROWS,
    REGION_BOSS_ANCHORS,
    FINAL_ANCHOR,
    REGION_GATEWAYS,
    WALL_ROWS,
    regionForRow,
    isGatewayTransition,
    movementAllowed,
    isNeighbor,
    wallClasses,
    bossZoneContains,
    shortestDistance
  });
});
