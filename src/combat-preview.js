(function attachCombatPreview(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.ThreeBladesCombatPreview = api;
})(typeof globalThis !== 'undefined' ? globalThis : window, function createCombatPreview() {
  'use strict';

  const floorMul = (value, multiplier) => Math.floor(value * (multiplier || 1));
  const clampChance = value => Math.max(0, Math.min(1, Number(value) || 0));

  function damageForHit(context, critical) {
    let damage = Math.max(0, Number(context.rawDamage) || 0);
    damage = floorMul(damage, context.firstShotMultiplier);
    damage = floorMul(damage, context.finisherMultiplier);
    damage = floorMul(damage, context.moveMultiplier);
    damage += Math.max(0, Number(context.spellCharge) || 0);
    damage = floorMul(damage, context.berserkMultiplier);

    const armor = Math.max(0, Number(context.armor) || 0);
    const beforeArmor = damage;
    damage = Math.max(0, damage - armor);
    if (context.immune) damage = 0;
    damage = floorMul(damage, context.elementalMultiplier);
    damage = floorMul(damage, context.targetMultiplier);
    if (critical) damage = floorMul(damage, context.critMultiplier || 1.5);
    damage = floorMul(damage, context.auraMultiplier);
    damage = floorMul(damage, context.flankMultiplier);

    return {
      damage,
      beforeArmor,
      armorAbsorbed: Math.min(beforeArmor, armor)
    };
  }

  function calculate(context = {}) {
    const hitCount = Math.max(1, Math.floor(Number(context.hitCount) || 1));
    const critChance = clampChance(context.critChance);
    const blockChance = clampChance(context.blockChance);
    const dodgeChance = clampChance(context.dodgeChance);
    const avoidChance = 1 - ((1 - blockChance) * (1 - dodgeChance));
    const regular = damageForHit(context, false);
    const critical = critChance > 0 ? damageForHit(context, true) : regular;
    const noAvoidMin = regular.damage * hitCount;
    const maximum = critical.damage * hitCount;
    const expectedPerHit = regular.damage * (1 - critChance) + critical.damage * critChance;
    const expected = Math.round(expectedPerHit * hitCount * (1 - avoidChance) * 10) / 10;
    const minimum = avoidChance > 0 ? 0 : noAvoidMin;
    const statusDamage = Math.max(0, Number(context.statusDamage) || 0);
    const targetHp = Math.max(0, Number(context.targetHp) || 0);

    return {
      minimum,
      maximum,
      expected,
      regularPerHit: regular.damage,
      criticalPerHit: critical.damage,
      armorAbsorbed: regular.armorAbsorbed,
      hitCount,
      critChance,
      blockChance,
      dodgeChance,
      avoidChance,
      statusDamage,
      statusLabel: context.statusLabel || '',
      immune: !!context.immune,
      guaranteedKill: targetHp > 0 && minimum >= targetHp,
      possibleKill: targetHp > 0 && maximum + statusDamage >= targetHp,
      tags: Array.isArray(context.tags) ? context.tags.filter(Boolean) : []
    };
  }

  function calculateSequence(context = {}, options = {}) {
    const hitCount = Math.max(1, Math.min(4, Math.floor(Number(options.hitCount) || 1)));
    const targetHp = Math.max(0, Number(options.targetHp ?? context.targetHp) || 0);
    const targetMaxHp = Math.max(1, Number(options.targetMaxHp) || targetHp || 1);
    const critChance = clampChance(context.critChance);
    const patternCount = critChance > 0 ? 2 ** hitCount : 1;
    const outcomes = [];
    let expected = 0;

    for (let mask = 0; mask < patternCount; mask++) {
      let remainingHp = targetHp;
      let total = 0;
      let probability = 1;
      for (let hit = 0; hit < hitCount && remainingHp > 0; hit++) {
        const critical = critChance > 0 && !!(mask & (1 << hit));
        probability *= critical ? critChance : 1 - critChance;
        const hitContext = {
          ...context,
          firstShotMultiplier: options.firstShotOnly && hit > 0 ? 1 : context.firstShotMultiplier,
          finisherMultiplier: options.finisherEnabled && remainingHp <= targetMaxHp * .4
            ? Number(options.finisherMultiplier) || 1.3
            : (Number(context.finisherMultiplier) || 1)
        };
        const hitDamage = damageForHit(hitContext, critical).damage;
        total += hitDamage;
        remainingHp -= hitDamage;
      }
      outcomes.push(total);
      expected += total * probability;
    }

    const firstHit = damageForHit(context, false);
    // Avoidance applies per hit: each shot in the sequence can be blocked or
    // dodged independently, so a two-shot volley expects (1 - avoid) of each.
    const blockChance = clampChance(context.blockChance);
    const dodgeChance = clampChance(context.dodgeChance);
    const avoidChance = 1 - ((1 - blockChance) * (1 - dodgeChance));
    const minimum = avoidChance > 0 ? 0 : Math.min(...outcomes);
    const maximum = Math.max(...outcomes);
    return {
      minimum,
      maximum,
      expected: Math.round(expected * (1 - avoidChance) * 10) / 10,
      regularPerHit: firstHit.damage,
      criticalPerHit: damageForHit(context, true).damage,
      armorAbsorbed: firstHit.armorAbsorbed,
      hitCount,
      critChance,
      blockChance,
      dodgeChance,
      avoidChance,
      statusDamage: Math.max(0, Number(context.statusDamage) || 0),
      statusLabel: context.statusLabel || '',
      immune: !!context.immune,
      guaranteedKill: targetHp > 0 && avoidChance === 0 && minimum >= targetHp,
      possibleKill: targetHp > 0 && maximum + (Number(context.statusDamage) || 0) >= targetHp,
      tags: Array.isArray(context.tags) ? context.tags.filter(Boolean) : []
    };
  }

  return Object.freeze({ calculate, calculateSequence, damageForHit });
});
