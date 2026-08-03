/* Three Blades — campaign variety: scenarios, choices and replay hooks.
 * Depends on game-core, game-data and game-state. Loaded before battle-system.
 */
const CampaignExpansion = (() => {
  const CONTRACTS = {
    hunters: {
      icon: '🔭',
      name: { ru: 'Охотники', en: 'Pathfinders', es: 'Rastreadores' },
      summary: { ru: 'Больше разведданных о врагах, но −5 золота в начале.', en: 'More enemy intel, but start with 5 less gold.', es: 'Más información, pero 5 de oro menos.' }
    },
    mercenaries: {
      icon: '🪙',
      name: { ru: 'Наёмники', en: 'Mercenaries', es: 'Mercenarios' },
      summary: { ru: '+10 золота и лечебное зелье, но первая добыча скромнее.', en: '+10 gold and a potion; the first drop is weaker.', es: '+10 oro y poción; el primer botín es menor.' }
    },
    guardians: {
      icon: '🛡️',
      name: { ru: 'Хранители', en: 'Wardens', es: 'Guardianes' },
      summary: { ru: 'Защита перед первым боссом, но меньше наград за короткий путь.', en: 'Protection before the first boss, but fewer shortcut rewards.', es: 'Protección antes del jefe, menos recompensas rápidas.' }
    }
  };

  const MUTATORS = {
    feral_packs: {
      icon: '🐺',
      name: { ru: 'Дикие стаи', en: 'Feral packs', es: 'Manadas ferales' },
      summary: { ru: 'Обычные бои получают одного дополнительного врага.', en: 'Normal battles gain one extra enemy.', es: 'Los combates normales ganan un enemigo.' }
    },
    relic_hunt: {
      icon: '💎',
      name: { ru: 'Охота за реликвиями', en: 'Relic hunt', es: 'Caza de reliquias' },
      summary: { ru: 'Шанс предмета после боя выше.', en: 'Higher item-drop chance after battles.', es: 'Más probabilidad de objetos tras el combate.' }
    },
    scarce_supplies: {
      icon: '🥀',
      name: { ru: 'Дефицит припасов', en: 'Scarce supplies', es: 'Suministros escasos' },
      summary: { ru: 'Лечение в событиях слабее, зато больше золота за задачи.', en: 'Event healing is weaker; scenario rewards give more gold.', es: 'Menos curación en eventos, más oro por objetivos.' }
    },
    cursed_paths: {
      icon: '☠️',
      name: { ru: 'Проклятые тропы', en: 'Cursed paths', es: 'Rutas malditas' },
      summary: { ru: 'Таймеры ритуалов строже, редкие награды ценнее.', en: 'Ritual timers are stricter; rare rewards improve.', es: 'Rituales más estrictos; mejores recompensas raras.' }
    },
    city_favor: {
      icon: '🏘️',
      name: { ru: 'Благосклонность городов', en: 'City favour', es: 'Favor de la ciudad' },
      summary: { ru: 'Первый визит в город каждого региона даёт 12 золота.', en: 'First city in each region grants 12 gold.', es: 'La primera ciudad de cada región da 12 oro.' }
    }
  };

  const REGION = {
    1: {
      name: { ru: 'Лес Лешего', en: 'Leshy Forest', es: 'Bosque del Leshy' },
      asset: 'assets/tiles/region-forest-glade.png', css: 'forest',
      feature: { ru: 'Корни: отдельные клетки могут временно блокироваться.', en: 'Roots can temporarily block isolated cells.', es: 'Las raíces pueden bloquear casillas.' },
      scenarios: ['eliminate', 'holdout', 'escape']
    },
    2: {
      name: { ru: 'Огненные глубины', en: 'Volcanic Depths', es: 'Profundidades ígneas' },
      asset: 'assets/tiles/region-volcanic-depths.png', css: 'volcanic',
      feature: { ru: 'Жар: огненные клетки и обвалы заставляют менять позицию.', en: 'Heat: fire tiles and collapses force repositioning.', es: 'Calor: fuego y derrumbes obligan a reposicionarse.' },
      scenarios: ['eliminate', 'ritual', 'defense', 'hunt']
    },
    3: {
      name: { ru: 'Затонувшие руины', en: 'Sunken Ruins', es: 'Ruinas hundidas' },
      asset: 'assets/tiles/region-sunken-ruins.png', css: 'ruins',
      feature: { ru: 'Прилив: вода и проклятые клетки ограничивают проходы.', en: 'Tide: water and cursed tiles constrain routes.', es: 'Marea: agua y maldiciones limitan las rutas.' },
      scenarios: ['eliminate', 'waves', 'escape', 'hunt', 'ritual']
    }
  };

  const SCENARIOS = {
    eliminate: { icon: '⚔️', label: { ru: 'Разгром', en: 'Elimination', es: 'Eliminación' }, short: { ru: 'Победите всех врагов.', en: 'Defeat all enemies.', es: 'Derrota a todos.' } },
    holdout: { icon: '⏳', label: { ru: 'Выдержка', en: 'Holdout', es: 'Resistencia' }, short: { ru: 'Продержитесь 4 раунда.', en: 'Hold for 4 rounds.', es: 'Resiste 4 rondas.' } },
    escape: { icon: '🚩', label: { ru: 'Прорыв', en: 'Breakthrough', es: 'Avance' }, short: { ru: 'Выведите любого героя к правому краю.', en: 'Get any hero to the right edge.', es: 'Lleva a un héroe al borde derecho.' } },
    defense: { icon: '🛡️', label: { ru: 'Оборона', en: 'Defense', es: 'Defensa' }, short: { ru: 'Сохраните древний оберег до 4-го раунда.', en: 'Protect the ancient ward through round 4.', es: 'Protege el amuleto hasta la ronda 4.' } },
    ritual: { icon: '🔮', label: { ru: 'Срыв ритуала', en: 'Ritual break', es: 'Ritual roto' }, short: { ru: 'Уничтожьте отмеченного ритуалиста до 6-го раунда.', en: 'Defeat the marked ritualist before round 6.', es: 'Derrota al ritualista antes de la ronda 6.' } },
    hunt: { icon: '🎯', label: { ru: 'Охота', en: 'Hunt', es: 'Cacería' }, short: { ru: 'Уничтожьте цель и уйдите через правый край.', en: 'Defeat the target and exit at the right edge.', es: 'Derrota al objetivo y sal por el borde derecho.' } },
    waves: { icon: '🌊', label: { ru: 'Волны', en: 'Waves', es: 'Oleadas' }, short: { ru: 'Выживите до конца 5-го раунда.', en: 'Survive through round 5.', es: 'Sobrevive hasta la ronda 5.' } }
  };

  const EVENTS = {
    1: [
      ['forest_hunters', '👥', 'positive', { ru: 'Потерявшиеся охотники просят провести их через чащу.', en: 'Lost hunters ask for a path through the thicket.', es: 'Cazadores perdidos piden una ruta.' }, [
        ['Защитить', '−8 здоровья у отряда, +редкий предмет позже', { hp: -8, flag: 'huntersSaved', delayed: 'hunter_cache' }],
        ['Разведать путь', 'Открыть соседние клетки и узнать врагов', { reveal: 2, intel: true }],
        ['Пройти мимо', 'Без эффекта', {}]
      ]],
      ['forest_roots', '🌿', 'neutral', { ru: 'Корни Лешего перерезали дорогу.', en: 'Leshy roots cut across the road.', es: 'Raíces del Leshy bloquean el camino.' }, [
        ['Сжечь корни', '−12 золота, следующий бой без засады', { gold: -12, clearAmbush: true }],
        ['Обойти', 'Следующая миссия: прорыв', { nextScenario: 'escape' }],
        ['Слушать лес', '+1 броня одному герою до босса', { ward: true }]
      ]],
      ['forest_shrine', '🌟', 'positive', { ru: 'Друидский круг ещё хранит слабый свет.', en: 'A druid circle still holds a faint light.', es: 'Un círculo druídico aún guarda luz.' }, [
        ['Принять благословение', '+2 брони до следующего босса, помощь друидов позже', { ward: true, delayed: 'druid_cache' }],
        ['Оставить золото', '−15 золота, редкая реликвия', { gold: -15, item: 'rare' }],
        ['Не тревожить', 'Без эффекта', {}]
      ]],
      ['forest_spores', '🍄', 'negative', { ru: 'Споры в роще искажают воздух.', en: 'Spores in the grove distort the air.', es: 'Las esporas distorsionan el aire.' }, [
        ['Взять образец', 'Редкий предмет, но следующий бой: засада', { item: 'rare', ambush: true }],
        ['Сжечь грибницу', '−10 золота, +12 здоровья', { gold: -10, heal: 12 }],
        ['Отступить', 'Следующая миссия: выдержка', { nextScenario: 'holdout' }]
      ]]
    ],
    2: [
      ['miners', '⛏️', 'neutral', { ru: 'Шахтёры просят освободить завал.', en: 'Miners ask you to clear a cave-in.', es: 'Mineros piden limpiar un derrumbe.' }, [
        ['Работать вместе', '−10 здоровья, +40 золота, благодарность шахтёров позже', { hp: -10, gold: 40, delayed: 'miners_gratitude' }],
        ['Подорвать проход', 'Следующая миссия: волны, редкий предмет', { nextScenario: 'waves', item: 'rare' }],
        ['Отказаться', 'Без эффекта', {}]
      ]],
      ['forge', '🔨', 'positive', { ru: 'Кузня ещё дышит жаром.', en: 'The forge still breathes heat.', es: 'La forja aún respira calor.' }, [
        ['Закалить клинок', '+1 атака одному герою, заказ кузни позже', { attack: 1, delayed: 'forge_delivery' }],
        ['Купить зелья', '−18 золота, 2 лечебных зелья', { gold: -18, potion: 2 }],
        ['Остыть у горна', '+16 здоровья, следующий бой: ритуал', { heal: 16, nextScenario: 'ritual' }]
      ]],
      ['crystal', '💠', 'curse', { ru: 'Нестабильный кристалл пульсирует под ногами.', en: 'An unstable crystal pulses underfoot.', es: 'Un cristal inestable palpita.' }, [
        ['Стабилизировать', '+1 мана в начале каждого боя, кристалл откроет тайник позже', { mana: true, delayed: 'crystal_echo' }],
        ['Расколоть', 'Редкий предмет, −5 макс. HP герою', { item: 'rare', maxHp: -5 }],
        ['Уйти', 'Без эффекта', {}]
      ]],
      ['cavein', '🪨', 'negative', { ru: 'Обвал отделил вас от привычной дороги.', en: 'A cave-in cuts off the familiar road.', es: 'Un derrumbe corta la ruta.' }, [
        ['Пробить тоннель', '−20 золота, раскрыть карту', { gold: -20, reveal: 3 }],
        ['Идти по лаве', 'Следующая миссия: прорыв, +25 золота', { nextScenario: 'escape', gold: 25 }],
        ['Переждать', 'Следующая миссия: оборона', { nextScenario: 'defense' }]
      ]]
    ],
    3: [
      ['caravan', '🚢', 'treasure', { ru: 'Под водой мерцают остатки каравана.', en: 'A drowned caravan glimmers below the water.', es: 'Un convoy hundido brilla bajo el agua.' }, [
        ['Нырнуть за грузом', 'Редкий предмет, следующая миссия: засада', { item: 'rare', ambush: true }],
        ['Освободить духов', '+18 здоровья, раскрыть карту и помощь духов позже', { heal: 18, reveal: 2, delayed: 'spirit_tide' }],
        ['Не рисковать', 'Без эффекта', {}]
      ]],
      ['sluice', '🚰', 'neutral', { ru: 'Древний шлюз может изменить течение в руинах.', en: 'An ancient sluice can change the ruins’ current.', es: 'Una esclusa antigua puede cambiar la corriente.' }, [
        ['Открыть шлюз', 'Следующая миссия: прорыв, +30 золота и находка позже', { nextScenario: 'escape', gold: 30, delayed: 'sluice_cache' }],
        ['Закрыть шлюз', 'Следующая миссия: оборона, +оберег', { nextScenario: 'defense', ward: true }],
        ['Взять руну', '+1 атака, следующий бой: ритуал', { attack: 1, nextScenario: 'ritual' }]
      ]],
      ['spirits', '👻', 'curse', { ru: 'Духи предлагают силу в обмен на память.', en: 'Spirits offer power in exchange for memory.', es: 'Los espíritus ofrecen poder por memoria.' }, [
        ['Принять договор', '+2 атаки до босса, следующая миссия: охота', { pact: true, nextScenario: 'hunt' }],
        ['Заплатить золотом', '−25 золота, редкая реликвия', { gold: -25, item: 'rare' }],
        ['Разорвать круг', 'Следующая миссия: волны, +25 золота', { nextScenario: 'waves', gold: 25 }]
      ]],
      ['archive', '📜', 'positive', { ru: 'Сухой архив хранит карту приливов.', en: 'A dry archive holds a tide map.', es: 'Un archivo seco guarda un mapa de mareas.' }, [
        ['Изучить карту', 'Открыть карту и узнать роли врагов', { reveal: 3, intel: true }],
        ['Взять печать', '+2 брони до босса', { ward: true }],
        ['Продать свитки', '+45 золота', { gold: 45 }]
      ]]
    ]
  };

  const pick = (list, value) => list[Math.abs(value) % list.length];
  const hash = value => String(value).split('').reduce((n, char) => (((n << 5) - n) + char.charCodeAt(0)) | 0, 17);
  const loc = (value, language = currentLanguage()) => value?.[language] || value?.en || '';

  function ensureState() {
    if (!GameState.contract || !CONTRACTS[GameState.contract]) GameState.contract = 'hunters';
    if (!Array.isArray(GameState.campaignMutators)) GameState.campaignMutators = [];
    if (!Array.isArray(GameState.campaignEvents)) GameState.campaignEvents = [];
    if (!Array.isArray(GameState.runHistory)) GameState.runHistory = [];
    if (!GameState.campaignEffects || typeof GameState.campaignEffects !== 'object') GameState.campaignEffects = {};
    if (!GameState.cityFavorClaimed || typeof GameState.cityFavorClaimed !== 'object') GameState.cityFavorClaimed = {};
  }

  function selectMutators(seed) {
    const keys = Object.keys(MUTATORS);
    const firstIndex = Math.abs(hash(seed || Date.now())) % keys.length;
    const secondIndex = Math.abs(hash(`${seed}:second`)) % (keys.length - 1);
    const first = keys[firstIndex];
    const second = keys.filter(key => key !== first)[secondIndex];
    return [first, second];
  }

  function startCampaign(seed) {
    ensureState();
    GameState.campaignMutators = selectMutators(seed || GameState.testSeed || Date.now());
    GameState.campaignEvents = [];
    GameState.campaignEffects = { nextScenario: null, nextAmbush: false, wardUntilBoss: false, pactUntilBoss: false, manaCrystal: false, hunterIntel: GameState.contract === 'hunters' };
    GameState.cityFavorClaimed = {};
    if (GameState.contract === 'hunters') GameState.gold = Math.max(0, GameState.gold - 5);
    if (GameState.contract === 'mercenaries') {
      GameState.gold += 10;
      GameState.consumables.healing = (GameState.consumables.healing || 0) + 1;
      GameState.campaignEffects.mercenaryFirstDrop = true;
    }
    if (GameState.contract === 'guardians') GameState.campaignEffects.wardUntilBoss = true;
  }

  function regionInfo(region) { return REGION[region] || REGION[1]; }
  function isMutatorActive(id) { return GameState.campaignMutators?.includes(id); }
  function scenarioLabel(id) { return loc(SCENARIOS[id]?.label) || id; }
  function scenarioShort(id) { return loc(SCENARIOS[id]?.short) || ''; }

  function scenarioForNode(node) {
    const forced = GameState.campaignEffects?.nextScenario;
    if (forced) {
      GameState.campaignEffects.nextScenario = null;
      return forced;
    }
    if (node.firstBattle || node.boss || node.final || node.type === 'arena') return 'eliminate';
    if (node.scenarioPreview) return node.scenarioPreview;
    const pool = REGION[node.region]?.scenarios || ['eliminate'];
    const weight = node.type === 'dungeon' ? 3 : 1;
    return pick(pool, hash(`${GameState.testSeed || 'run'}:${node.id}:${weight}`));
  }

  function createScenario(node) {
    const id = scenarioForNode(node);
    const scenario = { id, ...SCENARIOS[id], startedRound: 1, completed: false, failed: false, rewardGold: id === 'eliminate' ? 0 : 15 };
    if (id === 'holdout') { scenario.roundTarget = 4; scenario.waveRounds = [2, 3]; }
    if (id === 'waves') { scenario.roundTarget = 5; scenario.waveRounds = [2, 3, 4]; }
    if (id === 'escape') scenario.exit = { x: GRID_W - 1, y: 3 };
    if (id === 'defense') { scenario.roundTarget = 4; scenario.ward = { x: 2, y: 3, hp: 24, maxHp: 24 }; }
    if (id === 'ritual') { scenario.roundLimit = isMutatorActive('cursed_paths') ? 5 : 6; scenario.ritualist = true; }
    if (id === 'hunt') { scenario.huntTarget = true; scenario.exit = { x: GRID_W - 1, y: 3 }; }
    return scenario;
  }

  function applyMutatorsToWave(wave, node) {
    const out = wave.slice();
    if (isMutatorActive('feral_packs') && !node.boss && !node.final && node.type !== 'arena') {
      const pool = node.region === 1 ? [ENEMY_IDS.WOLF, ENEMY_IDS.BOAR, ENEMY_IDS.RAT_SWARM]
        : node.region === 2 ? [ENEMY_IDS.SPIDER, ENEMY_IDS.ORC_GUARD, ENEMY_IDS.SUICIDE]
          : [ENEMY_IDS.GHOST, ENEMY_IDS.BANSHEE, ENEMY_IDS.VOID_STALKER];
      out.push(pick(pool, hash(`${node.id}:feral`)));
    }
    return out;
  }

  function applyStartBattleEffects(b) {
    const effects = GameState.campaignEffects || {};
    const heroes = b.units.filter(unit => unit.isHero);
    if (effects.wardUntilBoss) heroes.forEach(hero => { hero.armor += 1; hero._campaignWard = true; });
    if (effects.pactUntilBoss) heroes.forEach(hero => { hero.attack += 2; hero._campaignPact = true; });
    if (effects.manaCrystal) heroes.filter(hero => hero.maxMana).forEach(hero => { hero.mana = Math.min(hero.maxMana, hero.mana + 1); });
    if (b.scenario?.id === 'ritual') {
      const target = b.units.filter(unit => !unit.isHero).sort((a, b2) => b2.hp - a.hp)[0];
      if (target) { target.scenarioTarget = 'ritualist'; target.maxHp += 6; target.hp += 6; }
    }
    if (b.scenario?.id === 'hunt') {
      const target = b.units.filter(unit => !unit.isHero).sort((a, b2) => b2.maxHp - a.maxHp)[0];
      if (target) target.scenarioTarget = 'prey';
    }
    const occupied = new Set(b.units.map(unit => `${unit.x},${unit.y}`));
    const setTerrain = (x, y, tile) => {
      if (inBounds(x, y) && !occupied.has(`${x},${y}`) && b.grid[y][x] === TILE.GROUND) b.grid[y][x] = tile;
    };
    if (b.region === 1 && !b.firstBattle) {
      // Thick roots form two visible, impassable obstacles away from the initial formation.
      setTerrain(6, 1, TILE.MOUNTAIN);
      setTerrain(8, 6, TILE.MOUNTAIN);
      b.regionalRule = 'roots';
    } else if (b.region === 2) {
      b.regionalRule = 'heat';
    } else if (b.region === 3) {
      b.regionalRule = 'tide';
    }
  }

  function scenarioStatus(b) {
    const scenario = b?.scenario;
    if (!scenario) return null;
    const base = { id: scenario.id, label: scenarioLabel(scenario.id), icon: scenario.icon, short: scenarioShort(scenario.id), tone: 'warn' };
    if (scenario.id === 'holdout' || scenario.id === 'waves') return { ...base, detail: `${Math.min(b.round, scenario.roundTarget)}/${scenario.roundTarget} ${loc({ ru: 'раунд', en: 'round', es: 'ronda' })}${scenario.id === 'holdout' ? ` · ${loc({ ru: 'подкрепления: 2 и 3', en: 'reinforcements: 2 and 3', es: 'refuerzos: 2 y 3' })}` : ''}` };
    if (scenario.id === 'escape') return { ...base, detail: loc({ ru: 'Выход: правая граница поля', en: 'Exit: right edge of the field', es: 'Salida: borde derecho' }) };
    if (scenario.id === 'defense') return { ...base, detail: `${loc({ ru: 'Оберег', en: 'Ward', es: 'Amuleto' })}: ${scenario.ward.hp}/${scenario.ward.maxHp} · ${b.round}/${scenario.roundTarget}` };
    if (scenario.id === 'ritual') return { ...base, detail: `${loc({ ru: 'Лимит', en: 'Limit', es: 'Límite' })}: ${scenario.roundLimit - b.round + 1}` };
    if (scenario.id === 'hunt') return { ...base, detail: loc({ ru: 'Уничтожьте золотую цель, затем выведите героя к правому краю.', en: 'Defeat the gold target, then reach the right edge.', es: 'Derrota al objetivo dorado y alcanza el borde derecho.' }) };
    return { ...base, detail: base.short };
  }

  function isVictory(b) {
    const scenario = b?.scenario;
    if (!scenario) return false;
    if (scenario.id === 'eliminate') return false;
    if (scenario.id === 'holdout' || scenario.id === 'waves' || scenario.id === 'defense') return b.round > scenario.roundTarget;
    if (scenario.id === 'escape') return b.units.some(unit => unit.isHero && unit.hp > 0 && unit.x + (unit.sizeW || 1) >= GRID_W);
    if (scenario.id === 'ritual') return !b.units.some(unit => !unit.isHero && unit.hp > 0 && unit.scenarioTarget === 'ritualist');
    if (scenario.id === 'hunt') return !b.units.some(unit => !unit.isHero && unit.hp > 0 && unit.scenarioTarget === 'prey') && b.units.some(unit => unit.isHero && unit.hp > 0 && unit.x + (unit.sizeW || 1) >= GRID_W);
    return false;
  }

  function isDefeat(b) {
    const scenario = b?.scenario;
    if (!scenario) return false;
    if (scenario.id === 'ritual') return b.round > scenario.roundLimit && b.units.some(unit => !unit.isHero && unit.hp > 0 && unit.scenarioTarget === 'ritualist');
    if (scenario.id === 'defense') return scenario.ward.hp <= 0;
    return false;
  }

  function onRoundStarted(b) {
    const scenario = b?.scenario;
    if (!scenario) return { spawn: [] };
    const out = { spawn: [], log: '' };
    if (scenario.id === 'waves' && scenario.waveRounds.includes(b.round)) {
      const pool = b.region === 3 ? [ENEMY_IDS.GHOST, ENEMY_IDS.BANSHEE, ENEMY_IDS.VOID_STALKER] : [ENEMY_IDS.SKELETON, ENEMY_IDS.GOBLIN_ARCHER];
      out.spawn = [pick(pool, b.round), pick(pool, b.round + 1)];
      out.log = loc({ ru: 'Новая волна приходит с края поля!', en: 'A new wave arrives from the field edge!', es: '¡Llega una nueva oleada!' });
    }
    if (scenario.id === 'holdout' && scenario.waveRounds.includes(b.round)) {
      const pool = b.region === 1 ? [ENEMY_IDS.WOLF, ENEMY_IDS.BOAR, ENEMY_IDS.SKELETON]
        : b.region === 2 ? [ENEMY_IDS.ORC_GUARD, ENEMY_IDS.SPIDER, ENEMY_IDS.SUICIDE]
          : [ENEMY_IDS.GHOST, ENEMY_IDS.BANSHEE, ENEMY_IDS.VOID_STALKER];
      out.spawn = [pick(pool, b.round), pick(pool, b.round + 4)];
      out.spawnMode = 'pressure';
      out.log = loc({ ru: 'Подкрепление прорывается к вашему рубежу!', en: 'Reinforcements breach toward your line!', es: '¡Los refuerzos irrumpen hacia tu línea!' });
    }
    if (scenario.id === 'defense') {
      const attackers = b.units.filter(unit => !unit.isHero && unit.hp > 0 && Math.abs(unit.x - scenario.ward.x) + Math.abs(unit.y - scenario.ward.y) <= 1);
      if (attackers.length) {
        const damage = attackers.length * 2;
        scenario.ward.hp = Math.max(0, scenario.ward.hp - damage);
        out.log = `${loc({ ru: 'Оберег получает', en: 'The ward takes', es: 'El amuleto recibe' })} ${damage} ${loc({ ru: 'урона', en: 'damage', es: 'daño' })}.`;
      }
    }
    const emptyGround = [];
    for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
      const occupied = b.units.some(unit => unit.hp > 0 && unit.x === x && unit.y === y);
      if (!occupied && b.grid[y][x] === TILE.GROUND) emptyGround.push({ x, y });
    }
    if (b.regionalRule === 'heat' && b.round >= 3 && b.round % 2 === 1 && emptyGround.length) {
      const tile = pick(emptyGround, b.round * 7);
      b.grid[tile.y][tile.x] = TILE.FIRE;
      out.log = out.log || loc({ ru: 'Жар разжигает новую огненную клетку.', en: 'The heat ignites a new fire tile.', es: 'El calor enciende una casilla de fuego.' });
    }
    if (b.regionalRule === 'tide' && b.round >= 3 && b.round % 2 === 0 && emptyGround.length) {
      const tile = pick(emptyGround, b.round * 11);
      b.grid[tile.y][tile.x] = TILE.WATER;
      out.log = out.log || loc({ ru: 'Прилив затапливает часть поля.', en: 'The tide floods part of the field.', es: 'La marea inunda parte del campo.' });
    }
    return out;
  }

  function eventForCell(cell) {
    const entries = EVENTS[cell.region] || EVENTS[1];
    const [id, icon, type, text, choices] = pick(entries, hash(`${GameState.testSeed || 'run'}:${cell.id}`));
    return { id, icon, type, text: loc(text), choices: choices.map(([label, detail, effect], index) => ({ id: `${id}:${index}`, label, detail, effect })) };
  }

  function applyEventEffect(effect, cell) {
    ensureState();
    const result = [];
    const heroes = GameState.heroes.filter(hero => hero.hp > 0);
    if (effect.gold) { GameState.gold = Math.max(0, GameState.gold + effect.gold); result.push(`${effect.gold > 0 ? '+' : ''}${effect.gold} 💰`); }
    if (effect.heal) { const amount = isMutatorActive('scarce_supplies') ? Math.ceil(effect.heal * 0.65) : effect.heal; heroes.forEach(hero => { hero.hp = Math.min(hero.maxHp, hero.hp + amount); }); result.push(`+${amount} HP`); }
    if (effect.hp) { heroes.forEach(hero => { hero.hp = Math.max(1, hero.hp + effect.hp); }); result.push(`${effect.hp} HP`); }
    if (effect.maxHp) { const hero = heroes[0]; if (hero) { applyPermanentHeroStat(hero, 'maxHp', effect.maxHp); result.push(`${effect.maxHp} max HP`); } }
    if (effect.attack) { const hero = heroes.sort((a, b) => a.attack - b.attack)[0]; if (hero) { applyPermanentHeroStat(hero, 'attack', effect.attack); result.push(`${hero.name} +${effect.attack} ⚔`); } }
    if (effect.item) { const item = randomItem(cell.region, effect.item); GameState.inventory.push(item.id); result.push(`🎁 ${translateText(item.name)}`); }
    if (effect.potion) { GameState.consumables.healing = (GameState.consumables.healing || 0) + effect.potion; result.push(`🧪 x${effect.potion}`); }
    if (effect.reveal) { for (let y = 0; y < MAP_ROWS; y++) for (let x = 0; x < MAP_COLS; x++) if (Math.abs(x - GameState.playerPos.x) + Math.abs(y - GameState.playerPos.y) <= effect.reveal) mapFogVisitedAdd(y, x); result.push('🗺️'); }
    if (effect.intel) { GameState.campaignEffects.hunterIntel = true; result.push('🔭'); }
    if (effect.nextScenario) { GameState.campaignEffects.nextScenario = effect.nextScenario; result.push(`→ ${scenarioLabel(effect.nextScenario)}`); }
    if (effect.ambush) { GameState.campaignEffects.nextAmbush = true; result.push('⚠️'); }
    if (effect.clearAmbush) { GameState.campaignEffects.nextAmbush = false; result.push('✓'); }
    if (effect.ward) { GameState.campaignEffects.wardUntilBoss = true; result.push('🛡️'); }
    if (effect.pact) { GameState.campaignEffects.pactUntilBoss = true; result.push('☠️'); }
    if (effect.mana) { GameState.campaignEffects.manaCrystal = true; result.push('🔮'); }
    if (effect.delayed) GameState.campaignEvents.push({ id: effect.delayed, region: cell.region, at: GameState.turn + 2, resolved: false });
    return result.join(' · ') || loc({ ru: 'Ничего не изменилось.', en: 'Nothing changes.', es: 'Nada cambia.' });
  }

  function resolveDelayedEvents() {
    ensureState();
    const ready = GameState.campaignEvents.filter(event => !event.resolved && event.at <= GameState.turn);
    ready.forEach(event => {
      event.resolved = true;
      const region = event.region || GameState.region;
      if (event.id === 'hunter_cache' || event.id === 'forge_delivery' || event.id === 'sluice_cache') {
        const item = randomItem(region, event.id === 'hunter_cache' ? 'rare' : 'normal');
        GameState.inventory.push(item.id);
        GameState._campaignNotice = `${loc({ ru: 'Отложенная находка:', en: 'A delayed find:', es: 'Hallazgo aplazado:' })} ${translateText(item.name)}`;
      } else if (event.id === 'druid_cache' || event.id === 'spirit_tide') {
        GameState.heroes.filter(hero => hero.hp > 0).forEach(hero => { hero.hp = Math.min(hero.maxHp, hero.hp + 8); });
        GameState._campaignNotice = loc({ ru: 'Союзники помогают отряду: +8 здоровья всем героям.', en: 'Allies aid the party: +8 health to every hero.', es: 'Aliados ayudan al grupo: +8 de salud.' });
      } else if (event.id === 'miners_gratitude' || event.id === 'crystal_echo') {
        const gold = event.id === 'miners_gratitude' ? 25 : 18;
        GameState.gold += gold;
        GameState._campaignNotice = `${loc({ ru: 'Последствие решения:', en: 'A consequence arrives:', es: 'Llega una consecuencia:' })} +${gold} 💰`;
      }
    });
  }

  function routeIntel(node) {
    const combatNode = ['mission', 'dungeon', 'arena', 'boss', 'final'].includes(node.type);
    const scenario = combatNode ? (node.scenarioPreview || scenarioForPreview(node)) : null;
    const region = regionInfo(node.region);
    const reward = node.type === 'event' ? loc({ ru: 'Выбор с последствиями', en: 'Choice with consequences', es: 'Elección con consecuencias' })
      : node.type === 'city' ? loc({ ru: 'Лечение и торговля', en: 'Recovery and trade', es: 'Curación y comercio' })
        : scenarioLabel(scenario);
    const risk = node.routeCommitment
      ? loc({ ru: 'Закроет альтернативу', en: 'Commits this route', es: 'Compromete la ruta' })
      : combatNode ? loc(region.feature) : '';
    return { scenario, reward, risk, region };
  }

  function scenarioForPreview(node) {
    if (node.scenarioPreview) return node.scenarioPreview;
    const pool = REGION[node.region]?.scenarios || ['eliminate'];
    node.scenarioPreview = pick(pool, hash(`${GameState.testSeed || 'run'}:${node.id}:preview`));
    return node.scenarioPreview;
  }

  function recordCompletedRun(result) {
    ensureState();
    GameState.runHistory.unshift({
      seed: GameState.testSeed || 'random', contract: GameState.contract,
      mutators: GameState.campaignMutators.slice(), turn: GameState.turn,
      gold: GameState.gold, result, at: Date.now()
    });
    GameState.runHistory = GameState.runHistory.slice(0, 10);
  }

  return { CONTRACTS, MUTATORS, REGION, SCENARIOS, ensureState, startCampaign, regionInfo, isMutatorActive, scenarioLabel, scenarioShort, createScenario, applyMutatorsToWave, applyStartBattleEffects, scenarioStatus, isVictory, isDefeat, onRoundStarted, eventForCell, applyEventEffect, resolveDelayedEvents, routeIntel, scenarioForPreview, recordCompletedRun, loc };
})();
