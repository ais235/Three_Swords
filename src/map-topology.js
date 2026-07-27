(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.WorldMapTopology = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const COLS = 12;
  const ROWS = 8;
  const LAYOUT_VERSION = 2;

  const REGION_BOSS_ANCHORS = Object.freeze({
    1: Object.freeze({ x: 11, y: 1 }),
    2: Object.freeze({ x: 0, y: 4 }),
    3: Object.freeze({ x: 11, y: 6 })
  });
  const FINAL_ANCHOR = Object.freeze({ x: 11, y: 7 });

  const REGION_GATEWAYS = Object.freeze([
    Object.freeze({
      fromRegion: 1,
      toRegion: 2,
      from: Object.freeze({ x: 11, y: 2 }),
      to: Object.freeze({ x: 11, y: 3 })
    }),
    Object.freeze({
      fromRegion: 2,
      toRegion: 3,
      from: Object.freeze({ x: 0, y: 5 }),
      to: Object.freeze({ x: 0, y: 6 })
    })
  ]);

  function regionForRow(y) {
    if (y <= 2) return 1;
    if (y <= 5) return 2;
    return 3;
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
    const aRegion = Number(a.region) || regionForRow(a.y);
    const bRegion = Number(b.region) || regionForRow(b.y);
    if (aRegion === bRegion) return true;
    return isGatewayTransition(a, b);
  }

  function isNeighbor(a, b) {
    if (!a || !b || samePoint(a, b)) return false;
    if (Math.abs(a.x - b.x) > 1 || Math.abs(a.y - b.y) > 1) return false;
    return movementAllowed(a, b);
  }

  function wallClasses(cell) {
    if (!cell) return [];
    const classes = [];
    if (cell.y === 2 && cell.x < 11) classes.push('map-wall-bottom');
    if (cell.y === 3 && cell.x < 11) classes.push('map-wall-top');
    if (cell.y === 5 && cell.x > 0) classes.push('map-wall-bottom');
    if (cell.y === 6 && cell.x > 0) classes.push('map-wall-top');
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
    if (region === 1) return point.x === 11 && point.y >= 0 && point.y <= 2;
    if (region === 2) return point.x === 0 && point.y >= 3 && point.y <= 5;
    if (region === 3) return point.x === 11 && point.y >= 6 && point.y <= 7;
    return false;
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
    REGION_BOSS_ANCHORS,
    FINAL_ANCHOR,
    REGION_GATEWAYS,
    regionForRow,
    isGatewayTransition,
    movementAllowed,
    isNeighbor,
    wallClasses,
    bossZoneContains,
    shortestDistance
  });
});
