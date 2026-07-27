import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const LeshyBoss = require('../src/leshy-boss.js');
const failures = [];
const check = (name, condition, details = '') => {
  if (condition) console.log(`PASS ${name}`);
  else failures.push(`${name}${details ? `: ${details}` : ''}`);
};

check('Leshy has less HP than the second boss', LeshyBoss.PROFILE.hp < 110, String(LeshyBoss.PROFILE.hp));
check('Leshy is durable enough for a regional boss', LeshyBoss.PROFILE.hp >= 80, String(LeshyBoss.PROFILE.hp));
check('summon pool contains only five existing forest enemy ids',
  JSON.stringify(LeshyBoss.SUMMON_POOL) === JSON.stringify(['wolf', 'spearman', 'thorn_dryad', 'bog_lurker', 'rat_swarm']));

const opening = LeshyBoss.planTurn({
  turn: 1, hp: 90, maxHp: 90, livingSummons: 0, summonCooldown: 0, phase2: false
});
check('opening turn summons two creatures', opening.summonCount === 2 && !opening.attack);

const recoveryTurn = LeshyBoss.planTurn({
  turn: 2, hp: 80, maxHp: 90, livingSummons: 2, summonCooldown: 2, phase2: false
});
check('turn after summoning is an attack turn', recoveryTurn.summonCount === 0 && recoveryTurn.attack && recoveryTurn.nextCooldown === 1);

const regularSummon = LeshyBoss.planTurn({
  turn: 3, hp: 70, maxHp: 90, livingSummons: 2, summonCooldown: 1, phase2: false
});
check('regular cadence summons one creature every other turn', regularSummon.summonCount === 1 && regularSummon.nextCooldown === 2);

const phase = LeshyBoss.planTurn({
  turn: 4, hp: 45, maxHp: 90, livingSummons: 2, summonCooldown: 2, phase2: false
});
check('half-health phase summons two and empowers the pack',
  phase.phaseTriggered && phase.phase2 && phase.empowerSummons && phase.summonCount === 2);

const capped = LeshyBoss.planTurn({
  turn: 5, hp: 40, maxHp: 90, livingSummons: 4, summonCooldown: 0, phase2: true
});
check('living summon cap forces an attack', capped.summonCount === 0 && capped.attack);
check('summons cycle through different forest creatures',
  JSON.stringify(LeshyBoss.summonTypes(4, 3)) === JSON.stringify(['rat_swarm', 'wolf', 'spearman']));

if (failures.length) {
  failures.forEach(failure => console.error(`FAIL ${failure}`));
  process.exit(1);
}

console.log('Leshy boss behavior tests passed.');
