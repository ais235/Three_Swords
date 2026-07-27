(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.LeshyBoss = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const PROFILE = Object.freeze({
    hp: 90,
    attack: 8,
    armor: 3,
    maxLivingSummons: 4,
    summonCooldown: 2,
    phaseThreshold: 0.5,
    phaseAttackBonus: 2
  });

  const SUMMON_POOL = Object.freeze([
    'wolf',
    'spearman',
    'thorn_dryad',
    'bog_lurker',
    'rat_swarm'
  ]);

  function clampSummonCount(requested, livingSummons) {
    return Math.max(0, Math.min(requested, PROFILE.maxLivingSummons - livingSummons));
  }

  function planTurn(state) {
    const turn = Math.max(1, Number(state.turn) || 1);
    const hp = Math.max(0, Number(state.hp) || 0);
    const maxHp = Math.max(1, Number(state.maxHp) || PROFILE.hp);
    const livingSummons = Math.max(0, Number(state.livingSummons) || 0);
    const cooldown = Math.max(0, Number(state.summonCooldown) || 0);
    const phase2 = !!state.phase2;
    const phaseTriggered = !phase2 && hp <= maxHp * PROFILE.phaseThreshold;

    let requestedSummons = 0;
    if (phaseTriggered) requestedSummons = 2;
    else if (turn === 1) requestedSummons = 2;
    else if (cooldown <= 1) requestedSummons = 1;

    const summonCount = clampSummonCount(requestedSummons, livingSummons);
    return Object.freeze({
      phaseTriggered,
      phase2: phase2 || phaseTriggered,
      empowerSummons: phaseTriggered,
      summonCount,
      attack: summonCount === 0,
      nextCooldown: summonCount > 0 ? PROFILE.summonCooldown : Math.max(0, cooldown - 1)
    });
  }

  function summonTypes(serial, count) {
    const start = Math.max(0, Number(serial) || 0);
    const amount = Math.max(0, Number(count) || 0);
    const result = [];
    for (let i = 0; i < amount; i++) {
      result.push(SUMMON_POOL[(start + i) % SUMMON_POOL.length]);
    }
    return result;
  }

  return Object.freeze({ PROFILE, SUMMON_POOL, planTurn, summonTypes });
});
