import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const indexPath = resolve(root, 'index.html');
const planPath = resolve(root, 'docs/UX_GAMEPLAY_OVERHAUL_PLAN.md');
const balanceSeedsPath = resolve(root, 'scripts/balance-seeds.mjs');
const readabilityPath = resolve(root, 'styles/readability.css');
const readabilityTestPath = resolve(root, 'scripts/test-readability.mjs');
const mapTopologyPath = resolve(root, 'src/map-topology.js');
const mapTopologyTestPath = resolve(root, 'scripts/test-map-topology.mjs');
const leshyBossPath = resolve(root, 'src/leshy-boss.js');
const leshyBossTestPath = resolve(root, 'scripts/test-leshy-boss.mjs');
const leshySpritePath = resolve(root, 'assets/enemies/leshy.png');
const battleAnimationPath = resolve(root, 'src/battle-animations.js');
const battleAnimationPlanPath = resolve(root, 'docs/BATTLE_ANIMATION_PLAN.md');
const battleAnimationTestPath = resolve(root, 'scripts/test-battle-animations.mjs');
const index = readFileSync(indexPath, 'utf8');
const plan = readFileSync(planPath, 'utf8');
const readability = existsSync(readabilityPath) ? readFileSync(readabilityPath, 'utf8') : '';

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
    'u.enemyId === ENEMY_IDS.LESHY',
    'function leshyAi',
    'summonedByLeshy',
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
  ['repeatable test seed present', () => index.includes('const TEST_SEED') && index.includes('function createSeededRandom') && index.includes("new URLSearchParams(window.location.search).get('seed')")],
  ['balance seed report present', () => existsSync(balanceSeedsPath)],
  ['regional boss wave mapping present', () => index.includes('cell.region === 1) return [ENEMY_IDS.LESHY]') && index.includes('cell.region === 2) return [ENEMY_IDS.FIRE_TITAN]')],
  ['enemy threat badges present', () => index.includes('function enemyThreatTags') && index.includes('threat-badges') && index.includes('enemyThreatBadgesHtml')],
  ['inventory equip best present', () => index.includes('function equipBestForHero') && index.includes('btn-inv-equip-best') && index.includes('inv-item-best')],
  ['inventory comparison present', () => index.includes('function itemCompareHtml') && index.includes('item-compare') && index.includes('powerDelta')],
  ['battle item proc feedback present', () => index.includes('function spawnBattleTextFx') && index.includes('DODGE') && index.includes('MANA +') && index.includes('REVIVE 5')],
  ['battle perk feedback present', () => index.includes('PIERCE -') && index.includes('AURA +10%') && index.includes('HEAL +5') && index.includes("spawnBattleTextFx(target.x, target.y, 'BURN'")],
  ['battle defensive feedback present', () => index.includes('STATUS REFLECT') && index.includes('AURA +1 ARM') && index.includes('SHIELD -') && index.includes("'BLOCK'")],
  ['status tick feedback present', () => index.includes('POISON -3') && index.includes('BURN -3') && index.includes('GUARD -50%')],
  ['hero flank mechanic present', () => index.includes('function heroFlankSupport') && index.includes('FLANK +25%') && index.includes('flankBonus')],
  ['victory power surge present', () => index.includes('victory-power') && index.includes('powerSurge') && index.includes('POWER SURGE')],
  ['victory loot CTA follows equipped state', () => index.includes('function updateVictoryActionButtons') && index.includes('_lastBattleDropHandled') && index.includes('vic-btn-continue-ready')],
  ['perk descriptions are specific', () => index.includes('const PERK_DESCRIPTIONS') && index.includes('Tank path:') && index.includes('Mystic path:')],
  ['all enemies have ability text', allEnemiesHaveAbilityText],
  ['all enemies have bestiary data', allEnemiesHaveBestiaryData],
  ['enemy behavior snippets present', enemyBehaviorSnippetsPresent],
  ['battle hover previews present', () => index.includes('function skillPreviewCells') && index.includes('function enemyHoverDangerCells') && index.includes('hoverCell')],
  ['battle tactical strip present', () => index.includes('function battleActionHintHtml') && index.includes('battle-tactical-strip') && index.includes('attackReady')],
  ['battle terrain hints present', () => index.includes('function terrainInfo') && index.includes('function shouldDrawTerrainMarkers') && index.includes('terrainBlocksSight') && index.includes('terrain.defense')],
  ['phone landscape rescue css present', () => index.includes('Phone landscape rescue pass') && index.includes('"heroes actions"') && index.includes('"field actions"')],
  ['touch map hides hover-only cell info', () => existsSync(resolve(root, 'styles/responsive-landscape.css')) && readFileSync(resolve(root, 'styles/responsive-landscape.css'), 'utf8').includes('#map-screen #map-cell-info')],
  ['touch route cards stack localized text', () => readFileSync(resolve(root, 'styles/responsive-landscape.css'), 'utf8').includes('grid-template-columns: minmax(0, 1fr)') && readFileSync(resolve(root, 'styles/responsive-landscape.css'), 'utf8').includes('overflow-wrap: anywhere')],
  ['portrait orientation gate present', () => index.includes('id="orientation-gate"') && index.includes('@media (orientation: portrait)') && index.includes('orientationTitle')],
  ['battle speed control persists', () => index.includes('battle-speed-toggle') && index.includes('function battleDelay') && index.includes('GameState.battleSpeed')],
  ['touch target confirmation present', () => index.includes('touchConfirmKey') && index.includes('tapToConfirm') && index.includes('function heroDamagePreview')],
  ['touch coordinates account for contained canvas', () => index.includes('function canvasContentRect') && index.includes('const r = canvasContentRect();')],
  ['unit movement is animated and speed-aware', () => index.includes('function startUnitMoveAnimation') && index.includes('function unitVisualPosition') && index.includes('duration: battleDelay(')],
  ['first battle cannot be skipped', () => index.includes("cur?.id === 'c_0_0' && node.id !== cur.id") && index.includes('btn-first-battle-route')],
  ['first battle coach uses field overlay', () => index.includes('id="battle-coach-overlay"') && index.includes('function renderFtueCoachOverlay')],
  ['Russian perk names are complete', () => index.includes('const PERK_NAMES_RU') && index.includes("y3:'Телепортация'") && index.includes('localizedPerkName(perk)')],
  ['perk rules expose exact triggers and values', () => index.includes('const PERK_RULES_RU') && index.includes("a1: { summary:'Цель ≤40% HP: +30% урона'") && index.includes("y3: { summary:'1 раз за бой: телепорт до 4 клеток'")],
  ['perk menu uses readable horizontal cards', () => existsSync(resolve(root, 'styles/perk-menu.css')) && readFileSync(resolve(root, 'styles/perk-menu.css'), 'utf8').includes('grid-template-columns: 32px minmax(0, 1fr) auto')],
  ['perk detail separates trigger and effect', () => index.includes('КОГДА СРАБАТЫВАЕТ') && index.includes('ЧТО ПРОИСХОДИТ') && index.includes('perk-detail-rule')],
  ['damage preview has a dedicated card', () => index.includes('function damagePreviewCardHtml') && index.includes('damage-preview-card')],
  ['route choice cards present', () => index.includes('map-route-choices') && index.includes('function mapNodeIntel') && index.includes('bossDistance')],
  ['unlocked region boss has a grey silhouette', () => index.includes('function mapBossSilhouetteHtml') && index.includes('map-boss-silhouette') && index.includes('background: linear-gradient(180deg, #aeb4bd, #656b76)')],
  ['boss silhouette uses the real regional boss asset', () => index.includes('function regionBossEnemyId') && index.includes('if (region === 1) return ENEMY_IDS.LESHY') && index.includes('ENEMY_IDS.FIRE_TITAN') && index.includes('ENEMY_IDS.HYDRA') && index.includes('enemyIconUrl(enemyId)')],
  ['unlocked boss cell is revealed across map fog', () => index.includes("const revealedBoss = node.type === 'boss' && node.region <= GameState.regionUnlocked") && index.includes('dist <= 2 || revealedBoss')],
  ['first battle flow present', () => index.includes('function createFirstBattleGrid') && index.includes('firstBattleCompleted') && index.includes('ftueSkillsUsed')],
  ['optional battle objective present', () => index.includes('objectiveUsedSkill') && index.includes('objectiveHeroLost') && index.includes('objectiveComplete')],
  ['campaign summary present', () => index.includes('function renderEndingSummary') && index.includes('runStartedAt') && index.includes('heroBuilds')],
  ['release packaging present', () => existsSync(resolve(root, 'scripts/package-release.mjs')) && existsSync(resolve(root, 'styles/responsive-landscape.css'))],
  ['plan has Definition of Done', () => plan.includes('Definition of Done')],
  ['plan has Out Of Scope', () => plan.includes('Out Of Scope For This Overhaul')],
  ['quality scorecard present', () => existsSync(resolve(root, 'docs/QUALITY_SCORECARD.md'))],
  ['quality improvement plan present', () => existsSync(resolve(root, 'docs/QUALITY_IMPROVEMENT_PLAN.md'))],
  ['combat preview module present', () => existsSync(resolve(root, 'src/combat-preview.js'))],
  ['critical path browser test present', () => existsSync(resolve(root, 'scripts/test-critical-path.mjs'))],
  ['global readability layer loads last', () => index.includes('<link rel="stylesheet" href="styles/readability.css">') && index.indexOf('styles/readability.css') > index.indexOf('styles/combat-ui.css')],
  ['desktop typography floor is present', () => readability.includes('--readable-compact: 12px') && readability.includes('#perk-modal .perk-skill-summary')],
  ['mobile typography floor is present', () => readability.includes('@media (orientation: landscape) and (max-height: 560px)') && readability.includes('--readable-label: 10px')],
  ['readability browser test present', () => existsSync(readabilityTestPath)],
  ['snake map topology module present', () => existsSync(mapTopologyPath) && index.includes('src/map-topology.js')],
  ['bosses use fixed terminal-zone anchors', () => index.includes('WorldMapTopology.REGION_BOSS_ANCHORS') && index.includes("assignAt('boss'") && index.includes('WorldMapTopology.FINAL_ANCHOR')],
  ['regional walls constrain map movement', () => index.includes('WorldMapTopology.isNeighbor') && index.includes('WorldMapTopology.wallClasses')],
  ['old saves migrate to the snake layout', () => index.includes('function migrateWorldMapTopology') && index.includes('mapLayoutVersion')],
  ['map topology test present', () => existsSync(mapTopologyTestPath)],
  ['Leshy boss module and test present', () => existsSync(leshyBossPath) && existsSync(leshyBossTestPath) && index.includes('src/leshy-boss.js')],
  ['Leshy has a dedicated sprite', () => existsSync(leshySpritePath) && index.includes("leshy: 'leshy.png'") && index.includes("leshy: 'assets/enemies/leshy.png'")],
  ['Leshy is a rooted two-cell summoner', () => index.includes("[D.LESHY]: { name: 'Ancient Leshy'") && index.includes('move: 0, range: 3') && index.includes('sizeW: 2') && index.includes('LeshyBoss.planTurn')],
  ['battle animation system and plan present', () => existsSync(battleAnimationPath) && existsSync(battleAnimationPlanPath) && existsSync(battleAnimationTestPath) && index.includes('src/battle-animations.js')],
  ['ability-aware attack animation runtime present', () => index.includes('function startBattleAttackAnimation') && index.includes('BattleAnimations.resolveAttack') && index.includes('drawBattleCombatFx(ctx, b)')],
  ['hero, enemy and boss death animations are distinct', () => index.includes('BattleAnimations.resolveDeath') && index.includes('isUnitDeathAnimating') && index.includes('activeDeathAnimationRemaining')],
  ['animation timing respects speed and reduced motion', () => index.includes('function battleAnimationMs') && index.includes('prefers-reduced-motion') && index.includes('GameState.battleSpeed')],
  ['ambush locks heroes in the center and enemies on map edges', () => index.includes('function ambushEnemyEdgeSlots') && index.includes('deploymentLocked: isAmbush') && index.includes("ambush: out.type === 'ambush'")],
  ['turn transition waits for the attack animation', () => index.includes('function reserveBattleVisualUntil') && index.includes('b._turnAdvanceTimer') && index.includes('turnTransitionLocked')],
  ['deployment zone exposes valid cells on the battlefield', () => index.includes('function isDeployCellAvailable') && index.includes("translateKey('deployZone')") && index.includes('ctx.setLineDash([7, 4])')],
  ['turn focus is explicit on field, cards and initiative', () => index.includes('turn-focus-banner') && index.includes('hero-turn-chip') && index.includes('initiativeCycleUnits') && index.includes("translateKey('turnNow').toUpperCase()")],
  ['map routes and cells have bidirectional hover linking', () => index.includes('route-linked-highlight') && index.includes('showLinkedRoute') && index.includes("event.pointerType !== 'touch'")],
  ['route cards expose cached enemy intel', () => index.includes('enemyWavePreview') && index.includes('map-route-intel')],
  ['ending summary tracks mastery', () => index.includes('objectivesCompleted') && index.includes('damageTaken') && index.includes('resultCode')],
  ['perk rules are exact in all languages', () => index.includes('const PERK_RULES_EXACT') && index.includes('TEAM SYNERGY') && index.includes('SINERGIA DE EQUIPO')]
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
