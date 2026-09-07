/* Three Blades ? Shared constants, localization and platform services.
 * Extracted from index.html; load order is intentional.
 */
  //══════════ SECTION 1: CONSTANTS ══════════
  const CELL = 64, GRID_W = 12, GRID_H = 8, CANVAS_W = CELL * 12, CANVAS_H = CELL * 8;
  /** The grid uses the same drawImage path, but hero sprites are visually larger, so they use a smaller multiplier. */
  const BATTLE_SPRITE_MULT_HERO = 1.14;
  const BATTLE_SPRITE_MULT_ENEMY = 1.2;
  const COLS_LEFT = 2, COLS_RIGHT = 2;
  const TILE = { GROUND: 0, FOREST: 1, MOUNTAIN: 2, WATER: 3, FORT: 4, FIRE: 5 };
  const TILE_EMOJI = { [TILE.GROUND]: '🟫', [TILE.FOREST]: '🌲', [TILE.MOUNTAIN]: '⛰️', [TILE.WATER]: '💧', [TILE.FORT]: '🏰', [TILE.FIRE]: '🔥' };
  const STATUS = { STUN: 'stun', FREEZE: 'freeze', FEAR: 'fear', WEB: 'web', POISON: 'poison', BURN: 'burn', SLOW: 'slow', BLIND: 'blind', CURSE: 'curse', BERSERK: 'berserk', STEALTH: 'stealth' };
  const SFX_AUDITOR_ENABLED = /(?:\?|&)sfx-audit=1(?:&|$)/.test(window.location.search) || localStorage.getItem('threeBladesSfxAudit') === '1';
  const TEST_SEED = (new URLSearchParams(window.location.search).get('seed') || '').trim();
  const SAVE_KEY = 'threeHeroesSave';
  const LEGACY_SAVE_KEY = 'save';
  const RECORDS_KEY = 'threeBladesRecordsV1';
  const AUDIO_SETTINGS_KEY = 'threeBladesAudioV1';
  const SFX_OVERRIDES_KEY = 'threeBladesSfxOverridesV1';
  const LANGUAGE_KEY = 'threeBladesLanguageV1';
  const TUTORIAL_SEEN_KEY = 'threeBladesTutorialSeenV1';
  const SUPPORTED_LANGUAGES = ['ru', 'en', 'es'];
  const CLOUD_SAVE_VERSION = 3;
  const LEADERBOARDS = {
    maxGold: 'three_blades_max_gold',
    enemiesDefeated: 'three_blades_enemies_defeated',
    fastVictory: 'three_blades_fast_victory'
  };
  const FAST_VICTORY_BASE_SCORE = 100000;
  const BGM_TRACKS = {
    'menu-cinematic': ['assets/audio/menu-cinematic/bgm_menu_cinematic_01.mp3'],
    battle: [
      'assets/audio/battle/bgm_battle_01.mp3',
      'assets/audio/battle/bgm_battle_02.mp3',
      'assets/audio/battle/bgm_battle_03.mp3'
    ],
    exploration: [
      'assets/audio/exploration/bgm_exploration_01.mp3',
      'assets/audio/exploration/bgm_exploration_02.mp3',
      'assets/audio/exploration/bgm_exploration_03.mp3'
    ]
  };

  function hashSeed(value) {
    let h = 2166136261;
    for (let i = 0; i < value.length; i++) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function createSeededRandom(seed) {
    let state = seed >>> 0;
    return function seededRandom() {
      state = (state + 0x6D2B79F5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function applyTestSeed(seed = (typeof GameState !== 'undefined' && GameState.replaySeed) || TEST_SEED) {
    if (!seed) return;
    Math.random = createSeededRandom(hashSeed(seed));
  }

  applyTestSeed();

  function detectInitialLanguage() {
    try {
      const saved = localStorage.getItem(LANGUAGE_KEY);
      if (SUPPORTED_LANGUAGES.includes(saved)) return saved;
    } catch (_) {}
    const nav = (navigator.language || '').toLowerCase();
    if (nav.startsWith('es')) return 'es';
    if (nav.startsWith('en')) return 'en';
    return 'ru';
  }
  function hasSavedLanguagePreference() {
    try { return SUPPORTED_LANGUAGES.includes(localStorage.getItem(LANGUAGE_KEY)); } catch (_) { return false; }
  }
  function normalizeSupportedLanguage(lang) {
    const v = String(lang || '').toLowerCase();
    if (v.startsWith('es')) return 'es';
    if (v.startsWith('en')) return 'en';
    if (v.startsWith('ru')) return 'ru';
    return 'en';
  }
  function applySdkLanguage(sdk) {
    if (hasSavedLanguagePreference()) return;
    const sdkLang = sdk?.environment?.i18n?.lang;
    if (!sdkLang) return;
    setGameLanguage(normalizeSupportedLanguage(sdkLang), { persist: false });
  }

  let GameLanguage = detectInitialLanguage();
  let ActiveScreen = 'menu';

  const I18N = {
    gameTitle: { ru: 'ТРИ  КЛИНКА', en: 'THREE BLADES', es: 'TRES ESPADAS' },
    pageTitle: { ru: 'Три клинка', en: 'Three Blades', es: 'Tres Espadas' },
    newGame: { ru: 'Новая игра', en: 'New Game', es: 'Nueva partida' },
    continue: { ru: 'Продолжить', en: 'Continue', es: 'Continuar' },
    about: { ru: 'Об игре', en: 'About', es: 'Acerca del juego' },
    tutorial: { ru: 'Обучение', en: 'Tutorial', es: 'Tutorial' },
    tutorialSkip: { ru: 'Пропустить', en: 'Skip', es: 'Saltar' },
    tutorialBack: { ru: 'Назад', en: 'Back', es: 'Atrás' },
    tutorialNext: { ru: 'Далее', en: 'Next', es: 'Siguiente' },
    tutorialPlay: { ru: 'Играть', en: 'Play', es: 'Jugar' },
    tutorialStepCounter: { ru: 'Шаг', en: 'Step', es: 'Paso' },
    tutorialTitle1: { ru: 'Добро пожаловать в Три клинка', en: 'Welcome to Three Blades', es: 'Bienvenido a Tres Espadas' },
    tutorialSub1: { ru: 'Тактическая RPG на короткие вылазки', en: 'A tactical RPG for short expeditions', es: 'Un RPG táctico de expediciones cortas' },
    tutorialText1: { ru: 'Вы ведёте отряд из трёх героев через три региона. Цель простая: выжить, усилиться и победить Тёмного Лорда.', en: 'Lead a party of three heroes through three regions. Your goal is simple: survive, grow stronger, and defeat the Dark Lord.', es: 'Dirige un grupo de tres héroes por tres regiones. El objetivo es simple: sobrevivir, fortalecerte y derrotar al Señor Oscuro.' },
    tutorialTip1aTitle: { ru: 'Три роли', en: 'Three roles', es: 'Tres roles' },
    tutorialTip1aText: { ru: 'Гарет держит удар, Алира стреляет издалека, Сэрис контролирует поле магией.', en: 'Garet holds the line, Alira shoots from range, and Seris controls the field with magic.', es: 'Garet aguanta la línea, Alira dispara a distancia y Seris controla el campo con magia.' },
    tutorialTip1bTitle: { ru: 'Сохранение', en: 'Saving', es: 'Guardado' },
    tutorialTip1bText: { ru: 'Прогресс сохраняется автоматически после важных действий.', en: 'Progress is saved automatically after important actions.', es: 'El progreso se guarda automáticamente tras acciones importantes.' },
    tutorialTitle2: { ru: 'Карта мира', en: 'World map', es: 'Mapa del mundo' },
    tutorialSub2: { ru: 'Выбирайте соседние клетки и открывайте путь', en: 'Choose adjacent tiles and open a route', es: 'Elige casillas cercanas y abre una ruta' },
    tutorialText2: { ru: 'На карте можно идти только в доступные соседние точки. Закрытые регионы накрыты туманом: победите босса текущей зоны, чтобы пройти дальше.', en: 'On the map, you can move only to available adjacent tiles. Locked regions are covered by fog: defeat the current region boss to move forward.', es: 'En el mapa solo puedes moverte a casillas adyacentes disponibles. Las regiones bloqueadas están cubiertas por niebla: derrota al jefe actual para avanzar.' },
    tutorialTip2aTitle: { ru: 'Город', en: 'Town', es: 'Ciudad' },
    tutorialTip2aText: { ru: 'В городе лечитесь, покупайте предметы, улучшайте снаряжение и получайте разведданные.', en: 'In town, heal, buy items, upgrade gear, and gather intel.', es: 'En la ciudad puedes curarte, comprar objetos, mejorar equipo y conseguir informes.' },
    tutorialTip2bTitle: { ru: 'События', en: 'Events', es: 'Eventos' },
    tutorialTip2bText: { ru: 'Не все клетки — бой. Иногда вас ждёт награда, риск или полезная передышка.', en: 'Not every tile is a battle. Some bring rewards, risks, or a useful breather.', es: 'No todas las casillas son combates. Algunas traen recompensas, riesgos o un respiro útil.' },
    tutorialTitle3: { ru: 'Бой', en: 'Combat', es: 'Combate' },
    tutorialSub3: { ru: 'Позиция важнее грубой силы', en: 'Position matters more than raw power', es: 'La posición importa más que la fuerza bruta' },
    tutorialText3: { ru: 'Перед боем герои выставляются слева. Можно перетащить их в первые две колонки или сразу начать бой. В свой ход герой может двигаться, атаковать и применять умения.', en: 'Before combat, heroes deploy on the left. You can drag them within the first two columns or start immediately. On a turn, a hero can move, attack, and use abilities.', es: 'Antes del combate, los héroes se colocan a la izquierda. Puedes arrastrarlos en las dos primeras columnas o empezar de inmediato. En su turno, un héroe puede moverse, atacar y usar habilidades.' },
    tutorialTip3aTitle: { ru: 'Рельеф', en: 'Terrain', es: 'Terreno' },
    tutorialTip3aText: { ru: 'Горы, вода, лес и огонь меняют маршрут и тактику. Следите за дальностью атак.', en: 'Mountains, water, forest, and fire change routes and tactics. Watch attack range.', es: 'Montañas, agua, bosque y fuego cambian rutas y tácticas. Vigila el alcance de ataque.' },
    tutorialTip3bTitle: { ru: 'Очередь хода', en: 'Turn order', es: 'Orden de turno' },
    tutorialTip3bText: { ru: 'Панель справа показывает, кто действует следующим. Планируйте фокус по опасным врагам.', en: 'The right panel shows who acts next. Plan focus fire on dangerous enemies.', es: 'El panel derecho muestra quién actúa después. Concentra ataques en enemigos peligrosos.' },
    tutorialTitle4: { ru: 'Прогресс отряда', en: 'Party progress', es: 'Progreso del grupo' },
    tutorialSub4: { ru: 'После победы зайдите в рюкзак и перки', en: 'After victory, check the bag and perks', es: 'Tras la victoria, revisa mochila y mejoras' },
    tutorialText4: { ru: 'Победы дают золото, опыт и снаряжение. Предметы надеваются в рюкзаке, а новые уровни открывают перки. Если бой стал тяжёлым, вернитесь в город и подготовьтесь.', en: 'Victories give gold, experience, and gear. Equip items in the bag, and new levels unlock perks. If fights get rough, return to town and prepare.', es: 'Las victorias dan oro, experiencia y equipo. Equipa objetos en la mochila y los niveles desbloquean mejoras. Si una batalla se complica, vuelve a la ciudad y prepárate.' },
    tutorialTip4aTitle: { ru: 'Хардкор', en: 'Hardcore', es: 'Difícil' },
    tutorialTip4aText: { ru: 'На хардкоре меньше золота, враги опаснее, а ошибки дороже. Для первого прохождения лучше обычный режим.', en: 'Hardcore gives less gold, tougher enemies, and harsher mistakes. Normal is better for a first run.', es: 'Difícil da menos oro, enemigos más duros y errores más caros. Normal es mejor para la primera partida.' },
    tutorialTip4bTitle: { ru: 'Реклама за награду', en: 'Rewarded ads', es: 'Anuncios con recompensa' },
    tutorialTip4bText: { ru: 'Реклама необязательна: она даёт бонусы вроде лечения, разведки или золота.', en: 'Ads are optional: they give bonuses such as healing, intel, or gold.', es: 'Los anuncios son opcionales: dan bonos como curación, informes u oro.' },
    ftueDeployTitle: { ru: 'ПЕРВАЯ СХВАТКА', en: 'FIRST CLASH', es: 'PRIMER ENCUENTRO' },
    ftueDeployText: { ru: 'Расстановка: коснитесь героя, затем свободной подсвеченной клетки в двух левых колонках. Можно и перетащить героя. После расстановки нажмите «Начать бой».', en: 'Deployment: tap a hero, then a highlighted free tile in the two left columns. You can also drag a hero. Press Start Battle when ready.', es: 'Despliegue: toca un héroe y después una casilla libre resaltada en las dos columnas izquierdas. También puedes arrastrarlo. Pulsa Iniciar combate al terminar.' },
    ftueGaretTitle: { ru: 'ГАРЕТ · ДЕРЖИ ЛИНИЮ', en: 'GARET · HOLD THE LINE', es: 'GARET · MANTÉN LA LÍNEA' },
    ftueGaretText: { ru: 'Займите переднюю позицию и примените «Удар щитом»: он наносит урон и оглушает цель.', en: 'Take the front position and use Shield Bash: it deals damage and stuns the target.', es: 'Ocupa la primera línea y usa Golpe de escudo: inflige daño y aturde al objetivo.' },
    ftueAliraTitle: { ru: 'АЛИРА · ФОКУС ЦЕЛИ', en: 'ALIRA · FOCUS FIRE', es: 'ALIRA · FUEGO CONCENTRADO' },
    ftueAliraText: { ru: 'Держите дистанцию и примените «Двойной выстрел» по раненому или опасному врагу.', en: 'Keep your distance and use Double Shot on a wounded or dangerous enemy.', es: 'Mantén la distancia y usa Disparo doble contra un enemigo herido o peligroso.' },
    ftueSerisTitle: { ru: 'СЭРИС · КОНТРОЛЬ ПОЛЯ', en: 'SERIS · CONTROL THE FIELD', es: 'SERIS · CONTROLA EL CAMPO' },
    ftueSerisText: { ru: 'Выберите «Огненный шар» и наведите его на соседние цели, чтобы задеть сразу несколько врагов.', en: 'Choose Fireball and target adjacent enemies to hit more than one foe.', es: 'Elige Bola de fuego y apunta a enemigos adyacentes para golpear a varios.' },
    ftueSkillsDoneTitle: { ru: 'РОЛИ ПОНЯТНЫ', en: 'ROLES LEARNED', es: 'ROLES APRENDIDOS' },
    ftueSkillsDoneText: { ru: 'Используйте позицию, фокус и область, чтобы завершить бой.', en: 'Use positioning, focus fire, and area damage to finish the battle.', es: 'Usa posición, fuego concentrado y daño de área para terminar el combate.' },
    ftueProgress: { ru: 'Испытайте умения', en: 'Try each ability', es: 'Prueba cada habilidad' },
    ftueSkip: { ru: 'Скрыть подсказки', en: 'Hide tips', es: 'Ocultar consejos' },
    orientationTitle: { ru: 'ПОВЕРНИТЕ УСТРОЙСТВО', en: 'ROTATE YOUR DEVICE', es: 'GIRA EL DISPOSITIVO' },
    orientationText: { ru: 'Игра создана для ПК и мобильных устройств в альбомном режиме.', en: 'This game is designed for PC and mobile devices in landscape mode.', es: 'Este juego está diseñado para PC y móviles en modo horizontal.' },
    battleSpeed: { ru: 'Скорость боя', en: 'Battle speed', es: 'Velocidad de combate' },
    settings: { ru: 'Настройки', en: 'Settings', es: 'Ajustes' },
    difficulty: { ru: 'СЛОЖНОСТЬ', en: 'DIFFICULTY', es: 'DIFICULTAD' },
    normal: { ru: 'ОБЫЧНАЯ', en: 'NORMAL', es: 'NORMAL' },
    hardcore: { ru: 'ХАРДКОР', en: 'HARDCORE', es: 'DIFÍCIL' },
    settingsTitle: { ru: 'НАСТРОЙКИ', en: 'SETTINGS', es: 'AJUSTES' },
    language: { ru: 'Язык', en: 'Language', es: 'Idioma' },
    records: { ru: 'Рекорды', en: 'Records', es: 'Récords' },
    recordGold: { ru: 'Макс. золото', en: 'Max gold', es: 'Oro máx.' },
    recordKills: { ru: 'Побеждено врагов', en: 'Enemies defeated', es: 'Enemigos vencidos' },
    recordTurns: { ru: 'Лучшая победа', en: 'Best victory', es: 'Mejor victoria' },
    noRecord: { ru: '—', en: '—', es: '—' },
    lockedRegion: { ru: 'Регион закрыт', en: 'Region locked', es: 'Región bloqueada' },
    defeatBoss: { ru: 'Победите босса', en: 'Defeat the boss', es: 'Derrota al jefe' },
    // Подзаголовки настроек переводятся подстановкой по фразе; без записи
    // здесь они так и остаются английскими в русском интерфейсе.
    previousRuns: { ru: 'Прошлые походы · seed для повтора', en: 'Previous expeditions · replay seed', es: 'Expediciones previas · semilla' },
    credits: { ru: 'Благодарности', en: 'Credits', es: 'Créditos' },
    sound: { ru: 'Звук', en: 'Sound', es: 'Sonido' },
    music: { ru: 'Музыка', en: 'Music', es: 'Música' },
    volume: { ru: 'Громкость', en: 'Volume', es: 'Volumen' },
    musicVolume: { ru: 'Громкость музыки', en: 'Music volume', es: 'Volumen de música' },
    sfx: { ru: 'Звуки боя (удары, выстрелы, магия)', en: 'Battle sounds (hits, shots, magic)', es: 'Sonidos de combate (golpes, disparos, magia)' },
    sfxVolume: { ru: 'Громкость SFX', en: 'SFX volume', es: 'Volumen SFX' },
    battleSfxVolume: { ru: 'Громкость звуков боя', en: 'Battle sound volume', es: 'Volumen de sonidos de combate' },
    sfxAuditor: { ru: '▶ SFX-аудитор', en: '▶ SFX auditor', es: '▶ Auditor SFX' },
    audioPauseHint: { ru: 'При сворачивании вкладки или окна музыка и звуки боя останавливаются (требование площадки).', en: 'Music and battle sounds stop when the tab or window is hidden (platform requirement).', es: 'La música y los sonidos de combate se detienen al ocultar la pestaña o la ventana (requisito de la plataforma).' },
    back: { ru: 'Назад', en: 'Back', es: 'Atrás' },
    menu: { ru: 'Меню', en: 'Menu', es: 'Menú' },
    pauseMenuSub: { ru: 'Пауза, обучение и выход из текущей партии.', en: 'Pause, tutorial, and current run exit options.', es: 'Pausa, tutorial y opciones para salir de la partida.' },
    gold: { ru: 'Золото', en: 'Gold', es: 'Oro' },
    region: { ru: 'Регион', en: 'Region', es: 'Región' },
    regionName1: { ru: 'Лес Лешего', en: "Leshy's Forest", es: 'Bosque del Leshi' },
    regionName2: { ru: 'Огненные глубины', en: 'Fire Depths', es: 'Profundidades de Fuego' },
    regionName3: { ru: 'Затонувшие руины', en: 'Sunken Ruins', es: 'Ruinas Sumergidas' },
    turn: { ru: 'Ход', en: 'Turn', es: 'Turno' },
    location: { ru: 'ЛОКАЦИЯ', en: 'LOCATION', es: 'UBICACIÓN' },
    opened: { ru: 'ОТКРЫТО', en: 'OPENED', es: 'ABIERTO' },
    selectCell: { ru: 'Выберите клетку', en: 'Select a tile', es: 'Elige una casilla' },
    cellInfoHint: { ru: 'Показывает информацию о выбранной зоне.', en: 'Shows information about the selected area.', es: 'Muestra información de la zona seleccionada.' },
    enter: { ru: '▶ Войти', en: '▶ Enter', es: '▶ Entrar' },
    bag: { ru: '🎒 Рюкзак', en: '🎒 Bag', es: '🎒 Mochila' },
    bestiary: { ru: '📖 Бестиарий', en: '📖 Bestiary', es: '📖 Bestiario' },
    arsenal: { ru: 'Арсенал', en: 'Arsenal', es: 'Arsenal' },
    arsenalWeapons: { ru: 'Оружие', en: 'Weapons', es: 'Armas' },
    arsenalArmor: { ru: 'Броня', en: 'Armor', es: 'Armadura' },
    arsenalArtifacts: { ru: 'Артефакты', en: 'Artifacts', es: 'Artefactos' },
    party: { ru: 'Отряд', en: 'Party', es: 'Grupo' },
    forestRefuge: { ru: 'ЛЕСНОЙ ПРИЮТ', en: 'FOREST HAVEN', es: 'REFUGIO DEL BOSQUE' },
    cityDesc: { ru: 'Торговый пост на краю Тёмного леса. Отдых, снаряжение, разведданные.', en: 'A trading post on the edge of the Dark Forest. Rest, gear, intel.', es: 'Un puesto comercial al borde del Bosque Oscuro. Descanso, equipo e informes.' },
    cityServices: { ru: 'Услуги города', en: 'Town services', es: 'Servicios de la ciudad' },
    trader: { ru: 'Торговец', en: 'Trader', es: 'Mercader' },
    alchemist: { ru: 'Алхимик', en: 'Alchemist', es: 'Alquimista' },
    scout: { ru: 'Разведка', en: 'Scout', es: 'Exploración' },
    traderBorn: { ru: 'ТОРГОВЕЦ БОРН', en: 'TRADER BORN', es: 'MERCADER BORN' },
    refresh: { ru: '↺ Обновить (20g)', en: '↺ Refresh (20g)', es: '↺ Renovar (20g)' },
    trade: { ru: 'Торговля', en: 'Trade', es: 'Comercio' },
    buyTab: { ru: 'Покупка', en: 'Buy', es: 'Comprar' },
    sellTab: { ru: 'Продажа', en: 'Sell', es: 'Vender' },
    chooseItemBuy: { ru: 'Выберите товар и нажмите «Купить».', en: 'Choose an item and press “Buy”.', es: 'Elige un objeto y pulsa “Comprar”.' },
    alchemistRuta: { ru: 'АЛХИМИК РУТА', en: 'ALCHEMIST RUTA', es: 'ALQUIMISTA RUTA' },
    alchemistHelp: { ru: 'Купите зелья и примените к герою. Ниже — улучшение снаряжения из рюкзака (100💰 / 200💰).', en: 'Buy potions and use them on a hero. Below: upgrade gear from the bag (100💰 / 200💰).', es: 'Compra pociones y úsalas en un héroe. Abajo: mejora equipo de la mochila (100💰 / 200💰).' },
    potions: { ru: 'Зелья и расходники', en: 'Potions and consumables', es: 'Pociones y consumibles' },
    gearUpgrade: { ru: 'Улучшение снаряжения', en: 'Gear upgrades', es: 'Mejoras de equipo' },
    scoutVeira: { ru: 'РАЗВЕДЧИЦА ВЕЙРА', en: 'SCOUT VEIRA', es: 'EXPLORADORA VEIRA' },
    scoutHint: { ru: 'Вейра изучит ближайший бой на карте: состав врагов после просмотра рекламы.', en: 'Veira will scout the nearest battle on the map: enemy lineup after watching an ad.', es: 'Veira explorará la batalla más cercana del mapa: enemigos tras ver un anuncio.' },
    getIntel: { ru: '📺 Получить разведданные', en: '📺 Get intel', es: '📺 Obtener informe' },
    quick: { ru: 'Быстро', en: 'Quick', es: 'Rápido' },
    leaveTown: { ru: '← Покинуть город', en: '← Leave town', es: '← Salir de la ciudad' },
    returnTown: { ru: '↩ В город', en: '↩ To town', es: '↩ A la ciudad' },
    turnOrder: { ru: 'ОЧЕРЁДНОСТЬ', en: 'TURN ORDER', es: 'ORDEN DE TURNO' },
    deployHint: { ru: 'Перетащите героев в левых 2 колонках. Или нажмите «Начать бой» сразу.', en: 'Drag heroes into the left 2 columns, or press “Start Battle” right away.', es: 'Arrastra héroes a las 2 columnas izquierdas, o pulsa “Iniciar batalla”.' },
    event: { ru: 'СОБЫТИЕ', en: 'EVENT', es: 'EVENTO' },
    continueArrow: { ru: 'Продолжить →', en: 'Continue →', es: 'Continuar →' },
    equipment: { ru: 'СНАРЯЖЕНИЕ', en: 'EQUIPMENT', es: 'EQUIPO' },
    weapon: { ru: 'Оружие', en: 'Weapon', es: 'Arma' },
    artifact: { ru: 'Артефакт', en: 'Artifact', es: 'Artefacto' },
    armor: { ru: 'Броня', en: 'Armor', es: 'Armadura' },
    inventory: { ru: 'РЮКЗАК', en: 'BAG', es: 'MOCHILA' },
    pickItem: { ru: 'Выберите предмет в рюкзаке.', en: 'Choose an item in the bag.', es: 'Elige un objeto de la mochila.' },
    dragWrongSlot: { ru: 'Этот предмет предназначен для другого слота.', en: 'This item belongs in a different slot.', es: 'Este objeto pertenece a otra ranura.' },
    close: { ru: '✕ Закрыть', en: '✕ Close', es: '✕ Cerrar' },
    doubleGold: { ru: '📺 ×2 ЗОЛОТО [РЕКЛАМА]', en: '📺 ×2 GOLD [AD]', es: '📺 ×2 ORO [ANUNCIO]' },
    victoryContinue: { ru: '▶ ПРОДОЛЖИТЬ', en: '▶ CONTINUE', es: '▶ CONTINUAR' },
    defeat: { ru: 'Поражение', en: 'Defeat', es: 'Derrota' },
    squadFell: { ru: 'Отряд пал...', en: 'The party has fallen...', es: 'El grupo ha caído...' },
    defeatSub: { ru: 'Отряд пал, но путь можно продолжить с последней безопасной точки.', en: 'The party has fallen, but you can continue from the last safe point.', es: 'El grupo ha caído, pero puedes continuar desde el último punto seguro.' },
    statBattles: { ru: 'Боев', en: 'Battles', es: 'Combates' },
    statEnemies: { ru: 'Врагов', en: 'Enemies', es: 'Enemigos' },
    statObjectives: { ru: 'Доп. целей', en: 'Bonus goals', es: 'Objetivos extra' },
    statDamageTaken: { ru: 'Получено урона', en: 'Damage taken', es: 'Daño recibido' },
    statSkillBattles: { ru: 'Бои с умением', en: 'Skill battles', es: 'Combates con habilidad' },
    runCode: { ru: 'Код результата', en: 'Result code', es: 'Código de resultado' },
    victory: { ru: 'ПОБЕДА!', en: 'VICTORY!', es: 'VICTORIA!' },
    missionComplete: { ru: 'МИССИЯ ЗАВЕРШЕНА', en: 'MISSION COMPLETE', es: 'MISIÓN COMPLETADA' },
    victoryGold: { ru: 'ЗОЛОТО', en: 'GOLD', es: 'ORO' },
    victoryKills: { ru: 'УБИТО', en: 'KILLS', es: 'BAJAS' },
    victoryRounds: { ru: 'РАУНДОВ', en: 'ROUNDS', es: 'RONDAS' },
    victoryLoot: { ru: 'ДОБЫЧА', en: 'LOOT', es: 'BOTÍN' },
    victoryStudied: { ru: 'ИЗУЧЕНО:', en: 'STUDIED:', es: 'ESTUDIADO:' },
    powerSurge: { ru: 'РОСТ СИЛЫ', en: 'POWER SURGE', es: 'AUMENTO DE PODER' },
    powerReady: { ru: 'готово к бою', en: 'battle-ready', es: 'listo para batalla' },
    perkPoint: { ru: 'перк', en: 'perk', es: 'mejora' },
    newSkill: { ru: 'новый навык', en: 'new skill', es: 'nueva habilidad' },
    flankBonus: { ru: 'Фланг', en: 'Flank', es: 'Flanco' },
    threatHealer: { ru: 'ЛЕКАРЬ', en: 'HEALER', es: 'CURA' },
    threatSummoner: { ru: 'ПРИЗЫВ', en: 'SUMMON', es: 'INVOCA' },
    threatAssassin: { ru: 'УБИЙЦА', en: 'ASSASSIN', es: 'ASESINO' },
    threatExplosive: { ru: 'ВЗРЫВ', en: 'BLAST', es: 'EXPLOSIÓN' },
    threatController: { ru: 'КОНТРОЛЬ', en: 'CONTROL', es: 'CONTROL' },
    threatBoss: { ru: 'БОСС', en: 'BOSS', es: 'JEFE' },
    leshySummons: { ru: 'призывает из чащи', en: 'summons from the thicket', es: 'invoca desde la espesura a' },
    leshyAwakens: { ru: 'ЧАЩА ПРОБУЖДАЕТСЯ — призванные получают +2 атаки', en: 'THE THICKET AWAKENS — summons gain +2 attack', es: 'LA ESPESURA DESPIERTA — las invocaciones obtienen +2 de ataque' },
    leshyNoTarget: { ru: 'укоренён и ждёт приближения героев', en: 'is rooted and waits for the heroes to approach', es: 'está enraizado y espera a que se acerquen los héroes' },
    threatTank: { ru: 'ТАНК', en: 'TANK', es: 'TANQUE' },
    threatRanged: { ru: 'ДАЛЬНИЙ', en: 'RANGED', es: 'DISTANCIA' },
    equipLoot: { ru: '🎒 НАДЕТЬ ДОБЫЧУ', en: '🎒 EQUIP LOOT', es: '🎒 EQUIPAR BOTÍN' },
    openBag: { ru: 'Открыть рюкзак', en: 'Open bag', es: 'Abrir mochila' },
    openBagEmpty: { ru: 'Открыть рюкзак (пусто)', en: 'Open bag (empty)', es: 'Abrir mochila (vacía)' },
    openBagEquip: { ru: 'Открыть рюкзак и надеть', en: 'Open bag and equip', es: 'Abrir mochila y equipar' },
    rarityCommon: { ru: 'ОБЫЧН.', en: 'COMMON', es: 'COMÚN' },
    rarityRare: { ru: 'РЕДКИЙ', en: 'RARE', es: 'RARO' },
    rarityEpic: { ru: 'ЭПИЧЕСКИЙ', en: 'EPIC', es: 'ÉPICO' },
    levelBadge: { ru: 'УРОВЕНЬ', en: 'LEVEL', es: 'NIVEL' },
    nodeMission: { ru: 'Миссия', en: 'Mission', es: 'Misión' },
    nodeCity: { ru: 'Город', en: 'Town', es: 'Ciudad' },
    nodeDungeon: { ru: 'Подземелье', en: 'Dungeon', es: 'Mazmorra' },
    nodeEvent: { ru: 'Событие', en: 'Event', es: 'Evento' },
    nodeBoss: { ru: 'Босс', en: 'Boss', es: 'Jefe' },
    nodeCamp: { ru: 'Привал', en: 'Camp', es: 'Campamento' },
    campRested: { ru: 'Отряд отдохнул', en: 'The party rested', es: 'El grupo descansó' },
    campAlreadyFull: { ru: 'Отряд и так полон сил.', en: 'The party is already at full strength.', es: 'El grupo ya está a plena fuerza.' },
    nodeWanderer: { ru: 'Странник', en: 'Wanderer', es: 'Errante' },
    nodeArena: { ru: 'Арена', en: 'Arena', es: 'Arena' },
    nodeFinal: { ru: 'Финал', en: 'Final', es: 'Final' },
    reviveAd: { ru: '⚡ Древний артефакт [реклама]', en: '⚡ Ancient artifact [ad]', es: '⚡ Artefacto antiguo [anuncio]' },
    loadLast: { ru: 'Загрузить последнее сохранение', en: 'Load last save', es: 'Cargar último guardado' },
    restart: { ru: 'Начать заново', en: 'Start over', es: 'Empezar de nuevo' },
    endingTitle: { ru: 'Победа над Тьмой!', en: 'Victory over Darkness!', es: '¡Victoria sobre la Oscuridad!' },
    endingText: { ru: 'Тёмный Лорд повержен. Мир спасён благодаря трём героям.', en: 'The Dark Lord is defeated. The world is saved by three heroes.', es: 'El Señor Oscuro ha caído. Tres héroes salvaron el mundo.' },
    wonderful: { ru: 'Замечательно', en: 'Wonderful', es: 'Excelente' },
    chooseCreature: { ru: 'Выберите существо из списка.', en: 'Choose a creature from the list.', es: 'Elige una criatura de la lista.' },
    newAbility: { ru: 'НОВАЯ СПОСОБНОСТЬ!', en: 'NEW ABILITY!', es: '¡NUEVA HABILIDAD!' },
    ability: { ru: 'Способность', en: 'Ability', es: 'Habilidad' },
    great: { ru: 'Отлично!', en: 'Great!', es: '¡Genial!' },
    levelUp: { ru: 'Уровень!', en: 'Level up!', es: '¡Subiste de nivel!' },
    choosePerkHint: { ru: 'Выберите перк — действие необратимо', en: 'Choose a perk — this cannot be undone', es: 'Elige una mejora; no se puede deshacer' },
    perkInfoHint: { ru: 'Нажмите на умение чтобы увидеть описание.', en: 'Click a skill to see its description.', es: 'Pulsa una habilidad para ver su descripción.' },
    sure: { ru: 'Вы уверены?', en: 'Are you sure?', es: '¿Seguro?' },
    yes: { ru: 'Да', en: 'Yes', es: 'Sí' },
    no: { ru: 'Нет', en: 'No', es: 'No' },
    cancel: { ru: 'Отмена', en: 'Cancel', es: 'Cancelar' },
    sfxAuditorTitle: { ru: 'SFX-АУДИТОР', en: 'SFX AUDITOR', es: 'AUDITOR SFX' },
    sfxAuditorSub: { ru: 'Сравнение кандидатов для боя и сохранение выбранного варианта', en: 'Compare battle sound candidates and save the selected option', es: 'Compara sonidos de combate y guarda la opción elegida' },
    ready: { ru: 'Готово', en: 'Ready', es: 'Listo' },
    resetChoice: { ru: 'Сбросить выбор', en: 'Reset choice', es: 'Restablecer elección' },
    saveExit: { ru: 'Сохранить и выйти', en: 'Save and exit', es: 'Guardar y salir' },
    exitNoSave: { ru: 'Выйти без сохранения', en: 'Exit without saving', es: 'Salir sin guardar' },
    notEnoughGold: { ru: 'Недостаточно золота.', en: 'Not enough gold.', es: 'No hay suficiente oro.' },
    saveNotFound: { ru: 'Сохранение не найдено.', en: 'Save not found.', es: 'Guardado no encontrado.' },
    adUnavailable: { ru: 'Реклама недоступна', en: 'Ad unavailable', es: 'Anuncio no disponible' },
    adCooldown: { ru: 'Реклама временно недоступна (антиспам).', en: 'Ad temporarily unavailable (cooldown).', es: 'Anuncio no disponible temporalmente (espera).' },
    allHealthy: { ru: '✓ Все здоровы', en: '✓ Everyone healthy', es: '✓ Todos sanos' },
    healOne: { ru: 'Лечить', en: 'Heal', es: 'Curar' },
    healAll: { ru: 'Лечить всех', en: 'Heal all', es: 'Curar a todos' },
    freeAdHeal: { ru: '📺 Бесплатно за рекламу', en: '📺 Free with ad', es: '📺 Gratis con anuncio' },
    adHealTitle: { ru: 'Лечение за просмотр рекламы', en: 'Healing for watching an ad', es: 'Curación por ver un anuncio' },
    adTitle: { ru: 'Реклама', en: 'Ad', es: 'Anuncio' },
    buy: { ru: 'КУПИТЬ', en: 'BUY', es: 'COMPRAR' },
    sell: { ru: 'ПРОДАТЬ', en: 'SELL', es: 'VENDER' },
    apply: { ru: 'Применить', en: 'Use', es: 'Usar' },
    upgrade: { ru: 'Улучшить', en: 'Upgrade', es: 'Mejorar' },
    learned: { ru: '✓ Изучено', en: '✓ Learned', es: '✓ Aprendido' },
    learn: { ru: '+ Изучить', en: '+ Learn', es: '+ Aprender' },
    turnDone: { ru: '✓ Ход завершён', en: '✓ Turn done', es: '✓ Turno terminado' },
    chooseTarget: { ru: '✦ Выбери цель', en: '✦ Choose target', es: '✦ Elige objetivo' },
    preview: { ru: 'Предпросмотр', en: 'Preview', es: 'Vista previa' },
    enemyReach: { ru: 'Зона угрозы', en: 'Threat zone', es: 'Zona de amenaza' },
    aiTargetLabel: { ru: 'Цель', en: 'Target', es: 'Objetivo' },
    avoidShort: { ru: 'мимо', en: 'miss', es: 'fallo' },
    avoidChanceTitle: { ru: 'Шанс полностью избежать удара: блок и уклонение', en: 'Chance to fully avoid a hit: block and dodge', es: 'Probabilidad de evitar un golpe: bloqueo y esquiva' },
    damageGuardianCover: { ru: 'Прикрытие −2', en: 'Cover −2', es: 'Cobertura −2' },
    damagePierce: { ru: 'Пробитие брони', en: 'Armor pierce', es: 'Perfora armadura' },
    damageBanner: { ru: 'Знамя +2', en: 'Banner +2', es: 'Estandarte +2' },
    affectedTiles: { ru: 'клеток заденет', en: 'tiles affected', es: 'casillas afectadas' },
    terrain: { ru: 'Местность', en: 'Terrain', es: 'Terreno' },
    terrainGround: { ru: 'Равнина', en: 'Ground', es: 'Suelo' },
    terrainForest: { ru: 'Лес', en: 'Forest', es: 'Bosque' },
    terrainMountain: { ru: 'Горы', en: 'Mountain', es: 'Montaña' },
    terrainWater: { ru: 'Вода', en: 'Water', es: 'Agua' },
    terrainFort: { ru: 'Форт', en: 'Fort', es: 'Fuerte' },
    terrainFire: { ru: 'Огонь', en: 'Fire', es: 'Fuego' },
    collapseWarning: { ru: 'ОБВАЛ', en: 'COLLAPSE', es: 'DERRUMBE' },
    lavaWarning: { ru: 'ЛАВА', en: 'LAVA', es: 'LAVA' },
    tideWarning: { ru: 'ПРИЛИВ', en: 'TIDE', es: 'MAREA' },
    collapseWarningTooltip: { ru: 'Сработает в следующем раунде: 10 урона, отталкивание и завал. Без свободной клетки юнит погибнет.', en: 'Triggers next round: 10 damage, push and rubble. A unit with no escape dies.', es: 'Se activa la próxima ronda: 10 de daño, empuje y escombros. Sin salida, la unidad muere.' },
    lavaWarningTooltip: { ru: 'Сработает в следующем раунде: 5 урона, огненная клетка и возможное появление элементаля.', en: 'Triggers next round: 5 damage, a fire tile and a possible elemental.', es: 'Se activa la próxima ronda: 5 de daño, fuego y posible elemental.' },
    tideWarningTooltip: { ru: 'В следующем раунде клетку затопит. На одной из отмеченных клеток может появиться водный элементаль.', en: 'This tile floods next round. A water elemental may rise on one marked tile.', es: 'Esta casilla se inundará la próxima ronda. Puede surgir un elemental de agua.' },
    terrainCover: { ru: 'укрытие', en: 'cover', es: 'cobertura' },
    terrainBlocksSight: { ru: 'блокирует выстрелы', en: 'blocks shots', es: 'bloquea disparos' },
    terrainBlocksMove: { ru: 'непроходимо', en: 'blocks movement', es: 'bloquea movimiento' },
    terrainSlows: { ru: 'замедляет', en: 'slows movement', es: 'ralentiza' },
    terrainNoBonus: { ru: 'без бонуса', en: 'no bonus', es: 'sin bonificación' },
    battleMove: { ru: '◇ Движение', en: '◇ Move', es: '◇ Mover' },
    battleAttack: { ru: '⚔ Атака', en: '⚔ Attack', es: '⚔ Atacar' },
    enemyTurn: { ru: 'Ход противника…', en: 'Enemy turn...', es: 'Turno enemigo...' },
    turnNow: { ru: 'Сейчас', en: 'Now', es: 'Ahora' },
    turnNext: { ru: 'Далее', en: 'Next', es: 'Siguiente' },
    nextHero: { ru: 'Следующий герой', en: 'Next hero', es: 'Siguiente héroe' },
    deployZone: { ru: 'Зона расстановки', en: 'Deployment zone', es: 'Zona de despliegue' },
    undoMove: { ru: '↩ Назад', en: '↩ Undo', es: '↩ Deshacer' },
    undoMoveTitle: { ru: 'Вернуть на клетку до перемещения', en: 'Return to the tile before moving', es: 'Volver a la casilla anterior' },
    skipMove: { ru: '⚡ Не двигаться', en: '⚡ Skip move', es: '⚡ No moverse' },
    waitTurn: { ru: '⏹ Ждать', en: '⏹ Wait', es: '⏹ Esperar' },
    battleInventory: { ru: '🎒 Инвентарь', en: '🎒 Inventory', es: '🎒 Inventario' },
    battleConsumables: { ru: '🧪 Расходники', en: '🧪 Consumables', es: '🧪 Consumibles' },
    consumablesEmpty: { ru: 'Расходников нет', en: 'No consumables', es: 'Sin consumibles' },
    useItem: { ru: 'Использовать', en: 'Use', es: 'Usar' },
    usesTurn: { ru: 'тратит ход', en: 'uses your turn', es: 'consume el turno' },
    chooseConsumable: { ru: 'Выберите расходник', en: 'Choose a consumable', es: 'Elige un consumible' },
    tactical: { ru: 'ТАКТИКА', en: 'TACTIC', es: 'TACTICA' },
    moveLeft: { ru: 'ХОД', en: 'MOVE', es: 'MOVER' },
    attackReady: { ru: 'ЦЕЛЕЙ', en: 'TARGETS', es: 'OBJETIVOS' },
    attackBlocked: { ru: 'ПЕРЕКРЫТО', en: 'BLOCKED', es: 'BLOQUEADO' },
    attackOut: { ru: 'ВНЕ ДОСЯГАЕМОСТИ', en: 'OUT OF RANGE', es: 'FUERA' },
    selectTarget: { ru: 'ВЫБЕРИ ЦЕЛЬ', en: 'SELECT TARGET', es: 'ELIGE OBJETIVO' },
    noTargets: { ru: 'НЕТ ЦЕЛЕЙ', en: 'NO TARGETS', es: 'SIN OBJETIVOS' },
    nearestEnemy: { ru: 'БЛИЖАЙШИЙ', en: 'NEAREST', es: 'CERCA' },
    lineBlocked: { ru: 'линия перекрыта', en: 'line blocked', es: 'linea bloqueada' },
    skipOrMove: { ru: 'двигайся, пропусти ход или используй навык', en: 'move, skip, or use a skill', es: 'mueve, pasa o usa habilidad' },
    unlocksAtLevel: { ru: '🔒 Открывается на уровне', en: '🔒 Unlocks at level', es: '🔒 Se desbloquea en nivel' },
    cooldownShort: { ru: 'КД', en: 'CD', es: 'REC' },
    statuses: { ru: 'Статусы', en: 'Statuses', es: 'Estados' },
    none: { ru: 'нет', en: 'none', es: 'ninguno' },
    restoresHp: { ru: 'восстанавливает HP', en: 'restores HP', es: 'restaura HP' },
    restoresMageMana: { ru: 'восстанавливает ману магу', en: 'restores mage mana', es: 'restaura maná del mago' },
    mageAttackForever: { ru: 'магу: +1 атака навсегда (1 раз на героя)', en: 'mage: +1 attack forever (once per hero)', es: 'mago: +1 ataque permanente (una vez por héroe)' },
    bestiaryCount: { ru: 'изучено / {known} встречено / {total} всего', en: 'studied / {known} encountered / {total} total', es: 'estudiados / {known} encontrados / {total} total' },
    unknown: { ru: '??? Неизвестно', en: '??? Unknown', es: '??? Desconocido' },
    unknownCaps: { ru: '??? НЕИЗВЕСТНО', en: '??? UNKNOWN', es: '??? DESCONOCIDO' },
    encountered: { ru: 'Встречен', en: 'Encountered', es: 'Encontrado' },
    studied: { ru: 'Изучен', en: 'Studied', es: 'Estudiado' },
    creatureNotMet: { ru: 'Это существо ещё не встречалось в бою.<br>Вступите в сражение, чтобы узнать больше.', en: 'This creature has not appeared in battle yet.<br>Fight it to learn more.', es: 'Esta criatura aún no apareció en combate.<br>Enfréntala para saber más.' },
    killsStat: { ru: 'Убито', en: 'Kills', es: 'Bajas' },
    atkShort: { ru: 'Атк', en: 'Atk', es: 'Atq' },
    armorShort: { ru: 'Броня', en: 'Armor', es: 'Armadura' },
    speedShort: { ru: 'Скор', en: 'Speed', es: 'Vel.' },
    rangeShort: { ru: 'Дальн', en: 'Range', es: 'Alc.' },
    abilityLabel: { ru: 'СПОСОБНОСТЬ', en: 'ABILITY', es: 'HABILIDAD' },
    tacticsLabel: { ru: 'ТАКТИКА', en: 'TACTICS', es: 'TÁCTICA' },
    weaknessLabel: { ru: '⚠ СЛАБОСТЬ', en: '⚠ WEAKNESS', es: '⚠ DEBILIDAD' },
    killToStudy: { ru: '[Убейте существо, чтобы изучить способности и тактику]', en: '[Defeat this creature to study abilities and tactics]', es: '[Derrota a esta criatura para estudiar habilidades y táctica]' },
    miniBossLabel: { ru: ' · Мини-босс', en: ' · Mini-boss', es: ' · Minijefe' },
    bossLabel: { ru: ' · БОСС', en: ' · BOSS', es: ' · JEFE' },
    courierAd: { ru: '💰 Гонец нашёл клад! +50 золота за рекламу?', en: '💰 A courier found treasure! +50 gold for an ad?', es: '💰 ¡Un mensajero encontró un tesoro! ¿+50 de oro por anuncio?' },
    goldAdded: { ru: 'золота!', en: 'gold!', es: 'de oro!' },
    noUpgradeableGear: { ru: 'Нет предметов common/rare в рюкзаке.', en: 'No common/rare items in the bag.', es: 'No hay objetos comunes/raros en la mochila.' },
    common: { ru: 'Обычн.', en: 'Common', es: 'Común' },
    rare: { ru: 'Редкий', en: 'Rare', es: 'Raro' },
    epic: { ru: 'Эпик', en: 'Epic', es: 'Épico' },
    toVictory: { ru: '↩ К победе', en: '↩ To victory', es: '↩ A la victoria' },
    toBattle: { ru: '↩ В бой', en: '↩ To battle', es: '↩ Al combate' },
    heroLevelShort: { ru: 'Ур.', en: 'Lv.', es: 'Nv.' },
    rangeShortUi: { ru: 'Дальн.', en: 'Range', es: 'Alc.' },
    mana: { ru: 'Мана', en: 'Mana', es: 'Maná' },
    progression: { ru: 'Прокачка', en: 'Progression', es: 'Progreso' },
    progressionTitle: { ru: 'Дерево перков и веток развития', en: 'Perk and upgrade tree', es: 'Árbol de mejoras y ramas' },
    equipBest: { ru: 'Надеть лучшее', en: 'Equip best', es: 'Equipar mejor' },
    equippedBest: { ru: 'Надето лучшее', en: 'Equipped best', es: 'Mejor equipado' },
    noBetterGear: { ru: 'Лучшее уже надето', en: 'Best gear already equipped', es: 'Ya está lo mejor equipado' },
    bestBadge: { ru: 'BEST', en: 'BEST', es: 'MEJOR' },
    compareGear: { ru: 'Сравнение', en: 'Compare', es: 'Comparar' },
    currentSlot: { ru: 'Сейчас', en: 'Current', es: 'Actual' },
    emptySlot: { ru: 'Пусто', en: 'Empty', es: 'Vacío' },
    powerDelta: { ru: 'Сила', en: 'Power', es: 'Poder' },
    unequip: { ru: 'Снять', en: 'Unequip', es: 'Quitar' },
    clickAgain: { ru: 'Клик ещё раз.', en: 'Click again.', es: 'Haz clic otra vez.' },
    emptyBag: { ru: 'Рюкзак пуст', en: 'Bag is empty', es: 'La mochila está vacía' },
    emptyBagHint: { ru: 'Первый предмет гарантирован за стартовую миссию. Затем снаряжение выпадает в боях и продаётся в городах.', en: 'Your first item is guaranteed by the opening mission. More gear drops in battles and is sold in towns.', es: 'El primer objeto está garantizado en la misión inicial. Encontrarás más equipo en combates y ciudades.' },
    onlyClass: { ru: 'Только', en: 'Only', es: 'Solo' },
    specialEffect: { ru: '— особый эффект', en: '— special effect', es: '— efecto especial' },
    notForHero: { ru: 'Не подходит', en: 'Not suitable for', es: 'No apto para' },
    equip: { ru: '✓ Надеть', en: '✓ Equip', es: '✓ Equipar' },
    transfer: { ru: '⇄ Передать', en: '⇄ Transfer', es: '⇄ Transferir' },
    drop: { ru: '✕ Убрать', en: '✕ Remove', es: '✕ Retirar' },
    itemDoesNotFit: { ru: 'Предмет не подходит герою.', en: 'This item does not fit the hero.', es: 'Este objeto no sirve para el héroe.' },
    replaceItem: { ru: 'Заменить', en: 'Replace', es: 'Reemplazar' },
    transferToWhom: { ru: 'Передать кому?', en: 'Transfer to whom?', es: '¿Transferir a quién?' },
    dropItemConfirm: { ru: 'Выбросить предмет?', en: 'Drop this item?', es: '¿Tirar este objeto?' },
    eventPositive: { ru: 'УДАЧА', en: 'LUCK', es: 'SUERTE' },
    eventNegative: { ru: 'НЕУДАЧА', en: 'BAD LUCK', es: 'MALA SUERTE' },
    eventAmbush: { ru: 'ЗАСАДА!', en: 'AMBUSH!', es: '¡EMBOSCADA!' },
    eventTreasure: { ru: 'НАХОДКА', en: 'FIND', es: 'HALLAZGO' },
    eventHeal: { ru: 'ИСЦЕЛЕНИЕ', en: 'HEALING', es: 'CURACIÓN' },
    eventSmith: { ru: 'КУЗНЕЦ', en: 'SMITH', es: 'HERRERO' },
    eventCurse: { ru: 'ПРОКЛЯТИЕ', en: 'CURSE', es: 'MALDICIÓN' },
    eventRefugees: { ru: 'ВСТРЕЧА', en: 'ENCOUNTER', es: 'ENCUENTRO' },
    eventFog: { ru: 'ТУМАН ВОЙНЫ', en: 'FOG OF WAR', es: 'NIEBLA DE GUERRA' },
    eventBlessing: { ru: 'БЛАГОСЛОВЕНИЕ', en: 'BLESSING', es: 'BENDICIÓN' },
    eventTrade: { ru: 'ТОРГОВЕЦ', en: 'TRADER', es: 'MERCADER' },
    eventChest: { ru: 'Найден сундук с золотом', en: 'Found a chest of gold', es: 'Encontraste un cofre de oro' },
    eventSpring: { ru: 'Лечебный источник. Все герои восстанавливают +10 HP.', en: 'Healing spring. All heroes restore +10 HP.', es: 'Fuente curativa. Todos los héroes restauran +10 HP.' },
    eventSmithText: { ru: 'Старый кузнец улучшает оружие', en: 'An old smith improves the weapon of', es: 'Un viejo herrero mejora el arma de' },
    eventAttackPlus: { ru: '+1 атака.', en: '+1 attack.', es: '+1 ataque.' },
    eventCurseText: { ru: 'Проклятое место.', en: 'A cursed place.', es: 'Un lugar maldito.' },
    eventLoseMaxHp: { ru: 'теряет −5 макс. HP.', en: 'loses −5 max HP.', es: 'pierde −5 HP máx.' },
    eventRefugeesHelped: { ru: 'Беженцы благодарят за 30 💰 помощи — все герои получают +100 опыта.', en: 'Refugees thank you for 30 💰 of aid: all heroes gain +100 XP.', es: 'Los refugiados agradecen 30 💰 de ayuda: todos los héroes ganan +100 XP.' },
    eventRefugeesPassed: { ru: 'Беженцы просили помощи, но вы прошли мимо.', en: 'Refugees asked for help, but you moved on.', es: 'Los refugiados pidieron ayuda, pero seguiste de largo.' },
    eventHiddenCache: { ru: 'Тайный склад: найден', en: 'Hidden cache: found', es: 'Almacén oculto: encontraste' },
    eventAddedBag: { ru: 'Добавлен в рюкзак.', en: 'Added to the bag.', es: 'Añadido a la mochila.' },
    eventFogText: { ru: 'Туман войны. Следующий бой начнётся без фазы расстановки — будьте готовы!', en: 'Fog of war. The next battle starts without deployment: be ready!', es: 'Niebla de guerra. El próximo combate empieza sin despliegue: prepárate.' },
    eventBlessingText: { ru: 'Благословение странника.', en: 'Wanderer blessing.', es: 'Bendición del errante.' },
    eventArmorForever: { ru: 'получает +2 брони навсегда.', en: 'gains +2 armor forever.', es: 'gana +2 armadura permanente.' },
    eventAmbushText: { ru: 'Засада! Отряд окружён. Немедленный бой!', en: 'Ambush! The party is surrounded. Immediate battle!', es: '¡Emboscada! El grupo está rodeado. ¡Combate inmediato!' },
    eventRareGift: { ru: 'Таинственный торговец предлагает редкий предмет', en: 'A mysterious trader offers a rare item', es: 'Un mercader misterioso ofrece un objeto raro' },
    eventFreeGift: { ru: 'ваш даром.', en: 'it is yours for free.', es: 'es tuyo gratis.' },
    fateSecondChance: { ru: '🎲 Судьба даёт второй шанс (реклама)?', en: '🎲 Fate offers a second chance (ad)?', es: '🎲 El destino ofrece una segunda oportunidad (anuncio)?' },
    placeHeroFirst: { ru: 'Поставьте хотя бы одного героя.', en: 'Deploy at least one hero.', es: 'Coloca al menos un héroe.' },
    mapCleared: { ru: 'Локация зачищена.', en: 'Location cleared.', es: 'Ubicación despejada.' },
    mapVisited: { ru: 'ПОСЕЩЕНО', en: 'VISITED', es: 'VISITADO' },
    bossDefeated: { ru: 'БОСС ПОВЕРЖЕН', en: 'BOSS DEFEATED', es: 'JEFE DERROTADO' },
    mapActive: { ru: 'Локация активна.', en: 'Location active.', es: 'Ubicación activa.' },
    fogOfWar: { ru: 'Туман войны', en: 'Fog of war', es: 'Niebla de guerra' },
    tooFar: { ru: 'Слишком далеко.', en: 'Too far away.', es: 'Demasiado lejos.' },
    regionLocked: { ru: 'Закрыто. Сначала босс предыдущего региона.', en: 'Locked. Defeat the previous region boss first.', es: 'Bloqueado. Derrota primero al jefe de la región anterior.' },
    regionStillLocked: { ru: 'Этот регион ещё закрыт. Победите босса в текущем регионе, чтобы открыть путь дальше.', en: 'This region is still locked. Defeat the boss in the current region to open the way forward.', es: 'Esta región sigue bloqueada. Derrota al jefe de la región actual para abrir el camino.' },
    currentPartyPosition: { ru: 'Текущая точка отряда.', en: 'Current party position.', es: 'Posición actual del grupo.' },
    nextRoutes: { ru: 'СЛЕДУЮЩИЙ ШАГ', en: 'NEXT MOVE', es: 'SIGUIENTE PASO' },
    threatLow: { ru: 'Низкая угроза', en: 'Low threat', es: 'Amenaza baja' },
    threatMedium: { ru: 'Средняя угроза', en: 'Medium threat', es: 'Amenaza media' },
    threatHigh: { ru: 'Высокая угроза', en: 'High threat', es: 'Amenaza alta' },
    threatExtreme: { ru: 'Смертельная угроза', en: 'Deadly threat', es: 'Amenaza mortal' },
    threatElite: { ru: 'ЭЛИТА', en: 'ELITE', es: 'ÉLITE' },
    rewardGear: { ru: 'Шанс снаряжения', en: 'Gear chance', es: 'Posible equipo' },
    rewardResources: { ru: 'Золото и ресурсы', en: 'Gold and resources', es: 'Oro y recursos' },
    rewardRecovery: { ru: 'Отдых и торговля', en: 'Rest and trade', es: 'Descanso y comercio' },
    rewardCamp: { ru: 'Привал: отряд восстановит 25% здоровья. Боя нет.', en: 'Camp: the party recovers 25% of its health. No battle.', es: 'Campamento: el grupo recupera el 25% de su salud. Sin combate.' },
    rewardCampUsed: { ru: 'Костёр уже догорел.', en: 'This fire has burned out.', es: 'Esta hoguera ya se apagó.' },
    pathBlockedWall: { ru: 'Путь перекрыт стеной. Обойдите через проём.', en: 'A wall blocks the way. Use an opening.', es: 'Un muro bloquea el paso. Usa una abertura.' },
    legendTitle: { ru: 'Обозначения', en: 'Legend', es: 'Leyenda' },
    legendOption: { ru: 'ход доступен', en: 'you can go here', es: 'puedes ir aquí' },
    legendSecondary: { ru: 'видно, но не дойти за один ход', en: 'seen, not one step away', es: 'visible, no a un paso' },
    legendExplored: { ru: 'уже пройдено', en: 'already cleared', es: 'ya despejado' },
    legendFog: { ru: 'туман войны', en: 'fog of war', es: 'niebla de guerra' },
    legendWall: { ru: 'стена: только через проём', en: 'wall: only through an opening', es: 'muro: solo por una abertura' },
    rewardUnknown: { ru: 'Неизвестный исход', en: 'Unknown outcome', es: 'Resultado incierto' },
    bossDistance: { ru: 'До босса', en: 'Boss distance', es: 'Distancia al jefe' },
    routeEnemies: { ru: 'Врагов', en: 'Enemies', es: 'Enemigos' },
    routeIntel: { ru: 'Разведданные', en: 'Intel', es: 'Información' },
    expectedDamage: { ru: 'Ожидаемый урон', en: 'Expected damage', es: 'Daño esperado' },
    armorAbsorb: { ru: 'Поглощено бронёй', en: 'Absorbed by armor', es: 'Absorbido por armadura' },
    finisher: { ru: 'ДОБИВАНИЕ', en: 'FINISHER', es: 'REMATE' },
    damageRange: { ru: 'Диапазон', en: 'Range', es: 'Rango' },
    damageHits: { ru: 'попадания', en: 'hits', es: 'impactos' },
    damageCritChance: { ru: 'шанс крита', en: 'crit chance', es: 'prob. de crítico' },
    damageBurnTotal: { ru: 'горение затем', en: 'burn later', es: 'quemadura después' },
    damageGuaranteedKill: { ru: 'ГАРАНТИРОВАННОЕ ДОБИВАНИЕ', en: 'GUARANTEED FINISH', es: 'REMATE GARANTIZADO' },
    damagePossibleKill: { ru: 'ВОЗМОЖНОЕ ДОБИВАНИЕ', en: 'POSSIBLE FINISH', es: 'REMATE POSIBLE' },
    damageImmune: { ru: 'Цель невосприимчива к этому типу урона', en: 'Target is immune to this damage type', es: 'El objetivo es inmune a este tipo de daño' },
    damageFirstShot: { ru: 'первый выстрел', en: 'first shot', es: 'primer disparo' },
    damageMoveBonus: { ru: 'бонус после движения', en: 'move bonus', es: 'bono tras moverse' },
    damageAura: { ru: 'аура Гарета', en: 'Garet aura', es: 'aura de Garet' },
    damageFlank: { ru: 'фланг', en: 'flank', es: 'flanqueo' },
    damageFinisherBonus: { ru: 'Палач', en: 'Executioner', es: 'Verdugo' },
    damageSpellCharge: { ru: 'магический заряд', en: 'arcane charge', es: 'carga arcana' },
    damageStunOne: { ru: 'оглушение: 1 ход', en: 'stun: 1 turn', es: 'aturdimiento: 1 turno' },
    damageSlowTwo: { ru: 'замедление: 2 хода', en: 'slow: 2 turns', es: 'ralentización: 2 turnos' },
    damageSplash: { ru: 'взрыв по соседним клеткам', en: 'splash on adjacent tiles', es: 'explosión en casillas adyacentes' },
    tapToConfirm: { ru: 'Коснитесь цели ещё раз для подтверждения', en: 'Tap the target again to confirm', es: 'Toca de nuevo el objetivo para confirmar' },
    blockedLine: { ru: 'Линия атаки заблокирована', en: 'Attack line is blocked', es: 'Línea de ataque bloqueada' },
    outOfRange: { ru: 'Цель вне дальности', en: 'Target is out of range', es: 'Objetivo fuera de alcance' },
    optionalObjective: { ru: 'ДОП. ЦЕЛЬ', en: 'BONUS OBJECTIVE', es: 'OBJETIVO EXTRA' },
    objectiveSkillful: { ru: 'Примените хотя бы одно умение', en: 'Use at least one ability', es: 'Usa al menos una habilidad' },
    objectiveFlawless: { ru: 'Победите без потери героя', en: 'Win without losing a hero', es: 'Vence sin perder un héroe' },
    objectiveComplete: { ru: 'Цель выполнена', en: 'Objective complete', es: 'Objetivo cumplido' },
    objectiveReward: { ru: 'Бонус', en: 'Bonus', es: 'Bonificación' },
    runTime: { ru: 'Время прохождения', en: 'Run time', es: 'Tiempo de partida' },
    survivors: { ru: 'Герои в строю', en: 'Heroes standing', es: 'Héroes en pie' },
    heroBuilds: { ru: 'Итоговые сборки', en: 'Final builds', es: 'Configuraciones finales' },
    runSeed: { ru: 'Seed прохождения', en: 'Run seed', es: 'Seed de partida' },
    showWandererGoods: { ru: 'Посмотреть товары странника за рекламу?', en: 'View wanderer goods for an ad?', es: '¿Ver mercancías del errante por un anuncio?' },
    wandererLeft: { ru: 'Странник ушёл.', en: 'The wanderer left.', es: 'El errante se marchó.' },
    enterShadowArena: { ru: 'Войти в Арену теней за рекламу?', en: 'Enter the Shadow Arena for an ad?', es: '¿Entrar en la Arena de Sombras por un anuncio?' },
    removeEquippedFirst: { ru: 'Сначала снимите предмет с героя.', en: 'Unequip the item from the hero first.', es: 'Quita primero el objeto del héroe.' },
    sellItemFor: { ru: 'Продать', en: 'Sell', es: 'Vender' },
    equippedOn: { ru: 'Надето на:', en: 'Equipped by:', es: 'Equipado por:' },
    sellEquippedWarning: { ru: 'Предмет будет снят с героя', en: 'The item will be unequipped from', es: 'El objeto se quitará de' },
    sellGearHint: { ru: 'Продайте лишнее снаряжение. Надетые предметы отмечены именем героя.', en: 'Sell spare gear. Equipped items are marked with the hero name.', es: 'Vende equipo sobrante. Los objetos equipados muestran el nombre del héroe.' },
    noItemsToSell: { ru: 'В рюкзаке нет снаряжения для продажи.', en: 'There is no gear to sell.', es: 'No hay equipo para vender.' },
    trapMarker: { ru: 'ЛОВУШКА', en: 'TRAP', es: 'TRAMPA' },
    trapTooltip: { ru: 'Срабатывает при входе на клетку: 4 урона.', en: 'Triggers when a unit enters: 4 damage.', es: 'Se activa al entrar: 4 de daño.' },
    wardMarker: { ru: 'ОБЕРЕГ', en: 'WARD', es: 'AMULETO' },
    wardTooltip: { ru: 'Защитите оберег до конца 4-го раунда. Поражение наступит, если его прочность упадёт до нуля.', en: 'Protect the ward through round 4. You lose if its durability reaches zero.', es: 'Protege el amuleto hasta la ronda 4. Pierdes si su resistencia llega a cero.' },
    exitMarker: { ru: 'ВЫХОД', en: 'EXIT', es: 'SALIDA' },
    exitTooltip: { ru: 'Зона выхода. Доведите сюда героя для выполнения цели.', en: 'Exit zone. Move a hero here to complete the objective.', es: 'Zona de salida. Lleva aquí a un héroe para completar el objetivo.' },
    huntTargetTooltip: { ru: 'Цель задания. Уничтожьте этого врага.', en: 'Mission target. Defeat this enemy.', es: 'Objetivo de misión. Derrota a este enemigo.' },
    ritualTargetTooltip: { ru: 'Ритуалист. Уничтожьте его до истечения времени.', en: 'Ritualist. Defeat it before time runs out.', es: 'Ritualista. Derrótalo antes de que acabe el tiempo.' },
    trapPlaced: { ru: 'ЛОВУШКА: 4 УРОНА', en: 'TRAP: 4 DAMAGE', es: 'TRAMPA: 4 DE DAÑO' },
    trapTriggered: { ru: 'ловушка', en: 'trap', es: 'trampa' },
    noUpgrades: { ru: 'Нет доступных улучшений.', en: 'No upgrades available.', es: 'No hay mejoras disponibles.' },
    upgradeFor: { ru: 'Улучшить', en: 'Upgrade', es: 'Mejorar' },
    needGold: { ru: 'Нужно', en: 'Need', es: 'Necesitas' },
    stock: { ru: 'в запасе', en: 'stock', es: 'en reserva' },
    noNearbyBattles: { ru: 'Ближайших боёв не найдено.', en: 'No nearby battles found.', es: 'No hay batallas cercanas.' },
    veiraIntel: { ru: 'Разведка Вейры', en: 'Veira intel', es: 'Informe de Veira' },
    secretGoods: { ru: 'Тайный товар', en: 'Secret goods', es: 'Mercancía secreta' },
    secret: { ru: 'Тайна', en: 'Secret', es: 'Secreto' },
    openAd: { ru: '📺 Открыть', en: '📺 Reveal', es: '📺 Revelar' },
    partyState: { ru: 'СОСТОЯНИЕ ОТРЯДА', en: 'PARTY STATUS', es: 'ESTADO DEL GRUPO' }
  };

  const I18N_DYNAMIC = {
    en: {
      terms: {
        'Текущая точка отряда.': 'Current party position.',
        'Рюкзак пуст': 'Bag is empty',
        'Выберите предмет в рюкзаке': 'Choose an item in the bag',
        'Дерево перков и веток развития': 'Perk and branch tree',
        'Не изучено': 'Not learned',
        'Изучено': 'Learned',
        'Прокачка': 'Progression',
        'Перки': 'Perks',
        'новый уровень': 'new level',
        'Просмотр': 'View',
        'новый перк выбирается при повышении уровня': 'new perks are chosen on level-up',
        'При следующем level-up': 'At the next level-up',
        'Сначала предыдущий': 'Previous perk first',
        'в ветке': 'in branch',
        'Перк': 'Perk',
        'Нажмите на перк для описания.': 'Click a perk for details.',
        'Выберите сейчас': 'Choose now',
        'Нужен предыдущий': 'Previous perk required',
        'Следующий при level-up': 'Next on level-up',
        'Закрыто': 'Locked',
        'Улучшает боевые характеристики героя.': 'Improves the hero combat stats.',
        'перемещение отменено': 'movement undone',
        'Щитовой блок': 'Shield block',
        'Критический удар': 'Critical hit',
        'уклонился': 'dodged',
        'Отражение 1 урона': 'Reflected 1 damage',
        'повержен': 'defeated',
        'за убийство': 'for a kill',
        'Одеяние феникса': 'Phoenix Robe',
        'Воскрешён с 5 HP': 'revived with 5 HP',
        'Кольцо смерти': 'Death Ring',
        'взрыв 3×3': '3×3 explosion',
        'Сражение!': 'Battle!',
        'горит на огне': 'burns in fire',
        'Ошибка очереди ходов — ход передан героям': 'Turn order error: turn passed to heroes',
        'пропускает ход': 'skips a turn',
        'оглушение/мороз': 'stun/freeze',
        'исцеляет': 'heals',
        'лечит': 'heals',
        'поднимает скелета': 'raises a skeleton',
        'регенерирует': 'regenerates',
        'искажает пространство вокруг себя': 'warps space around itself',
        'Сбой хода противника': 'Enemy turn failed',
        'взрывается': 'explodes',
        'бьёт': 'hits',
        'атакует': 'attacks',
        'Вызов огня': 'Call Fire',
        'заморожен': 'frozen',
        'добавлен в бестиарий': 'added to the bestiary',
        'изучен — открыты способности и тактика': 'studied: abilities and tactics unlocked',
        'Пробивание': 'Armor Pierce',
        'Крит 15%': 'Crit 15%',
        'Командир': 'Commander',
        '+1 дальность': '+1 range',
        'Игнор укрытия': 'Ignore cover',
        '+1 движение': '+1 movement',
        'Выстрел после шага': 'Shot after moving',
        '+2 скорость': '+2 speed',
        'Ловушка урон': 'Damage trap',
        'Ловушка замедление': 'Slow trap',
        'Двойные ловушки': 'Double traps',
        'Сжигание 2 хода': 'Burn 2 turns',
        'Заморозка 2 хода': 'Freeze 2 turns',
        'Страх 1 ход': 'Fear 1 turn',
        'Контроль мастер': 'Control master',
        '+3 макс маны': '+3 max mana',
        'Телепорт': 'Teleport',
        'Культист': 'Cultist',
        'Колдун порчи': 'Hexer',
        'Щитоносец': 'Shieldbearer',
        'Арбалетчик': 'Crossbowman',
        'Каменный голем': 'Stone Golem',
        'Пустотный охотник': 'Void Stalker',
        'Кровавый рыцарь': 'Blood Knight',
        'Банши': 'Banshee',
        'Чумной лекарь': 'Plague Doctor',
        'Чародейский страж': 'Arcane Sentinel',
        'Подрывник': 'Bomber',
        'Следящий': 'Watcher',
        'Ледяной элем.': 'Ice Elemental',
        'Хаос-демон': 'Chaos Demon',
        'Убийца': 'Assassin',
        'Гидра': 'Hydra',
        'Призрак': 'Ghost',
        'Огненный титан': 'Fire Titan',
        'Леший — хозяин чащи': 'Ancient Leshy',
        'Колючие корни': 'Thorned Roots',
        'Неподвижный клубок корней. Бьёт героя на соседней клетке и замедляет его на 1 ход.': 'Immobile roots strike a hero on an adjacent tile and slow the target for 1 turn.',
        'Не подходите вплотную: уничтожайте издалека или уроном по области.': 'Stay out of adjacent cells, destroy it from range, or clear it with area damage.',
        'Неподвижный босс. В первый ход призывает двух лесных существ, затем по одному через ход (не больше 4). На 50% HP призывает ещё до двух и даёт всем своим призванным +2 атаки.': 'Rooted boss. On its first turn it summons two forest creatures, then one every other turn (maximum 4). At 50% HP it summons up to two more and gives all its summons +2 attack.',
        'Уничтожайте опасных призванных, но не затягивайте бой: сам Леший не двигается и атакует корнями с дистанции 3.': 'Remove dangerous summons, but do not prolong the fight: the Leshy cannot move and attacks with roots from range 3.',
        'Стоит на месте. Призывает 2 существа в первый ход, затем 1 через ход (макс. 4). На 50% HP призывает ещё до 2 и усиливает призванных на +2 атаки.': 'Does not move. Summons 2 creatures on the first turn, then 1 every other turn (max 4). At 50% HP it summons up to 2 more and gives summons +2 attack.',
        'Тяжелая броня 6, двигается медленно. Держит линию.': 'Heavy armor 6, moves slowly. Holds the line.',
        'Бежит к герою и взрывается — AoE 5 урона всем рядом.': 'Runs toward a hero and explodes: AoE 5 damage to all nearby units.',
        'При жизни даёт всем союзникам +2 хода движения. Убей первым!': 'While alive, grants all allies +2 movement. Kill first!',
        'При попадании замораживает героя на 1 ход. Броня 3.': 'Freezes a hero for 1 turn on hit. Armor 3.',
        'Мини-босс. Высокие статы, только ближний бой.': 'Mini-boss. High stats, melee only.',
        'Поднимает мёртвых врагов как зомби. Убей его первым.': 'Raises dead enemies as zombies. Kill it first.',
        'Высокая скорость и урон, низкий HP. Атакует слабейшего.': 'High speed and damage, low HP. Attacks the weakest target.',
        'БОСС. Огненный взрыв по области каждые 2 хода. Огромный HP.': 'BOSS. Fiery area explosion every 2 turns. Huge HP.',
        'ФИНАЛЬНЫЙ БОСС. Телепорт, AoE, призыв миньонов. Две фазы.': 'FINAL BOSS. Teleport, AoE, minion summons. Two phases.',
        'Магический урон игнорирует броню. Огненный шар.': 'Magic damage ignores armor. Fireball.',
        'Уничтожь издалека до подрыва. Дождь стрел.': 'Destroy from range before detonation. Arrow Rain.',
        'Низкий HP — любой герой с фокусом.': 'Low HP: any focused hero can finish it.',
        'Огненный шар снимает заморозку и даёт бонус урон.': 'Fireball removes freeze and grants bonus damage.',
        'Заморозка + Стрела замедления + Берсерк Гарета.': 'Freeze + Slowing Arrow + Garet Berserk.',
        'Метеорит Сэрис — уничтожить немедленно.': 'Seris Meteor: destroy immediately.',
        'Дождь стрел по области. Убей до его следующего хода.': 'Arrow Rain over the area. Kill before its next turn.',
        'Заморозка останавливает. Держи героев рассредоточено.': 'Freeze stops it. Keep heroes spread out.',
        'Убей миньонов. Берсерк + Метеорит в финале.': 'Kill the minions. Berserk + Meteor in the finale.',
        'Атакует целевого врага — оглушает на 1 ход. КД 3.': 'Attacks the target enemy and stuns it for 1 turn. CD 3.',
        'Поджигает всех врагов вокруг Гарета (AoE). КД 4.': 'Ignites all enemies around Garet (AoE). CD 4.',
        'Ульта: ×1.5 атаки, −50% брони на 3 хода. КД 6.': 'Ultimate: x1.5 attack, -50% armor for 3 turns. CD 6.',
        'Два выстрела подряд по одной цели. КД 2.': 'Two shots in a row at one target. CD 2.',
        'Замедляет цель: −2 хода движения, 2 раунда. КД 3.': 'Slows the target: -2 movement for 2 rounds. CD 3.',
        'Ульта: AoE атака по всем врагам рядом. КД 5.': 'Ultimate: AoE attack against all nearby enemies. CD 5.',
        'Взрыв по цели и соседям. Стоимость 3 MP.': 'Explosion on the target and adjacent tiles. Cost: 3 MP.',
        'Замораживает цель на 1 ход. Стоимость 4 MP.': 'Freezes the target for 1 turn. Cost: 4 MP.',
        'Ульта: мощный AoE по большой области. Стоимость 8 MP.': 'Ultimate: powerful AoE over a large area. Cost: 8 MP.',
        'Золото': 'Gold',
        'Регион': 'Region',
        'Ход': 'Turn',
        'Меню': 'Menu',
        'Гарет': 'Garet',
        'Алира': 'Alira',
        'Сэрис': 'Seris',
        'ЗАЩИТА': 'DEFENSE',
        'АТАКА': 'ATTACK',
        'ЛИДЕРСТВО': 'LEADERSHIP',
        'МЕТКОСТЬ': 'ACCURACY',
        'СКОРОСТЬ': 'SPEED',
        'ЛОВУШКИ': 'TRAPS',
        'РАЗРУШЕНИЕ': 'DESTRUCTION',
        'КОНТРОЛЬ': 'CONTROL',
        'МИСТИКА': 'MYSTIC',
        'броня': 'armor',
        'урон': 'damage',
        'маг. урон': 'magic damage',
        'Соседи': 'Adjacent allies',
        'Обычная атака.': 'Basic attack.',
        'Рывок к цели, игнорирует лес и воду.': 'Charges toward the target, ignoring forest and water.',
        'Движется прямо к ближайшему герою. Атакует в ближнем бою без хитростей.': 'Moves straight toward the nearest hero. Attacks in melee without tricks.',
        'Дробящее оружие, Огненный шар, Заморозка.': 'Crushing weapons, Fireball, Freeze.',
        'Дальность 2. Может накладывать замедление шипами.': 'Range 2. Can slow with thorns.',
        'Фокус-огонь и быстрый рывок в ближний бой.': 'Focus fire and a quick melee push.',
        'Маг дальнего боя. Накладывает проклятие и усиливает давление.': 'Ranged mage. Applies curses and increases pressure.',
        'Убить первым, не стоять кучей.': 'Kill first, do not group up.',
        'Накладывает паутину — герой пропускает ход. Высокая скорость.': 'Applies webbing: the hero skips a turn. High speed.',
        'Заморозка блокирует паутину. Берсерк Гарета.': 'Freeze blocks the web. Garet Berserk.',
        'AoE-атаки, высокая скорость. Бьёт всех рядом каждый ход.': 'AoE attacks, high speed. Hits everyone nearby each turn.',
        'Не стоять кучей! Разойтись, бить с расстояния.': 'Do not group up. Spread out and attack from range.',
        'Три головы — три атаки за ход. Регенерирует головы.': 'Three heads: three attacks per turn. Regenerates heads.',
        'AoE-способности. Берсерк рядом с телом гидры.': 'AoE abilities. Berserk near the hydra body.',
        'Проходит через препятствия, высокая скорость. Слабая броня.': 'Passes through obstacles, high speed. Weak armor.',
        'Магические атаки Сэрис наносят двойной урон.': 'Seris magic attacks deal double damage.',
        'Стреляет с дистанции, держит дальность.': 'Shoots from range and keeps distance.',
        'Метает с дистанции 2, отходит от героев.': 'Throws from range 2 and backs away from heroes.',
        'Стреляет с дистанции 3.': 'Shoots from range 3.',
        'Атакует с дистанции, накладывает слепоту.': 'Attacks from range and applies blindness.',
        'Дальняя атака, шанс проклятия.': 'Ranged attack, curse chance.',
        'Дальняя атака, замедление.': 'Ranged attack, slow.',
        'Взрыв при смерти.': 'Explodes on death.',
        'Лечит союзников.': 'Heals allies.',
        'Быстрый ближний бой.': 'Fast melee fighter.',
        'Охотится на самого слабого героя.': 'Hunts the weakest hero.',
        'Усиленный удар в ближнем бою.': 'Empowered melee strike.',
        'Шанс замедлить в ближнем бою.': 'Chance to slow in melee.',
        'Шанс отравить при ударе.': 'Chance to poison on hit.',
        'Пробивает 2 брони.': 'Pierces 2 armor.',
        'Взрыв 20 урона рядом.': 'Explosion deals 20 damage nearby.',
        'Накладывает паутину.': 'Applies webbing.',
        '+2 хода движения союзникам, держит дистанцию.': '+2 movement to allies, keeps distance.',
        'Морозит при атаке.': 'Freezes on attack.',
        'Призывает скелетов.': 'Summons skeletons.',
        'AoE вокруг себя, не ходит.': 'AoE around itself, does not move.',
        'Невидим в лесу, удар в спину ×2.': 'Invisible in forest, backstab ×2.',
        'Три удара за атаку, регенерация.': 'Three hits per attack, regeneration.',
        'Проходит сквозь горы, только магия.': 'Passes through mountains, only magic works.',
        'Удар в спину ×1.5, фокус слабых.': 'Backstab ×1.5, focuses weak targets.',
        'Вампиризм при ударе.': 'Lifesteal on hit.',
        'Шанс оглушить.': 'Chance to stun.',
        'Лечит союзников, отравляет.': 'Heals allies and poisons.',
        'Снижает получаемый урон.': 'Reduces incoming damage.',
        'Шанс заморозить.': 'Chance to freeze.',
        'Поджигает поле, AoE.': 'Ignites the field, AoE.',
        'Мини-босс ближнего боя.': 'Melee mini-boss.',
        'Фазовый босс.': 'Phase-based boss.',
        'Опасный противник.': 'Dangerous enemy.',
        'Оружие': 'Weapon',
        'Артефакт': 'Artifact',
        'Броня': 'Armor',
        'Атака': 'Attack',
        'Дальн.': 'Range',
        'Мана': 'Mana',
        'Снять': 'Unequip',
        'К победе': 'To victory',
        'В бой': 'To battle',
        'Воин': 'Warrior',
        'Лучник': 'Archer',
        'Маг': 'Mage',
        'Все герои': 'All heroes',
        'Удар щитом': 'Shield Bash',
        'Вызов': 'Challenge',
        'Вызов огня': 'Call Fire',
        'Берсерк': 'Berserk',
        'Двойной выстрел': 'Double Shot',
        'Стрела замедления': 'Slowing Arrow',
        'Дождь стрел': 'Arrow Rain',
        'Огненный шар': 'Fireball',
        'Заморозка': 'Freeze',
        'Метеорит': 'Meteor',
        'Движение': 'Move',
        'ЛОГ': 'LOG',
        'Герои выставлены автоматически. Перетащите их в левых 2 колонках при необходимости, затем «Начать бой».': 'Heroes are deployed automatically. Drag them into the left 2 columns if needed, then press “Start Battle”.',
        'добавлен в бестиарий': 'added to the bestiary',
        'РАССТАНОВКА': 'DEPLOYMENT',
        'Кликни героя → перетащи': 'Click hero → drag',
        'Начать бой': 'Start Battle',
        'Крысиный рой': 'Rat Swarm',
        'Гоблин-лучник': 'Goblin Archer',
        'Топляк': 'Bog Lurker',
        'Скелет': 'Skeleton',
        'Кабан': 'Boar',
        'Зомби': 'Zombie',
        'Лесной шаман': 'Forest Shaman',
        'Разбойник': 'Bandit',
        'Волк': 'Wolf',
        'Метатель': 'Thrower',
        'Копейщик': 'Spearman',
        'Дриада шипов': 'Thorn Dryad',
        'Орк-страж': 'Orc Guard',
        'Паук': 'Spider',
        'Тёмный рыцарь': 'Dark Knight',
        'Некромант': 'Necromancer',
        'Тёмный Лорд': 'Dark Lord',
        'Малое зелье HP +5': 'Small HP Potion +5',
        'Зелье HP +10': 'HP Potion +10',
        'Зелье HP +15': 'HP Potion +15',
        'Эликсир маны +5': 'Mana Elixir +5',
        'Камень магии (+1 атака мага)': 'Magic Stone (+1 mage attack)',
        'Стальной меч': 'Steel Sword',
        'Клинок яда': 'Poison Blade',
        'Громовой молот': 'Thunder Hammer',
        'Клинок тьмы': 'Dark Blade',
        'Охотничий лук': 'Hunter Bow',
        'Лук теней': 'Shadow Bow',
        'Лунный лук': 'Moon Bow',
        'Боевой арбалет': 'War Crossbow',
        'Магический жезл': 'Magic Wand',
        'Огненный посох': 'Fire Staff',
        'Посох хаоса': 'Chaos Staff',
        'Посох ледяного демона': 'Ice Demon Staff',
        'Кожаная броня': 'Leather Armor',
        'Плащ теней': 'Shadow Cloak',
        'Рунический щит': 'Runic Shield',
        'Мантия отражения': 'Mirror Robe',
        'Доспех стражника': 'Guardian Plate',
        'Одеяние феникса': 'Phoenix Robe',
        'Тёмная мантия': 'Dark Mantle',
        'Амулет удачи': 'Lucky Amulet',
        'Кристалл маны': 'Mana Crystal',
        'Глаз провидца': 'Scout Eye',
        'Песочные часы': 'Hourglass',
        'Кольцо смерти': 'Death Ring',
        'Портальный камень': 'Portal Stone',
        'Корона власти': 'Crown of Power',
        'Надёжный меч из хорошей стали.': 'A reliable sword of good steel.',
        'Отравляет цель на 2 хода.': 'Poisons the target for 2 turns.',
        'Оглушает врага на 1 ход при попадании.': 'Stuns the enemy for 1 turn on hit.',
        'Огромная сила ценой −1 брони владельца.': 'Great power at the cost of −1 owner armor.',
        'Лёгкий лук для дальней охоты.': 'A light bow for long-range hunting.',
        'Стрелы проходят сквозь лес и укрытия.': 'Arrows pass through forest and cover.',
        'Первый выстрел за раунд наносит ×1.5 урона.': 'The first shot each round deals ×1.5 damage.',
        'Дальнобойное оружие с большим уроном.': 'A long-range weapon with high damage.',
        'Усиливает магические атаки.': 'Strengthens magical attacks.',
        'Все заклинания +1 к радиусу AoE.': 'All spells gain +1 AoE radius.',
        'После заклинания случайный AoE (5 урона) по ближайшим.': 'After a spell, random AoE (5 damage) near the closest targets.',
        'Заморозка длится 2 хода вместо 1.': 'Freeze lasts 2 turns instead of 1.',
        'Лёгкая защита. Подходит всем.': 'Light protection. Fits everyone.',
        '20% шанс уклониться от атаки.': '20% chance to dodge an attack.',
        '25% шанс отразить негативный статус атакующему.': '25% chance to reflect a negative status to the attacker.',
        '10% входящего физ. урона отражается атакующему.': 'Reflects 10% incoming physical damage to the attacker.',
        'Каждая атака по владельцу даёт 1 урона атакующему.': 'Each attack on the owner deals 1 damage to the attacker.',
        '1 раз за бой: погиб → воскрес с 5 HP.': 'Once per battle: die → revive with 5 HP.',
        '+3 атаки ценой −5 макс HP.': '+3 attack at the cost of −5 max HP.',
        '+15% к золоту с каждого боя.': '+15% gold from each battle.',
        'Маг восстанавливает +3 маны в начале каждого хода.': 'The mage restores +3 mana at the start of each turn.',
        'На карте раскрывает точный состав врагов.': 'Reveals the exact enemy lineup on the map.',
        '1 раз за бой: после действия получить дополнительный ход.': 'Once per battle: gain one extra turn after your action.',
        'При гибели героя — взрыв 3×3, 15 урона врагам.': 'When a hero dies: 3×3 explosion, 15 damage to enemies.',
        '1 раз за бой: телепортировать владельца на любую свободную клетку.': 'Once per battle: teleport the owner to any free tile.',
        'Все союзники +2 атаки и +1 брони (аура).': 'All allies gain +2 attack and +1 armor (aura).',
        'Реген. маны/ход': 'Mana regen/turn',
        'золота с боя': 'gold from battle',
        'Эпик за рекламу': 'Epic for ad',
        'Яд при ударе (2 хода)': 'Poison on hit (2 turns)',
        'Оглушение при ударе (1 ход)': 'Stun on hit (1 turn)',
        'Игнор укрытий (лес/союзники)': 'Ignore cover (forest/allies)',
        'AoE заклинания: +1 радиус': 'AoE spells: +1 radius',
        'Случайный AoE 5 урона после заклинания': 'Random AoE 5 damage after spell',
        'Заморозка: 2 хода вместо 1': 'Freeze: 2 turns instead of 1',
        '1× воскрешение с 5 HP': '1× revive with 5 HP',
        '1× повтор действия за бой': '1× repeat action per battle',
        'Точный состав врагов на карте': 'Exact enemy lineup on the map',
        '1× телепорт героя за бой': '1× hero teleport per battle',
        'Пробитие брони': 'Armor piercing',
        'Шипы (урон атакующему)': 'Thorns (damage attacker)',
        'Аура': 'Aura',
        'атаки союзникам': 'attack to allies',
        'брони союзникам': 'armor to allies',
        'уклонение': 'dodge',
        'отражение физ. урона': 'physical damage reflection',
        'отражение статуса': 'status reflection',
        'Первый выстрел': 'First shot',
        'Взрыв 3×3 при гибели': '3×3 explosion on death',
        'урона': 'damage'
      },
      nodeTypes: { 'Миссия': 'Mission', 'Город': 'Town', 'Подземелье': 'Dungeon', 'Событие': 'Event', 'Босс': 'Boss', 'Странник': 'Wanderer', 'Арена': 'Arena', 'Финал': 'Final' },
      regions: { 'Регион 1 — Дикий лес': 'Region 1 — Wild Forest', 'Регион 2 — Тёмные земли': 'Region 2 — Dark Lands', 'Регион 3 — Цитадель тьмы': 'Region 3 — Citadel of Darkness' },
      classes: { 'Воин': 'Warrior', 'Лучник': 'Archer', 'Маг': 'Mage', 'Все герои': 'All heroes' },
      stats: { 'Атака': 'Attack', 'Броня': 'Armor', 'Дальность': 'Range', 'Дальн.': 'Range', 'Ход': 'Move', 'Мана': 'Mana', 'Скорость': 'Speed', 'Макс.HP': 'Max HP', 'Макс.Мана': 'Max Mana' }
    },
    es: {
      terms: {
        'Текущая точка отряда.': 'Posición actual del grupo.',
        'Рюкзак пуст': 'La mochila está vacía',
        'Выберите предмет в рюкзаке': 'Elige un objeto de la mochila',
        'Дерево перков и веток развития': 'Árbol de mejoras y ramas',
        'Не изучено': 'No aprendido',
        'Изучено': 'Aprendido',
        'Прокачка': 'Progresión',
        'Перки': 'Mejoras',
        'новый уровень': 'nuevo nivel',
        'Просмотр': 'Vista',
        'новый перк выбирается при повышении уровня': 'las nuevas mejoras se eligen al subir de nivel',
        'При следующем level-up': 'En la próxima subida de nivel',
        'Сначала предыдущий': 'Primero la mejora anterior',
        'в ветке': 'en la rama',
        'Перк': 'Mejora',
        'Нажмите на перк для описания.': 'Pulsa una mejora para ver detalles.',
        'Выберите сейчас': 'Elige ahora',
        'Нужен предыдущий': 'Requiere la mejora anterior',
        'Следующий при level-up': 'Siguiente al subir de nivel',
        'Закрыто': 'Bloqueado',
        'Улучшает боевые характеристики героя.': 'Mejora las estadísticas de combate del héroe.',
        'перемещение отменено': 'movimiento deshecho',
        'Щитовой блок': 'Bloqueo con escudo',
        'Критический удар': 'Golpe crítico',
        'уклонился': 'esquivó',
        'Отражение 1 урона': 'Reflejó 1 de daño',
        'повержен': 'derrotado',
        'за убийство': 'por una baja',
        'Одеяние феникса': 'Túnica del fénix',
        'Воскрешён с 5 HP': 'resucitó con 5 HP',
        'Кольцо смерти': 'Anillo de muerte',
        'взрыв 3×3': 'explosión 3×3',
        'Сражение!': '¡Combate!',
        'горит на огне': 'arde en fuego',
        'Ошибка очереди ходов — ход передан героям': 'Error de orden de turnos: turno cedido a los héroes',
        'пропускает ход': 'pierde un turno',
        'оглушение/мороз': 'aturdimiento/congelación',
        'исцеляет': 'cura',
        'лечит': 'cura',
        'поднимает скелета': 'levanta un esqueleto',
        'регенерирует': 'regenera',
        'искажает пространство вокруг себя': 'distorsiona el espacio a su alrededor',
        'Сбой хода противника': 'Falló el turno enemigo',
        'взрывается': 'explota',
        'бьёт': 'golpea',
        'атакует': 'ataca',
        'Вызов огня': 'Llamar fuego',
        'заморожен': 'congelado',
        'добавлен в бестиарий': 'añadido al bestiario',
        'изучен — открыты способности и тактика': 'estudiado: habilidades y tácticas desbloqueadas',
        'Пробивание': 'Perforar armadura',
        'Крит 15%': 'Crítico 15%',
        'Командир': 'Comandante',
        '+1 дальность': '+1 alcance',
        'Игнор укрытия': 'Ignora cobertura',
        '+1 движение': '+1 movimiento',
        'Выстрел после шага': 'Disparo tras moverse',
        '+2 скорость': '+2 velocidad',
        'Ловушка урон': 'Trampa de daño',
        'Ловушка замедление': 'Trampa ralentizante',
        'Двойные ловушки': 'Trampas dobles',
        'Сжигание 2 хода': 'Quemadura 2 turnos',
        'Заморозка 2 хода': 'Congelación 2 turnos',
        'Страх 1 ход': 'Miedo 1 turno',
        'Контроль мастер': 'Maestro del control',
        '+3 макс маны': '+3 maná máx.',
        'Телепорт': 'Teletransporte',
        'Культист': 'Cultista',
        'Колдун порчи': 'Maleficiante',
        'Щитоносец': 'Portaescudo',
        'Арбалетчик': 'Ballestero',
        'Каменный голем': 'Gólem de piedra',
        'Пустотный охотник': 'Acechador del vacío',
        'Кровавый рыцарь': 'Caballero sangriento',
        'Банши': 'Banshee',
        'Чумной лекарь': 'Médico de la peste',
        'Чародейский страж': 'Centinela arcano',
        'Подрывник': 'Bombardero',
        'Следящий': 'Vigilante',
        'Ледяной элем.': 'Elemental de hielo',
        'Хаос-демон': 'Demonio del caos',
        'Убийца': 'Asesino',
        'Гидра': 'Hidra',
        'Призрак': 'Fantasma',
        'Огненный титан': 'Titán de fuego',
        'Леший — хозяин чащи': 'Leshy ancestral',
        'Колючие корни': 'Raíces espinosas',
        'Неподвижный клубок корней. Бьёт героя на соседней клетке и замедляет его на 1 ход.': 'Raíces inmóviles golpean a un héroe en una casilla adyacente y lo ralentizan durante 1 turno.',
        'Не подходите вплотную: уничтожайте издалека или уроном по области.': 'No te acerques: destrúyelas a distancia o con daño de área.',
        'Неподвижный босс. В первый ход призывает двух лесных существ, затем по одному через ход (не больше 4). На 50% HP призывает ещё до двух и даёт всем своим призванным +2 атаки.': 'Jefe enraizado. En su primer turno invoca dos criaturas del bosque y luego una cada dos turnos (máximo 4). Al 50% de HP invoca hasta dos más y da +2 de ataque a todas sus invocaciones.',
        'Уничтожайте опасных призванных, но не затягивайте бой: сам Леший не двигается и атакует корнями с дистанции 3.': 'Elimina las invocaciones peligrosas, pero no alargues el combate: el Leshy no se mueve y ataca con raíces desde alcance 3.',
        'Стоит на месте. Призывает 2 существа в первый ход, затем 1 через ход (макс. 4). На 50% HP призывает ещё до 2 и усиливает призванных на +2 атаки.': 'No se mueve. Invoca 2 criaturas en el primer turno y luego 1 cada dos turnos (máx. 4). Al 50% de HP invoca hasta 2 más y da +2 de ataque a sus invocaciones.',
        'Тяжелая броня 6, двигается медленно. Держит линию.': 'Armadura pesada 6, se mueve lento. Mantiene la línea.',
        'Бежит к герою и взрывается — AoE 5 урона всем рядом.': 'Corre hacia un héroe y explota: área de 5 de daño a todos los cercanos.',
        'При жизни даёт всем союзникам +2 хода движения. Убей первым!': 'Mientras vive, otorga +2 movimiento a todos los aliados. ¡Mátalo primero!',
        'При попадании замораживает героя на 1 ход. Броня 3.': 'Congela a un héroe 1 turno al golpear. Armadura 3.',
        'Мини-босс. Высокие статы, только ближний бой.': 'Minijefe. Estadísticas altas, solo cuerpo a cuerpo.',
        'Поднимает мёртвых врагов как зомби. Убей его первым.': 'Levanta enemigos muertos como zombis. Mátalo primero.',
        'Высокая скорость и урон, низкий HP. Атакует слабейшего.': 'Alta velocidad y daño, poco HP. Ataca al más débil.',
        'БОСС. Огненный взрыв по области каждые 2 хода. Огромный HP.': 'JEFE. Explosión ígnea de área cada 2 turnos. HP enorme.',
        'ФИНАЛЬНЫЙ БОСС. Телепорт, AoE, призыв миньонов. Две фазы.': 'JEFE FINAL. Teletransporte, área, invoca esbirros. Dos fases.',
        'Магический урон игнорирует броню. Огненный шар.': 'El daño mágico ignora armadura. Bola de fuego.',
        'Уничтожь издалека до подрыва. Дождь стрел.': 'Destrúyelo desde lejos antes de que explote. Lluvia de flechas.',
        'Низкий HP — любой герой с фокусом.': 'HP bajo: cualquier héroe concentrado puede rematarlo.',
        'Огненный шар снимает заморозку и даёт бонус урон.': 'Bola de fuego elimina congelación y da daño extra.',
        'Заморозка + Стрела замедления + Берсерк Гарета.': 'Congelación + Flecha ralentizante + Berserker de Garet.',
        'Метеорит Сэрис — уничтожить немедленно.': 'Meteorito de Seris: destruir de inmediato.',
        'Дождь стрел по области. Убей до его следующего хода.': 'Lluvia de flechas en área. Mátalo antes de su siguiente turno.',
        'Заморозка останавливает. Держи героев рассредоточено.': 'Congelación lo detiene. Mantén a los héroes separados.',
        'Убей миньонов. Берсерк + Метеорит в финале.': 'Mata a los esbirros. Berserker + Meteorito al final.',
        'Атакует целевого врага — оглушает на 1 ход. КД 3.': 'Ataca al enemigo objetivo y lo aturde 1 turno. REC 3.',
        'Поджигает всех врагов вокруг Гарета (AoE). КД 4.': 'Prende fuego a todos los enemigos alrededor de Garet (área). REC 4.',
        'Ульта: ×1.5 атаки, −50% брони на 3 хода. КД 6.': 'Definitiva: x1.5 ataque, -50% armadura durante 3 turnos. REC 6.',
        'Два выстрела подряд по одной цели. КД 2.': 'Dos disparos seguidos al mismo objetivo. REC 2.',
        'Замедляет цель: −2 хода движения, 2 раунда. КД 3.': 'Ralentiza al objetivo: -2 movimiento durante 2 rondas. REC 3.',
        'Ульта: AoE атака по всем врагам рядом. КД 5.': 'Definitiva: ataque de área a todos los enemigos cercanos. REC 5.',
        'Взрыв по цели и соседям. Стоимость 3 MP.': 'Explosión sobre el objetivo y casillas adyacentes. Coste: 3 MP.',
        'Замораживает цель на 1 ход. Стоимость 4 MP.': 'Congela al objetivo durante 1 turno. Coste: 4 MP.',
        'Ульта: мощный AoE по большой области. Стоимость 8 MP.': 'Definitiva: potente área en una zona grande. Coste: 8 MP.',
        'Золото': 'Oro',
        'Регион': 'Región',
        'Ход': 'Turno',
        'Меню': 'Menú',
        'Гарет': 'Garet',
        'Алира': 'Alira',
        'Сэрис': 'Seris',
        'ЗАЩИТА': 'DEFENSA',
        'АТАКА': 'ATAQUE',
        'ЛИДЕРСТВО': 'LIDERAZGO',
        'МЕТКОСТЬ': 'PRECISIÓN',
        'СКОРОСТЬ': 'VELOCIDAD',
        'ЛОВУШКИ': 'TRAMPAS',
        'РАЗРУШЕНИЕ': 'DESTRUCCIÓN',
        'КОНТРОЛЬ': 'CONTROL',
        'МИСТИКА': 'MÍSTICA',
        'броня': 'armadura',
        'урон': 'daño',
        'маг. урон': 'daño mágico',
        'Соседи': 'Aliados adyacentes',
        'Обычная атака.': 'Ataque básico.',
        'Рывок к цели, игнорирует лес и воду.': 'Carga hacia el objetivo e ignora bosque y agua.',
        'Движется прямо к ближайшему герою. Атакует в ближнем бою без хитростей.': 'Avanza directo al héroe más cercano. Ataca cuerpo a cuerpo sin trucos.',
        'Дробящее оружие, Огненный шар, Заморозка.': 'Armas contundentes, Bola de fuego, Congelación.',
        'Дальность 2. Может накладывать замедление шипами.': 'Alcance 2. Puede ralentizar con espinas.',
        'Фокус-огонь и быстрый рывок в ближний бой.': 'Fuego concentrado y acercamiento rápido.',
        'Маг дальнего боя. Накладывает проклятие и усиливает давление.': 'Mago a distancia. Aplica maldiciones y aumenta la presión.',
        'Убить первым, не стоять кучей.': 'Mátalo primero y no te agrupes.',
        'Накладывает паутину — герой пропускает ход. Высокая скорость.': 'Aplica telaraña: el héroe pierde un turno. Alta velocidad.',
        'Заморозка блокирует паутину. Берсерк Гарета.': 'Congelación bloquea la telaraña. Berserker de Garet.',
        'AoE-атаки, высокая скорость. Бьёт всех рядом каждый ход.': 'Ataques de área, alta velocidad. Golpea a todos los cercanos cada turno.',
        'Не стоять кучей! Разойтись, бить с расстояния.': 'No te agrupes. Sepárate y ataca desde lejos.',
        'Три головы — три атаки за ход. Регенерирует головы.': 'Tres cabezas: tres ataques por turno. Regenera cabezas.',
        'AoE-способности. Берсерк рядом с телом гидры.': 'Habilidades de área. Berserker cerca del cuerpo de la hidra.',
        'Проходит через препятствия, высокая скорость. Слабая броня.': 'Atraviesa obstáculos, alta velocidad. Armadura débil.',
        'Магические атаки Сэрис наносят двойной урон.': 'Los ataques mágicos de Seris hacen daño doble.',
        'Стреляет с дистанции, держит дальность.': 'Dispara a distancia y mantiene separación.',
        'Метает с дистанции 2, отходит от героев.': 'Lanza desde alcance 2 y se aleja de los héroes.',
        'Стреляет с дистанции 3.': 'Dispara desde alcance 3.',
        'Атакует с дистанции, накладывает слепоту.': 'Ataca a distancia y aplica ceguera.',
        'Дальняя атака, шанс проклятия.': 'Ataque a distancia, probabilidad de maldición.',
        'Дальняя атака, замедление.': 'Ataque a distancia, ralentización.',
        'Взрыв при смерти.': 'Explota al morir.',
        'Лечит союзников.': 'Cura aliados.',
        'Быстрый ближний бой.': 'Combatiente cuerpo a cuerpo rápido.',
        'Охотится на самого слабого героя.': 'Caza al héroe más débil.',
        'Усиленный удар в ближнем бою.': 'Golpe cuerpo a cuerpo potenciado.',
        'Шанс замедлить в ближнем бою.': 'Puede ralentizar en cuerpo a cuerpo.',
        'Шанс отравить при ударе.': 'Puede envenenar al golpear.',
        'Пробивает 2 брони.': 'Perfora 2 de armadura.',
        'Взрыв 20 урона рядом.': 'Explosión de 20 de daño cercano.',
        'Накладывает паутину.': 'Aplica telaraña.',
        '+2 хода движения союзникам, держит дистанцию.': '+2 movimiento a aliados, mantiene distancia.',
        'Морозит при атаке.': 'Congela al atacar.',
        'Призывает скелетов.': 'Invoca esqueletos.',
        'AoE вокруг себя, не ходит.': 'Área alrededor de sí mismo, no se mueve.',
        'Невидим в лесу, удар в спину ×2.': 'Invisible en bosque, puñalada ×2.',
        'Три удара за атаку, регенерация.': 'Tres golpes por ataque, regeneración.',
        'Проходит сквозь горы, только магия.': 'Atraviesa montañas, solo funciona la magia.',
        'Удар в спину ×1.5, фокус слабых.': 'Puñalada ×1.5, enfoca débiles.',
        'Вампиризм при ударе.': 'Robo de vida al golpear.',
        'Шанс оглушить.': 'Puede aturdir.',
        'Лечит союзников, отравляет.': 'Cura aliados y envenena.',
        'Снижает получаемый урон.': 'Reduce el daño recibido.',
        'Шанс заморозить.': 'Puede congelar.',
        'Поджигает поле, AoE.': 'Incendia el campo, área.',
        'Мини-босс ближнего боя.': 'Minijefe cuerpo a cuerpo.',
        'Фазовый босс.': 'Jefe por fases.',
        'Опасный противник.': 'Enemigo peligroso.',
        'Оружие': 'Arma',
        'Артефакт': 'Artefacto',
        'Броня': 'Armadura',
        'Атака': 'Ataque',
        'Дальн.': 'Alcance',
        'Мана': 'Maná',
        'Снять': 'Quitar',
        'К победе': 'A la victoria',
        'В бой': 'Al combate',
        'Воин': 'Guerrero',
        'Лучник': 'Arquero',
        'Маг': 'Mago',
        'Все герои': 'Todos los héroes',
        'Удар щитом': 'Golpe de escudo',
        'Вызов': 'Desafío',
        'Вызов огня': 'Llamar fuego',
        'Берсерк': 'Berserker',
        'Двойной выстрел': 'Disparo doble',
        'Стрела замедления': 'Flecha ralentizante',
        'Дождь стрел': 'Lluvia de flechas',
        'Огненный шар': 'Bola de fuego',
        'Заморозка': 'Congelación',
        'Метеорит': 'Meteorito',
        'Движение': 'Mov.',
        'ЛОГ': 'REGISTRO',
        'Герои выставлены автоматически. Перетащите их в левых 2 колонках при необходимости, затем «Начать бой».': 'Los héroes se despliegan automáticamente. Arrástralos a las 2 columnas izquierdas si hace falta y pulsa “Iniciar combate”.',
        'добавлен в бестиарий': 'añadido al bestiario',
        'РАССТАНОВКА': 'DESPLIEGUE',
        'Кликни героя → перетащи': 'Haz clic en un héroe → arrastra',
        'Начать бой': 'Iniciar combate',
        'Крысиный рой': 'Enjambre de ratas',
        'Гоблин-лучник': 'Arquero goblin',
        'Топляк': 'Acechador del pantano',
        'Skeleton': 'Esqueleto',
        'Boar': 'Jabalí',
        'Zombie': 'Zombi',
        'Forest Shaman': 'Chamán del bosque',
        'Bandit': 'Bandido',
        'Wolf': 'Lobo',
        'Thrower': 'Lanzador',
        'Spearman': 'Lancero',
        'Thorn Dryad': 'Dríada espinosa',
        'Orc Guard': 'Guardia orco',
        'Spider': 'Araña',
        'Dark Knight': 'Caballero oscuro',
        'Necromancer': 'Nigromante',
        'Dark Lord': 'Señor Oscuro',
        'Small HP Potion +5': 'Poción pequeña de HP +5',
        'HP Potion +10': 'Poción de HP +10',
        'HP Potion +15': 'Poción de HP +15',
        'Mana Elixir +5': 'Elixir de maná +5',
        'Magic Stone (+1 mage attack)': 'Piedra mágica (+1 ataque de mago)',
        'Steel Sword': 'Espada de acero',
        'Poison Blade': 'Hoja venenosa',
        'Thunder Hammer': 'Martillo del trueno',
        'Dark Blade': 'Hoja oscura',
        'Hunter Bow': 'Arco de cazador',
        'Shadow Bow': 'Arco de sombras',
        'Moon Bow': 'Arco lunar',
        'War Crossbow': 'Ballesta de guerra',
        'Magic Wand': 'Vara mágica',
        'Fire Staff': 'Bastón de fuego',
        'Chaos Staff': 'Bastón del caos',
        'Ice Demon Staff': 'Bastón del demonio de hielo',
        'Leather Armor': 'Armadura de cuero',
        'Shadow Cloak': 'Capa de sombras',
        'Runic Shield': 'Escudo rúnico',
        'Mirror Robe': 'Túnica reflectante',
        'Guardian Plate': 'Placa del guardián',
        'Phoenix Robe': 'Túnica del fénix',
        'Dark Mantle': 'Manto oscuro',
        'Lucky Amulet': 'Amuleto de suerte',
        'Mana Crystal': 'Cristal de maná',
        'Scout Eye': 'Ojo explorador',
        'Hourglass': 'Reloj de arena',
        'Death Ring': 'Anillo de muerte',
        'Portal Stone': 'Piedra portal',
        'Crown of Power': 'Corona de poder',
        'A reliable sword of good steel.': 'Una espada fiable de buen acero.',
        'Poisons the target for 2 turns.': 'Envenena al objetivo durante 2 turnos.',
        'Stuns the enemy for 1 turn on hit.': 'Aturde al enemigo durante 1 turno al golpear.',
        'Great power at the cost of −1 owner armor.': 'Gran poder a cambio de −1 armadura del portador.',
        'A light bow for long-range hunting.': 'Un arco ligero para caza a distancia.',
        'Arrows pass through forest and cover.': 'Las flechas atraviesan bosque y cobertura.',
        'The first shot each round deals ×1.5 damage.': 'El primer disparo de cada ronda inflige ×1.5 daño.',
        'A long-range weapon with high damage.': 'Arma de largo alcance con gran daño.',
        'Strengthens magical attacks.': 'Potencia los ataques mágicos.',
        'All spells gain +1 AoE radius.': 'Todos los hechizos ganan +1 radio AoE.',
        'After a spell, random AoE (5 damage) near the closest targets.': 'Tras un hechizo, AoE aleatoria (5 daño) cerca de los objetivos más próximos.',
        'Freeze lasts 2 turns instead of 1.': 'Congelación dura 2 turnos en vez de 1.',
        'Light protection. Fits everyone.': 'Protección ligera. Sirve para todos.',
        '20% chance to dodge an attack.': '20% de probabilidad de esquivar un ataque.',
        '25% chance to reflect a negative status to the attacker.': '25% de probabilidad de reflejar un estado negativo al atacante.',
        'Reflects 10% incoming physical damage to the attacker.': 'Refleja al atacante el 10% del daño físico recibido.',
        'Each attack on the owner deals 1 damage to the attacker.': 'Cada ataque al portador inflige 1 daño al atacante.',
        'Once per battle: die → revive with 5 HP.': 'Una vez por combate: morir → revivir con 5 HP.',
        '+3 attack at the cost of −5 max HP.': '+3 ataque a cambio de −5 HP máx.',
        '+15% gold from each battle.': '+15% de oro en cada combate.',
        'The mage restores +3 mana at the start of each turn.': 'El mago recupera +3 maná al inicio de cada turno.',
        'Preview enemy lineup and abilities before battle.': 'Muestra la formación y habilidades enemigas antes del combate.',
        'Once per battle: gain one extra turn after your action.': 'Una vez por combate: obtén un turno adicional después de tu acción.',
        'When a hero dies: 3×3 explosion, 15 damage to enemies.': 'Al morir un héroe: explosión 3×3, 15 daño a enemigos.',
        'Once per battle: teleport the owner to any free tile.': 'Una vez por combate: teletransporta al portador a cualquier casilla libre.',
        'All allies gain +2 attack and +1 armor (aura).': 'Todos los aliados ganan +2 ataque y +1 armadura (aura).',
        'Mana regen/turn': 'Regen. maná/turno',
        'gold from battle': 'oro del combate',
        'Epic for ad': 'Épico por anuncio',
        'Poison on hit (2 turns)': 'Veneno al golpear (2 turnos)',
        'Stun on hit (1 turn)': 'Aturdimiento al golpear (1 turno)',
        'Ignore cover (forest/allies)': 'Ignora cobertura (bosque/aliados)',
        'AoE spells: +1 radius': 'Hechizos AoE: +1 radio',
        'Random AoE 5 damage after spell': 'AoE aleatoria de 5 daño tras hechizo',
        'Freeze: 2 turns instead of 1': 'Congelación: 2 turnos en vez de 1',
        '1× revive with 5 HP': '1× revivir con 5 HP',
        '1× repeat action per battle': '1× repetir acción por combate',
        'Exact enemy lineup on the map': 'Composición enemiga exacta en el mapa',
        '1× hero teleport per battle': '1× teletransporte de héroe por combate',
        'Armor piercing': 'Perforación de armadura',
        'Thorns (damage attacker)': 'Espinas (daño al atacante)',
        'Aura': 'Aura',
        'attack to allies': 'ataque a aliados',
        'armor to allies': 'armadura a aliados',
        'dodge': 'esquivar',
        'physical damage reflection': 'reflejo de daño físico',
        'status reflection': 'reflejo de estado',
        'First shot': 'Primer disparo',
        '3×3 explosion on death': 'Explosión 3×3 al morir',
        'damage': 'daño'
      },
      nodeTypes: { 'Mission': 'Misión', 'Town': 'Ciudad', 'Dungeon': 'Mazmorra', 'Event': 'Evento', 'Boss': 'Jefe', 'Wanderer': 'Viajero', 'Arena': 'Arena', 'Final': 'Final' },
      regions: { 'Region 1 — Wild Forest': 'Región 1 — Bosque Salvaje', 'Region 2 — Dark Lands': 'Región 2 — Tierras Oscuras', 'Region 3 — Citadel of Darkness': 'Región 3 — Ciudadela Oscura' },
      classes: { 'Warrior': 'Guerrero', 'Archer': 'Arquero', 'Mage': 'Mago', 'All heroes': 'Todos los héroes' },
      stats: { 'Attack': 'Ataque', 'Armor': 'Armadura', 'Range': 'Alcance', 'Range': 'Alcance', 'Turn': 'Mov.', 'Mana': 'Maná', 'Speed': 'Velocidad', 'Max HP': 'HP máx.', 'Max Mana': 'Maná máx.' }
    }
  };

  const I18N_EXACT = (() => {
    const out = {};
    Object.values(I18N).forEach(entry => {
      SUPPORTED_LANGUAGES.forEach(lang => {
        const phrase = entry[lang];
        if (!phrase) return;
        const key = phrase.replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
        if (!out[key]) out[key] = entry;
      });
    });
    return out;
  })();
  [
    { ru: 'Огненный элементаль', en: 'Fire Elemental', es: 'Elemental de fuego' },
    { ru: 'Водный элементаль', en: 'Water Elemental', es: 'Elemental de agua' },
    { ru: 'Возникает из предупреждённой лавы. Огонь лечит его, а удар поджигает клетку цели. Одновременно может существовать не более двух.', en: 'Rises from warned lava. Fire heals it, and its strike ignites the ground beneath the target. Up to two may exist at once.', es: 'Surge de la lava anunciada. El fuego lo cura y su golpe incendia la casilla del objetivo. Puede haber hasta dos.' },
    { ru: 'Выманите его из огня и применяйте заморозку. Уничтожьте стражей Титана, чтобы снять стихийный щит.', en: 'Lure it away from fire and use Freeze. Destroy the Titan guards to break its elemental shield.', es: 'Sácalo del fuego y congélalo. Destruye a los guardianes del Titán para romper su escudo.' },
    { ru: 'Возникает во время предупреждённого прилива. Свободно ходит по воде, получает там броню и отталкивает героев ударом.', en: 'Rises with the warned tide. It moves freely through water, gains armor there, and pushes heroes with its attack.', es: 'Surge con la marea anunciada. Se mueve libremente por el agua, gana armadura y empuja al atacar.' },
    { ru: 'Сражайтесь с ним на суше или вытолкните его из воды. Уничтожьте стражей Гидры, чтобы снять приливный щит.', en: 'Fight it on dry ground or force it out of water. Destroy the Hydra guards to break its tidal shield.', es: 'Combate en tierra seca o sácalo del agua. Destruye a los guardianes de la Hidra para romper su escudo.' },
    { ru: 'Огонь лечит его. Атака поджигает клетку цели, а смерть вызывает небольшой взрыв.', en: 'Fire heals it. Its attack ignites the target tile, and it explodes on death.', es: 'El fuego lo cura. Su ataque incendia la casilla y explota al morir.' },
    { ru: 'Свободно ходит по воде, получает там +2 брони и отталкивает цель при попадании.', en: 'Moves freely through water, gains +2 armor there, and pushes its target on hit.', es: 'Se mueve libremente por el agua, gana +2 de armadura y empuja al golpear.' }
  ].forEach(entry => Object.values(entry).forEach(value => { I18N_EXACT[normalizeI18nText(value).toLowerCase()] = entry; }));

  function currentLanguage() { return SUPPORTED_LANGUAGES.includes(GameLanguage) ? GameLanguage : 'ru'; }
  function translateKey(key) { return (I18N[key] && I18N[key][currentLanguage()]) || (I18N[key] && I18N[key].ru) || key; }
  function campaignRegionName(region) {
    const value = Math.max(1, Math.min(3, Number(region) || 1));
    return translateKey(`regionName${value}`);
  }
  function normalizeI18nText(text) { return String(text || '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim(); }
  function reverseMap(obj) { return Object.fromEntries(Object.entries(obj || {}).map(([k, v]) => [v, k])); }
  I18N_DYNAMIC.ru = {
    terms: reverseMap(I18N_DYNAMIC.en.terms),
    nodeTypes: reverseMap(I18N_DYNAMIC.en.nodeTypes),
    regions: reverseMap(I18N_DYNAMIC.en.regions),
    classes: reverseMap(I18N_DYNAMIC.en.classes),
    stats: reverseMap(I18N_DYNAMIC.en.stats)
  };
  ['terms', 'nodeTypes', 'regions', 'classes', 'stats'].forEach(group => {
    const enMap = I18N_DYNAMIC.en[group] || {};
    const esMap = I18N_DYNAMIC.es[group] || {};
    Object.entries(enMap).forEach(([ru, en]) => {
      if (esMap[ru] && !esMap[en]) esMap[en] = esMap[ru];
    });
  });
  function translateText(text) {
    const target = currentLanguage();
    if (!text || !normalizeI18nText(text)) return text;
    const raw = String(text);
    const leading = raw.match(/^\s*/)[0];
    const trailing = raw.match(/\s*$/)[0];
    const core = normalizeI18nText(raw);
    const exact = I18N_EXACT[core.toLowerCase()];
    if (exact && exact[target]) return leading + exact[target] + trailing;
    return leading + translateDynamicText(core, target) + trailing;
  }
  function localizeContent(value) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value[currentLanguage()] || value.ru || value.en || '';
    }
    return translateText(value);
  }
  function translateDynamicText(text, target) {
    const d = I18N_DYNAMIC[target] || I18N_DYNAMIC.en;
    let out = text;
    out = out.replace(/^Gold: (\d+) \| Region: (\d+) \| Turn: (\d+)$/, target === 'es' ? 'Oro: $1 | Región: $2 | Turno: $3' : 'Gold: $1 | Region: $2 | Turn: $3');
    out = out.replace(/^OPENED: (\d+) \/ (\d+)$/, target === 'es' ? 'ABIERTO: $1 / $2' : 'OPENED: $1 / $2');
    out = out.replace(/^Region (\d+) · (.+)$/, (_, r, type) => `${target === 'es' ? 'Región' : 'Region'} ${r} · ${(d.nodeTypes && d.nodeTypes[type]) || type}`);
    out = out.replace(/^Region (\d+)$/, (_, r) => `${target === 'es' ? 'Región' : 'Region'} ${r}`);
    out = replaceTerms(out, d.nodeTypes || {});
    Object.entries(d.regions || {}).forEach(([ru, tr]) => { out = out.replace(ru, tr); });
    out = replaceTerms(out, d.terms || {});
    out = replaceTerms(out, d.classes || {});
    out = replaceTerms(out, d.stats || {});
    out = out.replace(/\u0423\u0440\. (\d+)/g, target === 'ru' ? 'Ур. $1' : target === 'es' ? 'Nv. $1' : 'Lv. $1');
    out = out.replace(/\u0443\u0440\.(\d+)/g, target === 'es' ? 'nv.$1' : 'lv.$1');
    out = out.replace(/\u0443\u0440\. (\d+)/g, target === 'es' ? 'nv. $1' : 'lv. $1');
    out = out.replace(/stock: (\d+)/g, target === 'es' ? 'en reserva: $1' : 'stock: $1');
    out = out.replace(/\u0443\u043b\u0443\u0447\u0448\u0435\u043d\u0438\u0435 (\d+)💰/g, target === 'es' ? 'mejora $1💰' : 'upgrade $1💰');
    out = out.replace(/^\u0411\u043b\u0438\u0436\u0430\u0439\u0448\u0438\u0445 \u0431\u043e\u0451\u0432 \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e\.$/, target === 'es' ? 'No hay batallas cercanas.' : 'No nearby battles found.');
    out = out.replace(/^Veira intel: /, target === 'es' ? 'Informe de Veira: ' : 'Veira intel: ');
    out = out.replace(/^\u041d\u0435\u0434\u043e\u0441\u0442\u0430\u0442\u043e\u0447\u043d\u043e \u0437\u043e\u043b\u043e\u0442\u0430\.$/, target === 'es' ? 'No hay suficiente oro.' : 'Not enough gold.');
    out = out.replace(/^Saving \u043d\u0435 \u043d\u0430\u0439\u0434\u0435\u043d\u043e\.$/, target === 'es' ? 'Guardado no encontrado.' : 'Save not found.');
    return out;
  }
  function replaceTerms(text, terms) {
    let out = text;
    Object.entries(terms)
      .sort((a, b) => b[0].length - a[0].length)
      .forEach(([ru, tr]) => { out = out.split(ru).join(tr); });
    return out;
  }
  function escapeRegExp(value) { return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  let i18nObserver = null;
  let i18nScheduled = false;
  let i18nApplying = false;
  function localizeUI(root) {
    const target = currentLanguage();
    document.documentElement.lang = target;
    document.title = I18N.pageTitle[target] || I18N.pageTitle.ru;
    const start = root || document.body;
    if (!start || i18nApplying) return;
    i18nApplying = true;
    const walker = document.createTreeWalker(start, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement;
        if (!p || p.closest('script,style,textarea,select,[data-i18n-skip]')) return NodeFilter.FILTER_REJECT;
        return normalizeI18nText(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
      }
    });
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const next = translateText(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    });
    start.querySelectorAll('[title],[aria-label],[placeholder],[alt]').forEach(el => {
      ['title', 'aria-label', 'placeholder', 'alt'].forEach(attr => {
        if (!el.hasAttribute(attr)) return;
        const next = translateText(el.getAttribute(attr));
        if (next !== el.getAttribute(attr)) el.setAttribute(attr, next);
      });
    });
    const langSelect = document.getElementById('setting-language');
    if (langSelect) langSelect.value = target;
    updateRegionClouds();
    i18nApplying = false;
  }
  function scheduleLocalize(root) {
    if (i18nApplying || i18nScheduled) return;
    i18nScheduled = true;
    requestAnimationFrame(() => {
      i18nScheduled = false;
      localizeUI(root || document.body);
    });
  }
  function startI18nObserver() {
    if (i18nObserver || !document.body) return;
    i18nObserver = new MutationObserver(() => scheduleLocalize(document.body));
    i18nObserver.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['title', 'aria-label', 'placeholder', 'alt'] });
    scheduleLocalize(document.body);
  }
  function setGameLanguage(lang, options = {}) {
    if (!SUPPORTED_LANGUAGES.includes(lang)) return;
    GameLanguage = lang;
    if (options.persist !== false) {
      try { localStorage.setItem(LANGUAGE_KEY, lang); } catch (_) {}
    }
    refreshLocalizedScreen();
    localizeUI(document.body);
  }
  function updateRecordsSummary() {
    const el = document.getElementById('settings-records');
    if (!el) return;
    const r = loadRecords();
    const turns = r.bestVictoryTurns ? String(r.bestVictoryTurns) : translateKey('noRecord');
    el.innerHTML = `
      <div class="menu-record-cell"><div class="menu-record-val">${r.maxGold || 0}</div><div class="menu-record-label">${translateKey('recordGold')}</div></div>
      <div class="menu-record-cell"><div class="menu-record-val">${r.enemiesDefeated || 0}</div><div class="menu-record-label">${translateKey('recordKills')}</div></div>
      <div class="menu-record-cell"><div class="menu-record-val">${turns}</div><div class="menu-record-label">${translateKey('recordTurns')}</div></div>
    `;
    const history = document.getElementById('settings-run-history');
    if (!history) return;
    const entries = Array.isArray(GameState.runHistory) ? GameState.runHistory.slice(0, 3) : [];
    history.innerHTML = entries.length
      ? entries.map((entry, index) => {
          const contract = typeof CampaignExpansion !== 'undefined' ? CampaignExpansion.CONTRACTS[entry.contract] : null;
          const title = contract ? `${contract.icon} ${CampaignExpansion.loc(contract.name)}` : entry.contract;
          const seed = escapeHtml(String(entry.seed));
          return `<button class="run-history-entry" type="button" data-replay-index="${index}"><span>${title} · ${entry.turn} ${translateKey('turn')}</span><small>${entry.result === 'victory' ? '🏆' : '☠️'} ${seed}</small></button>`;
        }).join('')
      : `<small class="run-history-empty">${currentLanguage() === 'ru' ? 'Завершённые походы появятся здесь.' : 'Completed runs will appear here.'}</small>`;
    history.querySelectorAll('[data-replay-index]').forEach(button => {
      button.onclick = () => replayCampaign(Number(button.dataset.replayIndex));
    });
  }
  function updateHud() {
    const center = document.getElementById('topbar-center');
    if (center) {
      // Three separate things, so they are marked up as three: a resource, the
      // place the party is in, and a counter. Written as one pipe-separated line
      // they read as a status bar in a terminal, which is what they used to be.
      center.innerHTML = `<span class="hud-stat hud-stat-gold">`
        + `<span class="hud-stat-label">${translateKey('gold')}</span>`
        + `<span class="hud-stat-value" id="gold-display">${GameState.gold}</span></span>`
        + `<span class="hud-place" id="region-display">${campaignRegionName(GameState.region)}</span>`
        + `<span class="hud-stat">`
        + `<span class="hud-stat-label">${translateKey('turn')}</span>`
        + `<span class="hud-stat-value" id="turn-display">${GameState.turn}</span></span>`;
    }
    const menuBtn = document.getElementById('btn-open-menu');
    if (menuBtn) menuBtn.textContent = `☰ ${translateKey('menu')}`;
    const battleVisible = ActiveScreen === 'battle' && !!GameState.currentBattle;
    const objective = document.getElementById('battle-objective-top');
    const inventoryBtn = document.getElementById('btn-battle-inventory');
    const bestiaryBtn = document.getElementById('btn-battle-bestiary');
    inventoryBtn?.classList.toggle('hidden', !battleVisible);
    bestiaryBtn?.classList.toggle('hidden', !battleVisible);
    if (inventoryBtn) inventoryBtn.innerHTML = `<span class="battle-top-icon" aria-hidden="true">🎒</span><span class="battle-top-label">${translateKey('battleInventory').replace(/^[^\p{L}\p{N}]+/u, '')}</span>`;
    if (bestiaryBtn) bestiaryBtn.innerHTML = `<span class="battle-top-icon" aria-hidden="true">📖</span><span class="battle-top-label">${translateKey('bestiary').replace(/^[^\p{L}\p{N}]+/u, '')}</span>`;
    if (objective) {
      const status = battleVisible && typeof CampaignExpansion !== 'undefined'
        ? CampaignExpansion.scenarioStatus(GameState.currentBattle) : null;
      const battle = GameState.currentBattle;
      let short = '';
      if (status && battle) {
        if (status.id === 'eliminate') short = CampaignExpansion.loc({ ru: 'Разгром: победите всех', en: 'Eliminate: defeat all', es: 'Eliminar: derrota a todos' });
        else if (status.id === 'holdout') short = CampaignExpansion.loc({ ru: `Выдержка: раунд ${Math.min(battle.round, battle.scenario.roundTarget)}/${battle.scenario.roundTarget}`, en: `Holdout: round ${Math.min(battle.round, battle.scenario.roundTarget)}/${battle.scenario.roundTarget}`, es: `Resiste: ronda ${Math.min(battle.round, battle.scenario.roundTarget)}/${battle.scenario.roundTarget}` });
        else if (status.id === 'waves') short = CampaignExpansion.loc({ ru: `Волны: раунд ${Math.min(battle.round, battle.scenario.roundTarget)}/${battle.scenario.roundTarget}`, en: `Waves: round ${Math.min(battle.round, battle.scenario.roundTarget)}/${battle.scenario.roundTarget}`, es: `Oleadas: ronda ${Math.min(battle.round, battle.scenario.roundTarget)}/${battle.scenario.roundTarget}` });
        else if (status.id === 'escape') short = CampaignExpansion.loc({ ru: 'Прорыв: герой → правый край', en: 'Escape: hero → right edge', es: 'Escape: héroe → borde derecho' });
        else if (status.id === 'defense') short = CampaignExpansion.loc({ ru: `Защита: оберег ${battle.scenario.ward.hp}/${battle.scenario.ward.maxHp} · ${battle.round}/${battle.scenario.roundTarget}`, en: `Defense: ward ${battle.scenario.ward.hp}/${battle.scenario.ward.maxHp} · ${battle.round}/${battle.scenario.roundTarget}`, es: `Defensa: sello ${battle.scenario.ward.hp}/${battle.scenario.ward.maxHp} · ${battle.round}/${battle.scenario.roundTarget}` });
        else if (status.id === 'ritual') short = CampaignExpansion.loc({ ru: `Ритуал: уничтожить цель · ${Math.max(0, battle.scenario.roundLimit - battle.round + 1)} ходов`, en: `Ritual: destroy target · ${Math.max(0, battle.scenario.roundLimit - battle.round + 1)} turns`, es: `Ritual: destruye objetivo · ${Math.max(0, battle.scenario.roundLimit - battle.round + 1)} turnos` });
        else if (status.id === 'hunt') short = CampaignExpansion.loc({ ru: 'Охота: цель → правый край', en: 'Hunt: target → right edge', es: 'Caza: objetivo → borde derecho' });
      }
      const text = status ? `${status.icon} ${short || status.label}` : '';
      objective.textContent = text;
      objective.title = text;
      objective.classList.toggle('hidden', !text);
    }
  }
  function updateRegionClouds() {
    [2, 3].forEach(region => {
      const el = document.getElementById(`region-cloud-${region}`);
      if (!el) return;
      const locked = (GameState.regionUnlocked || 1) < region;
      el.classList.toggle('hidden', !locked);
      const label = el.querySelector('.map-region-cloud-label');
      if (label) label.innerHTML = `${translateKey('lockedRegion')}<br>${translateKey('defeatBoss')}`;
    });
  }
  function refreshLocalizedScreen() {
    try {
      updateMenuMeta();
      updateStaticLabels();
      updateRecordsSummary();
      updateHud();
      if (ActiveScreen === 'map') renderMap();
      else if (ActiveScreen === 'city') renderCityUI();
      else if (ActiveScreen === 'battle') updateBattleUI();
      else if (ActiveScreen === 'inventory') renderInventoryScreen();
      else if (ActiveScreen === 'bestiary') renderBestiary();
    } catch (_) {}
  }
  function updateStaticLabels() {
    const tutorialBtn = document.getElementById('btn-menu-tutorial');
    if (tutorialBtn) tutorialBtn.textContent = translateKey('tutorial');
  }

  function loadAudioSettings() {
    const def = { musicEnabled: true, musicVolume: 0.7, sfxEnabled: true, sfxVolume: 0.75 };
    try {
      const raw = localStorage.getItem(AUDIO_SETTINGS_KEY);
      if (!raw) return def;
      const o = JSON.parse(raw);
      return {
        musicEnabled: o.musicEnabled !== false,
        musicVolume: Math.min(1, Math.max(0, typeof o.musicVolume === 'number' ? o.musicVolume : def.musicVolume)),
        sfxEnabled: o.sfxEnabled !== false,
        sfxVolume: Math.min(1, Math.max(0, typeof o.sfxVolume === 'number' ? o.sfxVolume : def.sfxVolume))
      };
    } catch (_) { return def; }
  }
  function saveAudioSettings(partial) {
    const cur = loadAudioSettings();
    const next = Object.assign({}, cur, partial);
    try { localStorage.setItem(AUDIO_SETTINGS_KEY, JSON.stringify(next)); } catch (_) {}
    return next;
  }

  function screenToBgmTheme(screenName) {
    if (screenName === 'menu' || screenName === 'victory' || screenName === 'ending') return 'menu-cinematic';
    if (screenName === 'battle') return 'battle';
    return 'exploration';
  }

  const GameBGM = {
    lastScreen: 'menu',
    audio: null,
    indices: { 'menu-cinematic': 0, battle: 0, exploration: 0 },
    lastPlaybackTheme: null,
    lastLoadedUrl: '',
    pausedByHide: false,
    unlocked: false,

    init() {
      this.audio = new Audio();
      this.audio.preload = 'auto';
      this.applyVolumeFromSettings();
      this.audio.addEventListener('ended', () => this.onTrackEnded());
      document.addEventListener('visibilitychange', () => this.onVisibilityChange());
      window.addEventListener('pagehide', () => {
        if (!this.audio) return;
        this.pausedByHide = !this.audio.paused;
        this.audio.pause();
      });
      const gc = document.getElementById('game-container');
      if (gc) {
        gc.addEventListener('pointerdown', () => {
          this.unlock();
          if (typeof BattleSfx !== 'undefined') BattleSfx.unlock();
        }, { capture: true, once: true });
      }
    },

    unlock() {
      if (this.unlocked) return;
      this.unlocked = true;
      this.syncToScreen(this.lastScreen);
    },

    applyVolumeFromSettings() {
      if (!this.audio) return;
      const s = loadAudioSettings();
      this.audio.volume = s.musicEnabled ? s.musicVolume : 0;
    },

    onVisibilityChange() {
      if (!this.audio) return;
      if (document.hidden) {
        this.pausedByHide = !this.audio.paused;
        this.audio.pause();
      } else if (this.pausedByHide) {
        this.pausedByHide = false;
        const s = loadAudioSettings();
        if (s.musicEnabled && this.unlocked) {
          this.audio.play().catch(() => {});
        }
      }
    },

    onTrackEnded() {
      const theme = this.lastPlaybackTheme;
      if (!theme || !BGM_TRACKS[theme]) return;
      if (screenToBgmTheme(this.lastScreen) !== theme) return;
      const list = BGM_TRACKS[theme];
      this.indices[theme] = (this.indices[theme] + 1) % list.length;
      this.lastLoadedUrl = '';
      this.syncToScreen(this.lastScreen);
    },

    syncToScreen(screenName) {
      this.lastScreen = screenName || 'menu';
      if (!this.audio) return;
      const s = loadAudioSettings();
      if (!s.musicEnabled) {
        this.audio.pause();
        this.applyVolumeFromSettings();
        return;
      }
      if (!this.unlocked) return;

      const theme = screenToBgmTheme(this.lastScreen);
      const list = BGM_TRACKS[theme];
      if (!list || !list.length) return;
      const idx = this.indices[theme] % list.length;
      const rel = list[idx];
      let abs = rel;
      try { abs = new URL(rel, window.location.href).href; } catch (_) {}

      this.lastPlaybackTheme = theme;
      this.applyVolumeFromSettings();

      if (this.lastLoadedUrl !== abs) {
        this.lastLoadedUrl = abs;
        this.audio.src = rel;
        this.audio.play().catch(() => {});
      } else if (this.audio.paused && !document.hidden) {
        this.audio.play().catch(() => {});
      }
    }
  };

  const AD_MIN_INTERVAL_MS = 3 * 60 * 1000;
  const INTERSTITIAL_MIN_INTERVAL_MS = 4 * 60 * 1000;
  const BONUS_GOLD_CD_MS = 5 * 60 * 1000;
  const MAP_COLS = WorldMapTopology.COLS;
  const MAP_ROWS = WorldMapTopology.ROWS;
  const MAP_CELL_TOTAL = MAP_COLS * MAP_ROWS;
