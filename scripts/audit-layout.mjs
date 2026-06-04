import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const indexPath = resolve(root, 'index.html');
const planPath = resolve(root, 'docs/UX_GAMEPLAY_OVERHAUL_PLAN.md');
const index = readFileSync(indexPath, 'utf8');
const plan = readFileSync(planPath, 'utf8');

function enemyEntries() {
  const block = index.match(/const ENEMY_IDS = \{([\s\S]*?)\n\s*\};/);
  if (!block) return [];
  return [...block[1].matchAll(/([A-Z0-9_]+):\s*'([^']+)'/g)]
    .map(match => ({ key: match[1], id: match[2] }));
}

function allEnemiesHaveAbilityText() {
  return enemyEntries().every(enemy => index.includes(`[ENEMY_IDS.${enemy.key}]:`) && index.includes('function enemyAbilityText'));
}

function allEnemiesHaveBestiaryData() {
  const dataBlock = index.match(/const ENEMY_BESTIARY_DATA = \{([\s\S]*?)\n\s*\};/);
  if (!dataBlock) return false;
  return enemyEntries().every(enemy => dataBlock[1].includes(`[ENEMY_IDS.${enemy.key}]:`));
}

function enemyBehaviorSnippetsPresent() {
  const snippets = [
    'u.enemyId === ENEMY_IDS.SHAMAN',
    'u.enemyId === ENEMY_IDS.PLAGUE_DOCTOR',
    'u.enemyId === ENEMY_IDS.NECRO',
    'spawnEnemy(ENEMY_IDS.SKELETON',
    'u.enemyId === ENEMY_IDS.SUICIDE',
    'dealDamage(u, h, 20',
    'u.enemyId === ENEMY_IDS.ZOMBIE',
    'dealDamage(u, t, 5',
    'attacker.enemyId === ENEMY_IDS.BLOOD_KNIGHT',
    'attacker.enemyId === ENEMY_IDS.SPIDER',
    'attacker.enemyId === ENEMY_IDS.ICE_ELEM',
    'attacker.enemyId === ENEMY_IDS.HEXER',
    'attacker.enemyId === ENEMY_IDS.BANSHEE',
    'target.enemyId === ENEMY_IDS.GHOST',
    'findWatcher(b)'
  ];
  return snippets.every(snippet => index.includes(snippet));
}

const checks = [
  ['index.html exists', () => existsSync(indexPath)],
  ['plan exists', () => existsSync(planPath)],
  ['Yandex SDK uses /sdk.js', () => index.includes('<script src="/sdk.js"></script>')],
  ['old Yandex SDK URL absent', () => !index.includes('https://yandex.ru/games/sdk/v2')],
  ['LoadingAPI.ready integration present', () => index.includes('LoadingAPI?.ready') && index.includes('notifyYandexGameReady')],
  ['current inventory layout selector present', () => index.includes('#inv-layout')],
  ['old inventory selectors absent', () => !/#inventory-layout|#inv-left|#inv-right/.test(index)],
  ['map Enter path uses enterMapNode', () => index.includes('function enterMapNode') && index.includes('cellNeighbors(cur, node)')],
  ['offline wanderer fallback present', () => index.includes('openWanderer();')],
  ['offline arena fallback present', () => index.includes('startArena();')],
  ['SFX auditor dev flag present', () => index.includes('SFX_AUDITOR_ENABLED')],
  ['Berserk key is consistent', () => index.includes("key: 'berserk'") && index.includes('u.cds.berserk = 6') && !index.includes('inspire')],
  ['enemy threat badges present', () => index.includes('function enemyThreatTags') && index.includes('threat-badges') && index.includes('enemyThreatBadgesHtml')],
  ['inventory equip best present', () => index.includes('function equipBestForHero') && index.includes('btn-inv-equip-best') && index.includes('inv-item-best')],
  ['inventory comparison present', () => index.includes('function itemCompareHtml') && index.includes('item-compare') && index.includes('powerDelta')],
  ['battle item proc feedback present', () => index.includes('function spawnBattleTextFx') && index.includes('DODGE') && index.includes('MANA +') && index.includes('REVIVE 5')],
  ['perk descriptions are specific', () => index.includes('const PERK_DESCRIPTIONS') && index.includes('Tank path:') && index.includes('Mystic path:')],
  ['all enemies have ability text', allEnemiesHaveAbilityText],
  ['all enemies have bestiary data', allEnemiesHaveBestiaryData],
  ['enemy behavior snippets present', enemyBehaviorSnippetsPresent],
  ['battle hover previews present', () => index.includes('function skillPreviewCells') && index.includes('function enemyHoverDangerCells') && index.includes('hoverCell')],
  ['plan has Definition of Done', () => plan.includes('Definition of Done')],
  ['plan has Out Of Scope', () => plan.includes('Out Of Scope For This Overhaul')]
];

let failed = 0;
for (const [name, fn] of checks) {
  let ok = false;
  try {
    ok = !!fn();
  } catch {
    ok = false;
  }
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`);
  if (!ok) failed++;
}

if (failed) {
  console.error(`\n${failed} audit check(s) failed.`);
  process.exit(1);
}

console.log('\nLayout/platform audit passed.');
