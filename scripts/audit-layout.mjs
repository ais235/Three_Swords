import { readFileSync, existsSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GAME_RUNTIME_SCRIPTS, gameRuntimeScriptPaths, gameRuntimeStylePaths, loadGameRuntimeSource } from './runtime-source.mjs';

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
const fullCampaignTestPath = resolve(root, 'scripts/test-full-campaign.mjs');
const storyPortraitPaths = ['garet', 'alira', 'seris'].map(id => resolve(root, `assets/portraits/${id}-dialog.png`));
const architecturePath = resolve(root, 'docs/TECHNICAL_MODULAR_ARCHITECTURE.md');
const runtimeScriptPaths = gameRuntimeScriptPaths(root);
const index = loadGameRuntimeSource(root);
const plan = readFileSync(planPath, 'utf8');
const readability = existsSync(readabilityPath) ? readFileSync(readabilityPath, 'utf8') : '';
// The --readable-* sizes moved to the token file; the rules that enforce them
// stayed in readability.css. Both halves of the contract are checked below.
const tokensPath = resolve(root, 'styles/tokens.css');
const tokens = existsSync(tokensPath) ? readFileSync(tokensPath, 'utf8') : '';

function enemyEntries() {
  const block = index.match(/const ENEMY_IDS = \{([\s\S]*?)\n\s*\};/);
  if (!block) return [];
  return [...block[1].matchAll(/([A-Z0-9_]+):\s*'([^']+)'/g)]
    .map(match => ({ key: match[1], id: match[2] }));
}

/** Every url() in a shipped stylesheet must resolve to a file on disk, relative
 *  to that stylesheet. Moving the CSS out of index.html rewrote these paths, and
 *  the menu and map backgrounds quietly stopped being packaged into the release. */
function everyStylesheetUrlResolves() {
  return gameRuntimeStylePaths(root).every(stylePath => {
    const css = readFileSync(stylePath, 'utf8');
    const dir = dirname(stylePath);
    return [...css.matchAll(/url\(\s*['"]?([^'")?#]+)['"]?\s*\)/gi)].every(match => {
      const raw = match[1];
      if (raw.startsWith('data:') || raw.includes('://') || raw.startsWith('/')) return true;
      return existsSync(resolve(dir, raw));
    });
  });
}

/** The display font must be served from the archive, never from a CDN, and its
 *  SIL Open Font License text has to travel with it. layout.css named this face
 *  for a long time with no @font-face and no file behind it, so it never once
 *  rendered; a link to fonts.googleapis.com would fail the same way whenever that
 *  host is slow or blocked for a player. */
