/* Three Blades ? Heroes, enemies, perks and item data.
 * Extracted from index.html; load order is intentional.
 */
  //══════════ SECTION 2: GAME_DATA ══════════
  const ENEMY_IDS = {
    SKELETON: 'skeleton', GOBLIN_ARCHER: 'goblin_archer', BOAR: 'boar', ZOMBIE: 'zombie', SHAMAN: 'shaman', LESHY: 'leshy',
    BANDIT: 'bandit', WOLF: 'wolf', BANDIT_THROWER: 'bandit_thrower',
    SPEARMAN: 'spearman', BOG_LURKER: 'bog_lurker', THORN_DRYAD: 'thorn_dryad', RAT_SWARM: 'rat_swarm', CULTIST: 'cultist',
    HEXER: 'hexer', SHIELDBEARER: 'shieldbearer', CROSSBOWMAN: 'crossbowman', STONE_GOLEM: 'stone_golem',
    VOID_STALKER: 'void_stalker', BLOOD_KNIGHT: 'blood_knight', BANSHEE: 'banshee', PLAGUE_DOCTOR: 'plague_doctor', ARCANE_SENTINEL: 'arcane_sentinel',
    ORC_GUARD: 'orc_guard', SUICIDE: 'suicide', SPIDER: 'spider', WATCHER: 'watcher', ICE_ELEM: 'ice_elem',
    DARK_KNIGHT: 'dark_knight', NECRO: 'necro', CHAOS: 'chaos', ASSASSIN: 'assassin', HYDRA: 'hydra', GHOST: 'ghost',
    FIRE_TITAN: 'fire_titan', DARK_LORD: 'dark_lord'
  };

  function inferAttackSfxKind(attacker, opts) {
    opts = opts || {};
    if (opts.magic || opts.fire) return 'magic';
    if (attacker.isHero && attacker.heroId === 'alira') return 'bow';
    if (attacker.isHero && attacker.heroId === 'seris') return 'magic';
    if (!attacker.isHero) {
      const mid = attacker.enemyId;
      if (mid === ENEMY_IDS.SHAMAN || mid === ENEMY_IDS.LESHY || mid === ENEMY_IDS.NECRO || mid === ENEMY_IDS.ICE_ELEM || mid === ENEMY_IDS.CHAOS) return 'magic';
      if (attacker.range > 1) return 'bow';
    }
    return 'melee';
  }

  /** Battle samples imported from assets/audio/battle/sfx; preloaded in Web Audio without replacing synthetic hits/deaths. */
  const BATTLE_SFX_SAMPLE_URLS = [
    'assets/audio/battle/sfx/common/hit.mp3',
    'assets/audio/battle/sfx/common/death.wav',
    'assets/audio/battle/sfx/common/critical_hit.mp3',
    'assets/audio/battle/sfx/common/victory.mp3',
    'assets/audio/battle/sfx/common/defeat.mp3',
    'assets/audio/battle/sfx/movement/step_grass.wav',
    'assets/audio/battle/sfx/movement/step_rock.wav',
    'assets/audio/battle/sfx/movement/step_wood.wav',
    'assets/audio/battle/sfx/movement/step_water.wav',
    'assets/audio/battle/sfx/heroes/garet_melee.mp3',
    'assets/audio/battle/sfx/heroes/alira_bow.wav',
    'assets/audio/battle/sfx/heroes/alira_bow_draw.mp3',
    'assets/audio/battle/sfx/heroes/seris_magic.mp3',
    'assets/audio/battle/sfx/heroes/garet_shield_bash.mp3',
    'assets/audio/battle/sfx/heroes/garet_fire_call.mp3',
    'assets/audio/battle/sfx/heroes/garet_berserk.mp3',
    'assets/audio/battle/sfx/heroes/alira_double_shot.mp3',
    'assets/audio/battle/sfx/heroes/alira_slow_arrow.wav',
    'assets/audio/battle/sfx/heroes/alira_arrow_rain.wav',
    'assets/audio/battle/sfx/heroes/seris_fireball.ogg',
    'assets/audio/battle/sfx/heroes/seris_freeze.mp3',
    'assets/audio/battle/sfx/heroes/seris_meteor.mp3',
    'assets/audio/battle/sfx/enemies/skeleton_attack.wav',
    'assets/audio/battle/sfx/enemies/goblin_archer_attack.wav',
    'assets/audio/battle/sfx/enemies/boar_attack.wav',
    'assets/audio/battle/sfx/enemies/zombie_attack.wav',
    'assets/audio/battle/sfx/enemies/zombie_explosion.ogg',
    'assets/audio/battle/sfx/enemies/shaman_attack.ogg',
    'assets/audio/battle/sfx/enemies/shaman_heal.wav',
    'assets/audio/battle/sfx/enemies/orc_guard_attack.mp3',
    'assets/audio/battle/sfx/enemies/suicide_attack.wav',
    'assets/audio/battle/sfx/enemies/suicide_explosion.ogg',
    'assets/audio/battle/sfx/enemies/spider_attack.wav',
    'assets/audio/battle/sfx/enemies/spider_web.ogg',
    'assets/audio/battle/sfx/enemies/watcher_attack.wav',
    'assets/audio/battle/sfx/enemies/watcher_buff.wav',
    'assets/audio/battle/sfx/enemies/ice_elem_attack.wav',
    'assets/audio/battle/sfx/enemies/ice_freeze_touch.wav',
    'assets/audio/battle/sfx/enemies/dark_knight_attack.wav',
    'assets/audio/battle/sfx/enemies/necro_attack.mp3',
    'assets/audio/battle/sfx/enemies/necro_raise.wav',
    'assets/audio/battle/sfx/enemies/chaos_attack.mp3',
    'assets/audio/battle/sfx/enemies/assassin_attack.wav',
    'assets/audio/battle/sfx/enemies/hydra_attack.wav',
    'assets/audio/battle/sfx/enemies/ghost_attack.wav',
    'assets/audio/battle/sfx/enemies/fire_titan_attack.ogg',
    'assets/audio/battle/sfx/enemies/fire_titan_aoe.ogg',
    'assets/audio/battle/sfx/enemies/dark_lord_attack.wav',
    'assets/audio/battle/sfx/enemies/dark_lord_teleport.mp3',
    'assets/audio/battle/sfx/enemies/dark_lord_summon.mp3',
    'assets/audio/battle/sfx/enemies/dark_lord_aoe.mp3',
    'assets/audio/battle/sfx/status/apply_stun.mp3',
    'assets/audio/battle/sfx/status/apply_freeze.wav',
    'assets/audio/battle/sfx/status/apply_web.wav',
    'assets/audio/battle/sfx/status/apply_poison.mp3',
    'assets/audio/battle/sfx/status/tick_poison.wav',
    'assets/audio/battle/sfx/status/apply_burn.ogg',
    'assets/audio/battle/sfx/status/tick_burn.ogg',
    'assets/audio/battle/sfx/status/apply_slow.mp3',
    'assets/audio/battle/sfx/status/apply_blind.mp3',
    'assets/audio/battle/sfx/status/apply_curse.wav',
    'assets/audio/battle/sfx/status/apply_berserk.mp3',
    'assets/audio/battle/sfx/ui/select_unit.mp3',
    'assets/audio/battle/sfx/ui/end_turn.mp3',
    'assets/audio/battle/sfx/ui/skill_ready.mp3',
    'assets/audio/battle/sfx/ui/victory_screen.mp3',
    'assets/audio/battle/sfx/ui/defeat_screen.mp3'
  ];

  const BSX = (() => {
    const r = p => 'assets/audio/battle/sfx/' + p;
    return {
      common_hit: r('common/hit.mp3'),
      common_death: r('common/death.wav'),
      common_critical_hit: r('common/critical_hit.mp3'),
      common_victory: r('common/victory.mp3'),
      common_defeat: r('common/defeat.mp3'),
      move_step_grass: r('movement/step_grass.wav'),
      move_step_rock: r('movement/step_rock.wav'),
      move_step_wood: r('movement/step_wood.wav'),
      move_step_water: r('movement/step_water.wav'),
      heroes_garet_melee: r('heroes/garet_melee.mp3'),
      heroes_alira_bow: r('heroes/alira_bow.wav'),
      heroes_alira_bow_draw: r('heroes/alira_bow_draw.mp3'),
      heroes_seris_magic: r('heroes/seris_magic.mp3'),
      heroes_garet_shield_bash: r('heroes/garet_shield_bash.mp3'),
      heroes_garet_fire_call: r('heroes/garet_fire_call.mp3'),
      heroes_garet_berserk: r('heroes/garet_berserk.mp3'),
      heroes_alira_double_shot: r('heroes/alira_double_shot.mp3'),
      heroes_alira_slow_arrow: r('heroes/alira_slow_arrow.wav'),
      heroes_alira_arrow_rain: r('heroes/alira_arrow_rain.wav'),
      heroes_seris_fireball: r('heroes/seris_fireball.ogg'),
      heroes_seris_freeze: r('heroes/seris_freeze.mp3'),
      heroes_seris_meteor: r('heroes/seris_meteor.mp3'),
      enemies_skeleton_attack: r('enemies/skeleton_attack.wav'),
      enemies_goblin_archer_attack: r('enemies/goblin_archer_attack.wav'),
      enemies_boar_attack: r('enemies/boar_attack.wav'),
      enemies_zombie_attack: r('enemies/zombie_attack.wav'),
      enemies_zombie_explosion: r('enemies/zombie_explosion.ogg'),
      enemies_shaman_attack: r('enemies/shaman_attack.ogg'),
      enemies_shaman_heal: r('enemies/shaman_heal.wav'),
      enemies_orc_guard_attack: r('enemies/orc_guard_attack.mp3'),
      enemies_suicide_attack: r('enemies/suicide_attack.wav'),
      enemies_suicide_explosion: r('enemies/suicide_explosion.ogg'),
      enemies_spider_attack: r('enemies/spider_attack.wav'),
      enemies_spider_web: r('enemies/spider_web.ogg'),
      enemies_watcher_attack: r('enemies/watcher_attack.wav'),
      enemies_watcher_buff: r('enemies/watcher_buff.wav'),
      enemies_ice_elem_attack: r('enemies/ice_elem_attack.wav'),
      enemies_ice_freeze_touch: r('enemies/ice_freeze_touch.wav'),
      enemies_dark_knight_attack: r('enemies/dark_knight_attack.wav'),
      enemies_necro_attack: r('enemies/necro_attack.mp3'),
      enemies_necro_raise: r('enemies/necro_raise.wav'),
      enemies_chaos_attack: r('enemies/chaos_attack.mp3'),
      enemies_assassin_attack: r('enemies/assassin_attack.wav'),
      enemies_hydra_attack: r('enemies/hydra_attack.wav'),
      enemies_ghost_attack: r('enemies/ghost_attack.wav'),
      enemies_fire_titan_attack: r('enemies/fire_titan_attack.ogg'),
      enemies_fire_titan_aoe: r('enemies/fire_titan_aoe.ogg'),
      enemies_dark_lord_attack: r('enemies/dark_lord_attack.wav'),
      enemies_dark_lord_teleport: r('enemies/dark_lord_teleport.mp3'),
      enemies_dark_lord_summon: r('enemies/dark_lord_summon.mp3'),
      enemies_dark_lord_aoe: r('enemies/dark_lord_aoe.mp3'),
      status_apply_stun: r('status/apply_stun.mp3'),
      status_apply_freeze: r('status/apply_freeze.wav'),
      status_apply_web: r('status/apply_web.wav'),
      status_apply_poison: r('status/apply_poison.mp3'),
      status_tick_poison: r('status/tick_poison.wav'),
      status_apply_burn: r('status/apply_burn.ogg'),
      status_tick_burn: r('status/tick_burn.ogg'),
      status_apply_slow: r('status/apply_slow.mp3'),
      status_apply_blind: r('status/apply_blind.mp3'),
      status_apply_curse: r('status/apply_curse.wav'),
      status_apply_berserk: r('status/apply_berserk.mp3'),
      ui_select_unit: r('ui/select_unit.mp3'),
      ui_end_turn: r('ui/end_turn.mp3'),
      ui_skill_ready: r('ui/skill_ready.mp3'),
      ui_victory_screen: r('ui/victory_screen.mp3'),
      ui_defeat_screen: r('ui/defeat_screen.mp3')
    };
  })();

  const ENEMY_ATTACK_SFX = {
    [ENEMY_IDS.SKELETON]: BSX.enemies_skeleton_attack,
    [ENEMY_IDS.GOBLIN_ARCHER]: BSX.enemies_goblin_archer_attack,
    [ENEMY_IDS.BOAR]: BSX.enemies_boar_attack,
    [ENEMY_IDS.ZOMBIE]: BSX.enemies_zombie_attack,
    [ENEMY_IDS.SHAMAN]: BSX.enemies_shaman_attack,
    [ENEMY_IDS.ORC_GUARD]: BSX.enemies_orc_guard_attack,
    [ENEMY_IDS.SUICIDE]: BSX.enemies_suicide_attack,
    [ENEMY_IDS.SPIDER]: BSX.enemies_spider_attack,
    [ENEMY_IDS.WATCHER]: BSX.enemies_watcher_attack,
    [ENEMY_IDS.ICE_ELEM]: BSX.enemies_ice_elem_attack,
    [ENEMY_IDS.DARK_KNIGHT]: BSX.enemies_dark_knight_attack,
    [ENEMY_IDS.NECRO]: BSX.enemies_necro_attack,
    [ENEMY_IDS.CHAOS]: BSX.enemies_chaos_attack,
    [ENEMY_IDS.ASSASSIN]: BSX.enemies_assassin_attack,
    [ENEMY_IDS.HYDRA]: BSX.enemies_hydra_attack,
    [ENEMY_IDS.GHOST]: BSX.enemies_ghost_attack,
    [ENEMY_IDS.FIRE_TITAN]: BSX.enemies_fire_titan_attack,
    [ENEMY_IDS.DARK_LORD]: BSX.enemies_dark_lord_attack
  };

  const SFX_AUDITOR_GROUPS = [
    {
      id: 'sword',
        title: 'Sword / melee hit',
      target: 'heroes_garet_melee',
      candidates: [
        ['Current: Slash 04', BSX.heroes_garet_melee],
        ['Blade 01', 'assets/audio/_extracted/80-CC0-RPG-SFX/blade_01.ogg'],
        ['Blade 02', 'assets/audio/_extracted/80-CC0-RPG-SFX/blade_02.ogg'],
        ['Blade 03', 'assets/audio/_extracted/80-CC0-RPG-SFX/blade_03.ogg'],
        ['Magic Slash', 'assets/audio/_extracted/magic_spells_ambroggiomusic/Slash.mp3'],
        ['Sword unsheathe', 'assets/audio/_extracted/rpg_sound_pack/rpg_sound_pack/battle/sword-unsheathe.wav']
      ]
    },
    {
      id: 'arrow',
        title: 'Arrow / shot',
      target: 'heroes_alira_bow',
      candidates: [
        ['Current: Wind 01', BSX.heroes_alira_bow],
        ['Attack 03', 'assets/audio/_extracted/RPG_Essentials_Free/12_Player_Movement_SFX/56_Attack_03.wav'],
        ['Swing', 'assets/audio/_extracted/rpg_sound_pack/rpg_sound_pack/battle/swing.wav'],
        ['Swing 2', 'assets/audio/_extracted/rpg_sound_pack/rpg_sound_pack/battle/swing2.wav'],
        ['Swing 3', 'assets/audio/_extracted/rpg_sound_pack/rpg_sound_pack/battle/swing3.wav'],
        ['Wind 01 source', 'assets/audio/_extracted/RPG_Essentials_Free/8_Atk_Magic_SFX/25_Wind_01.wav']
      ]
    },
    {
      id: 'impact',
        title: 'Hit / impact',
      target: 'common_hit',
      candidates: [
        ['Current: flesh impact', BSX.common_hit],
        ['Movement Hit 03', 'assets/audio/_extracted/RPG_Essentials_Free/12_Player_Movement_SFX/61_Hit_03.wav'],
        ['Metal Hit 1', 'assets/audio/_extracted/magic_spells_ambroggiomusic/metal_hit_1.mp3'],
        ['Metal Hit 2', 'assets/audio/_extracted/magic_spells_ambroggiomusic/metal_hit_2.mp3'],
        ['Orc damage', 'assets/audio/_extracted/43284__randbsoundbites__rpg-sounds/800361__randbsoundbites__orc-taking-damage.wav'],
        ['Character injury', 'assets/audio/_extracted/43284__randbsoundbites__rpg-sounds/808094__randbsoundbites__various-injury-sounds-for-game-character.wav']
      ]
    },
    {
      id: 'steps',
        title: 'Ground steps',
      target: 'move_step_grass',
      candidates: [
        ['Current: grass step', BSX.move_step_grass],
        ['Rock step', BSX.move_step_rock],
        ['Wood step', BSX.move_step_wood],
        ['Water step', BSX.move_step_water],
        ['Landing 01', 'assets/audio/_extracted/RPG_Essentials_Free/12_Player_Movement_SFX/45_Landing_01.wav']
      ]
    },
    {
      id: 'fire',
        title: 'Fire / explosion',
      target: 'heroes_seris_fireball',
      candidates: [
        ['Current: fireball', BSX.heroes_seris_fireball],
        ['Fire explosion medium', 'assets/audio/_extracted/RPG_Essentials_Free/8_Atk_Magic_SFX/04_Fire_explosion_04_medium.wav'],
        ['Fire 01', 'assets/audio/_extracted/80-CC0-RPG-SFX/spell_fire_01.ogg'],
        ['Fire 02', 'assets/audio/_extracted/80-CC0-RPG-SFX/spell_fire_02.ogg'],
        ['Fire 04', 'assets/audio/_extracted/80-CC0-RPG-SFX/spell_fire_04.ogg'],
        ['Fire 05', 'assets/audio/_extracted/80-CC0-RPG-SFX/spell_fire_05.ogg']
      ]
    },
    {
      id: 'ice',
        title: 'Ice / freeze',
      target: 'heroes_seris_freeze',
      candidates: [
        ['Current: ice explosion', BSX.heroes_seris_freeze],
        ['Ice source', 'assets/audio/_extracted/RPG_Essentials_Free/8_Atk_Magic_SFX/13_Ice_explosion_01.wav'],
        ['Water 02', 'assets/audio/_extracted/RPG_Essentials_Free/8_Atk_Magic_SFX/22_Water_02.wav'],
        ['Stun', 'assets/audio/_extracted/magic_spells_vol_2_ambroggiomusic/Stun.mp3'],
        ['Magic Block', 'assets/audio/_extracted/magic_spells_vol_2_ambroggiomusic/magic_block.mp3']
      ]
    },
    {
      id: 'magic',
        title: 'Magic burst',
      target: 'heroes_seris_magic',
      candidates: [
        ['Current: magic1', BSX.heroes_seris_magic],
        ['Spell', 'assets/audio/_extracted/rpg_sound_pack/rpg_sound_pack/battle/spell.wav'],
        ['Spell 01', 'assets/audio/_extracted/80-CC0-RPG-SFX/spell_01.ogg'],
        ['Spell 02', 'assets/audio/_extracted/80-CC0-RPG-SFX/spell_02.ogg'],
        ['Zap 1', 'assets/audio/_extracted/magic_spells_vol_2_ambroggiomusic/zap_1.mp3'],
        ['Zap 2', 'assets/audio/_extracted/magic_spells_vol_2_ambroggiomusic/zap_2.mp3']
      ]
    }
  ];

  function addBattleSfxUrl(url) {
    if (url && !BATTLE_SFX_SAMPLE_URLS.includes(url)) BATTLE_SFX_SAMPLE_URLS.push(url);
  }

  function loadSfxOverrides() {
    try {
      const raw = localStorage.getItem(SFX_OVERRIDES_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (_) {
      return {};
    }
  }

  function saveSfxOverrides(overrides) {
    try { localStorage.setItem(SFX_OVERRIDES_KEY, JSON.stringify(overrides || {})); } catch (_) {}
  }

  function applySfxOverride(target, url) {
    if (!target || !url || !(target in BSX)) return false;
    BSX[target] = url;
    addBattleSfxUrl(url);
    return true;
  }

  function applySavedSfxOverrides() {
    const overrides = loadSfxOverrides();
    Object.entries(overrides).forEach(([target, url]) => applySfxOverride(target, url));
  }

  function resetSfxOverrides() {
    try { localStorage.removeItem(SFX_OVERRIDES_KEY); } catch (_) {}
    location.reload();
  }

  applySavedSfxOverrides();

  const BattleSfx = {
    ctx: null,
    master: null,
    _noiseBuf: null,
    _sampleBuffers: null,
    _sampleLoadPromise: null,

    init() {
      document.addEventListener('visibilitychange', () => this.onVisibility());
      window.addEventListener('pagehide', () => { if (this.ctx) this.ctx.suspend().catch(() => {}); });
    },

    onVisibility() {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend().catch(() => {});
      else this.ctx.resume().catch(() => {});
    },

    unlock() {
      const ctx = this.ensureCtx();
      if (ctx && ctx.state === 'suspended') ctx.resume().catch(() => {});
    },

    ensureCtx() {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return null;
      if (!this.ctx) {
        this.ctx = new Ctx();
        this.master = this.ctx.createGain();
        this.master.connect(this.ctx.destination);
      }
      return this.ctx;
    },

    /** Background-load all imported samples into memory once per session. */
    ensureSampleBuffers() {
      if (this._sampleLoadPromise) return this._sampleLoadPromise;
      const ctx = this.ensureCtx();
      if (!ctx) return Promise.resolve();
      if (!this._sampleBuffers) this._sampleBuffers = new Map();
      const map = this._sampleBuffers;
      this._sampleLoadPromise = (async () => {
        for (const url of BATTLE_SFX_SAMPLE_URLS) {
          if (map.has(url)) continue;
          try {
            const res = await fetch(url);
            if (!res.ok) continue;
            const ab = await res.arrayBuffer();
            const buf = await ctx.decodeAudioData(ab.slice(0));
            map.set(url, buf);
          } catch (e) { /* Skip broken or unsupported files. */ }
        }
      })();
      return this._sampleLoadPromise;
    },

    _altSampleUrls(url) {
      const base = url.replace(/\.[^.]+$/, '');
      const exts = ['.mp3', '.wav', '.ogg', '.m4a'];
      const out = [url];
      exts.forEach(ext => { const u = base + ext; if (!out.includes(u)) out.push(u); });
      return out;
    },

    _bufferForUrl(url) {
      if (!this._sampleBuffers || !url) return null;
      if (this._sampleBuffers.has(url)) return { url, buf: this._sampleBuffers.get(url) };
      const base = url.replace(/\.[^.]+$/, '');
      for (const ext of ['.mp3', '.wav', '.ogg', '.m4a']) {
        const alt = base + ext;
        if (this._sampleBuffers.has(alt)) return { url: alt, buf: this._sampleBuffers.get(alt) };
      }
      return null;
    },

    async loadSampleUrl(url) {
      const ctx = this.ensureCtx();
      if (!ctx || !url) return false;
      if (!this._sampleBuffers) this._sampleBuffers = new Map();
      const hit = this._bufferForUrl(url);
      if (hit) return true;
      for (const tryUrl of this._altSampleUrls(url)) {
        try {
          const res = await fetch(tryUrl);
          if (!res.ok) continue;
          const ab = await res.arrayBuffer();
          const buf = await ctx.decodeAudioData(ab.slice(0));
          this._sampleBuffers.set(url, buf);
          addBattleSfxUrl(url);
          return true;
        } catch (_) { /* next ext */ }
      }
      return false;
    },

    async auditionUrl(url, gainMul) {
      this.unlock();
      const ok = await this.loadSampleUrl(url);
      if (!ok) return false;
      this.playSampledUrl(url, gainMul || 0.85);
      return true;
    },

    /** Play a sample by full URL; delaySec is relative to AudioContext.currentTime. */
    playSampledUrl(url, gainMul, delaySec) {
      const ctx = this.ensureCtx();
      if (!ctx || !this.master || !this._sampleBuffers) return;
      const g0 = this._sfxGain();
      if (g0 <= 0) return;
      const resolved = this._bufferForUrl(url);
      if (!resolved) return;
      const buf = resolved.buf;
      const startAt = ctx.currentTime + Math.max(0, delaySec || 0);
      const gn = ctx.createGain();
      const mul = typeof gainMul === 'number' && gainMul > 0 ? gainMul : 1;
      gn.gain.setValueAtTime(g0 * Math.min(1.2, mul), startAt);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(gn);
      gn.connect(this.master);
      src.start(startAt);
    },

    _sfxGain() {
      const s = loadAudioSettings();
      if (s.sfxEnabled === false) return 0;
      return Math.min(1, Math.max(0, s.sfxVolume));
    },

    _windSfxUrl(attacker, opts) {
      opts = opts || {};
      if (opts.sfxWindUrl) return opts.sfxWindUrl;
      if (opts.sfxSkipWind) return null;
      if (!attacker) return null;
      if (attacker.isHero) {
        const b = GameState.currentBattle;
        const ps = b && b.pendingSkill;
        if (attacker.heroId === 'garet') {
          if (ps === 'shieldBash') return BSX.heroes_garet_shield_bash;
          return BSX.heroes_garet_melee;
        }
        if (attacker.heroId === 'alira') {
          if (ps === 'double') return BSX.heroes_alira_double_shot;
          if (ps === 'slowArrow') return BSX.heroes_alira_slow_arrow;
          return BSX.heroes_alira_bow;
        }
        if (attacker.heroId === 'seris') return BSX.heroes_seris_magic;
        return null;
      }
      return ENEMY_ATTACK_SFX[attacker.enemyId] || null;
    },

    statusApplied(type) {
      const map = {
        [STATUS.STUN]: BSX.status_apply_stun,
        [STATUS.FREEZE]: BSX.status_apply_freeze,
        [STATUS.WEB]: BSX.status_apply_web,
        [STATUS.POISON]: BSX.status_apply_poison,
        [STATUS.BURN]: BSX.status_apply_burn,
        [STATUS.SLOW]: BSX.status_apply_slow,
        [STATUS.BLIND]: BSX.status_apply_blind,
        [STATUS.CURSE]: BSX.status_apply_curse,
        [STATUS.BERSERK]: BSX.status_apply_berserk
      };
      const url = map[type];
      if (url) this.playSampledUrl(url, 0.82);
    },

    heroTurnEnter(u) {
      if (!u || !u.isHero) return;
      this.playSampledUrl(BSX.ui_select_unit, 0.78);
      const hh = GameState.heroes.find(x => x.id === u.heroId);
      const lvl = (hh && hh.level) || u.level || 1;
      const cds = u.cds || {};
      const defs = HERO_SKILLS[u.heroId] || [];
      let anyReady = false;
      for (const sk of defs) {
        if (lvl < sk.unlockLevel) continue;
        const cd = cds[sk.key] || 0;
        if (cd > 0) continue;
        if (sk.cost != null && typeof sk.cost === 'number' && (u.mana || 0) < sk.cost) continue;
        anyReady = true;
        break;
      }
      if (anyReady) this.playSampledUrl(BSX.ui_skill_ready, 0.55, 0.06);
    },

    tileStepUrl(tile) {
      if (tile === TILE.WATER) return BSX.move_step_water;
      if (tile === TILE.MOUNTAIN || tile === TILE.FORT) return BSX.move_step_rock;
      if (tile === TILE.FOREST) return BSX.move_step_wood;
      return BSX.move_step_grass;
    },

    unitMoved(unit, fromX, fromY, toX, toY, grid) {
      if (!unit || fromX === toX && fromY === toY) return;
      const dist = Math.abs(toX - fromX) + Math.abs(toY - fromY);
      if (dist <= 0) return;
      const tile = grid && grid[toY] ? grid[toY][toX] : TILE.GROUND;
      const url = this.tileStepUrl(tile);
      const steps = Math.max(1, Math.min(3, dist));
      const gain = unit.isHero ? 0.58 : 0.42;
      for (let i = 0; i < steps; i++) {
        this.playSampledUrl(url, gain, i * 0.105);
      }
    },

    damageEvent(attacker, target, opts, dmg) {
      const ctx = this.ensureCtx();
      if (!ctx || !this.master) return;
      const g = this._sfxGain();
      if (g <= 0 || dmg <= 0) return;
      const mul = Math.min(1.15, 0.5 + Math.min(dmg, 45) * 0.014);
      const t0 = ctx.currentTime;
      const bufHit = this._bufferForUrl(BSX.common_hit);
      const onlyImpact = opts && opts.sfxImpactOnly;
      if (!onlyImpact) {
        const wind = this._windSfxUrl(attacker, opts);
        if (wind && this._bufferForUrl(wind)) this.playSampledUrl(wind, 0.88 * mul, 0);
      }
      if (bufHit) {
        this.playSampledUrl(BSX.common_hit, 0.9 * mul, onlyImpact ? 0 : 0.035);
        if (opts && opts.sfxCrit) this.playSampledUrl(BSX.common_critical_hit, 0.92 * mul, 0.052);
        return;
      }
      const kind = inferAttackSfxKind(attacker, opts || {});
      this._attack(ctx, t0, kind, g * mul);
      this._hit(ctx, t0 + 0.032, g * mul * 0.92);
    },

    death() {
      const ctx = this.ensureCtx();
      if (!ctx || !this.master) return;
      const g = this._sfxGain();
      if (g <= 0) return;
      if (this._bufferForUrl(BSX.common_death)) {
        this.playSampledUrl(BSX.common_death, 0.95);
        return;
      }
      this._death(ctx, ctx.currentTime, g);
    },

    _attack(ctx, t0, kind, vol) {
      const m = this.master;
      if (kind === 'bow') {
        const o = ctx.createOscillator();
        const o2 = ctx.createOscillator();
        const gn = ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(620, t0);
        o.frequency.exponentialRampToValueAtTime(180, t0 + 0.052);
        o2.type = 'sine';
        o2.frequency.setValueAtTime(1180, t0);
        o2.frequency.exponentialRampToValueAtTime(380, t0 + 0.038);
        gn.gain.setValueAtTime(0.0001, t0);
        gn.gain.exponentialRampToValueAtTime(vol * 0.2, t0 + 0.006);
        gn.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.062);
        o.connect(gn); o2.connect(gn); gn.connect(m);
        o.start(t0); o2.start(t0);
        o.stop(t0 + 0.07); o2.stop(t0 + 0.07);
      } else if (kind === 'magic') {
        const o = ctx.createOscillator();
        const o3 = ctx.createOscillator();
        const gn = ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(200, t0);
        o.frequency.linearRampToValueAtTime(920, t0 + 0.075);
        o3.type = 'triangle';
        o3.frequency.setValueAtTime(420, t0);
        gn.gain.setValueAtTime(0.0001, t0);
        gn.gain.exponentialRampToValueAtTime(vol * 0.17, t0 + 0.018);
        gn.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.11);
        o.connect(gn); o3.connect(gn); gn.connect(m);
        o.start(t0); o3.start(t0);
        o.stop(t0 + 0.12); o3.stop(t0 + 0.12);
      } else {
        const o = ctx.createOscillator();
        const f = ctx.createBiquadFilter();
        const gn = ctx.createGain();
        o.type = 'square';
        o.frequency.setValueAtTime(88, t0);
        o.frequency.exponentialRampToValueAtTime(42, t0 + 0.055);
        f.type = 'lowpass';
        f.frequency.setValueAtTime(700, t0);
        f.Q.setValueAtTime(0.6, t0);
        gn.gain.setValueAtTime(0.0001, t0);
        gn.gain.exponentialRampToValueAtTime(vol * 0.11, t0 + 0.01);
        gn.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.072);
        o.connect(f); f.connect(gn); gn.connect(m);
        o.start(t0); o.stop(t0 + 0.08);
      }
    },

    _hit(ctx, t0, vol) {
      const m = this.master;
      const buf = this._getNoise(ctx);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const bp = ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.setValueAtTime(680, t0);
      bp.Q.setValueAtTime(1.1, t0);
      const gn = ctx.createGain();
      gn.gain.setValueAtTime(0.0001, t0);
      gn.gain.exponentialRampToValueAtTime(vol * 0.26, t0 + 0.003);
      gn.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.085);
      src.connect(bp); bp.connect(gn); gn.connect(m);
      src.start(t0, 0, 0.09);
    },

    _death(ctx, t0, vol) {
      const m = this.master;
      const o = ctx.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(165, t0);
      o.frequency.exponentialRampToValueAtTime(48, t0 + 0.36);
      const gn = ctx.createGain();
      gn.gain.setValueAtTime(0.0001, t0);
      gn.gain.exponentialRampToValueAtTime(vol * 0.14, t0 + 0.035);
      gn.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.42);
      o.connect(gn); gn.connect(m);
      o.start(t0); o.stop(t0 + 0.44);
      const buf = this._getNoise(ctx);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.setValueAtTime(1200, t0);
      f.frequency.exponentialRampToValueAtTime(100, t0 + 0.18);
      const gn2 = ctx.createGain();
      gn2.gain.setValueAtTime(vol * 0.1, t0);
      gn2.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.2);
      src.connect(f); f.connect(gn2); gn2.connect(m);
      src.start(t0, 0, 0.2);
    },

    _getNoise(ctx) {
      if (this._noiseBuf && Math.abs(this._noiseBuf.sampleRate - ctx.sampleRate) < 1) return this._noiseBuf;
      const len = Math.ceil(ctx.sampleRate * 0.16);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      this._noiseBuf = buf;
      return buf;
    }
  };

  function baseHeroTemplate() {
    return [
      { id: 'garet', name: 'Garet', emoji: '⚔️', role: 'warrior', hp: 30, maxHp: 30, armor: 4, attack: 6, range: 1, move: 3, speed: 11, level: 1, xp: 0, perks: [], mana: 0, maxMana: 0,
        cds: { shieldBash: 0, fireCall: 0, berserk: 0 }, flags: { firstAttackTurn: true } },
      { id: 'alira', name: 'Alira', emoji: '🏹', role: 'archer', hp: 19, maxHp: 19, armor: 1, attack: 8, range: 3, move: 3, speed: 9, level: 1, xp: 0, perks: [], mana: 0, maxMana: 0,
        cds: { doubleShot: 0, slowArrow: 0, arrowRain: 0 }, flags: { firstAttackTurn: true } },
      { id: 'seris', name: 'Seris', emoji: '🔮', role: 'mage', hp: 15, maxHp: 15, armor: 0, attack: 9, range: 2, move: 2, speed: 7, level: 1, xp: 0, perks: [], mana: 8, maxMana: 8,
        cds: { fireball: 0, freeze: 0, meteor: 0 }, flags: { mysticShield: 3 } }
    ];
  }

  const PERK_TREES = {
    garet: {
      defense: [
        { level: 1, id: 'd1', name: 'Guardian Cover', apply: h => { h.perks.push('guardianCover'); } },
        { level: 2, id: 'd2', name: '+1 armor', apply: h => { applyPermanentHeroStat(h, 'armor', 1); } },
        { level: 3, id: 'd3', name: 'Reflected 1 damage', apply: h => { h.perks.push('reflect1'); } }
      ],
      attack: [
        { level: 1, id: 'a1', name: 'Executioner', apply: h => { h.perks.push('finisher'); } },
        { level: 2, id: 'a2', name: 'Armor Pierce', apply: h => { h.perks.push('armorPierce'); } },
        { level: 3, id: 'a3', name: 'Crit 15%', apply: h => { h.perks.push('crit15'); } }
      ],
      leader: [
        { level: 1, id: 'l1', name: 'Adjacent allies +1 armor', apply: h => { h.perks.push('auraArmor'); } },
        { level: 2, id: 'l2', name: 'Aura +10% damage', apply: h => { h.perks.push('auraDmg'); } },
        { level: 3, id: 'l3', name: 'Commander', apply: h => { h.speed += 1; } }
      ]
    },
    alira: {
      accuracy: [
        { level: 1, id: 'm1', name: '+1 range', apply: h => { applyPermanentHeroStat(h, 'range', 1); } },
        { level: 2, id: 'm2', name: '+3 damage', apply: h => { applyPermanentHeroStat(h, 'attack', 3); } },
        { level: 3, id: 'm3', name: 'Ignore cover', apply: h => { h.perks.push('ignoreCover'); } }
      ],
      speed: [
        { level: 1, id: 's1', name: '+1 movement', apply: h => { applyPermanentHeroStat(h, 'move', 1); } },
        { level: 2, id: 's2', name: 'Shot after moving', apply: h => { h.perks.push('moveAttack'); } },
        { level: 3, id: 's3', name: '+2 speed', apply: h => { h.speed += 2; } }
      ],
      traps: [
        { level: 1, id: 't1', name: 'Damage trap', apply: h => { h.perks.push('trapDmg'); } },
        { level: 2, id: 't2', name: 'Slow trap', apply: h => { h.perks.push('trapSlow'); } },
        { level: 3, id: 't3', name: 'Double traps', apply: h => { h.perks.push('trapDouble'); } }
      ]
    },
    seris: {
      destruction: [
        { level: 1, id: 'r1', name: 'Arcane Charge', apply: h => { h.perks.push('spellCharge'); } },
        { level: 2, id: 'r2', name: 'AoE +1', apply: h => { h.perks.push('aoePlus'); } },
        { level: 3, id: 'r3', name: 'Burn 2 turns', apply: h => { h.perks.push('burnSpell'); } }
      ],
      control: [
        { level: 1, id: 'c1', name: 'Freeze 2 turns', apply: h => { h.perks.push('freeze2'); } },
        { level: 2, id: 'c2', name: 'Fear 1 turn', apply: h => { h.perks.push('fear'); } },
        { level: 3, id: 'c3', name: 'Control master', apply: h => { applyPermanentHeroStat(h, 'maxMana', 2); } }
      ],
      mystic: [
        { level: 1, id: 'y1', name: '+3 max mana', apply: h => { applyPermanentHeroStat(h, 'maxMana', 3); } },
        { level: 2, id: 'y2', name: 'HP for a kill', apply: h => { h.perks.push('killHeal'); } },
        { level: 3, id: 'y3', name: 'Teleport', apply: h => { h.perks.push('teleport'); } }
      ]
    }
  };

  const PERK_ICONS = {
    d1:'🛡',d2:'🔰',d3:'💎', a1:'⚡',a2:'🔥',a3:'💥', l1:'🌟',l2:'🤝',l3:'👑',
    m1:'🎯',m2:'🏹',m3:'🔍', s1:'💨',s2:'🌀',s3:'⚡', t1:'🕸',t2:'💣',t3:'🌧',
    r1:'🔥',r2:'☄',r3:'💥', c1:'🧊',c2:'😱',c3:'🌀', y1:'✨',y2:'💊',y3:'🌀'
  };
  const PERK_BRANCH_LABELS = {
    defense: 'DEFENSE', attack: 'ATTACK', leader: 'LEADERSHIP',
    accuracy: 'ACCURACY', speed: 'SPEED', traps: 'TRAPS',
    destruction: 'DESTRUCTION', control: 'CONTROL', mystic: 'MYSTIC'
  };
  const PERK_NAMES_RU = {
    d1:'Защитное прикрытие', d2:'+1 к броне', d3:'Ответный урон 1',
    a1:'Палач', a2:'Пробитие брони', a3:'Критический удар 15%',
    l1:'Соседям +1 к броне', l2:'Аура: +10% к урону', l3:'Командир',
    m1:'+1 к дальности', m2:'+3 к урону', m3:'Игнорирование укрытий',
    s1:'+1 к движению', s2:'Выстрел после движения', s3:'+2 к скорости',
    t1:'Наносящая урон ловушка', t2:'Замедляющая ловушка', t3:'Двойные ловушки',
    r1:'Магический заряд', r2:'Область действия +1', r3:'Горение на 2 хода',
    c1:'Заморозка на 2 хода', c2:'Страх на 1 ход', c3:'Мастер контроля',
    y1:'+3 к максимуму маны', y2:'Лечение за убийство', y3:'Телепортация'
  };
  const PERK_BRANCH_NAMES = {
    defense:{ru:'ЗАЩИТА',en:'DEFENSE',es:'DEFENSA'},
    attack:{ru:'АТАКА',en:'ATTACK',es:'ATAQUE'},
    leader:{ru:'ЛИДЕРСТВО',en:'LEADERSHIP',es:'LIDERAZGO'},
    accuracy:{ru:'ТОЧНОСТЬ',en:'ACCURACY',es:'PRECISIÓN'},
    speed:{ru:'МОБИЛЬНОСТЬ',en:'SPEED',es:'VELOCIDAD'},
    traps:{ru:'ЛОВУШКИ',en:'TRAPS',es:'TRAMPAS'},
    destruction:{ru:'РАЗРУШЕНИЕ',en:'DESTRUCTION',es:'DESTRUCCIÓN'},
    control:{ru:'КОНТРОЛЬ',en:'CONTROL',es:'CONTROL'},
    mystic:{ru:'МИСТИКА',en:'MYSTIC',es:'MÍSTICA'}
  };
  function localizedPerkName(perk) {
    if (!perk) return '';
    return currentLanguage() === 'ru' ? (PERK_NAMES_RU[perk.id] || perk.name) : translateText(perk.name);
  }
  function localizedPerkBranch(branch) {
    const names = PERK_BRANCH_NAMES[branch];
    return names ? (names[currentLanguage()] || names.en) : translateText(PERK_BRANCH_LABELS[branch] || branch);
  }
  const PERK_DESCRIPTIONS = {
    d1: { ru: 'Путь танка: переживай ещё один удар и дольше удерживай передовую.', en: 'Tank path: survive one more hit and hold the front line longer.', es: 'Ruta de tanque: resiste un golpe más y protege el frente durante más tiempo.' },
    d2: { ru: 'Путь танка: снижай постоянный урон ближнего боя до того, как он достигнет тыла.', en: 'Tank path: reduce steady melee damage before it reaches the back line.', es: 'Ruta de tanque: reduce el daño cuerpo a cuerpo antes de que alcance la retaguardia.' },
    d3: { ru: 'Путь танка: наказывай врагов за атаки по Гарету.', en: 'Tank path: punish enemies for attacking Garet.', es: 'Ruta de tanque: castiga a los enemigos por atacar a Garet.' },
    a1: { ru: 'Путь дуэлянта: превращай Гарета в более сильного добивающего бойца.', en: 'Duelist path: turn Garet into a stronger finisher.', es: 'Ruta de duelista: convierte a Garet en un rematador más fuerte.' },
    a2: { ru: 'Путь дуэлянта: пробивай бронированных врагов и боссов.', en: 'Duelist path: cut through armored enemies and bosses.', es: 'Ruta de duelista: atraviesa a enemigos acorazados y jefes.' },
    a3: { ru: 'Путь дуэлянта: добавляй всплески урона к ключевым атакам.', en: 'Duelist path: add burst damage spikes to key attacks.', es: 'Ruta de duelista: añade picos de daño a los ataques clave.' },
    l1: { ru: 'Путь командира: защищай соседних союзников, когда они стоят рядом с Гаретом.', en: 'Commander path: keep nearby allies safer when they stand with Garet.', es: 'Ruta de comandante: protege a los aliados cercanos junto a Garet.' },
    l2: { ru: 'Путь командира: плотный строй наносит больше урона.', en: 'Commander path: make tight formations hit harder.', es: 'Ruta de comandante: las formaciones compactas golpean más fuerte.' },
    l3: { ru: 'Путь командира: ходи раньше и поддерживай темп отряда.', en: 'Commander path: act earlier and keep the squad tempo high.', es: 'Ruta de comandante: actúa antes y mantiene alto el ritmo del grupo.' },
    m1: { ru: 'Путь снайпера: атакуй из безопасных позиций и контролируй больше линий.', en: 'Sniper path: attack from safer positions and cover more lanes.', es: 'Ruta de francotirador: ataca desde posiciones seguras y cubre más líneas.' },
    m2: { ru: 'Путь снайпера: каждая стрела становится серьёзной угрозой одной цели.', en: 'Sniper path: make each arrow a serious single-target threat.', es: 'Ruta de francotirador: cada flecha se vuelve una amenaza seria para un objetivo.' },
    m3: { ru: 'Путь снайпера: стреляй сквозь укрытия, когда позиция становится неудобной.', en: 'Sniper path: shoot through cover when positioning gets messy.', es: 'Ruta de francotirador: dispara a través de cobertura cuando la posición se complica.' },
    s1: { ru: 'Путь застрельщика: быстрее меняй позицию и уходи с опасных клеток.', en: 'Skirmisher path: reposition faster and escape bad tiles.', es: 'Ruta de hostigador: reposiciónate más rápido y escapa de casillas peligrosas.' },
    s2: { ru: 'Путь застрельщика: сохраняй урон после перемещения.', en: 'Skirmisher path: keep damage flowing after movement.', es: 'Ruta de hostigador: mantiene el daño después de moverte.' },
    s3: { ru: 'Путь застрельщика: ходи раньше и добивай раненых врагов.', en: 'Skirmisher path: take turns earlier and finish wounded enemies.', es: 'Ruta de hostigador: actúa antes y remata enemigos heridos.' },
    t1: { ru: 'Путь ловчего: сделай перемещение врагов опасным.', en: 'Trapper path: make enemy movement costly.', es: 'Ruta de trampero: haz costoso el movimiento enemigo.' },
    t2: { ru: 'Путь ловчего: замедляй опасные цели до их подхода к героям.', en: 'Trapper path: slow dangerous targets before they reach the heroes.', es: 'Ruta de trampero: ralentiza objetivos peligrosos antes de que alcancen a los héroes.' },
    t3: { ru: 'Путь ловчего: контролируй больше пространства цепочками ловушек.', en: 'Trapper path: control more space with layered traps.', es: 'Ruta de trampero: controla más espacio con trampas encadenadas.' },
    r1: { ru: 'Путь разрушения: повышай урон Сэрис, чтобы заклинания быстрее завершали бой.', en: 'Destruction path: raise Seris damage so spells end fights faster.', es: 'Ruta de destrucción: aumenta el daño de Seris para acabar combates más rápido.' },
    r2: { ru: 'Путь разрушения: каждое заклинание по области поражает больше врагов.', en: 'Destruction path: hit more enemies with every area spell.', es: 'Ruta de destrucción: golpea a más enemigos con cada hechizo de área.' },
    r3: { ru: 'Путь разрушения: добавляй горение после попаданий заклинаний.', en: 'Destruction path: add burning pressure after spell hits.', es: 'Ruta de destrucción: añade quemadura tras los impactos de hechizos.' },
    c1: { ru: 'Путь контроля: дольше удерживай приоритетных врагов в заморозке.', en: 'Control path: keep priority enemies frozen longer.', es: 'Ruta de control: mantiene congelados más tiempo a los enemigos prioritarios.' },
    c2: { ru: 'Путь контроля: ломай темп врага страхом.', en: 'Control path: break enemy tempo with fear.', es: 'Ruta de control: rompe el ritmo enemigo con miedo.' },
    c3: { ru: 'Путь контроля: получай больше маны для повторных заклинаний контроля.', en: 'Control path: gain more mana for repeated control spells.', es: 'Ruta de control: gana más maná para repetir hechizos de control.' },
    y1: { ru: 'Путь мистика: колдуй чаще и не оставайся без маны.', en: 'Mystic path: cast more often before running dry.', es: 'Ruta mística: lanza hechizos con más frecuencia sin quedarte sin maná.' },
    y2: { ru: 'Путь мистика: убийства поддерживают выживание Сэрис.', en: 'Mystic path: reward kills with sustain for Seris.', es: 'Ruta mística: las bajas sostienen la supervivencia de Seris.' },
    y3: { ru: 'Путь мистика: решай проблемы с позицией телепортацией.', en: 'Mystic path: solve positioning problems with teleport.', es: 'Ruta mística: resuelve problemas de posición con teletransporte.' }
  };

  const PERK_RULES_RU = {
    d1: { summary:'Союзник рядом: −2 урона', trigger:'Союзник в соседней клетке от Гарета получает урон.', effect:'Входящий урон этому союзнику уменьшается на 2. На самого Гарета эффект не действует.' },
    d2: { summary:'Постоянно: +1 к броне', trigger:'Действует постоянно после изучения.', effect:'Базовая броня Гарета увеличивается на 1 и снижает урон каждой входящей атаки.' },
    d3: { summary:'Немагическая атака по Гарету: ответ 1', trigger:'Гарет получает больше 0 урона от немагической атаки.', effect:'Атакующий немедленно получает 1 ответного урона.' },
    a1: { summary:'Цель ≤40% HP: +30% урона', trigger:'Гарет атакует противника, у которого осталось 40% здоровья или меньше.', effect:'Урон атаки увеличивается на 30% до вычета брони. Бонус помогает добить раненую цель.' },
    a2: { summary:'Атаки игнорируют 2 брони', trigger:'Гарет наносит урон любой атакой.', effect:'При расчёте урона броня цели уменьшается на 2, но не ниже 0.' },
    a3: { summary:'15% шанс: ×1,5 урона', trigger:'Каждая наносящая урон атака Гарета имеет шанс 15%.', effect:'При срабатывании итоговый урон атаки умножается на 1,5.' },
    l1: { summary:'Соседним союзникам +1 броня', trigger:'Союзник стоит в соседней клетке от живого Гарета.', effect:'При получении урона союзник считается имеющим на 1 броню больше. Гарет себя не усиливает.' },
    l2: { summary:'Союзникам в радиусе 2: +10% урона', trigger:'Союзник атакует, находясь не дальше 2 клеток от живого Гарета.', effect:'Урон союзника увеличивается на 10%. На атаки самого Гарета аура не действует.' },
    l3: { summary:'Постоянно: +1 к скорости', trigger:'Действует постоянно после изучения.', effect:'Скорость Гарета увеличивается на 1 — он раньше получает ход в очереди инициативы.' },
    m1: { summary:'Постоянно: +1 к дальности', trigger:'Действует постоянно после изучения.', effect:'Дальность обычных атак Алиры увеличивается на 1 клетку.' },
    m2: { summary:'Постоянно: +3 к атаке', trigger:'Действует постоянно после изучения.', effect:'Базовая атака Алиры увеличивается на 3; бонус участвует в обычных выстрелах и умениях от силы атаки.' },
    m3: { summary:'Можно стрелять в цель в лесу', trigger:'Цель Алиры находится на клетке леса.', effect:'Лес под целью больше не блокирует линию выстрела. Лес и горы между Алирой и целью всё ещё мешают.' },
    s1: { summary:'Постоянно: +1 клетка движения', trigger:'Действует постоянно после изучения.', effect:'Алира может пройти на 1 клетку дальше за свой ход.' },
    s2: { summary:'После движения: +20% урона', trigger:'Алира сначала переместилась, а затем атакует в тот же ход.', effect:'Урон этой атаки увеличивается на 20%.' },
    s3: { summary:'Постоянно: +2 к скорости', trigger:'Действует постоянно после изучения.', effect:'Скорость Алиры увеличивается на 2 — она раньше получает ход в очереди инициативы.' },
    t1: { summary:'После движения: ловушка на 4 урона', trigger:'Алира покидает клетку во время своего перемещения.', effect:'На покинутой клетке появляется ловушка. Первый наступивший враг получает 4 урона, после чего ловушка исчезает.' },
    t2: { summary:'Ловушки замедляют на 2 хода', trigger:'Враг наступает на ловушку Алиры и выживает.', effect:'Враг получает замедление на 2 хода: −2 к движению и −2 к скорости.' },
    t3: { summary:'После движения: до 2 ловушек', trigger:'Алира перемещается, имея изученную ловушку.', effect:'Помимо ловушки на покинутой клетке создаётся вторая на соседней доступной клетке.' },
    r1: { summary:'Магические попадания: +3 урона', trigger:'Сэрис наносит магический урон Огненным шаром, Метеором или другим магическим эффектом.', effect:'Каждое отдельное магическое попадание получает +3 урона до вычета брони.' },
    r2: { summary:'Огненный шар и Метеор: область +1', trigger:'Сэрис применяет Огненный шар или Метеор.', effect:'Радиус Огненного шара увеличивается с 1 до 2 клеток, а область Метеора — с 2×2 до 3×3.' },
    r3: { summary:'Магия поджигает: 3×2 урона', trigger:'Магическая атака Сэрис попадает по выжившей цели.', effect:'Цель горит 2 хода и получает по 3 урона в начале каждого хода — до 6 дополнительного урона.' },
    c1: { summary:'Заморозка: 2 хода вместо 1', trigger:'Сэрис применяет умение «Заморозка».', effect:'Цель пропускает 2 своих хода вместо 1.' },
    c2: { summary:'Заморозка пугает соседей на 1 ход', trigger:'Сэрис замораживает цель, рядом с которой стоят другие враги.', effect:'Все остальные враги в соседних клетках получают страх и пропускают 1 ход.' },
    c3: { summary:'Постоянно: +2 к максимуму маны', trigger:'Срабатывает сразу при изучении и действует постоянно.', effect:'Максимум маны Сэрис увеличивается на 2; при изучении она также сразу восстанавливает 2 маны.' },
    y1: { summary:'Постоянно: +3 к максимуму маны', trigger:'Срабатывает сразу при изучении и действует постоянно.', effect:'Максимум маны Сэрис увеличивается на 3; при изучении она также сразу восстанавливает 3 маны.' },
    y2: { summary:'Смерть врага: Сэрис лечится на 5 HP', trigger:'Любой враг погибает, пока Сэрис жива.', effect:'Сэрис восстанавливает 5 HP, но не выше своего максимального здоровья.' },
    y3: { summary:'1 раз за бой: телепорт до 4 клеток', trigger:'Один раз за бой выберите свободную клетку не дальше 4 клеток от Сэрис.', effect:'Сэрис мгновенно перемещается на выбранную клетку. Телепорт считается движением, но не расходует её атаку.' }
  };

  const PERK_RULES_EXACT = {
    en: {
      d1:['Adjacent ally: −2 damage','An ally adjacent to Garet takes damage.','Reduce that incoming damage by 2. Garet cannot cover himself.'],
      d2:['Permanent: +1 armor','Always active after learning.','Garet gains 1 base armor against every incoming attack.'],
      d3:['Physical hit on Garet: reflect 1','Garet takes more than 0 physical damage.','The attacker immediately takes 1 damage.'],
      a1:['Target ≤40% HP: +30% damage','Garet attacks an enemy at 40% HP or less.','Increase attack damage by 30% before armor is subtracted.'],
      a2:['Attacks ignore 2 armor','Garet deals damage with any attack.','Treat the target as having 2 less armor, never below 0.'],
      a3:['15% chance: ×1.5 damage','Each damaging attack made by Garet.','On success, multiply final attack damage by 1.5.'],
      l1:['Adjacent allies: +1 armor','An ally stands next to living Garet.','That ally counts as having 1 additional armor. Garet does not buff himself.'],
      l2:['Allies within 2 tiles: +10% damage','An ally attacks within 2 tiles of living Garet.','Increase that ally’s final damage by 10%.'],
      l3:['Permanent: +1 speed','Always active after learning.','Garet gains 1 speed and acts earlier in initiative.'],
      m1:['Permanent: +1 attack range','Always active after learning.','Alira’s normal attack range increases by 1 tile.'],
      m2:['Permanent: +3 attack','Always active after learning.','Alira gains 3 base attack for normal shots and attack-based skills.'],
      m3:['Can shoot a target in forest','Alira targets an enemy standing in forest.','The target’s forest tile no longer blocks the shot; obstacles between units still do.'],
      s1:['Permanent: +1 movement','Always active after learning.','Alira can move 1 additional tile each turn.'],
      s2:['After moving: +20% damage','Alira moves and then attacks in the same turn.','Increase that attack’s damage by 20%.'],
      s3:['Permanent: +2 speed','Always active after learning.','Alira gains 2 speed and acts earlier in initiative.'],
      t1:['After moving: 4-damage trap','Alira leaves a tile during her movement.','Place a trap there; the first enemy entering it takes 4 damage, then it disappears.'],
      t2:['Traps slow for 2 turns','An enemy survives triggering Alira’s trap.','Apply −2 movement and −2 speed for 2 turns.'],
      t3:['After moving: up to 2 traps','Alira moves while Damage Trap is learned.','Create one trap on the vacated tile and a second on a valid adjacent tile.'],
      r1:['Magic hits: +3 damage','Seris deals magic damage with a spell or magic attack.','Add 3 damage to every separate magic hit before armor.'],
      r2:['Fireball and Meteor: area +1','Seris casts Fireball or Meteor.','Fireball radius grows from 1 to 2; Meteor area grows from 2×2 to 3×3.'],
      r3:['Magic hit burns: 3×2 damage','A magic attack hits a surviving target.','Burn it for 2 turns; it takes 3 damage at the start of each turn, up to 6 total.'],
      c1:['Freeze: 2 turns instead of 1','Seris casts Freeze.','The target skips 2 of its turns instead of 1.'],
      c2:['Freeze fears adjacent enemies for 1 turn','Seris freezes a target with other enemies adjacent to it.','All other adjacent enemies gain Fear and skip 1 turn.'],
      c3:['Permanent: +2 maximum mana','Applied immediately and then remains active.','Increase maximum mana by 2 and immediately restore 2 mana.'],
      y1:['Permanent: +3 maximum mana','Applied immediately and then remains active.','Increase maximum mana by 3 and immediately restore 3 mana.'],
      y2:['Enemy death: Seris heals 5 HP','Any enemy dies while Seris is alive.','Restore 5 HP to Seris, up to her maximum HP.'],
      y3:['Once per battle: teleport up to 4 tiles','Choose a free tile within 4 tiles of Seris once per battle.','Move there instantly. It counts as movement but does not consume her attack.']
    },
    es: {
      d1:['Aliado adyacente: −2 de daño','Un aliado adyacente a Garet recibe daño.','Reduce ese daño en 2. Garet no puede protegerse a sí mismo.'],
      d2:['Permanente: +1 armadura','Siempre activo tras aprenderlo.','Garet obtiene 1 de armadura base contra cada ataque.'],
      d3:['Golpe físico a Garet: refleja 1','Garet recibe más de 0 de daño físico.','El atacante recibe inmediatamente 1 de daño.'],
      a1:['Objetivo ≤40% PV: +30% daño','Garet ataca a un enemigo con 40% de PV o menos.','Aumenta el daño un 30% antes de restar la armadura.'],
      a2:['Los ataques ignoran 2 armadura','Garet inflige daño con cualquier ataque.','La armadura del objetivo cuenta como 2 menos, nunca por debajo de 0.'],
      a3:['15%: ×1,5 de daño','Cada ataque dañino de Garet.','Al activarse, multiplica el daño final por 1,5.'],
      l1:['Aliados adyacentes: +1 armadura','Un aliado está junto a Garet mientras vive.','Ese aliado cuenta con 1 armadura adicional.'],
      l2:['Aliados a 2 casillas: +10% daño','Un aliado ataca a 2 casillas o menos de Garet vivo.','Aumenta el daño final de ese aliado un 10%.'],
      l3:['Permanente: +1 velocidad','Siempre activo tras aprenderlo.','Garet obtiene 1 velocidad y actúa antes.'],
      m1:['Permanente: +1 alcance','Siempre activo tras aprenderlo.','El alcance del ataque normal de Alira aumenta 1 casilla.'],
      m2:['Permanente: +3 ataque','Siempre activo tras aprenderlo.','Alira obtiene 3 ataque base para disparos y habilidades.'],
      m3:['Puede disparar a objetivos en bosque','Alira apunta a un enemigo situado en bosque.','El bosque del objetivo ya no bloquea el disparo; los obstáculos intermedios sí.'],
      s1:['Permanente: +1 movimiento','Siempre activo tras aprenderlo.','Alira puede mover 1 casilla adicional por turno.'],
      s2:['Tras moverse: +20% daño','Alira se mueve y luego ataca en el mismo turno.','Aumenta el daño de ese ataque un 20%.'],
      s3:['Permanente: +2 velocidad','Siempre activo tras aprenderlo.','Alira obtiene 2 velocidad y actúa antes.'],
      t1:['Tras moverse: trampa de 4 daño','Alira abandona una casilla durante su movimiento.','Coloca una trampa; el primer enemigo que la pisa recibe 4 de daño.'],
      t2:['Las trampas ralentizan 2 turnos','Un enemigo sobrevive a una trampa de Alira.','Aplica −2 movimiento y −2 velocidad durante 2 turnos.'],
      t3:['Tras moverse: hasta 2 trampas','Alira se mueve con Trampa de daño aprendida.','Crea una trampa en la casilla abandonada y otra en una casilla adyacente válida.'],
      r1:['Impactos mágicos: +3 daño','Seris inflige daño mágico.','Añade 3 de daño a cada impacto mágico antes de la armadura.'],
      r2:['Bola de fuego y Meteoro: área +1','Seris lanza Bola de fuego o Meteoro.','Bola de fuego pasa de radio 1 a 2; Meteoro de 2×2 a 3×3.'],
      r3:['Impacto mágico quema: 3×2 daño','Un ataque mágico impacta a un objetivo que sobrevive.','Arde 2 turnos y recibe 3 de daño al inicio de cada turno, hasta 6.'],
      c1:['Congelación: 2 turnos en vez de 1','Seris usa Congelación.','El objetivo pierde 2 turnos en vez de 1.'],
      c2:['Congelar asusta a vecinos 1 turno','Seris congela a un objetivo con otros enemigos adyacentes.','Todos los demás enemigos adyacentes ganan Miedo y pierden 1 turno.'],
      c3:['Permanente: +2 maná máximo','Se aplica inmediatamente y permanece activo.','Aumenta el maná máximo en 2 y recupera 2 de maná.'],
      y1:['Permanente: +3 maná máximo','Se aplica inmediatamente y permanece activo.','Aumenta el maná máximo en 3 y recupera 3 de maná.'],
      y2:['Muere un enemigo: Seris cura 5 PV','Cualquier enemigo muere mientras Seris vive.','Seris recupera 5 PV, sin superar su máximo.'],
      y3:['Una vez por batalla: teletransporte 4','Elige una casilla libre a 4 casillas o menos una vez por batalla.','Seris se mueve allí al instante; cuenta como movimiento pero no consume el ataque.']
    }
  };

  function localizedPerkRule(perk) {
    if (currentLanguage() === 'ru' && PERK_RULES_RU[perk?.id]) return PERK_RULES_RU[perk.id];
    const exact = PERK_RULES_EXACT[currentLanguage()]?.[perk?.id];
    if (exact) return { summary: exact[0], trigger: exact[1], effect: exact[2] };
    const fallback = localizeContent(PERK_DESCRIPTIONS[perk?.id] || {
      ru: 'Улучшает боевые характеристики героя.',
      en: 'Improves the hero combat stats.',
      es: 'Mejora las estadísticas de combate del héroe.'
    });
    return {
      summary: localizedPerkName(perk),
      trigger: currentLanguage() === 'es' ? 'Efecto pasivo o contextual.' : 'Passive or contextual effect.',
      effect: fallback
    };
  }

  function perkStatPreview(perk, hero) {
    const direct = {
      d2: ['armor', 1],
      l3: ['speed', 1],
      m1: ['range', 1],
      m2: ['attack', 3],
      s1: ['move', 1],
      s3: ['speed', 2],
      c3: ['maxMana', 2],
      y1: ['maxMana', 3]
    };
    const change = direct[perk?.id];
    if (!change) return null;
    const [stat, delta] = change;
    const labels = {
      ru: { armor:'Броня', speed:'Скорость', range:'Дальность', attack:'Атака', move:'Движение', maxMana:'Макс. мана' },
      en: { armor:'Armor', speed:'Speed', range:'Range', attack:'Attack', move:'Movement', maxMana:'Max mana' },
      es: { armor:'Armadura', speed:'Velocidad', range:'Alcance', attack:'Ataque', move:'Movimiento', maxMana:'Maná máximo' }
    };
    const before = Number(hero?.[stat]) || 0;
    return { label: labels[currentLanguage()]?.[stat] || stat, before, after: before + delta };
  }

  function perkSynergyText(branch) {
    const copy = {
      ru: {
        defense:'Держите Алиру или Сэрис рядом с Гаретом: ветка превращает его позицию в защитный ресурс команды.',
        attack:'Сначала снимайте здоровье дальними героями, затем Гарет надёжнее завершит бой.',
        leader:'Стройте компактное построение вокруг Гарета, чтобы союзники получали бонусы ауры.',
        accuracy:'Гарет удерживает переднюю линию, а Алира безопасно использует дальность и открытые линии огня.',
        speed:'Перемещайтесь перед выстрелом: ветка награждает смену позиции и быстрый выбор цели.',
        traps:'Заморозка Сэрис и позиция Гарета помогают направлять врагов в оставленные ловушки.',
        destruction:'Собирайте врагов вокруг Гарета или сдерживайте их ловушками Алиры для сильных атак по области.',
        control:'Заморозка и страх дают Гарету время занять фронт, а Алире — выйти на безопасную линию выстрела.',
        mystic:'Запас маны и лечение за убийства позволяют Сэрис дольше поддерживать обе другие роли.'
      },
      en: {
        defense:'Keep Alira or Seris near Garet: this branch turns his position into team protection.',
        attack:'Soften targets with ranged heroes, then let Garet finish them reliably.',
        leader:'Use a compact formation around Garet so allies benefit from his auras.',
        accuracy:'Garet holds the front while Alira exploits range and clear firing lines.',
        speed:'Move before shooting: this branch rewards repositioning and fast target selection.',
        traps:'Seris control and Garet’s position help route enemies into Alira’s traps.',
        destruction:'Cluster enemies around Garet or hold them with traps for stronger area spells.',
        control:'Freeze and fear buy Garet time to hold the line and Alira time to find a safe shot.',
        mystic:'More mana and kill healing let Seris support both other roles for longer.'
      },
      es: {
        defense:'Mantén a Alira o Seris cerca de Garet: su posición se convierte en protección para el equipo.',
        attack:'Debilita objetivos a distancia y deja que Garet los remate con seguridad.',
        leader:'Usa una formación compacta alrededor de Garet para aprovechar sus auras.',
        accuracy:'Garet sostiene el frente mientras Alira aprovecha el alcance y las líneas de tiro.',
        speed:'Muévete antes de disparar: la rama premia reposicionarse y elegir objetivos rápido.',
        traps:'El control de Seris y la posición de Garet ayudan a llevar enemigos hacia las trampas.',
        destruction:'Agrupa enemigos alrededor de Garet o frénalos con trampas para potenciar las áreas.',
        control:'Congelación y miedo dan tiempo a Garet para cubrir y a Alira para buscar un tiro seguro.',
        mystic:'Más maná y curación por bajas permiten que Seris apoye al grupo durante más tiempo.'
      }
    };
    return copy[currentLanguage()]?.[branch] || copy.en[branch] || '';
  }

  function getHeroPerkBranchSlots(hero) {
    const tree = PERK_TREES[hero.id];
    if (!tree) return [];
    hero.perkLevels = hero.perkLevels || {};
    return Object.keys(tree).map(br => {
      const perks = tree[br];
      const taken = hero.perkLevels[br] || 0;
      const perk = taken > 0 ? perks[Math.min(taken, perks.length) - 1] : perks[0];
      return { br, perk, active: taken > 0, taken, maxTier: perks.length };
    });
  }

  function renderInvHeroPerksHtml(hero) {
    const slots = getHeroPerkBranchSlots(hero);
    if (!slots.length) return '';
    const btns = slots.map(s => {
      const icon = PERK_ICONS[s.perk.id] || '◆';
      const branch = localizedPerkBranch(s.br);
      const tip = s.active
        ? `${localizedPerkName(s.perk)}\n${branch}\n${translateKey('studied')} · ${s.taken}/${s.maxTier}`
        : `${localizedPerkName(s.perk)}\n${branch}\n${translateKey('unknown')} · ${translateKey('progression')}`;
      const cls = s.active ? 'active' : 'inactive';
      const safeTip = tip.replace(/"/g, '&quot;');
      return `<div class="inv-perk-btn ${cls}" title="${safeTip}">${icon}</div>`;
    }).join('');
    return `<div class="inv-perks-label">${translateText('Perks')}</div><div class="inv-perks-row">${btns}</div>`;
  }

  function enemyDef(type) {
    const D = ENEMY_IDS;
    const map = {
      [D.SKELETON]: { name: 'Skeleton', emoji: '💀', hp: 8, armor: 0, attack: 5, move: 2, range: 1, speed: 8, gold: [5,10] },
      [D.GOBLIN_ARCHER]: { name: 'Goblin Archer', emoji: '🏹', hp: 10, armor: 0, attack: 6, move: 2, range: 3, speed: 9, gold: [8,12] },
      [D.BOAR]: { name: 'Boar', emoji: '🐗', hp: 15, armor: 2, attack: 7, move: 2, range: 1, speed: 8, gold: [10,15] },
      [D.ZOMBIE]: { name: 'Zombie', emoji: '🧟', hp: 12, armor: 1, attack: 6, move: 1, range: 1, speed: 5, gold: [8,12] },
      [D.SHAMAN]: { name: 'Forest Shaman', emoji: '🧙', hp: 25, armor: 1, attack: 5, move: 2, range: 2, speed: 7, gold: [40,60], miniBoss: true },
      [D.LESHY]: { name: 'Ancient Leshy', emoji: '🌳', hp: 90, armor: 3, attack: 8, move: 0, range: 3, speed: 6, gold: [140,160], boss: true, sizeW: 2 },
      [D.BANDIT]: { name: 'Bandit', emoji: '🗡️', hp: 16, armor: 1, attack: 8, move: 2, range: 1, speed: 10, gold: [10,16] },
      [D.WOLF]: { name: 'Wolf', emoji: '🐺', hp: 12, armor: 0, attack: 7, move: 3, range: 1, speed: 12, gold: [8,12] },
      [D.BANDIT_THROWER]: { name: 'Thrower', emoji: '🪓', hp: 12, armor: 0, attack: 7, move: 2, range: 2, speed: 11, gold: [10,14] },
      [D.SPEARMAN]: { name: 'Spearman', emoji: '🔱', hp: 16, armor: 1, attack: 7, move: 2, range: 1, speed: 9, gold: [10,14] },
      [D.BOG_LURKER]: { name: 'Bog Lurker', emoji: '⛓️', hp: 20, armor: 2, attack: 8, move: 1, range: 1, speed: 7, gold: [12,18] },
      [D.THORN_DRYAD]: { name: 'Thorn Dryad', emoji: '🌿', hp: 14, armor: 0, attack: 7, move: 2, range: 2, speed: 10, gold: [12,18] },
      [D.RAT_SWARM]: { name: 'Rat Swarm', emoji: '🐀', hp: 18, armor: 0, attack: 5, move: 3, range: 1, speed: 12, gold: [10,16] },
      [D.CULTIST]: { name: 'Cultist', emoji: '🕯️', hp: 15, armor: 0, attack: 7, move: 2, range: 2, speed: 9, gold: [14,20] },
      [D.HEXER]: { name: 'Hexer', emoji: '☠️', hp: 18, armor: 1, attack: 8, move: 2, range: 3, speed: 10, gold: [18,26] },
      [D.SHIELDBEARER]: { name: 'Shieldbearer', emoji: '🛡️', hp: 26, armor: 5, attack: 8, move: 1, range: 1, speed: 7, gold: [16,24] },
      [D.CROSSBOWMAN]: { name: 'Crossbowman', emoji: '🏹', hp: 16, armor: 1, attack: 9, move: 2, range: 3, speed: 9, gold: [16,24] },
      [D.STONE_GOLEM]: { name: 'Stone Golem', emoji: '🪨', hp: 40, armor: 6, attack: 10, move: 1, range: 1, speed: 6, gold: [22,32], miniBoss: true, sizeW: 2 },
      [D.VOID_STALKER]: { name: 'Void Stalker', emoji: '🌑', hp: 22, armor: 1, attack: 11, move: 4, range: 1, speed: 14, gold: [26,36] },
      [D.BLOOD_KNIGHT]: { name: 'Blood Knight', emoji: '🩸', hp: 38, armor: 4, attack: 12, move: 2, range: 1, speed: 8, gold: [30,42], miniBoss: true, sizeW: 2 },
      [D.BANSHEE]: { name: 'Banshee', emoji: '👻', hp: 24, armor: 0, attack: 9, move: 3, range: 2, speed: 12, gold: [26,38] },
      [D.PLAGUE_DOCTOR]: { name: 'Plague Doctor', emoji: '🧪', hp: 26, armor: 1, attack: 8, move: 2, range: 3, speed: 10, gold: [28,40] },
      [D.ARCANE_SENTINEL]: { name: 'Arcane Sentinel', emoji: '💠', hp: 34, armor: 3, attack: 11, move: 1, range: 3, speed: 9, gold: [30,44], miniBoss: true },
      [D.ORC_GUARD]: { name: 'Orc Guard', emoji: '🛡️', hp: 30, armor: 6, attack: 9, move: 1, range: 1, speed: 6, gold: [15,20] },
      [D.SUICIDE]: { name: 'Bomber', emoji: '💣', hp: 8, armor: 0, attack: 0, move: 3, range: 1, speed: 10, gold: [12,18] },
      [D.SPIDER]: { name: 'Spider', emoji: '🕷️', hp: 18, armor: 1, attack: 7, move: 3, range: 1, speed: 10, gold: [15,22] },
      [D.WATCHER]: { name: 'Watcher', emoji: '👁️', hp: 15, armor: 0, attack: 4, move: 1, range: 0, speed: 4, gold: [20,30] },
      [D.ICE_ELEM]: { name: 'Ice Elemental', emoji: '🧊', hp: 22, armor: 3, attack: 8, move: 2, range: 2, speed: 8, gold: [20,28] },
      [D.DARK_KNIGHT]: { name: 'Dark Knight', emoji: '⚔️', hp: 45, armor: 5, attack: 12, move: 2, range: 1, speed: 7, gold: [80,100], miniBoss: true },
      [D.NECRO]: { name: 'Necromancer', emoji: '🔮', hp: 28, armor: 1, attack: 8, move: 2, range: 3, speed: 8, gold: [30,40] },
      [D.CHAOS]: { name: 'Chaos Demon', emoji: '🌀', hp: 25, armor: 2, attack: 11, move: 0, range: 2, speed: 12, gold: [28,38] },
      [D.ASSASSIN]: { name: 'Assassin', emoji: '🗡️', hp: 20, armor: 0, attack: 14, move: 4, range: 1, speed: 14, gold: [30,40] },
      [D.HYDRA]: { name: 'Hydra', emoji: '🐍', hp: 35, armor: 2, attack: 9, move: 1, range: 2, speed: 6, gold: [50,70], heads: 3, headHp: 10, boss: true, sizeW: 2 },
      [D.GHOST]: { name: 'Ghost', emoji: '👻', hp: 18, armor: 0, attack: 10, move: 3, range: 1, speed: 11, gold: [35,45] },
      [D.FIRE_TITAN]: { name: 'Fire Titan', emoji: '🔥', hp: 80, armor: 4, attack: 15, move: 2, range: 1, speed: 8, gold: [150,150], boss: true, sizeW: 2 },
      [D.DARK_LORD]: { name: 'Dark Lord', emoji: '👑', hp: 120, armor: 6, attack: 16, move: 2, range: 1, speed: 10, gold: [300,300], boss: true, sizeW: 4 }
    };
    return map[type] || map[D.SKELETON];
  }

  const ENEMY_ICON_BASE = 'assets/enemies/';
  const ENEMY_ICON_FILE = {
    ice_elem: 'ice_elemental.png',
    suicide: 'bomber.png',
    necro: 'necromancer.png',
    chaos: 'chaos_beast.png',
    leshy: 'leshy.png'
  };
  function enemyIconUrl(enemyId) {
    const file = ENEMY_ICON_FILE[enemyId] || (enemyId + '.png');
    return ENEMY_ICON_BASE + file;
  }
  /** Enemy portrait for the bestiary; falls back to enemyDef emoji on load failure. */
  function bestiaryEnemyPortraitHtml(enemyId, sizePx) {
    const d = enemyDef(enemyId);
    const em = d && d.emoji ? d.emoji : '👾';
    const src = enemyIconUrl(enemyId);
    const px = sizePx + 'px';
    return '<span class="bestiary-portrait"><img class="bestiary-portrait-img" src="' + src + '" alt="" width="' + sizePx + '" height="' + sizePx + '" style="width:' + px + ';height:' + px + ';object-fit:contain;display:block" loading="lazy" decoding="async" onerror="this.style.display=\'none\';var n=this.nextElementSibling;if(n)n.style.display=\'block\'"/><span class="bestiary-portrait-fallback" style="display:none;font-size:' + px + ';line-height:1">' + em + '</span></span>';
  }

  // ══════════ HERO SKILLS (unlock by level) ══════════
  const HERO_SKILLS = {
    garet: [
      { key: 'shieldBash', name: 'Shield Bash',   icon: '🛡', unlockLevel: 1, cd: 3,  cost: null, signature: true, desc: { ru: 'Атакует врага и оглушает его на 1 ход. КД 3.', en: 'Attacks the target enemy and stuns it for 1 turn. CD 3.', es: 'Ataca al enemigo objetivo y lo aturde durante 1 turno. REC 3.' } },
      { key: 'fireCall',   name: 'Call Fire',     icon: '🔥', unlockLevel: 3, cd: 4,  cost: null, desc: { ru: 'Поджигает всех врагов рядом с Гаретом (по области). КД 4.', en: 'Ignites all enemies around Garet (AoE). CD 4.', es: 'Prende fuego a todos los enemigos cerca de Garet (área). REC 4.' } },
      { key: 'berserk',    name: 'Berserk',       icon: '💪', unlockLevel: 5, cd: 6,  cost: null, desc: { ru: 'Ульта: ×1.5 атаки, −50% брони на 3 хода. КД 6.', en: 'Ultimate: x1.5 attack, -50% armor for 3 turns. CD 6.', es: 'Definitiva: ×1.5 ataque, −50% armadura durante 3 turnos. REC 6.' } }
    ],
    alira: [
      { key: 'doubleShot', name: 'Double Shot',   icon: '🏹', unlockLevel: 1, cd: 2, cost: null, signature: true, desc: { ru: 'Два выстрела подряд по одной цели. КД 2.', en: 'Two shots in a row at one target. CD 2.', es: 'Dos disparos seguidos al mismo objetivo. REC 2.' } },
      { key: 'slowArrow',  name: 'Slowing Arrow', icon: '🐢', unlockLevel: 3, cd: 3, cost: null, desc: { ru: 'Замедляет цель: −2 к перемещению на 2 раунда. КД 3.', en: 'Slows the target: -2 movement for 2 rounds. CD 3.', es: 'Ralentiza al objetivo: −2 de movimiento durante 2 rondas. REC 3.' } },
      { key: 'arrowRain',  name: 'Arrow Rain',    icon: '🌧', unlockLevel: 5, cd: 5, cost: null, desc: { ru: 'Ульта: атака по области по всем ближайшим врагам. КД 5.', en: 'Ultimate: AoE attack against all nearby enemies. CD 5.', es: 'Definitiva: ataque de área contra todos los enemigos cercanos. REC 5.' } }
    ],
    seris: [
      { key: 'fireball', name: 'Fireball', icon: '🔥', unlockLevel: 1, cd: 0, cost: 3, signature: true, desc: { ru: 'Взрыв по цели и соседним клеткам. Стоимость: 3 MP.', en: 'Explosion on the target and adjacent tiles. Cost: 3 MP.', es: 'Explosión en el objetivo y las casillas adyacentes. Coste: 3 MP.' } },
      { key: 'freeze',   name: 'Freeze',   icon: '🧊', unlockLevel: 3, cd: 0, cost: 4, desc: { ru: 'Замораживает цель на 1 ход. Стоимость: 4 MP.', en: 'Freezes the target for 1 turn. Cost: 4 MP.', es: 'Congela al objetivo durante 1 turno. Coste: 4 MP.' } },
      { key: 'meteor',   name: 'Meteor',   icon: '☄',  unlockLevel: 5, cd: 0, cost: 8, desc: { ru: 'Ульта: мощная атака по большой области. Стоимость: 8 MP.', en: 'Ultimate: powerful AoE over a large area. Cost: 8 MP.', es: 'Definitiva: poderoso ataque de área amplia. Coste: 8 MP.' } }
    ]
  };

  // ══════════ ENEMY BESTIARY DATA ══════════
  const ENEMY_BESTIARY_DATA = {
    [ENEMY_IDS.SKELETON]:     { region: 1, tactic: 'Moves straight toward the nearest hero. Attacks in melee without tricks.', weakness: 'Crushing weapons, Fireball, Freeze.' },
    [ENEMY_IDS.GOBLIN_ARCHER]:{ region: 1, tactic: 'Shoots from range 3 and tries to keep distance, but will not retreat forever. It circles obstacles and keeps pressure.', weakness: 'Close the gap: Garet with Berserk works well.' },
    [ENEMY_IDS.BOAR]:         { region: 1, tactic: 'Rushes the target while ignoring terrain. High HP and armor 2.', weakness: 'Slowing Arrow reduces speed. Freeze also helps.' },
    [ENEMY_IDS.ZOMBIE]:       { region: 1, tactic: 'Slow, but explodes on death for 5 damage to nearby units.', weakness: 'Keep distance. Archer and Mage are ideal.' },
    [ENEMY_IDS.SHAMAN]:       { region: 1, tactic: 'Mini-boss. Heals allies every turn. Kill first.', weakness: 'Immediate focus fire. Meteor or Arrow Rain.' },
    [ENEMY_IDS.LESHY]:        { region: 1, tactic: 'Rooted boss. On its first turn it summons two forest creatures, then one every other turn (maximum 4). At 50% HP it summons up to two more and gives all its summons +2 attack.', weakness: 'Remove dangerous summons, but do not prolong the fight: the Leshy cannot move and attacks with roots from range 3.' },
    [ENEMY_IDS.BANDIT]:       { region: 1, tactic: 'Fast melee fighter. Tries to close in and trade damage.', weakness: 'Control with Freeze or stun, then focus fire.' },
    [ENEMY_IDS.WOLF]:         { region: 1, tactic: 'Very mobile. Flanks and punishes poor positioning quickly.', weakness: 'Slow it and keep a tight line.' },
    [ENEMY_IDS.BANDIT_THROWER]:{ region: 1, tactic: 'Range 2. Tries to finish wounded heroes while the front line holds distance.', weakness: 'Close in, focus it, and use Garet shield pressure.' },
    [ENEMY_IDS.SPEARMAN]:     { region: 1, tactic: 'Holds the line and punishes close approaches. Simple but reliable frontliner.', weakness: 'Freeze or stun, then ranged focus.' },
    [ENEMY_IDS.BOG_LURKER]:   { region: 1, tactic: 'Durable marsh lurker. Hits hard and can slow nearby targets.', weakness: 'Keep distance and burn it down with fire.' },
    [ENEMY_IDS.THORN_DRYAD]:  { region: 1, tactic: 'Range 2. Can slow with thorns.', weakness: 'Focus fire and a quick melee push.' },
    [ENEMY_IDS.RAT_SWARM]:    { region: 1, tactic: 'Overwhelms with numbers and poison. Fast, but vulnerable to AoE.', weakness: 'Fireball or Arrow Rain.' },
    [ENEMY_IDS.CULTIST]:      { region: 2, tactic: 'Ranged mage. Applies curses and increases pressure.', weakness: 'Kill first, do not group up.' },
    [ENEMY_IDS.HEXER]:        { region: 2, tactic: 'Control caster. Hexes and blindness break accuracy and tempo.', weakness: 'Focus it, resist control, and use Garet shield pressure.' },
    [ENEMY_IDS.SHIELDBEARER]: { region: 2, tactic: 'Tank. Holds chokepoints and reduces incoming damage with a shield.', weakness: 'Magic damage and armor pierce.' },
    [ENEMY_IDS.CROSSBOWMAN]:  { region: 2, tactic: 'Strong ranged damage. Punishes exposed positions.', weakness: 'Use cover, flank it, or freeze it.' },
    [ENEMY_IDS.STONE_GOLEM]:  { region: 2, tactic: 'Mini-boss. Very high HP and armor. Advances slowly but steadily.', weakness: 'Magic, control, and flanking.' },
    [ENEMY_IDS.VOID_STALKER]: { region: 3, tactic: 'Elite assassin. Reaches weak targets very quickly.', weakness: 'Do not spread too far. Use control.' },
    [ENEMY_IDS.BLOOD_KNIGHT]: { region: 3, tactic: 'Mini-boss. Heavy frontline fighter with self-healing on hit.', weakness: 'Kite, freeze, and focus.' },
    [ENEMY_IDS.BANSHEE]:      { region: 3, tactic: 'Spirit mage. Its scream can stun or blind and break formation.', weakness: 'Do not group up. Finish it quickly.' },
    [ENEMY_IDS.PLAGUE_DOCTOR]:{ region: 3, tactic: 'Support unit: heals allies and poisons heroes.', weakness: 'Focus the doctor first.' },
    [ENEMY_IDS.ARCANE_SENTINEL]:{ region: 3, tactic: 'Mini-boss. Arcane guard with strong range and control.', weakness: 'Rush, control, and focus.' },
    [ENEMY_IDS.ORC_GUARD]:    { region: 2, tactic: 'Heavy armor 6, moves slowly. Holds the line.', weakness: 'Magic damage ignores armor. Fireball.' },
    [ENEMY_IDS.SUICIDE]:      { region: 2, tactic: 'Runs toward a hero and explodes: AoE 5 damage to all nearby units.', weakness: 'Destroy from range before detonation. Arrow Rain.' },
    [ENEMY_IDS.SPIDER]:       { region: 2, tactic: 'Applies webbing: the hero skips a turn. High speed.', weakness: 'Freeze blocks the web. Garet Berserk.' },
    [ENEMY_IDS.WATCHER]:      { region: 2, tactic: 'While alive, grants all allies +2 movement. Kill first.', weakness: 'Low HP: any focused hero can finish it.' },
    [ENEMY_IDS.ICE_ELEM]:     { region: 2, tactic: 'Freezes a hero for 1 turn on hit. Armor 3.', weakness: 'Fireball removes freeze and grants bonus damage.' },
    [ENEMY_IDS.DARK_KNIGHT]:  { region: 2, tactic: 'Mini-boss. High stats, melee only.', weakness: 'Freeze + Slowing Arrow + Garet Berserk.' },
    [ENEMY_IDS.NECRO]:        { region: 3, tactic: 'Raises dead enemies as zombies. Kill it first.', weakness: 'Seris Meteor: destroy immediately.' },
    [ENEMY_IDS.CHAOS]:        { region: 3, tactic: 'AoE attacks, high speed. Hits everyone nearby each turn.', weakness: 'Do not group up. Spread out and attack from range.' },
    [ENEMY_IDS.ASSASSIN]:     { region: 3, tactic: 'High speed and damage, low HP. Attacks the weakest target.', weakness: 'Arrow Rain over the area. Kill before its next turn.' },
    [ENEMY_IDS.HYDRA]:        { region: 3, tactic: 'Three heads: three attacks per turn. Regenerates heads.', weakness: 'AoE abilities. Berserk near the hydra body.' },
    [ENEMY_IDS.GHOST]:        { region: 3, tactic: 'Passes through obstacles, high speed. Weak armor.', weakness: 'Seris magic attacks deal double damage.' },
    [ENEMY_IDS.FIRE_TITAN]:   { region: 3, tactic: 'BOSS. Fiery area explosion every 2 turns. Huge HP.', weakness: 'Freeze stops it. Keep heroes spread out.' },
    [ENEMY_IDS.DARK_LORD]:    { region: 3, tactic: 'FINAL BOSS. Teleport, AoE, minion summons. Two phases.', weakness: 'Kill the minions. Berserk + Meteor in the finale.' }
  };

  /** Single-use consumables; item icons live in ITEM_ICON_MAP. */
  const SHOP_ITEMS = [
    { id: 'potion_small', name: 'Small HP Potion +5', price: 10, emoji: '🧪', use: (h) => { h.hp = Math.min(h.maxHp, h.hp + 5); } },
    { id: 'potion_mid', name: 'HP Potion +10', price: 18, emoji: '🧪', use: (h) => { h.hp = Math.min(h.maxHp, h.hp + 10); } },
    { id: 'potion', name: 'HP Potion +15', price: 30, emoji: '🧪', use: (h) => { h.hp = Math.min(h.maxHp, h.hp + 15); } },
    { id: 'elixir', name: 'Mana Elixir +5', price: 40, emoji: '🔵', use: (h) => { if (h.maxMana) h.mana = Math.min(h.maxMana, h.mana + 5); } },
    { id: 'mag_stone', name: 'Magic Stone (+1 mage attack)', price: 80, emoji: '💎', use: (h) => { if (h.role === 'mage') h.attack += 1; } }
  ];
  const ITEM_POOL = [
    // Weapons: Garet (warrior)
    { id: 'steel_sword',    slot: 'weapon', heroClass: 'warrior', rarity: 'common', minRegion: 1, emoji: '⚔️', name: 'Steel Sword',           price: 35,  sellPrice: 17,  mods: { attack: 3 },                         desc: 'A reliable sword of good steel.' },
    { id: 'poison_blade',   slot: 'weapon', heroClass: 'warrior', rarity: 'rare',   minRegion: 1, emoji: '🗡️', name: 'Poison Blade',               price: 90,  sellPrice: 45,  mods: { attack: 2, poisonOnHit: true },      desc: 'Poisons the target for 2 turns.' },
    { id: 'thunder_hammer', slot: 'weapon', heroClass: 'warrior', rarity: 'epic',   minRegion: 1, emoji: '🔨', name: 'Thunder Hammer',           price: 160, sellPrice: 80,  mods: { attack: 4, stunOnHit: true },        desc: 'Stuns the enemy for 1 turn on hit.' },
    { id: 'blade_dark',     slot: 'weapon', heroClass: 'warrior', rarity: 'epic',   minRegion: 2, emoji: '⚔️', name: 'Dark Blade',             price: 200, sellPrice: 100, mods: { attack: 5, armor: -1 },              desc: 'Great power at the cost of −1 owner armor.' },
    // Weapons: Alira (archer)
    { id: 'hunter_bow',     slot: 'weapon', heroClass: 'archer',  rarity: 'common', minRegion: 1, emoji: '🏹', name: 'Hunter Bow',           price: 40,  sellPrice: 20,  mods: { attack: 3, range: 1 },               desc: 'A light bow for long-range hunting.' },
    { id: 'shadow_bow',     slot: 'weapon', heroClass: 'archer',  rarity: 'rare',   minRegion: 1, emoji: '🏹', name: 'Shadow Bow',               price: 100, sellPrice: 50,  mods: { attack: 4, ignoreCover: true },      desc: 'Arrows pass through forest and cover.' },
    { id: 'moon_bow',       slot: 'weapon', heroClass: 'archer',  rarity: 'epic',   minRegion: 2, emoji: '🌙', name: 'Moon Bow',              price: 180, sellPrice: 90,  mods: { attack: 5, firstShotBonus: 0.5 },   desc: 'The first shot each round deals ×1.5 damage.' },
    { id: 'crossbow_war',   slot: 'weapon', heroClass: 'archer',  rarity: 'epic',   minRegion: 2, emoji: '🏹', name: 'War Crossbow',          price: 220, sellPrice: 110, mods: { attack: 6, range: 2 },               desc: 'A long-range weapon with high damage.' },
    // Weapons: Seris (mage)
    { id: 'magic_wand',     slot: 'weapon', heroClass: 'mage',    rarity: 'common', minRegion: 1, emoji: '🔮', name: 'Magic Wand',         price: 40,  sellPrice: 20,  mods: { attack: 4 },                         desc: 'Strengthens magical attacks.' },
    { id: 'fire_staff',     slot: 'weapon', heroClass: 'mage',    rarity: 'rare',   minRegion: 1, emoji: '🔥', name: 'Fire Staff',          price: 110, sellPrice: 55,  mods: { attack: 5, aoePlus: true },          desc: 'All spells gain +1 AoE radius.' },
    { id: 'chaos_staff',    slot: 'weapon', heroClass: 'mage',    rarity: 'epic',   minRegion: 2, emoji: '🌀', name: 'Chaos Staff',             price: 200, sellPrice: 100, mods: { attack: 6, chaosAoe: true },         desc: 'After a spell, random AoE (5 damage) near the closest targets.' },
    { id: 'staff_ice',      slot: 'weapon', heroClass: 'mage',    rarity: 'epic',   minRegion: 2, emoji: '❄️', name: 'Ice Demon Staff',   price: 220, sellPrice: 110, mods: { attack: 6, freeze2: true },          desc: 'Freeze lasts 2 turns instead of 1.' },
    // Armor: all heroes or class-specific
    { id: 'leather',        slot: 'armor',  heroClass: 'all',     rarity: 'common', minRegion: 1, emoji: '🛡️', name: 'Leather Armor',           price: 30,  sellPrice: 15,  mods: { armor: 2 },                          desc: 'Light protection. Fits everyone.' },
    { id: 'shadow_cloak',   slot: 'armor',  heroClass: 'all',     rarity: 'rare',   minRegion: 1, emoji: '🧥', name: 'Shadow Cloak',              price: 85,  sellPrice: 42,  mods: { armor: 1, dodge: 0.20 },             desc: '20% chance to dodge an attack.' },
    { id: 'runic_shield',   slot: 'armor',  heroClass: 'warrior', rarity: 'rare',   minRegion: 1, emoji: '🛡️', name: 'Runic Shield',          price: 95,  sellPrice: 47,  mods: { armor: 3, reflectStatus: 0.25 },     desc: '25% chance to reflect a negative status to the attacker.' },
    { id: 'mirror_robe',    slot: 'armor',  heroClass: 'mage',    rarity: 'rare',   minRegion: 1, emoji: '🌀', name: 'Mirror Robe',        price: 100, sellPrice: 50,  mods: { armor: 2, reflectDmg: 0.10 },        desc: 'Reflects 10% incoming physical damage to the attacker.' },
    { id: 'guardian_plate', slot: 'armor',  heroClass: 'warrior', rarity: 'epic',   minRegion: 2, emoji: '💎', name: 'Guardian Plate',        price: 170, sellPrice: 85,  mods: { armor: 4, reflectFlat: 1 },          desc: 'Each attack on the owner deals 1 damage to the attacker.' },
    { id: 'phoenix',        slot: 'armor',  heroClass: 'mage',    rarity: 'epic',   minRegion: 2, emoji: '🔥', name: 'Phoenix Robe',         price: 200, sellPrice: 100, mods: { armor: 3, revive5: true },            desc: 'Once per battle: die → revive with 5 HP.' },
    { id: 'dark_mantle',    slot: 'armor',  heroClass: 'all',     rarity: 'epic',   minRegion: 2, emoji: '🌑', name: 'Dark Mantle',           price: 190, sellPrice: 95,  mods: { armor: 2, attack: 3, maxHp: -5 },    desc: '+3 attack at the cost of −5 max HP.' },
    // Artifacts: all heroes
    { id: 'luck_amulet',    slot: 'artifact', heroClass: 'all',   rarity: 'common', minRegion: 1, emoji: '🧿', name: 'Lucky Amulet',            price: 25,  sellPrice: 12,  mods: { goldBonus: 0.15 },                   desc: '+15% gold from each battle.' },
    { id: 'mana_crystal',   slot: 'artifact', heroClass: 'mage',  rarity: 'rare',   minRegion: 1, emoji: '💠', name: 'Mana Crystal',           price: 80,  sellPrice: 40,  mods: { manaRegen: 3 },                      desc: 'The mage restores +3 mana at the start of each turn.' },
    { id: 'seer_eye',       slot: 'artifact', heroClass: 'all',   rarity: 'rare',   minRegion: 1, emoji: '👁️', name: 'Scout Eye',           price: 85,  sellPrice: 42,  mods: { previewEnemies: true },              desc: 'Reveals the exact enemy lineup on the map.' },
    { id: 'hourglass',      slot: 'artifact', heroClass: 'all',   rarity: 'rare',   minRegion: 2, emoji: '⏳', name: 'Hourglass',           price: 95,  sellPrice: 47,  mods: { extraAction: true },                 desc: 'Once per battle: gain one extra turn after your action.' },
    { id: 'death_ring',     slot: 'artifact', heroClass: 'all',   rarity: 'epic',   minRegion: 2, emoji: '💀', name: 'Death Ring',           price: 175, sellPrice: 87,  mods: { deathExplode: 15 },                  desc: 'When a hero dies: 3×3 explosion, 15 damage to enemies.' },
    { id: 'portal_stone',   slot: 'artifact', heroClass: 'all',   rarity: 'epic',   minRegion: 2, emoji: '🌀', name: 'Portal Stone',       price: 185, sellPrice: 92,  mods: { battleTeleport: true },              desc: 'Once per battle: teleport the owner to any free tile.' },
    { id: 'crown',          slot: 'artifact', heroClass: 'all',   rarity: 'epic',   minRegion: 3, emoji: '👑', name: 'Crown of Power',           price: 195, sellPrice: 97,  mods: { allyAttack: 2, allyArmor: 1 },       desc: 'All allies gain +2 attack and +1 armor (aura).' }
  ];

  /** PNG item icons: normalized to 64x64. Values are paths relative to assets/items/. */
  const ITEM_ICON_BASE = 'assets/items/';
  const ITEM_ICON_MAP = {
    steel_sword: 'weapons/iron_sword.png',
    poison_blade: 'weapons/poison_sword.png',
    thunder_hammer: 'weapons/storm_sword.png',
    blade_dark: 'weapons/shadow_sword.png',
    hunter_bow: 'weapons/hunter_bow.png',
    shadow_bow: 'weapons/shadow_bow.png',
    moon_bow: 'weapons/moon_bow.png',
    crossbow_war: 'weapons/war_crossbow.png',
    magic_wand: 'weapons/arcane_staff.png',
    fire_staff: 'weapons/fire_staff.png',
    chaos_staff: 'weapons/shadow_staff.png',
    staff_ice: 'weapons/frost_staff.png',
    leather: 'armor/leather_armor.png',
    shadow_cloak: 'armor/shadow_cloak.png',
    runic_shield: 'armor/runic_shield.png',
    mirror_robe: 'armor/mage_cloak_blue.png',
    guardian_plate: 'armor/plate_armor.png',
    phoenix: 'armor/magister_robe.png',
    dark_mantle: 'armor/assassin_cloak.png',
    luck_amulet: 'accessories/amulet_clover.png',
    mana_crystal: 'materials/mana_crystal.png',
    seer_eye: 'accessories/amulet_evil_eye.png',
    hourglass: 'misc/hourglass.png',
    death_ring: 'accessories/ring_of_skulls.png',
    portal_stone: 'misc/rune_stone.png',
    crown: 'accessories/royal_crown.png',
    /* SHOP_ITEMS consumables are code-ready; potion-shop icons are prepared. */
    potion_small: 'consumables/health_potion.png',
    potion_mid: 'consumables/health_potion.png',
    potion: 'consumables/health_potion.png',
    elixir: 'consumables/mana_potion.png',
    mag_stone: 'materials/arcane_crystal.png'
  };

  const LOOT_CHANCE = {
    skeleton: 0.25, goblin_archer: 0.30, boar: 0.35, zombie: 0.25,
    shaman: 0.80, orc_guard: 0.40, suicide: 0.30, spider: 0.40,
    watcher: 0.50, ice_elem: 0.45, dark_knight: 0.85, necro: 0.45,
    chaos: 0.50, assassin: 0.50, hydra: 0.55, ghost: 0.45,
    fire_titan: 1.00, dark_lord: 1.00
  };

  function ownedItemIds() {
    const ids = new Set(GameState.inventory || []);
    (GameState.heroes || []).forEach(h => {
      Object.values(h.equipment || {}).forEach(id => { if (id) ids.add(id); });
    });
    return ids;
  }

  function selectLootItem(region, forceRarity = null, preferNew = false) {
    let rarity;
    if (forceRarity) {
      rarity = forceRarity;
    } else {
      const r = Math.random();
      const epicChance = [0.05, 0.15, 0.30][region - 1] || 0.05;
      const rareChance = [0.25, 0.35, 0.45][region - 1] || 0.25;
      if (r < epicChance) rarity = 'epic';
      else if (r < epicChance + rareChance) rarity = 'rare';
      else rarity = 'common';
    }
    const pool = ITEM_POOL.filter(i => i.rarity === rarity && i.minRegion <= region);
    if (!pool.length) return deepClone(ITEM_POOL[0]);
    const freshPool = preferNew ? pool.filter(i => !ownedItemIds().has(i.id)) : [];
    const finalPool = freshPool.length ? freshPool : pool;
    return deepClone(finalPool[Math.floor(Math.random() * finalPool.length)]);
  }
