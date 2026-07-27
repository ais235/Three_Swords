import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const preview = require(resolve(root, 'src/combat-preview.js'));

const failures = [];
const check = (name, actual, expected) => {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    failures.push(`${name}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  } else {
    console.log(`PASS ${name}`);
  }
};

check('base damage minus armor',
  preview.calculate({ rawDamage: 10, armor: 3 }).minimum,
  7);

check('finisher applies before armor',
  preview.calculate({ rawDamage: 10, armor: 3, finisherMultiplier: 1.3 }).minimum,
  10);

check('move, charge, aura and flank preserve combat order',
  preview.calculate({
    rawDamage: 10,
    armor: 2,
    moveMultiplier: 1.2,
    spellCharge: 3,
    auraMultiplier: 1.1,
    flankMultiplier: 1.25
  }).minimum,
  17);

check('double shot reports two independently armored hits',
  preview.calculate({ rawDamage: 8, armor: 3, hitCount: 2 }).minimum,
  10);

check('double shot applies first-shot bonus only once',
  preview.calculateSequence(
    { rawDamage: 8, armor: 0, firstShotMultiplier: 1.5, targetHp: 20 },
    { hitCount: 2, targetHp: 20, targetMaxHp: 20, firstShotOnly: true }
  ).minimum,
  20);

check('double shot can activate finisher on its second hit',
  preview.calculateSequence(
    { rawDamage: 10, armor: 0, finisherMultiplier: 1, targetHp: 15 },
    { hitCount: 2, targetHp: 15, targetMaxHp: 20, finisherEnabled: true, finisherMultiplier: 1.3 }
  ).minimum,
  23);

check('critical hit exposes a range',
  (({ minimum, maximum, critChance }) => ({ minimum, maximum, critChance }))(
    preview.calculate({ rawDamage: 10, armor: 2, critChance: 0.15, critMultiplier: 1.5 })
  ),
  { minimum: 8, maximum: 12, critChance: 0.15 });

check('immunity overrides physical damage',
  preview.calculate({ rawDamage: 40, armor: 0, immune: true }).maximum,
  0);

check('burn is separated from immediate damage',
  (({ minimum, statusDamage, possibleKill }) => ({ minimum, statusDamage, possibleKill }))(
    preview.calculate({ rawDamage: 8, armor: 3, statusDamage: 6, targetHp: 10 })
  ),
  { minimum: 5, statusDamage: 6, possibleKill: true });

check('avoidance makes minimum zero',
  preview.calculate({ rawDamage: 10, armor: 0, dodgeChance: 0.2 }).minimum,
  0);

if (failures.length) {
  failures.forEach(failure => console.error(`FAIL ${failure}`));
  process.exit(1);
}

console.log('Combat preview tests passed.');
