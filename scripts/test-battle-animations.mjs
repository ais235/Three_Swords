import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const BattleAnimations = require('../src/battle-animations.js');
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const index = readFileSync(resolve(root, 'index.html'), 'utf8');
const failures = [];
const check = (name, condition, details = '') => {
  if (condition) console.log(`PASS ${name}`);
  else failures.push(`${name}${details ? `: ${details}` : ''}`);
};

const enemyBlock = index.match(/const ENEMY_IDS = \{([\s\S]*?)\n\s*\};/);
const enemyIds = enemyBlock
  ? [...enemyBlock[1].matchAll(/[A-Z0-9_]+:\s*'([^']+)'/g)].map(match => match[1])
  : [];
const missingEnemies = enemyIds.filter(id => !BattleAnimations.ENEMY[id]);

check('every enemy has an attack animation profile', missingEnemies.length === 0, missingEnemies.join(', '));
check('every enemy profile resolves to a known archetype',
  Object.values(BattleAnimations.ENEMY).every(id => !!BattleAnimations.PROFILES[id]));

const expectedHeroActions = {
  garet: ['basic', 'shieldBash', 'fireCall', 'berserk'],
  alira: ['basic', 'double', 'doubleShot', 'slowArrow', 'arrowRain'],
  seris: ['basic', 'fireball', 'freeze', 'meteor', 'teleport']
};
for (const [heroId, actions] of Object.entries(expectedHeroActions)) {
  const missing = actions.filter(action => !BattleAnimations.HERO[heroId]?.[action]);
  check(`${heroId} has profiles for every combat action`, missing.length === 0, missing.join(', '));
}

check('ranged attacks have a visible projectile',
  ['arrow', 'thrown', 'magic', 'fire', 'ice', 'poison', 'shadow', 'root']
    .every(id => !!BattleAnimations.PROFILES[id].projectile));
check('hero, enemy and boss deaths are distinct',
  new Set([
    BattleAnimations.resolveDeath({ isHero: true }).kind,
    BattleAnimations.resolveDeath({ isHero: false }, {}).kind,
    BattleAnimations.resolveDeath({ isHero: false }, { boss: true }).kind
  ]).size === 3);
check('boss death lasts longer than hero and enemy deaths',
  BattleAnimations.resolveDeath({}, { boss: true }).duration >
    BattleAnimations.resolveDeath({ isHero: true }).duration &&
  BattleAnimations.resolveDeath({ isHero: true }).duration >
    BattleAnimations.resolveDeath({ isHero: false }).duration);
check('double shot resolves as an arrow profile',
  BattleAnimations.resolveAttack({ isHero: true, heroId: 'alira' }, { animationSkill: 'double' }).id === 'arrow');
check('Leshy uses the root profile',
  BattleAnimations.resolveAttack({ isHero: false, enemyId: 'leshy' }, {}).id === 'root');

if (failures.length) {
  failures.forEach(failure => console.error(`FAIL ${failure}`));
  process.exit(1);
}

console.log('Battle animation profile tests passed.');
