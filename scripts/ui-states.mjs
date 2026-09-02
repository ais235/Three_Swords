/**
 * Every UI state the game can show, driven inside the page.
 *
 * Both the computed-style snapshot and the dead-rule audit need the same thing:
 * a way to put the running game into each state its stylesheets are written for.
 * Screens alone are not enough — modals, tabs, targeting modes and selection
 * states all carry their own rules, and a refactor checked only against screens
 * will happily break the perk modal without anyone noticing.
 *
 * The whole driver lives in one page-side function so it survives serialisation
 * into the browser; helpers cannot be closed over from module scope.
 */

export const UI_STATE_NAMES = [
  'menu', 'menu-settings',
  'map', 'map-selected', 'map-completed', 'map-region-2',
  'battle-deploy', 'battle-combat', 'battle-skill-targeting', 'battle-log',
  'battle-first-encounter', 'battle-enemy-hover',
  'city-trader-buy', 'city-trader-sell', 'city-item-selected', 'city-alchemist', 'city-oracle',
  'inventory', 'inventory-item-selected',
  'bestiary', 'bestiary-detail', 'arsenal', 'arsenal-detail',
  'victory', 'perk-modal', 'perk-modal-selected', 'skill-unlock-modal',
  'story-modal', 'event-screen', 'confirm-modal', 'alert-modal', 'prompt-modal',
  'gameover', 'ending'
];

/** Roots worth measuring. Anything outside these is chrome the game does not style. */
export const MEASURED_ROOTS = [
  '#main-menu', '#hud-top', '#map-screen', '#battle-screen', '#city-screen', '#inventory-screen',
  '#victory-screen', '#gameover-screen', '#ending-screen', '#event-screen', '#bestiary-screen',
  '#arsenal-screen', '#perk-modal', '#confirm-modal', '#game-alert-modal', '#game-prompt-modal',
  '#skill-unlock-modal', '#story-modal', '#menu-settings-overlay'
];

export const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'landscape-phone', width: 812, height: 375 }
];

