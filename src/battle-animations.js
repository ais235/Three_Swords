(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.BattleAnimations = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const PROFILES = Object.freeze({
    melee:     Object.freeze({ motion: 'lunge', projectile: null, impact: 'slash', color: '#ffe7a8', duration: 300, impactDelay: 90, strength: 1 }),
    heavy:     Object.freeze({ motion: 'heavy', projectile: null, impact: 'smash', color: '#ffb36b', duration: 390, impactDelay: 150, strength: 2 }),
    shield:    Object.freeze({ motion: 'heavy', projectile: null, impact: 'smash', color: '#8bdcff', duration: 410, impactDelay: 155, strength: 2 }),
    thrust:    Object.freeze({ motion: 'thrust', projectile: null, impact: 'pierce', color: '#fff0ba', duration: 310, impactDelay: 105, strength: 1 }),
    bite:      Object.freeze({ motion: 'pounce', projectile: null, impact: 'bite', color: '#ff8f8f', duration: 340, impactDelay: 125, strength: 1 }),
    arrow:     Object.freeze({ motion: 'recoil', projectile: 'arrow', impact: 'spark', color: '#d9f4ff', duration: 390, impactDelay: 250, strength: 1 }),
    arrowRain: Object.freeze({ motion: 'recoil', projectile: 'rain', impact: 'pierce', color: '#d9f4ff', duration: 520, impactDelay: 330, strength: 2 }),
    thrown:    Object.freeze({ motion: 'recoil', projectile: 'axe', impact: 'shard', color: '#e8d6bd', duration: 420, impactDelay: 270, strength: 1 }),
    magic:     Object.freeze({ motion: 'cast', projectile: 'orb', impact: 'rune', color: '#c9a8ff', duration: 430, impactDelay: 270, strength: 1 }),
    fire:      Object.freeze({ motion: 'cast', projectile: 'fire', impact: 'fire', color: '#ff8a42', duration: 480, impactDelay: 285, strength: 2 }),
    ice:       Object.freeze({ motion: 'cast', projectile: 'ice', impact: 'ice', color: '#8bdcff', duration: 450, impactDelay: 275, strength: 1 }),
    poison:    Object.freeze({ motion: 'recoil', projectile: 'poison', impact: 'poison', color: '#79e58c', duration: 440, impactDelay: 270, strength: 1 }),
    shadow:    Object.freeze({ motion: 'blink', projectile: 'shadow', impact: 'shadow', color: '#b68cff', duration: 370, impactDelay: 190, strength: 2 }),
    root:      Object.freeze({ motion: 'cast', projectile: 'root', impact: 'root', color: '#8fd36b', duration: 470, impactDelay: 285, strength: 1 }),
    heal:      Object.freeze({ motion: 'cast', projectile: null, impact: 'heal', color: '#7dffbf', duration: 500, impactDelay: 120, strength: 1 }),
    summon:    Object.freeze({ motion: 'cast', projectile: null, impact: 'summon', color: '#b7a7ff', duration: 600, impactDelay: 180, strength: 2 }),
    buff:      Object.freeze({ motion: 'brace', projectile: null, impact: 'buff', color: '#ffd06b', duration: 520, impactDelay: 120, strength: 1 }),
    teleport:  Object.freeze({ motion: 'teleport', projectile: null, impact: 'teleport', color: '#c9a8ff', duration: 430, impactDelay: 150, strength: 1 }),
    aoe:       Object.freeze({ motion: 'cast', projectile: null, impact: 'aoe', color: '#d8b4ff', duration: 520, impactDelay: 210, strength: 2 }),
    explosion: Object.freeze({ motion: 'brace', projectile: null, impact: 'explosion', color: '#ff6b4a', duration: 520, impactDelay: 190, strength: 3 }),
    meteor:    Object.freeze({ motion: 'cast', projectile: 'meteor', impact: 'explosion', color: '#ff6b4a', duration: 650, impactDelay: 430, strength: 3 })
  });

  const HERO = Object.freeze({
    garet: Object.freeze({
      basic: 'melee',
      shieldBash: 'shield',
      fireCall: 'fire',
      berserk: 'buff'
    }),
    alira: Object.freeze({
      basic: 'arrow',
      double: 'arrow',
      doubleShot: 'arrow',
      slowArrow: 'ice',
      arrowRain: 'arrowRain'
    }),
    seris: Object.freeze({
      basic: 'magic',
      fireball: 'fire',
      freeze: 'ice',
      meteor: 'meteor',
      teleport: 'teleport'
    })
  });

  const ENEMY = Object.freeze({
    skeleton: 'melee',
    goblin_archer: 'arrow',
    boar: 'heavy',
    zombie: 'melee',
    shaman: 'magic',
    leshy: 'root',
    bandit: 'melee',
    wolf: 'bite',
    bandit_thrower: 'thrown',
    spearman: 'thrust',
    bog_lurker: 'heavy',
    thorn_dryad: 'root',
    rat_swarm: 'bite',
    cultist: 'shadow',
    hexer: 'magic',
    shieldbearer: 'heavy',
    crossbowman: 'arrow',
    stone_golem: 'heavy',
    void_stalker: 'shadow',
    blood_knight: 'heavy',
    banshee: 'aoe',
    plague_doctor: 'poison',
    arcane_sentinel: 'magic',
    orc_guard: 'thrust',
    suicide: 'explosion',
    spider: 'bite',
    watcher: 'buff',
    ice_elem: 'ice',
    dark_knight: 'heavy',
    necro: 'magic',
    chaos: 'aoe',
    assassin: 'shadow',
    hydra: 'bite',
    ghost: 'shadow',
    fire_titan: 'fire',
    dark_lord: 'shadow'
  });

  const ENEMY_ABILITIES = Object.freeze({
    shamanHeal: 'heal',
    leshySummon: 'summon',
    leshyAwaken: 'buff',
    plagueHeal: 'heal',
    necroRaise: 'summon',
    watcherAura: 'buff',
    chaosAoe: 'aoe',
    hydraRegenerate: 'heal',
    bomberExplosion: 'explosion',
    zombieExplosion: 'explosion',
    darkLordTeleport: 'teleport',
    darkLordAoe: 'shadow',
    darkLordSummon: 'summon',
    fireTitanAoe: 'fire'
  });

  function profileById(id) {
    return PROFILES[id] || PROFILES.melee;
  }

  function resolveAttack(attacker, opts) {
    const options = opts || {};
    let id = options.animationProfile;
    if (!id && attacker && attacker.isHero) {
      const skill = options.animationSkill || 'basic';
      id = HERO[attacker.heroId] && (HERO[attacker.heroId][skill] || HERO[attacker.heroId].basic);
    }
    if (!id && attacker && !attacker.isHero) id = ENEMY[attacker.enemyId];
    if (!id && options.fire) id = 'fire';
    if (!id && options.magic) id = 'magic';
    if (!id && attacker && attacker.range > 1) id = 'arrow';
    id = id || 'melee';
    return Object.freeze({ id, ...profileById(id) });
  }

  function resolveAbility(owner, abilityKey) {
    let id = owner && owner.isHero
      ? HERO[owner.heroId] && HERO[owner.heroId][abilityKey]
      : ENEMY_ABILITIES[abilityKey];
    id = id || 'buff';
    return Object.freeze({ id, ...profileById(id) });
  }

  function resolveDeath(unit, meta) {
    const info = meta || {};
    if (unit && unit.isHero) return Object.freeze({ kind: 'hero', duration: 850, color: '#ff7f7f' });
    if (info.boss || info.large) return Object.freeze({ kind: 'boss', duration: 1100, color: info.color || '#ffd06b' });
    return Object.freeze({ kind: 'enemy', duration: 620, color: info.color || '#d8d8e8' });
  }

  return Object.freeze({
    PROFILES,
    HERO,
    ENEMY,
    ENEMY_ABILITIES,
    profileById,
    resolveAttack,
    resolveAbility,
    resolveDeath
  });
});
