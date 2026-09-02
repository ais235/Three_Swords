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
check('distance from region 1 to region 2 boss uses the right gateway', topology.shortestDistance(topology.REGION_BOSS_ANCHORS[1], topology.REGION_BOSS_ANCHORS[2]) === 14);
check('distance from region 2 to region 3 boss uses the left gateway', topology.shortestDistance(topology.REGION_BOSS_ANCHORS[2], topology.REGION_BOSS_ANCHORS[3]) === 13);

// Act proportions: the finale must own at least as much board as the opening.
const rowsPerRegion = [1, 2, 3].map(region => topology.REGION_ROWS[region].length);
check('region 1 is the short opening act', rowsPerRegion[0] < rowsPerRegion[2], JSON.stringify(rowsPerRegion));
check('regions cover every row exactly once', [1, 2, 3].flatMap(r => topology.REGION_ROWS[r]).sort((a, b) => a - b)
  .every((row, index) => row === index) && rowsPerRegion.reduce((a, b) => a + b, 0) === topology.ROWS, JSON.stringify(rowsPerRegion));
for (const cell of cells) {
  const declared = topology.REGION_ROWS[cell.region];
  if (!declared.includes(cell.y)) failures.push(`row ${cell.y} is not listed under region ${cell.region}`);
}
pass('regionForRow agrees with REGION_ROWS');

// Internal walls: leaving the direct line to the boss has to cost real steps,
// otherwise a route is only a visiting order on a fully connected slab.
const detours = [
  ['region 2 entry to the far bottom corner', { x: 11, y: 2 }, { x: 11, y: 4 }],
  ['region 3 entry to the far bottom corner', { x: 0, y: 5 }, { x: 0, y: 7 }]
];
for (const [label, from, to] of detours) {
  const steps = topology.shortestDistance(from, to);
  const straight = Math.max(Math.abs(from.x - to.x), Math.abs(from.y - to.y));
  check(`internal walls make a detour cost more than a straight hop: ${label}`, steps >= straight + 3, `${steps} vs ${straight}`);
}
for (const region of [1, 2, 3]) {
  const anchor = topology.REGION_BOSS_ANCHORS[region];
  const entry = region === 1 ? { x: 0, y: 0 } : topology.REGION_GATEWAYS[region - 2].to;
  const steps = topology.shortestDistance(entry, anchor);
  const straight = Math.abs(entry.x - anchor.x);
  check(`region ${region} boss stays on a near-direct route`, steps <= straight + 2, `${steps} vs ${straight}`);
}
for (const wall of topology.WALL_ROWS) {
  check(`wall under row ${wall.above} has at least one opening`, wall.open.length > 0);
  const diagonal = topology.isNeighbor({ x: wall.open[0], y: wall.above }, { x: wall.open[0] + 1, y: wall.above + 1 });
  check(`wall under row ${wall.above} cannot be crossed diagonally`, !diagonal);
}

// A diagonal step is a row change, so a wall under every row would remove diagonal
// movement from the whole board. Rows without a wall must stay diagonally open.
const walledRows = new Set(topology.WALL_ROWS.map(wall => wall.above));
const openRowPairs = [];
for (let row = 0; row < topology.ROWS - 1; row++) if (!walledRows.has(row)) openRowPairs.push(row);
check('at least one row boundary in every region stays open', openRowPairs.length >= 2, JSON.stringify(openRowPairs));
let diagonalMoves = 0;
for (const cell of cells) {
  for (const other of cells) {
    if (Math.abs(cell.x - other.x) === 1 && Math.abs(cell.y - other.y) === 1 && topology.isNeighbor(cell, other)) diagonalMoves++;
  }
}
check('diagonal movement survives outside the walls', diagonalMoves > 100, String(diagonalMoves));
check('region 1 has no internal wall', !walledRows.has(0), JSON.stringify([...walledRows]));

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
check('walled topology keeps all 96 cells reachable', allReachable.size === topology.COLS * topology.ROWS, String(allReachable.size));

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
const expectedSegments = topology.WALL_ROWS.reduce((sum, wall) => sum + (topology.COLS - wall.open.length) * 2, 0);
check('every wall renders a segment on both of its sides', wallSegments.filter(name => name === 'map-wall-top' || name === 'map-wall-bottom').length === expectedSegments, String(wallSegments.length));
const regionalSegments = topology.WALL_ROWS.filter(wall => wall.regional)
  .reduce((sum, wall) => sum + (topology.COLS - wall.open.length) * 2, 0);
check('only the two act boundaries are marked regional', wallSegments.filter(name => name.endsWith('-regional')).length === regionalSegments, String(regionalSegments));
check('four cells mark the two gateway directions', wallSegments.filter(name => name.startsWith('map-gateway-')).length === 4, String(wallSegments.length));
// Both gateway cells must still be marked, wall segment or not: they render as
// separate child elements, so a wall on the same cell no longer hides the arrow.
for (const gateway of topology.REGION_GATEWAYS) {
  check(`gateway ${gateway.fromRegion} exit is marked`, topology.wallClasses(gateway.from).includes('map-gateway-down'));
  check(`gateway ${gateway.toRegion} entry is marked`, topology.wallClasses(gateway.to).includes('map-gateway-up'));
}

if (failures.length) {
  failures.forEach(failure => console.error(`FAIL ${failure}`));
  process.exit(1);
}

console.log('World map topology tests passed.');