/** Put the page into one named state. Returns false when the state cannot be built. */
export async function applyUiState(page, name) {
  return page.evaluate(async stateName => {
    const settle = ms => new Promise(done => setTimeout(done, ms));

    async function ensureRun() {
      if (!GameState.mapGrid || !GameState.mapGrid.length) {
        startNewGame();
        await settle(450);
      }
      GameState.regionUnlocked = 3;
      GameState.gold = 600;
      GameState.firstBattleCompleted = true;
      GameState.heroes.forEach(hero => { hero.hp = hero.maxHp; });
      if (!GameState.inventory.length) GameState.inventory.push('steel_sword', 'leather', 'luck_amulet');
    }
    function closeOverlays() {
      ['perk-modal', 'confirm-modal', 'game-alert-modal', 'game-prompt-modal',
        'skill-unlock-modal', 'story-modal', 'menu-settings-overlay', 'sfx-auditor-modal']
        .forEach(id => document.getElementById(id)?.classList.add('hidden'));
    }
    const cityCell = () => GameState.mapGrid.find(cell => cell.type === 'city');
    const missionCell = () => GameState.mapGrid.find(cell => cell.type === 'mission' && cell.id !== 'c_0_0');

    async function toMap() {
      await ensureRun();
      closeOverlays();
      GameState.currentBattle = null;
      GameState.mapGrid.forEach(cell => mapFogVisitedAdd(cell.y, cell.x));
      showScreen('map');
      renderMap();
      await settle(220);
    }
    async function toBattle() {
      await ensureRun();
      closeOverlays();
      if (!GameState.currentBattle) {
        startBattleForCell(missionCell(), { skipDeploy: true });
        await settle(550);
      }
      showScreen('battle');
      await settle(200);
    }
    async function toCity(npcTab, traderTab) {
      await ensureRun();
      closeOverlays();
      GameState.currentBattle = null;
      GameState.cityNpcTab = npcTab;
      if (traderTab) GameState.cityTraderTab = traderTab;
      enterCity(cityCell());
      await settle(260);
    }
    async function toListScreen(render, screen) {
      await ensureRun();
      closeOverlays();
      GameState.currentBattle = null;
      render();
      showScreen(screen);
      await settle(240);
    }

    const states = {
      'menu': async () => { await ensureRun(); closeOverlays(); showScreen('menu'); await settle(220); },
      'menu-settings': async () => {
        await ensureRun(); closeOverlays(); showScreen('menu');
        document.getElementById('btn-menu-settings')?.click();
        await settle(260);
      },
      'map': toMap,
      'map-selected': async () => {
        await toMap();
        const cell = GameState.mapGrid.find(node => node.type === 'dungeon') || GameState.mapGrid[5];
        document.querySelector(`[data-node-id="${cell.id}"]`)?.click();
        await settle(240);
      },
      'battle-deploy': async () => {
        await ensureRun(); closeOverlays();
        GameState.currentBattle = null;
        startBattleForCell(missionCell(), {});
        await settle(520);
        showScreen('battle');
        await settle(240);
      },
      'battle-combat': async () => {
        await toBattle();
        const battle = GameState.currentBattle;
        battle.briefingDismissed = true;
        battle.phase = 'combat';
        updateBattleUI();
        await settle(240);
      },
      'battle-skill-targeting': async () => {
        await toBattle();
        const battle = GameState.currentBattle;
        battle.briefingDismissed = true;
        battle.phase = 'combat';
        battle.mode = 'skill';
        battle.pendingSkill = 'shieldBash';
        updateBattleUI();
        await settle(240);
      },
      'map-completed': async () => {
        await toMap();
        // Cleared cells, a defeated boss and a visited town all carry their own
        // rules; a fresh map never shows any of them.
        GameState.mapGrid.filter(cell => cell.region === 1).slice(0, 6)
          .forEach(cell => { cell.visited = true; cell.completed = true; });
        const boss = GameState.mapGrid.find(cell => cell.type === 'boss' && cell.region === 1);
        if (boss) { boss.visited = true; boss.completed = true; }
        renderMap();
        await settle(240);
      },
      'map-region-2': async () => {
        await toMap();
        const entry = WorldMapTopology.REGION_GATEWAYS[0].to;
        GameState.playerPos = { x: entry.x, y: entry.y };
        GameState.region = 2;
        renderMap();
        await settle(240);
      },
      'battle-first-encounter': async () => {
        await ensureRun();
        closeOverlays();
        // The tutorial coach only exists in the very first battle of a run.
        GameState.currentBattle = null;
        GameState.firstBattleCompleted = false;
        GameState.ftueHintsEnabled = true;
        startBattleForCell(GameState.mapGrid.find(cell => cell.id === 'c_0_0'), { skipDeploy: true });
        await settle(520);
        GameState.currentBattle.briefingDismissed = true;
        updateBattleUI();
        await settle(240);
        GameState.firstBattleCompleted = true;
      },
      'battle-enemy-hover': async () => {
        await toBattle();
        const battle = GameState.currentBattle;
        battle.briefingDismissed = true;
        battle.phase = 'combat';
        const enemy = battle.units.find(unit => !unit.isHero && unit.hp > 0);
        BattleView.hoverCell = { gx: enemy.x, gy: enemy.y };
        updateBattleUI();
        await settle(240);
      },
      'city-item-selected': async () => {
        await toCity('trader', 'buy');
        document.querySelector('#shop-list .item-card')?.click();
        await settle(240);
      },
      'battle-log': async () => {
        await toBattle();
        GameState.currentBattle.briefingDismissed = true;
        pushBattleLog('Проверочная строка журнала боя', 'status');
        pushBattleLog('Ещё одна строка для высоты панели', 'hero');
        renderBattleLog();
        updateBattleUI();
        await settle(240);
      },
      'city-trader-buy': () => toCity('trader', 'buy'),
      'city-trader-sell': () => toCity('trader', 'sell'),
      'city-alchemist': () => toCity('alchemist'),
      'city-oracle': () => toCity('oracle'),
      'inventory': () => toListScreen(renderInventoryScreen, 'inventory'),
      'inventory-item-selected': async () => {
        await toListScreen(renderInventoryScreen, 'inventory');
        document.querySelector('[data-inventory-index="0"]')?.click();
        await settle(240);
      },
      'bestiary': () => toListScreen(renderBestiaryScreen, 'bestiary'),
      'bestiary-detail': async () => {
        await toListScreen(renderBestiaryScreen, 'bestiary');
        document.querySelector('[data-eid]')?.click();
        await settle(240);
      },
      'arsenal': () => toListScreen(renderArsenal, 'arsenal'),
      'arsenal-detail': async () => {
        await toListScreen(renderArsenal, 'arsenal');
        document.querySelector('[data-arsenal-id]')?.click();
        await settle(240);
      },
      'victory': async () => {
        await ensureRun(); closeOverlays();
        GameState.currentBattle = null;
        GameState._lastBattleLabel = 'Region 1 · Mission';
        GameState._lastBattleMeta = { region: 1, type: 'mission' };
        GameState._lastBattleEnemyIds = ['skeleton'];
        GameState._lastBattleRounds = 4;
        GameState._lastBattleLevelUps = {};
        GameState._lastBattleProgress = {};
        GameState._lastBattleDrop = itemById('steel_sword');
        GameState._lastBattleDropHandled = false;
        GameState.pendingPerks = [];
        try { showVictoryUI(40, 30); } catch (error) { showScreen('victory'); }
        await settle(280);
      },
      'perk-modal': async () => {
        await ensureRun(); closeOverlays();
        GameState.currentBattle = null;
        showScreen('map');
        openPerkModal('garet', true);
        await settle(300);
      },
      'perk-modal-selected': async () => {
        await states['perk-modal']();
        document.querySelector('#perk-modal .perk-skill.available')?.click();
        await settle(260);
      },
      'skill-unlock-modal': async () => {
        await ensureRun(); closeOverlays(); showScreen('map');
        void showSkillUnlockPopup('garet', HERO_SKILLS.garet[0]);
        await settle(260);
      },
      'story-modal': async () => {
        await ensureRun(); closeOverlays(); showScreen('map');
        void showStoryScene('region1');
        await settle(320);
      },
      'event-screen': async () => {
        await ensureRun(); closeOverlays();
        GameState.currentBattle = null;
        showEventModal('Проверочное событие для замера стилей.', 'neutral', () => {}, [
          ['Первый выбор', 'Короткое пояснение', {}],
          ['Второй выбор', 'Другое пояснение', {}]
        ]);
        await settle(280);
      },
      'confirm-modal': async () => {
        await ensureRun(); closeOverlays(); showScreen('map');
        void showGameConfirm('Проверочный вопрос для замера стилей?');
        await settle(260);
      },
      'alert-modal': async () => {
        await ensureRun(); closeOverlays(); showScreen('map');
        void showGameAlert('Проверочное сообщение для замера стилей.');
        await settle(260);
      },
      'prompt-modal': async () => {
        await ensureRun(); closeOverlays(); showScreen('map');
        void showGamePickOne('Проверочный выбор', [
          { value: 'a', label: 'Первый вариант' },
          { value: 'b', label: 'Второй вариант' }
        ]);
        await settle(260);
      },
      'gameover': () => toListScreen(renderGameOverUI, 'gameover'),
      'ending': () => toListScreen(renderEndingSummary, 'ending')
    };

    const state = states[stateName];
    if (!state) return false;
    await state();
    return true;
  }, name);
}