function bundledFontIsSelfContained() {
  const stylesheets = gameRuntimeStylePaths(root).map(path => readFileSync(path, 'utf8'));
  const declaresFace = stylesheets.some(css => /@font-face[\s\S]*?Press Start 2P/.test(css));
  // Comments explain why the font is bundled and name the CDN while doing so, so
  // only a real reference counts: a url(), an @import or a link/src attribute.
  const withoutComments = source => source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/<!--[\s\S]*?-->/g, '');
  const noRemoteFont = ![...stylesheets, index]
    .map(withoutComments)
    .some(source => /(?:url\(|@import|href=|src=)\s*['"]?[^'")\s]*fonts\.(?:googleapis|gstatic)\.com/i.test(source));
  return declaresFace && noRemoteFont
    && existsSync(resolve(root, 'assets/fonts/press-start-2p-cyrillic.woff2'))
    && existsSync(resolve(root, 'assets/fonts/PressStart2P-OFL.txt'));
}

/** Every piece of interface art must ship with the licence that permits it.
 *
 *  The first version of this kit came from a commercial pack given to the owner
 *  by another studio. That licence is issued to the purchaser and does not
 *  transfer, so the files carried no right to publish, and the whole kit had to be
 *  replaced. The replacement is CC BY 3.0, which permits commercial use and
 *  derivative work but requires the author be credited where the work is seen.
 *
 *  So this checks all three halves of that obligation: the licence text is in the
 *  repository, the README records the source and what was changed, and the credit
 *  is in the interface rather than only in a file no player opens. */
function interfaceArtIsLicensed() {
  const kit = resolve(root, 'assets/ui/kit');
  const readmePath = resolve(kit, 'README.md');
  if (!existsSync(readmePath) || !existsSync(resolve(kit, 'LICENSE-CC-BY-3.0.txt'))) return false;
  const iconsReadmePath = resolve(root, 'assets/ui/icons/README.md');
  if (!existsSync(iconsReadmePath)) return false;
  const readme = readFileSync(readmePath, 'utf8');
  const iconsReadme = readFileSync(iconsReadmePath, 'utf8');
  const namesAuthorAndLicence = readme.includes('Lamoot') && readme.includes('CC BY 3.0')
    && ['Lorc', 'Delapouite', 'sbed'].every(author => iconsReadme.includes(author));
  const recordsChanges = [readme, iconsReadme].every(text => /Что изменено/i.test(text));
  // Every author the licence names has to reach the player, not just the file.
  const shownToPlayer = ['Lamoot', 'Lorc', 'Delapouite', 'sbed', 'CC BY 3.0']
    .every(name => index.includes(name));
  return namesAuthorAndLicence && recordsChanges && shownToPlayer;
}

/** Долгое нажатие на телефоне не должно открывать системную панель.
 *
 *  Требование площадки 1.6.2.7. Проверка статическая намеренно: свойство
 *  -webkit-touch-callout реализовано только в Safari, Chrome его из вычисленных
 *  стилей выбрасывает, поэтому в браузерном тесте оно всегда выглядит
 *  отсутствующим — там его проверять нечем. */
function longPressCalloutIsBlocked() {
  return gameRuntimeStylePaths(root)
    .map(path => readFileSync(path, 'utf8'))
    .some(css => /-webkit-touch-callout\s*:\s*none/.test(css));
}

/** Every icon named in the markup must have a rule behind it.
 *
 *  Control icons are CSS masks: the element carries `ico ico-<name>` and a rule
 *  supplies the file. Miss the rule and the button silently renders an empty box -
 *  and because the packager finds assets by following url(), the file never even
 *  reaches the archive. That happened to the artifact icon: it was downloaded,
 *  used in the arsenal tab, and had no rule for it. */
function everyIconClassHasARule() {
  const css = gameRuntimeStylePaths(root).map(path => readFileSync(path, 'utf8')).join('\n');
  const declared = new Set([...css.matchAll(/\.ico-([a-z0-9-]+)\s*\{/gi)].map(match => match[1]));
  const used = new Set([...index.matchAll(/\bico-([a-z0-9-]+)\b/gi)].map(match => match[1]));
  return [...used].every(name => declared.has(name));
}

/** Global tokens belong to styles/tokens.css and nowhere else.
 *
 *  They used to be split: the palette sat in layout.css while --text-dim and the
 *  --readable-* sizes were declared in readability.css, the last correction layer,
 *  even though the base files used them a hundred times. It worked, because custom
 *  properties resolve at computed-value time rather than by source order, but it
 *  meant deleting the bottom of the cascade would have silently recoloured the top.
 *
 *  Component-scoped properties are a different thing and stay allowed: a rule like
 *  .city-panel-trader { --shop-icon-size: 40px } is how a component parameterises
 *  itself, and it is not a global decision. Only :root declarations are global. */
function globalTokensLiveInOneFile() {
  return gameRuntimeStylePaths(root).every(stylePath => {
    if (basename(stylePath) === 'tokens.css') return true;
    const css = readFileSync(stylePath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    return [...css.matchAll(/:root[^{]*\{([^{}]*)\}/g)].every(match => !/--[a-z0-9-]+\s*:/i.test(match[1]));
  });
}

/** An undiscovered boss is shown as a featureless stone silhouette, so the point
 *  is that its gradient carries no hue: a coloured silhouette would read as
 *  information the player has not earned yet.
 *
 *  This used to assert the two hex values literally, which broke the moment the
 *  palette moved from cold greys to warm ones even though the silhouette stayed
 *  just as grey. Saturation is the property that actually matters, so that is
 *  what gets measured. */
function bossSilhouetteIsGrey() {
  if (!index.includes('function mapBossSilhouetteHtml') || !index.includes('map-boss-silhouette')) return false;
  const gradient = /\.map-boss-silhouette[^{}]*\{[^{}]*background:\s*linear-gradient\(([^)]*)\)/.exec(index);
  if (!gradient) return false;
  const stops = [...gradient[1].matchAll(/#([0-9a-f]{6})/gi)].map(match => match[1]);
  if (stops.length < 2) return false;
  return stops.every(hex => {
    const [r, g, b] = [0, 2, 4].map(at => parseInt(hex.slice(at, at + 2), 16));
    return Math.max(r, g, b) - Math.min(r, g, b) <= 24;
  });
}

function everyEquipmentItemHasUniqueIcon() {
  const pool = index.match(/const ITEM_POOL = \[([\s\S]*?)\n\s*\];/);
  const iconMap = index.match(/const ITEM_ICON_MAP = \{([\s\S]*?)\n\s*\};/);
  if (!pool || !iconMap) return false;
  const ids = [...pool[1].matchAll(/\bid\s*:\s*'([^']+)'/g)].map(match => match[1]);
  const mappings = new Map([...iconMap[1].matchAll(/\b(\w+)\s*:\s*'([^']+\.png)'/g)].map(match => [match[1], match[2]]));
  const paths = ids.map(id => mappings.get(id));
  return paths.every(Boolean) && new Set(paths).size === paths.length && paths.every(path => existsSync(resolve(root, 'assets/items', path)));
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
  ['runtime is split into ordered subsystem scripts', () => runtimeScriptPaths.every(existsSync) && runtimeScriptPaths.length === GAME_RUNTIME_SCRIPTS.length],
  ['technical architecture is documented', () => existsSync(architecturePath)],
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
  // Every proc that changes the maths must announce itself on the field.
  ['battle perk feedback present', () => ['PIERCE -', 'AURA +10%', 'HEAL +5', 'BURN', 'FLANK +25%', 'BLOCK', 'DODGE',
    'BANNER +2', 'EXECUTION', 'INCINERATE', 'CHAIN FREEZE', 'WARD', 'SPLASH ', 'PULL', 'CLEANSE']
    .every(label => index.includes(`'${label}'`))],
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
  ['touch map uses the selected cell information panel', () => index.includes('selectedCellInfoHtml') && index.includes('map-cell-info')],
  ['portrait orientation gate present', () => index.includes('id="orientation-gate"') && index.includes('@media (orientation: portrait)') && index.includes('orientationTitle')],
  ['battle speed control persists', () => index.includes('battle-speed-toggle') && index.includes('function battleDelay') && index.includes('GameState.battleSpeed')],
  ['touch target confirmation present', () => index.includes('touchConfirmKey') && index.includes('tapToConfirm') && index.includes('function heroDamagePreview')],
  ['touch coordinates account for contained canvas', () => index.includes('function canvasContentRect') && index.includes('const r = canvasContentRect();')],
  ['unit movement is animated and speed-aware', () => index.includes('function startUnitMoveAnimation') && index.includes('function unitVisualPosition') && index.includes('duration: battleDelay(')],
  // The route-card panel that used to carry btn-first-battle-route was removed
  // from the markup long ago; the live guard is the map Enter handler.
  ['first battle cannot be skipped', () => index.includes("cur?.id === 'c_0_0' && node.id !== cur.id")
    && index.includes('startBattleForCell(cur, { skipDeploy: false })')],
  ['first battle coach uses field overlay', () => index.includes('id="battle-coach-overlay"') && index.includes('function renderFtueCoachOverlay')],
  ['Russian perk names are complete', () => index.includes('const PERK_NAMES_RU') && index.includes("y3:'") && index.includes('localizedPerkName(perk)')],
  ['perk rules expose exact triggers and values', () => index.includes('const PERK_RULES_RU') && index.includes('a1: { summary:') && index.includes('y3: { summary:') && index.includes('trigger:') && index.includes('effect:')],
  // Assert the card shape, not the file it lives in: perk-menu.css declared a
  // 32px icon column that readability.css overrode with 36px, so the check was
  // pinned to a value that never rendered.
  ['perk menu uses readable horizontal cards', () => /#perk-modal \.perk-skill \{[^}]*grid-template-columns:\s*\d+px minmax\(0, 1fr\) auto/.test(index)],
  ['perk detail separates trigger and effect', () => index.includes('perk-detail-rule') && index.includes("trigger:'") && index.includes("effect:'")],
  ['damage preview has a dedicated card', () => index.includes('function damagePreviewCardHtml') && index.includes('damage-preview-card')],
  ['contextual map cell intelligence is present', () => index.includes('selectedCellInfoHtml') && index.includes('function mapNodeIntel') && index.includes('bossDistance')],
  ['unlocked region boss has a grey silhouette', bossSilhouetteIsGrey],
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
  ['desktop typography floor is present', () => tokens.includes('--readable-compact: 12px') && readability.includes('#perk-modal .perk-skill-summary')],
  ['mobile typography floor is present', () => readability.includes('@media (orientation: landscape) and (max-height: 560px)') && tokens.includes('--readable-label: 10px')],
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
  ['ambush locks heroes in the center and enemies on map edges', () => index.includes('function ambushEnemyEdgeSlots') && index.includes('deploymentLocked: isAmbush') && index.includes('campaignAmbush')],
  ['turn transition waits for the attack animation', () => index.includes('function reserveBattleVisualUntil') && index.includes('b._turnAdvanceTimer') && index.includes('turnTransitionLocked')],
  ['initiative HUD is event-driven rather than rebuilt every frame', () => !/function loop\(\) \{[\s\S]{0,500}renderInitiative\(\)/.test(index) && index.includes('Initiative is DOM-heavy')],
  ['deployment zone exposes valid cells on the battlefield', () => index.includes('function isDeployCellAvailable') && index.includes("translateKey('deployZone')") && index.includes('ctx.setLineDash([7, 4])')],
  ['turn focus is explicit on field, cards and initiative', () => index.includes('turn-focus-banner') && index.includes('hero-turn-chip') && index.includes('initiativeCycleUnits') && index.includes("translateKey('turnNow').toUpperCase()")],
  ['map hover updates contextual cell information', () => index.includes('el.onmouseenter') && index.includes('showInfo(node)')],
  ['selected map cell exposes cached enemy intel', () => index.includes('enemyWavePreview') && index.includes('selectedCellInfoHtml')],
  ['ending summary tracks mastery', () => index.includes('objectivesCompleted') && index.includes('damageTaken') && index.includes('resultCode')],
  ['perk rules are exact in all languages', () => index.includes('const PERK_RULES_EXACT') && index.includes('TEAM SYNERGY') && index.includes('SINERGIA DE EQUIPO')]
  ,['campaign expansion runtime is present', () => existsSync(resolve(root, 'src/campaign-expansion.js')) && index.includes('src/campaign-expansion.js')]
  ,['campaign contracts, mutators and replay are present', () => index.includes('CampaignExpansion.CONTRACTS') && index.includes('campaignMutators') && index.includes('function replayCampaign')]
  ,['varied battle objectives are present', () => index.includes("id === 'holdout'") && index.includes("id === 'escape'") && index.includes("id === 'defense'") && index.includes("id === 'ritual'") && index.includes("id === 'waves'")]
  ,['event choices and delayed consequences are present', () => index.includes('event-choice-list') && index.includes('resolveDelayedEvents') && index.includes('druid_cache')]
  ,['regional terrain assets are packaged from source', () => existsSync(resolve(root, 'assets/tiles/region-forest-glade.png')) && existsSync(resolve(root, 'assets/tiles/region-volcanic-depths.png')) && existsSync(resolve(root, 'assets/tiles/region-sunken-ruins.png'))]
  ,['every equipment item has its own packaged icon', everyEquipmentItemHasUniqueIcon]
  ,['every stylesheet url resolves from its own folder', everyStylesheetUrlResolves]
  ,['bundled display font ships self-hosted with its licence', bundledFontIsSelfContained]
  ,['global design tokens live in one file', globalTokensLiveInOneFile]
  ,['interface art ships with its licence and credit', interfaceArtIsLicensed]
  ,['every control icon has a rule behind it', everyIconClassHasARule]
  ,['long press does not open the system callout', longPressCalloutIsBlocked]
  ,['regional story scenes and epilogue are present', () => index.includes("region1: {") && index.includes("region2: {") && index.includes("region3: {") && index.includes("finale: {") && index.includes('showStoryScene')]
  ,['story dialogue uses packaged hero portraits', () => storyPortraitPaths.every(existsSync) && index.includes('assets/portraits/garet-dialog.png') && index.includes('story-portrait')]
  ,['full campaign release test is present', () => existsSync(fullCampaignTestPath) && readFileSync(resolve(root, 'package.json'), 'utf8').includes('test:campaign')]
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
