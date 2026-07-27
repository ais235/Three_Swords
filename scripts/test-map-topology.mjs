import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const topology = require('../src/map-topology.js');
const failures = [];
const pass = name => console.log(`PASS ${name}`);
const check = (name, condition, details = '') => {
  if (condition) pass(name);
  else failures.push(`${name}${details ? `: ${details}` : ''}`);
};

const cells = [];
for (let y = 0; y < topology.ROWS; y++) {
  for (let x = 0; x < topology.COLS; x++) {
    cells.push({ x, y, region: topology.regionForRow(y) });
  }
}

const pointKey = point => `${point.x},${point.y}`;
const byKey = new Map(cells.map(cell => [pointKey(cell), cell]));
const neighbors = cell => cells.filter(other => topology.isNeighbor(cell, other));

function reachable(start) {
  const seen = new Set([pointKey(start)]);
  const queue = [start];
  while (queue.length) {
    const current = queue.shift();
    neighbors(current).forEach(next => {
      const key = pointKey(next);
      if (seen.has(key)) return;
      seen.add(key);
      queue.push(next);
    });
  }
  return seen;
}

for (const region of [1, 2, 3]) {
  const anchor = topology.REGION_BOSS_ANCHORS[region];
  check(`region ${region} boss is inside its terminal zone`, topology.bossZoneContains(region, anchor), JSON.stringify(anchor));
  check(`region ${region} boss anchor belongs to its region`, topology.regionForRow(anchor.y) === region, JSON.stringify(anchor));
}
check('final boss is inside the region 3 terminal zone', topology.bossZoneContains(3, topology.FINAL_ANCHOR));
check('region 3 boss leads directly to the final boss', topology.isNeighbor(topology.REGION_BOSS_ANCHORS[3], topology.FINAL_ANCHOR));
check('distance to region 1 boss follows actual movement', topology.shortestDistance({ x: 0, y: 0 }, topology.REGION_BOSS_ANCHORS[1]) === 11);
check('distance from region 1 to region 2 boss uses the right gateway', topology.shortestDistance(topology.REGION_BOSS_ANCHORS[1], topology.REGION_BOSS_ANCHORS[2]) === 13);
check('distance from region 2 to region 3 boss uses the left gateway', topology.shortestDistance(topology.REGION_BOSS_ANCHORS[2], topology.REGION_BOSS_ANCHORS[3]) === 13);

const crossRegionEdges = [];
for (const cell of cells) {
  for (const other of cells) {
    if (cell.region === other.region || !topology.isNeighbor(cell, other)) continue;
    const edge = [pointKey(cell), pointKey(other)].sort().join('|');
    if (!crossRegionEdges.includes(edge)) crossRegionEdges.push(edge);
  }
}
check('only two openings cross regional walls', crossRegionEdges.length === 2, JSON.stringify(crossRegionEdges));

for (const gateway of topology.REGION_GATEWAYS) {
  check(`gateway ${gateway.fromRegion}→${gateway.toRegion} is open`, topology.isNeighbor(gateway.from, gateway.to));
  const sideX = gateway.from.x === 0 ? 1 : gateway.from.x - 1;
  const diagonalA = { x: sideX, y: gateway.from.y, region: gateway.fromRegion };
  const diagonalB = { x: gateway.to.x, y: gateway.to.y, region: gateway.toRegion };
  if (!topology.isGatewayTransition(diagonalA, diagonalB)) {
    check(`wall beside gateway ${gateway.fromRegion}→${gateway.toRegion} blocks diagonal bypass`, !topology.isNeighbor(diagonalA, diagonalB));
  }
}

const allReachable = reachable(byKey.get('0,0'));
check('snake topology keeps all 96 cells reachable', allReachable.size === topology.COLS * topology.ROWS, String(allReachable.size));

const sequence = [
  byKey.get('0,0'),
  ...[1, 2, 3].map(region => byKey.get(pointKey(topology.REGION_BOSS_ANCHORS[region]))),
  byKey.get(pointKey(topology.FINAL_ANCHOR))
];
for (let i = 0; i < sequence.length - 1; i++) {
  const seen = reachable(sequence[i]);
  check(`route stage ${i + 1} can reach stage ${i + 2}`, seen.has(pointKey(sequence[i + 1])));
}

const wallSegments = cells.flatMap(cell => topology.wallClasses(cell));
check('both regional walls have complete visual segments', wallSegments.filter(name => name.startsWith('map-wall-')).length === 44, String(wallSegments.length));
check('four cells mark the two gateway directions', wallSegments.filter(name => name.startsWith('map-gateway-')).length === 4, String(wallSegments.length));

if (failures.length) {
  failures.forEach(failure => console.error(`FAIL ${failure}`));
  process.exit(1);
}

console.log('World map topology tests passed.');
