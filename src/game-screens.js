/* Three Blades ? Map, economy, menus and application initialization.
 * Extracted from index.html; load order is intentional.
 */
  //══════════ Map / economy / screens ══════════
  function getCellById(id) { return GameState.mapGrid.find(c => c.id === id); }
  function getCurrentCell() { return GameState.mapGrid.find(c => c.x === GameState.playerPos.x && c.y === GameState.playerPos.y); }
  function mapFogVisitedAdd(row, col) {
    const key = `${row},${col}`;
    if (!GameState.mapFogVisited.includes(key)) GameState.mapFogVisited.push(key);
  }
  function ensureCurrentCellFogVisited() {
    const p = GameState.playerPos;
    if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
      mapFogVisitedAdd(p.y, p.x);
      const node = getCurrentCell();
      if (node) node.visited = true;
    }
  }
  /** In-game message shown instead of browser alert. */
  function showGameAlert(message) {
    return new Promise(resolve => {
      const el = document.getElementById('game-alert-modal');
      const ta = document.getElementById('game-alert-text');
      const ok = document.getElementById('game-alert-ok');
      if (!el || !ta || !ok) { resolve(); return; }
      ta.textContent = translateText(message);
      el.classList.remove('hidden');
      localizeUI(el);
      ok.onclick = () => {
        el.classList.add('hidden');
        ok.onclick = null;
        resolve();
      };
    });
  }
  function tutorialSlides() {
    return [
      {
        icon: '⚔',
        title: translateKey('tutorialTitle1'),
        subtitle: translateKey('tutorialSub1'),
        text: translateKey('tutorialText1'),
        tips: [
          [translateKey('tutorialTip1aTitle'), translateKey('tutorialTip1aText')],
          [translateKey('tutorialTip1bTitle'), translateKey('tutorialTip1bText')]
        ]
      },
      {
        icon: '🗺',
        title: translateKey('tutorialTitle2'),
        subtitle: translateKey('tutorialSub2'),
        text: translateKey('tutorialText2'),
        tips: [
          [translateKey('tutorialTip2aTitle'), translateKey('tutorialTip2aText')],
          [translateKey('tutorialTip2bTitle'), translateKey('tutorialTip2bText')]
        ]
      }
    ];
  }
  function mapIntroductionSlides() {
    const lang = currentLanguage();
    if (lang === 'en') return [
      {
        icon: '🗺️', title: 'THE ROAD OF THREE BLADES', subtitle: 'The path is yours now',
        text: 'The first blood has been spilled. From here, choose one of the neighboring trails: each may lead to battle, shelter, treasure, or trouble.',
        tips: [['Follow the marks', 'Select one of the available neighboring locations to advance.'], ['Prepare', 'Towns offer healing, equipment, and supplies before harder battles.']]
      },
      {
        icon: '🏰', title: 'THREE CURSED LANDS', subtitle: 'Break the seals on the road to the Dark Lord',
        text: `${campaignRegionName(1)}, ${campaignRegionName(2)}, and ${campaignRegionName(3)} stand between the party and its quarry.`,
        tips: [['Your task', 'Find and defeat the guardian of each land. Its fall opens the road onward.'], ['Choose wisely', 'Short routes save strength; detours may bring gold, equipment, and safer preparation.']]
      }
    ];
    if (lang === 'es') return [
      {
        icon: '🗺️', title: 'LA SENDA DE LAS TRES ESPADAS', subtitle: 'Ahora el camino es tuyo',
        text: 'La primera sangre ya se ha derramado. Desde aquí, elige una senda cercana: puede llevar a una batalla, un refugio, un tesoro o un peligro.',
        tips: [['Sigue las señales', 'Elige una ubicación cercana disponible para avanzar.'], ['Prepárate', 'En las ciudades puedes curarte y comprar equipo y provisiones.']]
      },
      {
        icon: '🏰', title: 'TRES TIERRAS MALDITAS', subtitle: 'Rompe los sellos del camino al Señor Oscuro',
        text: `${campaignRegionName(1)}, ${campaignRegionName(2)} y ${campaignRegionName(3)} se alzan entre el grupo y su presa.`,
        tips: [['Tu misión', 'Encuentra y derrota al guardián de cada tierra para abrir el siguiente camino.'], ['Elige bien', 'La ruta corta ahorra fuerzas; los desvíos pueden dar oro, equipo y preparación.']]
      }
    ];
    return [
      {
        icon: '🗺️', title: 'ТРОПА ТРЁХ КЛИНКОВ', subtitle: 'Теперь путь выбираете вы',
        text: 'Первая кровь пролита. Отныне выбирайте одну из соседних троп: за ней может ждать битва, приют, добыча или беда.',
        tips: [['Следуйте знакам', 'Чтобы продолжить поход, выберите одну из доступных соседних точек.'], ['Готовьтесь', 'В городах можно вылечиться, купить снаряжение и пополнить припасы.']]
      },
      {
        icon: '🏰', title: 'ТРИ ПРОКЛЯТЫЕ ЗЕМЛИ', subtitle: 'Сорвите печати на пути к Тёмному Лорду',
        text: `${campaignRegionName(1)}, ${campaignRegionName(2)} и ${campaignRegionName(3)} лежат между отрядом и его целью.`,
        tips: [['Ваша задача', 'Найдите и одолейте хранителя каждой земли — его гибель откроет путь дальше.'], ['Выбирайте путь', 'Короткая дорога бережёт силы, а обходная может принести золото, снаряжение и передышку.']]
      }
    ];
  }

  const STORY_PORTRAITS = {
    garet: 'assets/portraits/garet-dialog.png',
    alira: 'assets/portraits/alira-dialog.png',
    seris: 'assets/portraits/seris-dialog.png'
  };

  function storySceneData(sceneId) {
    const lang = currentLanguage();
    const scenes = {
      ru: {
        region1: {
          kicker: 'ПЕЧАТЬ ЛЕСА СОРВАНА', title: 'Шёпот под корнями',
          lines: [
            ['alira', 'Алира', 'Леший пал, и лес снова дышит. Но послушайте: под землёй гудит огонь. Кто-то разбудил древние кузни.'],
            ['seris', 'Сэрис', 'Это не просто пламя. Первая печать питала врата Тёмного Лорда. Теперь путь ведёт в Огненные глубины.'],
            ['garet', 'Гарет', 'Значит, передышка будет короткой. Соберём припасы в городе и спустимся туда вместе.']
          ]
        },
        region2: {
          kicker: 'ПЕЧАТЬ ПЛАМЕНИ СОКРУШЕНА', title: 'Пепел древней клятвы',
          lines: [
            ['garet', 'Гарет', 'Титан погас. Его пламя больше не закалит оружие Тёмного Лорда.'],
            ['alira', 'Алира', 'В золе я нашла морскую соль. Подземная река уходит к руинам, которых давно нет ни на одной карте.'],
            ['seris', 'Сэрис', 'Затонувшие руины помнят последнюю печать. За ней нас уже ждёт хозяин этой войны.']
          ]
        },
        region3: {
          kicker: 'ПОСЛЕДНЯЯ ПЕЧАТЬ ПАЛА', title: 'Врата Тьмы',
          lines: [
            ['seris', 'Сэрис', 'Руины отпустили нас. Три печати разрушены, и крепость Тёмного Лорда проступает сквозь туман.'],
            ['alira', 'Алира', 'Назад дороги уже не будет. Но впервые за весь поход враг боится нас сильнее, чем мы его.'],
            ['garet', 'Гарет', 'Три клинка дошли до конца пути. Проверим снаряжение — и закончим эту войну.']
          ]
        },
        finale: {
          kicker: 'ЭПИЛОГ', title: 'Рассвет трёх клинков',
          lines: [
            ['garet', 'Гарет', 'Тёмный Лорд повержен. Его крепость рушится — пора уходить, пока камни не погребли нашу победу.'],
            ['seris', 'Сэрис', 'Магия печатей исчезла. Лес, глубины и руины больше не связаны его волей. Мир снова принадлежит живым.'],
            ['alira', 'Алира', 'Тогда вернёмся домой не легендами, а людьми. Хотя про три клинка я бы всё-таки оставила хорошую песню.'],
            ['garet', 'Гарет', 'Пусть её поют те, кому больше не приходится брать в руки меч.']
          ]
        }
      },
      en: {
        region1: { kicker:'THE FOREST SEAL IS BROKEN', title:'Whispers Beneath the Roots', lines:[
          ['alira','Alira','The Leshy has fallen, and the forest breathes again. But listen—the earth hums with fire. Someone has awakened the ancient forges.'],
          ['seris','Seris','It is more than flame. The first seal fed the Dark Lord\'s gate. Our road now descends into the Fiery Depths.'],
          ['garet','Garet','Then our rest will be brief. We gather supplies in town and descend together.'] ] },
        region2: { kicker:'THE FLAME SEAL IS SHATTERED', title:'Ashes of an Ancient Oath', lines:[
          ['garet','Garet','The Titan is extinguished. Its fire will forge no more weapons for the Dark Lord.'],
          ['alira','Alira','I found sea salt in the ashes. An underground river runs toward ruins erased from every map.'],
          ['seris','Seris','The Sunken Ruins keep the final seal. Beyond it, the master of this war awaits us.'] ] },
        region3: { kicker:'THE LAST SEAL HAS FALLEN', title:'The Gate of Darkness', lines:[
          ['seris','Seris','The ruins have released us. Three seals are broken, and the Dark Lord\'s fortress is taking shape beyond the mist.'],
          ['alira','Alira','There is no road back. But for the first time, our enemy fears us more than we fear him.'],
          ['garet','Garet','Three blades have reached the end of the road. Check your gear—we finish this war now.'] ] },
        finale: { kicker:'EPILOGUE', title:'Dawn of the Three Blades', lines:[
          ['garet','Garet','The Dark Lord is defeated. His fortress is collapsing—move, before the stones bury our victory.'],
          ['seris','Seris','The seals are gone. Forest, depths, and ruins are no longer bound to his will. The world belongs to the living again.'],
          ['alira','Alira','Then let us return home as people, not legends. Though I would keep one good song about the three blades.'],
          ['garet','Garet','Let it be sung by those who no longer need to carry a sword.'] ] }
      },
      es: {
        region1: { kicker:'EL SELLO DEL BOSQUE SE HA ROTO', title:'Susurros bajo las raíces', lines:[
          ['alira','Alira','El Leshy ha caído y el bosque vuelve a respirar. Pero la tierra vibra con fuego: alguien despertó las antiguas forjas.'],
          ['seris','Seris','Es más que una llama. El primer sello alimentaba la puerta del Señor Oscuro. El camino baja hacia las Profundidades Ardientes.'],
          ['garet','Garet','Entonces descansaremos poco. Reuniremos provisiones y descenderemos juntos.'] ] },
        region2: { kicker:'EL SELLO DE FUEGO SE HA QUEBRADO', title:'Cenizas de un juramento', lines:[
          ['garet','Garet','El Titán se ha apagado. Su fuego ya no forjará armas para el Señor Oscuro.'],
          ['alira','Alira','Encontré sal marina entre las cenizas. Un río subterráneo lleva a unas ruinas borradas de todos los mapas.'],
          ['seris','Seris','Las Ruinas Sumergidas guardan el último sello. Tras él nos espera el dueño de esta guerra.'] ] },
        region3: { kicker:'EL ÚLTIMO SELLO HA CAÍDO', title:'La puerta de la oscuridad', lines:[
          ['seris','Seris','Las ruinas nos han liberado. Los tres sellos están rotos y la fortaleza del Señor Oscuro aparece entre la niebla.'],
          ['alira','Alira','Ya no hay vuelta atrás. Pero por primera vez el enemigo nos teme más de lo que nosotros le tememos.'],
          ['garet','Garet','Las tres espadas llegaron al final del camino. Revisad el equipo: hoy terminamos esta guerra.'] ] },
        finale: { kicker:'EPÍLOGO', title:'El alba de las tres espadas', lines:[
          ['garet','Garet','El Señor Oscuro ha caído. Su fortaleza se derrumba; salgamos antes de que las piedras entierren la victoria.'],
          ['seris','Seris','Los sellos desaparecieron. El bosque, las profundidades y las ruinas ya no obedecen su voluntad.'],
          ['alira','Alira','Volvamos a casa como personas, no como leyendas. Aunque conservaría una buena canción sobre las tres espadas.'],
          ['garet','Garet','Que la canten quienes ya no tengan que empuñar una espada.'] ] }
      }
    };
    return (scenes[lang] || scenes.en)[sceneId] || null;
  }

  function showStoryScene(sceneId) {
    const scene = storySceneData(sceneId);
    if (!scene) return Promise.resolve(false);
    return new Promise(resolve => {
      const modal = document.getElementById('story-modal');
      const next = document.getElementById('story-next');
      let index = 0;
      const finish = () => {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        GameState.storyScenesSeen = Array.isArray(GameState.storyScenesSeen) ? GameState.storyScenesSeen : [];
        if (!GameState.storyScenesSeen.includes(sceneId)) GameState.storyScenesSeen.push(sceneId);
        if (GameState.pendingStoryScene === sceneId) GameState.pendingStoryScene = null;
        saveGame();
        resolve(true);
      };
      const render = () => {
        const [heroId, speaker, text] = scene.lines[index];
        const portrait = document.getElementById('story-portrait');
        portrait.src = STORY_PORTRAITS[heroId];
        portrait.alt = speaker;
        document.getElementById('story-kicker').textContent = scene.kicker;
        document.getElementById('story-title').textContent = scene.title;
        document.getElementById('story-speaker').textContent = speaker;
        document.getElementById('story-text').textContent = text;
        document.getElementById('story-progress').textContent = `${index + 1} / ${scene.lines.length}`;
        next.textContent = index === scene.lines.length - 1
          ? (currentLanguage() === 'ru' ? 'Продолжить' : currentLanguage() === 'es' ? 'Continuar' : 'Continue')
          : (currentLanguage() === 'ru' ? 'Далее' : currentLanguage() === 'es' ? 'Siguiente' : 'Next');
      };
      next.onclick = () => { if (index < scene.lines.length - 1) { index++; render(); } else finish(); };
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');
      render();
    });
  }

  function queueRegionalStory(region) {
    const sceneId = `region${region}`;
    if ((GameState.storyScenesSeen || []).includes(sceneId)) return;
    GameState.pendingStoryScene = sceneId;
  }

  function consumePendingStoryScene() {
    const sceneId = GameState.pendingStoryScene;
    if (!sceneId) return Promise.resolve(false);
    return showStoryScene(sceneId);
  }
  function markTutorialSeen() {
    try { localStorage.setItem(TUTORIAL_SEEN_KEY, '1'); } catch (_) {}
  }
  function shouldShowFirstRunTutorial() {
    try { return localStorage.getItem(TUTORIAL_SEEN_KEY) !== '1'; } catch (_) { return true; }
  }
  function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  }
  function showOnboarding(options = {}) {
    return new Promise(resolve => {
      const modal = document.getElementById('onboarding-modal');
      const iconEl = document.getElementById('onboarding-icon');
      const titleEl = document.getElementById('onboarding-title');
      const subEl = document.getElementById('onboarding-subtitle');
      const textEl = document.getElementById('onboarding-text');
      const tipsEl = document.getElementById('onboarding-tips');
      const progressEl = document.getElementById('onboarding-progress');
      const skipBtn = document.getElementById('onboarding-skip');
      const nextBtn = document.getElementById('onboarding-next');
      if (!modal || !iconEl || !titleEl || !subEl || !textEl || !tipsEl || !progressEl || !skipBtn || !nextBtn) {
        resolve();
        return;
      }
      const slides = Array.isArray(options.slides) && options.slides.length ? options.slides : tutorialSlides();
      let idx = 0;
      const finish = () => {
        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
        skipBtn.onclick = null;
        nextBtn.onclick = null;
        if (options.markSeen !== false) markTutorialSeen();
        resolve();
      };
      const render = () => {
        const slide = slides[idx];
        iconEl.textContent = slide.icon;
        titleEl.textContent = slide.title;
        subEl.textContent = `${translateKey('tutorialStepCounter')} ${idx + 1}/${slides.length} · ${slide.subtitle}`;
        textEl.textContent = slide.text;
        tipsEl.innerHTML = slide.tips.map(([title, text]) => `
          <div class="onboarding-tip">
            <div class="onboarding-tip-title">${escapeHtml(title)}</div>
            <div class="onboarding-tip-text">${escapeHtml(text)}</div>
          </div>
        `).join('');
        progressEl.innerHTML = slides.map((_, i) => `<span class="onboarding-dot${i === idx ? ' active' : ''}"></span>`).join('');
        skipBtn.textContent = idx === 0 ? translateKey('tutorialSkip') : translateKey('tutorialBack');
        nextBtn.textContent = idx === slides.length - 1 ? (options.finishLabel || translateKey('tutorialPlay')) : translateKey('tutorialNext');
      };
      skipBtn.onclick = () => {
        if (idx > 0) {
          idx--;
          render();
        } else {
          finish();
        }
      };
      nextBtn.onclick = () => {
        if (idx < slides.length - 1) {
          idx++;
          render();
        } else {
          finish();
        }
      };
      render();
      modal.classList.remove('hidden');
      modal.setAttribute('aria-hidden', 'false');
      if (options.manual) markTutorialSeen();
    });
  }
  function showMapIntroduction() {
    if (GameState.mapIntroShown) return Promise.resolve();
    GameState.mapIntroShown = true;
    saveGame();
    const finishLabel = currentLanguage() === 'ru' ? 'В путь' : currentLanguage() === 'es' ? 'En marcha' : 'Set out';
    return showOnboarding({ slides: mapIntroductionSlides(), markSeen: false, finishLabel });
  }
  /** In-game confirmation shown instead of browser confirm. */
  function showGameConfirm(message) {
    return new Promise(resolve => {
      const el = document.getElementById('confirm-modal');
      const textEl = document.getElementById('confirm-text');
      const yesBtn = document.getElementById('confirm-yes');
      const noBtn = document.getElementById('confirm-no');
      if (!el || !textEl || !yesBtn || !noBtn) { resolve(false); return; }
      textEl.textContent = translateText(message);
      el.classList.remove('hidden');
      localizeUI(el);
      const cleanup = () => {
        yesBtn.onclick = null;
        noBtn.onclick = null;
        el.classList.add('hidden');
      };
      yesBtn.onclick = () => { cleanup(); resolve(true); };
      noBtn.onclick = () => { cleanup(); resolve(false); };
    });
  }
  /** In-game single-choice prompt. options: { value, label }[] */
  function showGamePickOne(message, options) {
    return new Promise(resolve => {
      const el = document.getElementById('game-prompt-modal');
      const lab = document.getElementById('game-prompt-label');
      const sel = document.getElementById('game-prompt-select');
      const okBtn = document.getElementById('game-prompt-ok');
      const cancelBtn = document.getElementById('game-prompt-cancel');
      if (!el || !lab || !sel || !okBtn || !cancelBtn) { resolve(null); return; }
      lab.textContent = translateText(message);
      sel.innerHTML = '';
      options.forEach(o => {
        const opt = document.createElement('option');
        opt.value = o.value;
        opt.textContent = o.label;
        sel.appendChild(opt);
      });
      el.classList.remove('hidden');
      const finish = val => {
        okBtn.onclick = null;
        cancelBtn.onclick = null;
        el.classList.add('hidden');
        resolve(val);
      };
      okBtn.onclick = () => finish(sel.value);
      cancelBtn.onclick = () => finish(null);
    });
  }

  function sfxShortPath(url) {
    return String(url || '').replace(/^assets\/audio\//, '');
  }

  function setSfxAuditorStatus(text) {
    const el = document.getElementById('sfx-auditor-status');
    if (el) el.textContent = text || '';
  }

  function renderSfxAuditor() {
    const root = document.getElementById('sfx-auditor-body');
    if (!root) return;
    const overrides = loadSfxOverrides();
    SFX_AUDITOR_GROUPS.forEach(group => group.candidates.forEach(([, url]) => addBattleSfxUrl(url)));
    root.innerHTML = SFX_AUDITOR_GROUPS.map(group => {
      const current = BSX[group.target] || overrides[group.target] || '';
      const rows = group.candidates.map(([label, url], idx) => {
        const active = url === current;
        return `<div class="sfx-candidate" data-sfx-target="${group.target}" data-sfx-url="${escapeHtmlAttr(url)}">
            <button type="button" class="btn sfx-play-btn" data-sfx-play title="Play">▶</button>
          <div>
            <div class="sfx-candidate-name">${idx + 1}. ${label}</div>
            <div class="sfx-candidate-src">${sfxShortPath(url)}</div>
          </div>
            <button type="button" class="btn sfx-apply-btn${active ? ' active' : ''}" data-sfx-apply>${active ? 'SELECTED' : 'SELECT'}</button>
        </div>`;
      }).join('');
      return `<section class="sfx-group">
        <div class="sfx-group-head">
          <div class="sfx-group-title">${group.title}</div>
          <div class="sfx-group-current">${sfxShortPath(current)}</div>
        </div>
        ${rows}
      </section>`;
    }).join('');

    root.querySelectorAll('[data-sfx-play]').forEach(btn => {
      btn.onclick = async ev => {
        ev.stopPropagation();
        const row = btn.closest('.sfx-candidate');
        const url = row && row.getAttribute('data-sfx-url');
        setSfxAuditorStatus(`Loading: ${sfxShortPath(url)}`);
        const ok = typeof BattleSfx !== 'undefined' && await BattleSfx.auditionUrl(url, 0.9);
        setSfxAuditorStatus(ok ? `Playing: ${sfxShortPath(url)}` : `Failed to load: ${sfxShortPath(url)}`);
      };
    });
    root.querySelectorAll('[data-sfx-apply]').forEach(btn => {
      btn.onclick = ev => {
        ev.stopPropagation();
        const row = btn.closest('.sfx-candidate');
        const target = row && row.getAttribute('data-sfx-target');
        const url = row && row.getAttribute('data-sfx-url');
        const ok = applySfxOverride(target, url);
        if (ok) {
          const next = loadSfxOverrides();
          next[target] = url;
          saveSfxOverrides(next);
          if (typeof BattleSfx !== 'undefined') void BattleSfx.loadSampleUrl(url);
          setSfxAuditorStatus(`Selected: ${sfxShortPath(url)}`);
          renderSfxAuditor();
        }
      };
    });
  }

  function openSfxAuditor() {
    const el = document.getElementById('sfx-auditor-modal');
    if (!el) return;
    if (typeof BattleSfx !== 'undefined') BattleSfx.unlock();
    renderSfxAuditor();
    el.classList.add('show');
    el.setAttribute('aria-hidden', 'false');
  }

  function closeSfxAuditor() {
    const el = document.getElementById('sfx-auditor-modal');
    if (!el) return;
    el.classList.remove('show');
    el.setAttribute('aria-hidden', 'true');
  }
  // Bestiary
  function markBestiarySeen(enemyId) {
    if (!GameState.bestiary) GameState.bestiary = {};
    if (!GameState.bestiary[enemyId]) {
      GameState.bestiary[enemyId] = 'seen';
      const d = enemyDef(enemyId);
      const msg = `📖 ${d.name} added to the bestiary`;
      if (GameState.currentBattle) pushBattleLog(msg, 'status');
      else {
        if (!GameState._pendingBestiaryLogs) GameState._pendingBestiaryLogs = [];
        GameState._pendingBestiaryLogs.push(msg);
      }
    }
  }
  function markEnemyDead(enemyId) {
    if (!GameState.bestiary) GameState.bestiary = {};
    if (!GameState.bestiaryKills) GameState.bestiaryKills = {};
    GameState.bestiaryKills[enemyId] = (GameState.bestiaryKills[enemyId] || 0) + 1;
    if (GameState.bestiary[enemyId] !== 'dead') {
      GameState.bestiary[enemyId] = 'dead';
      const d = enemyDef(enemyId);
      pushBattleLog(`📖 ${d.name} studied: abilities and tactics unlocked`, 'status');
    }
  }

  function renderBestiaryScreen() {
    if (!GameState.bestiary) GameState.bestiary = {};
    if (!GameState.bestiaryKills) GameState.bestiaryKills = {};
    const listEl = document.getElementById('bestiary-list');
    const detailEl = document.getElementById('bestiary-detail');
    const countEl = document.getElementById('bestiary-count');
    const allIds = Object.keys(ENEMY_BESTIARY_DATA);
    const knownCount = allIds.filter(id => GameState.bestiary[id]).length;
    const deadCount = allIds.filter(id => GameState.bestiary[id] === 'dead').length;
    if (countEl) {
      const countTail = translateKey('bestiaryCount')
        .replace('{known}', knownCount)
        .replace('{total}', allIds.length);
      countEl.textContent = `${deadCount} ${countTail}`;
    }

    listEl.innerHTML = allIds.map(id => {
      const st = GameState.bestiary[id] || 'new';
      const d = enemyDef(id);
      const statusLabel = st === 'new' ? translateKey('unknown') : st === 'seen' ? translateKey('encountered') : translateKey('studied');
      const statusClass = `bs-${st}`;
      const name = st === 'new' ? translateKey('unknownCaps') : translateText(d.name);
      const iconHtml = st === 'new'
        ? '<span class="bestiary-card-unknown">❓</span>'
        : bestiaryEnemyPortraitHtml(id, 28);
      return `<div class="bestiary-card" data-eid="${id}">
        <div class="bestiary-card-icon">${iconHtml}</div>
        <div>
          <div class="bestiary-card-name">${name}</div>
          <div class="bestiary-card-status ${statusClass}">${statusLabel}</div>
        </div>
      </div>`;
    }).join('');

    listEl.querySelectorAll('.bestiary-card').forEach(card => {
      card.onclick = () => {
        listEl.querySelectorAll('.bestiary-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        renderBestiaryDetail(card.dataset.eid);
      };
    });
    detailEl.innerHTML = `<div class="bestiary-text" style="color:var(--text-hint)">${translateKey('chooseCreature')}</div>`;
    localizeUI(document.getElementById('bestiary-screen'));
  }

  function renderBestiaryDetail(id) {
    const detailEl = document.getElementById('bestiary-detail');
    if (!detailEl) return;
    const st = GameState.bestiary[id] || 'new';
    const d = enemyDef(id);
    const bd = ENEMY_BESTIARY_DATA[id] || {};
    const kills = (GameState.bestiaryKills || {})[id] || 0;
    const regionClass = `bregion-${bd.region || 1}`;

    if (st === 'new') {
      detailEl.innerHTML = `
        <div class="bestiary-detail-icon bs-unknown">❓</div>
        <div class="bestiary-detail-name">${translateKey('unknownCaps')}</div>
        <div class="bestiary-text bestiary-locked">${translateKey('creatureNotMet')}</div>`;
      localizeUI(document.getElementById('bestiary-screen'));
      return;
    }

    const regionBadge = `<span class="bestiary-region-badge ${regionClass}">${escapeHtml(campaignRegionName(bd.region))}</span>`;
    const isMiniBoss = d.miniBoss ? translateKey('miniBossLabel') : '';
    const isBoss = d.boss ? translateKey('bossLabel') : '';
    const killsLine = kills > 0 ? `<div class="bestiary-stat"><b>${kills}</b>${translateKey('killsStat')}</div>` : '';

    let statsHtml = `
      <div class="bestiary-stats-row">
        <div class="bestiary-stat"><b>${d.hp}</b>HP</div>
        <div class="bestiary-stat"><b>${d.attack}</b>${translateKey('atkShort')}</div>
        <div class="bestiary-stat"><b>${d.armor}</b>${translateKey('armorShort')}</div>
        <div class="bestiary-stat"><b>${d.speed}</b>${translateKey('speedShort')}</div>
        <div class="bestiary-stat"><b>${d.range}</b>${translateKey('rangeShort')}</div>
        ${killsLine}
      </div>`;

    const abilityHtml = st === 'dead'
      ? `<div class="bestiary-section-label">${translateKey('abilityLabel')}</div>
         <div class="bestiary-text">${enemyAbilityText(id)}</div>
         <div class="bestiary-section-label">${translateKey('tacticsLabel')}</div>
         <div class="bestiary-text">${translateText(bd.tactic || '')}</div>
         <div class="bestiary-section-label">${translateKey('weaknessLabel')}</div>
         <div class="bestiary-weakness">${translateText(bd.weakness || '')}</div>`
      : `<div class="bestiary-section-label">${translateKey('abilityLabel')}</div>
         <div class="bestiary-text bestiary-locked">${translateKey('killToStudy')}</div>`;

    detailEl.innerHTML = `
      <div class="bestiary-detail-icon">${bestiaryEnemyPortraitHtml(id, 88)}</div>
      ${regionBadge}
      <div class="bestiary-detail-name">${translateText(d.name)}${isMiniBoss}${isBoss}</div>
      ${enemyThreatBadgesHtml(id)}
      ${statsHtml}
      ${abilityHtml}`;
    localizeUI(document.getElementById('bestiary-screen'));
  }

  let ArsenalState = { slot: 'weapon', selectedId: null };
  function localizeArsenalStat(line) {
    const lang = currentLanguage();
    if (lang === 'ru') return String(line)
      .replace(/Max HP/g, 'Макс. HP').replace(/Max Mana/g, 'Макс. мана')
      .replace(/Attack/g, 'Атака').replace(/Armor/g, 'Броня')
      .replace(/Range/g, 'Дальность').replace(/Move/g, 'Ход')
      .replace(/Stun on hit \(1 turn\)/g, 'Оглушение при попадании: 1 ход')
      .replace(/Crit chance/g, 'Шанс крита').replace(/Crit damage/g, 'Урон крита')
      .replace(/Gold earned/g, 'Получаемое золото').replace(/Healing received/g, 'Получаемое лечение');
    if (lang === 'es') return String(line)
      .replace(/Max HP/g, 'PV máx.').replace(/Max Mana/g, 'Maná máx.')
      .replace(/Attack/g, 'Ataque').replace(/Armor/g, 'Armadura')
      .replace(/Range/g, 'Alcance').replace(/Move/g, 'Movimiento');
    return line;
  }
  function localizeArsenalItem(item, field) {
    const names = {
      steel_sword: ['Стальной меч', 'Espada de acero'], poison_blade: ['Клинок яда', 'Hoja venenosa'], thunder_hammer: ['Громовой молот', 'Martillo de trueno'], blade_dark: ['Тёмный клинок', 'Hoja oscura'],
      hunter_bow: ['Охотничий лук', 'Arco de cazador'], shadow_bow: ['Лук теней', 'Arco de sombras'], moon_bow: ['Лунный лук', 'Arco lunar'], crossbow_war: ['Боевой арбалет', 'Ballesta de guerra'],
      magic_wand: ['Волшебная палочка', 'Varita mágica'], fire_staff: ['Огненный посох', 'Bastón de fuego'], chaos_staff: ['Посох хаоса', 'Bastón del caos'], staff_ice: ['Посох ледяного демона', 'Bastón del demonio de hielo'],
      leather: ['Кожаный доспех', 'Armadura de cuero'], shadow_cloak: ['Плащ теней', 'Capa de sombras'], runic_shield: ['Рунический щит', 'Escudo rúnico'], mirror_robe: ['Зеркальная мантия', 'Túnica espejo'], guardian_plate: ['Латы стража', 'Placa de guardián'], phoenix: ['Одеяние феникса', 'Túnica del fénix'], dark_mantle: ['Тёмная мантия', 'Manto oscuro'],
      luck_amulet: ['Амулет удачи', 'Amuleto de la suerte'], mana_crystal: ['Кристалл маны', 'Cristal de maná'], seer_eye: ['Око разведчика', 'Ojo del explorador'], hourglass: ['Песочные часы', 'Reloj de arena'], death_ring: ['Кольцо смерти', 'Anillo de la muerte'], portal_stone: ['Камень портала', 'Piedra portal'], crown: ['Корона силы', 'Corona de poder'],
      ash_sword: ['Клинок пепла', 'Espada de ceniza'], forge_hammer: ['Молот кузни', 'Martillo de forja'], coal_bow: ['Угольный лук', 'Arco de carbón'], siege_crossbow: ['Осадный арбалет', 'Ballesta de asedio'], magma_wand: ['Жезл магмы', 'Varita de magma'], volcano_staff: ['Посох вулкана', 'Bastón del volcán'],
      tide_blade: ['Клинок прилива', 'Hoja de marea'], abyss_staff: ['Посох бездны', 'Bastón del abismo'], vent_shield: ['Щит жерла', 'Escudo de la chimenea'], spark_cloak: ['Плащ искр', 'Capa de chispas'], phoenix_robe_2: ['Одеяние феникса', 'Túnica del fénix'], forge_hourglass: ['Кузнечные часы', 'Reloj de arena de forja'],
      tide_trident: ['Трезубец стража', 'Tridente del guardián'], deep_shell: ['Панцирь глубин', 'Caparazón de las profundidades'], current_bow: ['Лук течений', 'Arco de corrientes'], harpoon_crossbow: ['Гарпунный арбалет', 'Ballesta arpón'], sea_cloak: ['Плащ морского призрака', 'Capa del fantasma marino'], tide_staff: ['Посох прилива', 'Bastón de marea'], deep_robe: ['Мантия глубин', 'Túnica de las profundidades'], tide_heart: ['Сердце прилива', 'Corazón de marea']
    };
    const languageIndex = currentLanguage() === 'ru' ? 0 : currentLanguage() === 'es' ? 1 : -1;
    if (field === 'name' && names[item.id] && languageIndex >= 0) return names[item.id][languageIndex];
    if (field === 'name') return translateText(item.name);
    const desc = localizeContent(item.desc);
    if (currentLanguage() === 'ru') return desc
      .replace(/attack/g, 'атаки').replace(/armor/g, 'брони').replace(/range/g, 'дальности')
      .replace(/mana/g, 'маны').replace(/move/g, 'хода').replace(/Stuns on hit\./g, 'Оглушает при попадании.')
      .replace(/Spells gain \+1 AoE radius\./g, 'Заклинания получают +1 к радиусу области.')
      .replace(/Attackers take 1 damage\./g, 'Атакующие получают 1 урон.')
      .replace(/Revive once with 5 HP\./g, 'Один раз воскрешает с 5 HP.')
      .replace(/Freeze lasts 2 turns and spreads to one nearby enemy\./g, 'Заморозка длится 2 хода и переходит на одного соседнего врага.')
      .replace(/Freeze lasts 2 turns\./g, 'Заморозка длится 2 хода.')
      .replace(/Ignores 2 armor\./g, 'Игнорирует 2 брони.')
      .replace(/Splashes 3 damage to enemies beside the target\./g, 'Задевает соседей цели на 3 урона.')
      .replace(/The first hit each round is fully blocked\./g, 'Первый удар в раунде поглощается полностью.')
      .replace(/Drags the target one tile closer\./g, 'Притягивает цель на одну клетку.')
      .replace(/Restores 2 mana whenever the wearer is hit\./g, 'Возвращает 2 маны при получении урона.')
      .replace(/Clears one negative status at the start of the turn\./g, 'Снимает один негативный эффект в начале хода.');
    if (currentLanguage() === 'es') return desc
      .replace(/Ignores 2 armor\./g, 'Ignora 2 de armadura.')
      .replace(/Splashes 3 damage to enemies beside the target\./g, 'Salpica 3 de daño a los enemigos junto al objetivo.')
      .replace(/The first hit each round is fully blocked\./g, 'El primer golpe de cada ronda se bloquea por completo.')
      .replace(/Drags the target one tile closer\./g, 'Arrastra al objetivo una casilla.')
      .replace(/Freeze lasts 2 turns and spreads to one nearby enemy\./g, 'La congelación dura 2 turnos y se contagia a un enemigo cercano.')
      .replace(/Restores 2 mana whenever the wearer is hit\./g, 'Devuelve 2 de maná al recibir daño.')
      .replace(/Clears one negative status at the start of the turn\./g, 'Elimina un efecto negativo al inicio del turno.');
    return desc;
  }
  function renderArsenal() {
    const list = document.getElementById('arsenal-list'); const detail = document.getElementById('arsenal-detail');
    if (!list || !detail) return;
    const items = ITEM_POOL.filter(item => item.slot === ArsenalState.slot);
    const owned = ownedItemIds();
    const labels = { weapon: translateKey('arsenalWeapons'), armor: translateKey('arsenalArmor'), artifact: translateKey('arsenalArtifacts') };
    document.querySelectorAll('[data-arsenal-slot]').forEach(btn => {
      const slot = btn.dataset.arsenalSlot;
      // Иконка — маска, а не эмодзи, поэтому нужен элемент: textContent тут
      // затирал бы разметку.
      const iconName = slot === 'weapon' ? 'swords' : slot === 'armor' ? 'shield' : 'artifact';
      btn.innerHTML = `<span class="ico ico-${iconName}" aria-hidden="true"></span> ${escapeHtml(labels[slot])}`;
      btn.classList.toggle('active', slot === ArsenalState.slot);
    });
    const title = document.querySelector('#arsenal-screen .bestiary-bar-title');
    if (title) title.textContent = `⚔ ${translateKey('arsenal')}`;
    const back = document.getElementById('btn-arsenal-back');
    if (back) back.textContent = `← ${translateKey('back')}`;
    document.getElementById('arsenal-count').textContent = `${items.filter(item => owned.has(item.id)).length} / ${items.length}`;
    list.innerHTML = items.map(item => {
      const known = owned.has(item.id); const region = campaignRegionName(item.minRegion);
      return `<button class="bestiary-card${known ? '' : ' locked'}" data-arsenal-id="${item.id}"><span class="bestiary-card-icon">${known ? itemIconMarkup(item, 34) : '❓'}</span><span class="bestiary-card-copy"><strong>${known ? localizeArsenalItem(item, 'name') : translateKey('unknownCaps')}</strong><small>${known ? formatItemMods(item).map(localizeArsenalStat).join(' · ') : region}</small></span></button>`;
    }).join('');
    const show = id => { const item = ITEM_POOL.find(entry => entry.id === id); if (!item) return; const known = owned.has(item.id); ArsenalState.selectedId = id;
      detail.innerHTML = known ? `<div class="bestiary-detail-icon">${itemIconMarkup(item, 72)}</div><div class="bestiary-detail-name">${localizeArsenalItem(item, 'name')}</div><div class="bestiary-text">${formatItemMods(item).map(localizeArsenalStat).join('<br>')}</div><div class="bestiary-region-badge">${campaignRegionName(item.minRegion)} · ${translateKey(item.rarity === 'epic' ? 'rarityEpic' : item.rarity === 'rare' ? 'rarityRare' : 'rarityCommon')}</div><div class="bestiary-weakness">${localizeArsenalItem(item, 'desc')}</div>` : `<div class="bestiary-detail-icon bs-unknown">❓</div><div class="bestiary-detail-name">${translateKey('unknownCaps')}</div><div class="bestiary-text bestiary-locked">${campaignRegionName(item.minRegion)}</div>`;
    };
    list.querySelectorAll('[data-arsenal-id]').forEach(btn => btn.onclick = () => show(btn.dataset.arsenalId));
    show(ArsenalState.selectedId && items.some(item => item.id === ArsenalState.selectedId) ? ArsenalState.selectedId : items[0]?.id);
  }

  // Skill unlock popup
  function showSkillUnlockPopup(heroId, skillDef) {
    return new Promise(resolve => {
      const el = document.getElementById('skill-unlock-modal');
      if (!el) { resolve(); return; }
      el.classList.remove('hidden');
      const hh = GameState.heroes.find(h => h.id === heroId);
      const heroName = hh ? hh.name : heroId;
      document.getElementById('skill-unlock-icon').textContent = skillDef.icon;
      document.getElementById('skill-unlock-name').textContent = translateText(skillDef.name);
      document.getElementById('skill-unlock-desc').textContent = localizeContent(skillDef.desc);
      const meta = skillDef.cost ? `Cost: ${skillDef.cost} MP` : skillDef.cd ? `${translateKey('cooldownShort')}: ${skillDef.cd}` : '';
      document.getElementById('skill-unlock-meta').textContent = `${heroName}: ${meta}`;
      const okBtn = document.getElementById('btn-skill-unlock-ok');
      const finish = () => { okBtn.onclick = null; el.classList.add('hidden'); resolve(); };
      okBtn.onclick = finish;
    });
  }

  async function processSkillUnlockQueue() {
    if (!GameState.pendingSkillUnlocks) return;
    const queue = [...GameState.pendingSkillUnlocks];
    GameState.pendingSkillUnlocks = [];
    for (const item of queue) {
      await showSkillUnlockPopup(item.heroId, item.skill);
    }
  }

  function cellNeighbors(a, b) { return WorldMapTopology.isNeighbor(a, b); }
  function canShowAd() {
    return window.ysdk && (Date.now() - (GameState.adMeta.lastShownAt || 0) >= AD_MIN_INTERVAL_MS);
  }
  function canShowInterstitialAd() {
    return !!(window.ysdk?.adv?.showFullscreenAdv) &&
      !YandexServices.interstitialOpen &&
      Date.now() - (YandexServices.interstitialLastAt || 0) >= INTERSTITIAL_MIN_INTERVAL_MS;
  }
  const AdRuntimePause = {
    depth: 0,
    bgmWasPlaying: false,
    sfxWasRunning: false,

    begin() {
      if (this.depth++ > 0) return;
      GameState.adPaused = true;
      this.bgmWasPlaying = !!(GameBGM.audio && !GameBGM.audio.paused);
      this.sfxWasRunning = !!(BattleSfx.ctx && BattleSfx.ctx.state === 'running');
      if (GameBGM.audio) GameBGM.audio.pause();
      if (BattleSfx.ctx && BattleSfx.ctx.state === 'running') BattleSfx.ctx.suspend().catch(() => {});
    },

    end() {
      if (this.depth <= 0) return;
      this.depth--;
      if (this.depth > 0) return;
      GameState.adPaused = false;
      const s = loadAudioSettings();
      if (this.bgmWasPlaying && GameBGM.audio && GameBGM.unlocked && s.musicEnabled && !document.hidden) {
        GameBGM.audio.play().catch(() => {});
      }
      if (this.sfxWasRunning && BattleSfx.ctx && BattleSfx.ctx.state === 'suspended' && !document.hidden) {
        BattleSfx.ctx.resume().catch(() => {});
      }
      if (GameState.pendingEnemyTurnAfterAd) {
        GameState.pendingEnemyTurnAfterAd = false;
        setTimeout(() => runEnemyTurn(), battleDelay(80));
      }
    }
  };
  function showInterstitialAdAtBreak(reason, after) {
    const done = typeof after === 'function' ? after : () => {};
    if (!canShowInterstitialAd()) { done(); return; }
    let completed = false;
    const finish = () => {
      if (completed) return;
      completed = true;
      YandexServices.interstitialOpen = false;
      AdRuntimePause.end();
      done();
    };
    try {
      YandexServices.interstitialOpen = true;
      YandexServices.interstitialLastAt = Date.now();
      AdRuntimePause.begin();
      window.ysdk.adv.showFullscreenAdv({
        callbacks: {
          onOpen: () => {},
          onClose: finish,
          onError: finish
        }
      });
    } catch (e) {
      finish();
    }
  }
  function showRewardedAd(rewardCallback) {
    if (!window.ysdk) { rewardCallback(); return; }
    if (!canShowAd()) {
      void showGameAlert('Ad temporarily unavailable (cooldown).');
      return;
    }
    let adPauseStarted = false;
    const pauseForAd = () => {
      if (adPauseStarted) return;
      adPauseStarted = true;
      AdRuntimePause.begin();
    };
    const resumeAfterAd = () => {
      if (!adPauseStarted) return;
      adPauseStarted = false;
      AdRuntimePause.end();
    };
    try {
      pauseForAd();
      window.ysdk.adv.showRewardedVideo({
        callbacks: {
          onOpen: pauseForAd,
          onRewarded: () => {
            GameState.adMeta.lastShownAt = Date.now();
            rewardCallback();
          },
          onClose: resumeAfterAd,
          onError: () => {
            resumeAfterAd();
            void showGameAlert('Ad unavailable');
          }
        }
      });
    } catch (e) {
      resumeAfterAd();
      void showGameAlert('Ad unavailable');
    }
  }
  function itemById(id) { return ITEM_POOL.find(i => i.id === id); }
  function shopItemById(id) { return SHOP_ITEMS.find(i => i.id === id) || null; }
  function getConsumableCount(id) {
    return (GameState.consumables && GameState.consumables[id]) ? GameState.consumables[id] : 0;
  }
  function addConsumable(id, n) {
    const add = n || 1;
    GameState.consumables = GameState.consumables || {};
    GameState.consumables[id] = (GameState.consumables[id] || 0) + add;
  }
  function canUseConsumableOnHero(item, hero) {
    if (!item || !hero || hero.hp <= 0) return false;
    if (item.id === 'potion_small' || item.id === 'potion_mid' || item.id === 'potion') return hero.hp < hero.maxHp;
    if (item.id === 'elixir') return hero.maxMana > 0 && hero.mana < hero.maxMana;
    if (item.id === 'mag_stone') return hero.role === 'mage' && !(hero.flags && hero.flags.magStoneUsed);
    return false;
  }
  function consumableUseHint(item) {
    if (!item) return '';
    if (item.id.startsWith('potion')) return translateKey('restoresHp');
    if (item.id === 'elixir') return translateKey('restoresMageMana');
    if (item.id === 'mag_stone') return translateKey('mageAttackForever');
    return '';
  }
  function useConsumableOnHero(itemId, heroId) {
    const item = shopItemById(itemId);
    const hero = GameState.heroes.find(h => h.id === heroId);
    if (!item || !hero || getConsumableCount(itemId) <= 0) return false;
    if (!canUseConsumableOnHero(item, hero)) return false;
    if (item.id === 'mag_stone') {
      hero.flags = hero.flags || {};
      if (hero.flags.magStoneUsed) return false;
      hero.flags.magStoneUsed = true;
      if (hero.role === 'mage') applyPermanentHeroStat(hero, 'attack', 1);
    } else {
      item.use(hero);
    }
    GameState.consumables[itemId]--;
    if (GameState.consumables[itemId] <= 0) delete GameState.consumables[itemId];
    return true;
  }
  function buyConsumable(itemId, node, strangerOnly) {
    const item = shopItemById(itemId);
    if (!item) return;
    if (GameState.gold < item.price) {
      void showGameAlert(translateKey('notEnoughGold'));
      return;
    }
    GameState.gold -= item.price;
    addConsumable(itemId);
    saveGame();
    enterCity(node, strangerOnly);
  }
  function tryUseConsumable(itemId, node, strangerOnly) {
    const item = shopItemById(itemId);
    if (!item || getConsumableCount(itemId) <= 0) return;
    const usable = GameState.heroes.filter(h => canUseConsumableOnHero(item, h));
    if (!usable.length) {
      void showGameAlert(`${translateKey('notForHero')} «${translateText(item.name)}». ${consumableUseHint(item)}.`);
      return;
    }
    const apply = heroId => {
      if (!useConsumableOnHero(itemId, heroId)) return;
      const h = GameState.heroes.find(x => x.id === heroId);
      saveGame();
      void showGameAlert(`${translateText(item.name)} → ${h.name}`).then(() => enterCity(node, strangerOnly));
    };
    if (usable.length === 1) {
      apply(usable[0].id);
      return;
    }
    showGamePickOne(`${translateKey('apply')} «${translateText(item.name)}»?`, usable.map(h => ({
      value: h.id,
      label: `${h.name} (${h.hp}/${h.maxHp}${h.maxMana ? ` · ${h.mana}/${h.maxMana} MP` : ''})`
    }))).then(heroId => {
      if (heroId) apply(heroId);
    });
  }

  function combatConsumableItems() {
    return SHOP_ITEMS.filter(item =>
      getConsumableCount(item.id) > 0 &&
      (item.id === 'potion_small' || item.id === 'potion_mid' || item.id === 'potion' || item.id === 'elixir')
    );
  }

  function useConsumableFromInventory(itemId) {
    const item = shopItemById(itemId);
    if (!item || getConsumableCount(itemId) <= 0) return;
    const usable = GameState.heroes.filter(hero => canUseConsumableOnHero(item, hero));
    if (!usable.length) {
      void showGameAlert(`${translateKey('notForHero')} «${translateText(item.name)}». ${consumableUseHint(item)}.`);
      return;
    }
    const apply = heroId => {
      if (!useConsumableOnHero(itemId, heroId)) return;
      saveGame();
      renderInventoryScreen();
    };
    if (usable.length === 1) {
      apply(usable[0].id);
      return;
    }
    showGamePickOne(`${translateKey('useItem')} «${translateText(item.name)}»?`, usable.map(hero => ({
      value: hero.id,
      label: `${hero.name} (${hero.hp}/${hero.maxHp}${hero.maxMana ? ` · ${hero.mana}/${hero.maxMana} MP` : ''})`
    }))).then(heroId => { if (heroId) apply(heroId); });
  }

  function useConsumableInBattle(itemId) {
    const b = GameState.currentBattle;
    const unit = getActiveUnit();
    const item = shopItemById(itemId);
    if (!b || b.phase !== 'combat' || !unit || !unit.isHero || b.heroActionDone || !item) return;
    if (!combatConsumableItems().some(entry => entry.id === itemId)) return;
    if (!canUseConsumableOnHero(item, unit)) return;
    item.use(unit);
    GameState.consumables[itemId]--;
    if (GameState.consumables[itemId] <= 0) delete GameState.consumables[itemId];
    syncHeroFromUnit(unit);
    saveGame();
    pushBattleLog(`[${unit.sprite} ${unit.name}] ${translateKey('useItem').toLowerCase()}: ${translateText(item.name)}`, 'hero');
    b.heroActionDone = true;
    b.mode = 'idle';
    b.pendingSkill = null;
    endUnitTurn();
  }

  function openBattleConsumables() {
    const unit = getActiveUnit();
    if (!unit || !unit.isHero) return;
    const usable = combatConsumableItems().filter(item => canUseConsumableOnHero(item, unit));
    if (!usable.length) {
      void showGameAlert(translateKey('consumablesEmpty'));
      return;
    }
    showGamePickOne(`${translateKey('chooseConsumable')} — ${translateKey('usesTurn')}`, usable.map(item => ({
      value: item.id,
      label: `${translateText(item.name)} ×${getConsumableCount(item.id)} · ${consumableUseHint(item)}`
    }))).then(itemId => { if (itemId) useConsumableInBattle(itemId); });
  }

  function renderInventoryConsumables() {
    const root = document.getElementById('inv-consumables');
    if (!root) return;
    if (GameState._returnToBattle && GameState.currentBattle?.phase === 'combat') {
      root.innerHTML = '';
      return;
    }
    const entries = SHOP_ITEMS.filter(item => getConsumableCount(item.id) > 0);
    if (!entries.length) { root.innerHTML = ''; return; }
    root.innerHTML = `<div class="inv-consumables-title">${translateKey('battleConsumables')}</div>` + entries.map(item => `
      <div class="inv-consumable-row">
        <div class="inv-consumable-icon">${itemIconMarkup({ id: item.id, rarity: 'common', emoji: item.emoji || '🧪' }, 22)}</div>
        <div class="inv-consumable-name">${translateText(item.name)} <span class="inv-consumable-count">×${getConsumableCount(item.id)}</span></div>
        <button type="button" class="btn" data-inv-consume="${item.id}">${translateKey('useItem')}</button>
      </div>`).join('');
    root.querySelectorAll('[data-inv-consume]').forEach(btn => {
      btn.onclick = () => useConsumableFromInventory(btn.getAttribute('data-inv-consume'));
    });
  }
  function itemIconPath(itemId) {
    const rel = ITEM_ICON_MAP[itemId];
    return rel ? ITEM_ICON_BASE + rel : null;
  }
  const CITY_SHOP_ICON_PX = 56;

  function itemIconMarkup(item, sizePx) {
    if (!item) return gameEmojiIconMarkup('📦', sizePx, '');
    const src = itemIconPath(item.id);
    if (src) {
      const px = sizePx + 'px';
      const rarCls = item.rarity ? ' rar-' + item.rarity : '';
      const img = '<img class="item-icon-img" src="' + src + '" alt="" width="' + sizePx + '" height="' + sizePx + '" decoding="async" loading="lazy" style="width:' + px + ';height:' + px + ';object-fit:contain;vertical-align:middle;display:block" />';
      return '<span class="item-icon-wrap' + rarCls + '">' + img + '</span>';
    }
    return gameEmojiIconMarkup(item.emoji || '📦', sizePx, item.name || '');
  }

  function escapeHtmlAttr(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Shared item-stat formatting; returns an array of lines.
  // ("+3 Attack", "Poison on hit (2 turns)", "20% dodge", "Aura: +2 attack to allies", ...).
  // Use everywhere item stats are shown: shop, bag, and victory loot.
  function formatItemMods(item) {
    if (!item || !item.mods) return [];
    const m = item.mods;
    const out = [];
    const numLabels = {
      attack: 'Attack',
      armor: 'Armor',
      range: 'Range',
      move: 'Turn',
      maxHp: 'Max HP',
      mana: 'Max Mana',
      maxMana: 'Max Mana',
      speed: 'Speed',
      armorPierce: 'Armor piercing',
      manaRegen: 'Mana regen/turn',
      reflectFlat: 'Thorns (damage attacker)'
    };
    for (const [k, v] of Object.entries(m)) {
      if (typeof v !== 'number' || v === 0) continue;
      if (k in numLabels) out.push(`${v > 0 ? '+' : ''}${v} ${numLabels[k]}`);
    }
    if (typeof m.goldBonus === 'number' && m.goldBonus !== 0) out.push(`+${Math.round(m.goldBonus * 100)}% gold from battle`);
    if (typeof m.dodge === 'number' && m.dodge !== 0) out.push(`${Math.round(m.dodge * 100)}% dodge`);
    if (typeof m.reflectDmg === 'number' && m.reflectDmg !== 0) out.push(`${Math.round(m.reflectDmg * 100)}% physical damage reflection`);
    if (typeof m.reflectStatus === 'number' && m.reflectStatus !== 0) out.push(`${Math.round(m.reflectStatus * 100)}% status reflection`);
    if (typeof m.firstShotBonus === 'number' && m.firstShotBonus !== 0) out.push(`First shot ×${(1 + m.firstShotBonus).toFixed(1)}`);
    if (typeof m.deathExplode === 'number' && m.deathExplode !== 0) out.push(`3×3 explosion on death (${m.deathExplode} damage)`);
    if (m.poisonOnHit) out.push('Poison on hit (2 turns)');
    if (m.stunOnHit) out.push('Stun on hit (1 turn)');
    if (m.ignoreCover) out.push('Ignore cover (forest/allies)');
    if (m.aoePlus) out.push('AoE spells: +1 radius');
    if (m.chaosAoe) out.push('Random AoE 5 damage after spell');
    if (m.freeze2) out.push('Freeze: 2 turns instead of 1');
    if (m.revive5) out.push('1× revive with 5 HP');
    if (m.extraAction) out.push('1× repeat action per battle');
    if (m.previewEnemies) out.push('Exact enemy lineup on the map');
    if (m.battleTeleport) out.push('1× hero teleport per battle');
    if (typeof m.allyAttack === 'number' && m.allyAttack !== 0) out.push(`Aura: +${m.allyAttack} attack to allies`);
    if (typeof m.allyArmor === 'number' && m.allyArmor !== 0) out.push(`Aura: +${m.allyArmor} armor to allies`);
    return out;
  }

  let InvState = { activeHeroId: 'garet', selectedItemId: null, selectedItemIdx: -1, selectedEquippedSlot: null };
  function randomItem(region, minRarity) {
    return selectLootItem(region, minRarity || null);
  }
  function bossRewardChoices(region) {
    const owned = ownedItemIds();
    const pool = ITEM_POOL.filter(item => item.minRegion === region && (item.rarity === 'rare' || item.rarity === 'epic'));
    const fresh = pool.filter(item => !owned.has(item.id));
    const source = fresh.length >= 3 ? fresh : pool;
    return [...source].sort(() => Math.random() - 0.5).slice(0, 3).map(deepClone);
  }
  /** True while the boss reward choice (or its confirmation) owns the screen.
   *  showVictoryUI waits on this before opening perk and skill-unlock modals. */
  let BossRewardPromptOpen = false;
  function bossRewardPromptActive() {
    return BossRewardPromptOpen || !!GameState.pendingBossReward?.choices?.length;
  }
  function showPendingBossReward() {
    const reward = GameState.pendingBossReward;
    if (!reward?.choices?.length || BossRewardPromptOpen) return Promise.resolve();
    BossRewardPromptOpen = true;
    const choices = reward.choices.map(item => ({ value: item.id, label: `${translateText(item.name)} — ${formatItemMods(item).map(translateText).join(', ')}` }));
    return showGamePickOne(`🏆 ${currentLanguage() === 'ru' ? 'Выберите награду следующего региона' : 'Choose a reward for the next region'}`, choices).then(id => {
      const item = reward.choices.find(choice => choice.id === id) || reward.choices[0];
      GameState.inventory.push(item.id);
      GameState._lastBossReward = item;
      GameState.pendingBossReward = null;
      saveGame(true);
      return showGameAlert(`${translateKey('victoryLoot')}: ${translateText(item.name)}`);
    }).finally(() => { BossRewardPromptOpen = false; });
  }
  function equipItem(hero, item) {
    hero.equipment = hero.equipment || { weapon: null, armor: null, artifact: null };
    hero.equipment[item.slot] = item.id;
  }
  function applyItemToHero(hero, item) {
    hero.attack += item.mods.attack || 0;
    hero.armor += item.mods.armor || 0;
    hero.range += item.mods.range || 0;
    hero.move += item.mods.move || 0;
    if (item.mods.mana) {
      hero.maxMana = (hero.maxMana || 0) + item.mods.mana;
      hero.mana = Math.min(hero.maxMana, (hero.mana || 0) + item.mods.mana);
    }
    if (item.mods.maxHp) {
      hero.maxHp += item.mods.maxHp;
      hero.hp = Math.min(hero.maxHp, hero.hp + item.mods.maxHp);
    }
  }
  function resetHeroBaseStats(hero) {
    const base = ensureHeroBaseStats(hero);
    if (!base) return;
    const previousMaxHp = hero.maxHp || base.maxHp;
    hero.maxHp = base.maxHp;
    hero.attack = base.attack;
    hero.armor = base.armor;
    hero.range = base.range;
    hero.move = base.move;
    hero.maxMana = base.maxMana;
    hero.hp = Math.min(hero.maxHp, Math.max(1, (hero.hp || hero.maxHp) + hero.maxHp - previousMaxHp));
    hero.mana = Math.min(hero.mana || hero.maxMana, hero.maxMana);
  }
  function recalcHeroFromEquipment(hero) {
    sanitizeHeroEquipment(hero);
    resetHeroBaseStats(hero);
    hero.equipment = hero.equipment || { weapon: null, armor: null, artifact: null };
    ['weapon', 'armor', 'artifact'].forEach(slot => {
      const id = hero.equipment[slot];
      const it = itemById(id);
      if (it) applyItemToHero(hero, it);
    });
  }
  function finishInventoryEquipmentChange(hero, selectedItemId, selectedItemIdx) {
    recalcHeroFromEquipment(hero);
    updateVictoryActionButtons();
    InvState.selectedItemId = selectedItemId || null;
    InvState.selectedItemIdx = Number.isInteger(selectedItemIdx) ? selectedItemIdx : -1;
    InvState.selectedEquippedSlot = null;
    saveGame();
    renderInventoryScreen();
    renderPartyStrip();
  }
  function equipInventoryItemAtIndex(hero, inventoryIndex) {
    const id = GameState.inventory?.[inventoryIndex];
    const item = itemById(id);
    if (!hero || !item || !inventoryItemFitsHero(item, hero)) return false;
    const old = hero.equipment?.[item.slot] || null;
    GameState.inventory.splice(inventoryIndex, 1);
    if (old) GameState.inventory.push(old);
    equipItem(hero, item);
    if (GameState._returnToVictory) markLastBattleDropHandled(item.id);
    finishInventoryEquipmentChange(hero, null, -1);
    return true;
  }
  function unequipHeroSlotToInventory(hero, slot) {
    const id = hero?.equipment?.[slot];
    if (!id) return false;
    hero.equipment[slot] = null;
    GameState.inventory.push(id);
    finishInventoryEquipmentChange(hero, id, GameState.inventory.length - 1);
    return true;
  }
  function inventoryDesktopDragEnabled() {
    return !!window.matchMedia?.('(hover: hover) and (pointer: fine)').matches;
  }
  function inventoryDragPayload(event) {
    try {
      return JSON.parse(event.dataTransfer?.getData('application/x-three-blades-item') || event.dataTransfer?.getData('text/plain') || 'null');
    } catch (_) {
      return null;
    }
  }
  function setInventoryDragPayload(event, payload) {
    const value = JSON.stringify(payload);
    event.dataTransfer?.setData('application/x-three-blades-item', value);
    event.dataTransfer?.setData('text/plain', value);
    if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
  }
  function inventoryDropFeedback(message, zone, invalid) {
    const info = document.getElementById('inv-slot-info');
    if (info) info.textContent = message;
    if (!zone) return;
    zone.classList.remove('eq-drop-valid', 'eq-drop-invalid');
    zone.classList.add(invalid ? 'eq-drop-invalid' : 'eq-drop-valid');
    setTimeout(() => zone.classList.remove('eq-drop-valid', 'eq-drop-invalid'), 650);
  }
  function heroEquipIcons(hero) {
    hero.equipment = hero.equipment || {};
    return ['weapon', 'armor', 'artifact']
      .map(s => {
        const id = hero.equipment[s];
        if (!id) return '<span class="eq-mini-dot">·</span>';
        const it = itemById(id);
        if (!it) return '<span class="eq-mini-dot">•</span>';
        const fx = formatItemMods(it).map(translateText).join(' · ');
        const tip = [translateText(it.name), fx, translateText(it.desc || '')].filter(Boolean).join('\n');
        return '<span class="eq-mini-icon" title="' + escapeHtmlAttr(tip) + '">' + itemIconMarkup(it, 11) + '</span>';
      })
      .join('');
  }
  function renderPartyStrip() {
    const root = document.getElementById('party-strip');
    if (!root) return;
    root.innerHTML = GameState.heroes.map(h => `<div class="party-card">${h.emoji} ${h.name}<div class="eq-mini">${heroEquipIcons(h)}</div></div>`).join('');
  }
  function itemHeroClassLabel(item) {
    if (!item || !item.heroClass || item.heroClass === 'all') return translateText('All heroes');
    return { warrior: translateText('Warrior'), archer: translateText('Archer'), mage: translateText('Mage') }[item.heroClass] || item.heroClass;
  }

  function inventoryItemFitsHero(item, hero) {
    if (!item || !hero) return false;
    const hc = item.heroClass;
    if (!hc || hc === 'all') return true;
    return hc === hero.role;
  }

  function itemPowerScoreForHero(item, hero) {
    if (!item || !hero || !inventoryItemFitsHero(item, hero)) return -Infinity;
    const m = item.mods || {};
    const role = hero.role || '';
    const weights = {
      attack: role === 'warrior' ? 8 : 9,
      armor: role === 'warrior' ? 7 : 5,
      range: role === 'archer' ? 9 : 6,
      move: 7,
      maxHp: role === 'warrior' ? 0.8 : 0.65,
      mana: role === 'mage' ? 4 : 1.5,
      armorPierce: 7,
      manaRegen: role === 'mage' ? 6 : 2,
      reflectFlat: role === 'warrior' ? 5 : 3,
      allyAttack: 5,
      allyArmor: 4
    };
    let score = 0;
    Object.entries(weights).forEach(([key, weight]) => {
      if (typeof m[key] === 'number') score += m[key] * weight;
    });
    if (typeof m.goldBonus === 'number') score += m.goldBonus * 16;
    if (typeof m.dodge === 'number') score += m.dodge * 45;
    if (typeof m.reflectDmg === 'number') score += m.reflectDmg * 35;
    if (typeof m.reflectStatus === 'number') score += m.reflectStatus * 30;
    if (typeof m.firstShotBonus === 'number') score += m.firstShotBonus * (role === 'archer' ? 45 : 24);
    if (typeof m.deathExplode === 'number') score += m.deathExplode * 0.8;
    if (m.poisonOnHit) score += 10;
    if (m.stunOnHit) score += 14;
    if (m.ignoreCover) score += role === 'archer' ? 12 : 5;
    if (m.aoePlus) score += role === 'mage' ? 16 : 4;
    if (m.chaosAoe) score += role === 'mage' ? 18 : 6;
    if (m.freeze2) score += role === 'mage' ? 14 : 5;
    if (m.revive5) score += 18;
    if (m.extraAction) score += 20;
    if (m.previewEnemies) score += 8;
    if (m.battleTeleport) score += 16;
    score += item.rarity === 'epic' ? 2 : item.rarity === 'rare' ? 1 : 0;
    return score;
  }

  function itemCompareStatLabel(key) {
    const labels = {
      attack: translateText('Attack'),
      armor: translateKey('armor'),
      range: translateKey('rangeShortUi'),
      move: translateKey('turn'),
      maxHp: 'HP',
      mana: translateKey('mana'),
      armorPierce: translateText('Armor piercing'),
      manaRegen: translateText('Mana regen/turn'),
      reflectFlat: translateText('Thorns (damage attacker)'),
      allyAttack: translateText('Aura') + ' ATK',
      allyArmor: translateText('Aura') + ' ARM'
    };
    return labels[key] || key;
  }

  function itemCompareHtml(item, hero) {
    if (!item || !hero || !inventoryItemFitsHero(item, hero)) return '';
    const current = itemById(hero?.equipment?.[item.slot]);
    const currentScore = current ? itemPowerScoreForHero(current, hero) : 0;
    const nextScore = itemPowerScoreForHero(item, hero);
    const delta = nextScore - currentScore;
    const deltaClass = delta > 0.01 ? 'better' : delta < -0.01 ? 'worse' : 'same';
    const signedDelta = `${delta >= 0 ? '+' : ''}${Math.round(delta)}`;
    const keys = ['attack', 'armor', 'range', 'move', 'maxHp', 'mana', 'armorPierce', 'manaRegen', 'reflectFlat', 'allyAttack', 'allyArmor'];
    const rows = keys.map(key => {
      const oldValue = Number(current?.mods?.[key] || 0);
      const newValue = Number(item?.mods?.[key] || 0);
      const statDelta = newValue - oldValue;
      if (!statDelta) return '';
      const cls = statDelta > 0 ? 'better' : 'worse';
      return `<div class="item-compare-row ${cls}"><span>${itemCompareStatLabel(key)}</span><span>${oldValue} -> ${newValue} (${statDelta > 0 ? '+' : ''}${statDelta})</span></div>`;
    }).filter(Boolean).join('');
    const currentName = current ? translateText(current.name) : translateKey('emptySlot');
    return `<div class="item-compare">
      <div class="item-compare-title">${translateKey('compareGear')}</div>
      <div class="item-compare-current">${translateKey('currentSlot')}: ${currentName}</div>
      <div class="item-compare-power ${deltaClass}">${translateKey('powerDelta')}: ${signedDelta}</div>
      ${rows}
    </div>`;
  }

  function bestInventoryCandidateForSlot(hero, slot) {
    const current = itemById(hero?.equipment?.[slot]);
    const currentScore = current ? itemPowerScoreForHero(current, hero) : 0;
    let best = null;
    (GameState.inventory || []).forEach((id, idx) => {
      const it = itemById(id);
      if (!it || it.slot !== slot || !inventoryItemFitsHero(it, hero)) return;
      const score = itemPowerScoreForHero(it, hero);
      if (score <= currentScore + 0.01) return;
      if (!best || score > best.score) best = { id, idx, item: it, score };
    });
    return best;
  }

  function bestInventoryCandidateIdsForHero(hero) {
    const ids = new Set();
    ['weapon', 'armor', 'artifact'].forEach(slot => {
      const best = bestInventoryCandidateForSlot(hero, slot);
      if (best) ids.add(best.id);
    });
    return ids;
  }

  function equipBestForHero(hero) {
    if (!hero) return 0;
    hero.equipment = hero.equipment || { weapon: null, armor: null, artifact: null };
    let changed = 0;
    ['weapon', 'armor', 'artifact'].forEach(slot => {
      const best = bestInventoryCandidateForSlot(hero, slot);
      if (!best) return;
      const old = hero.equipment[slot];
      const removeIdx = GameState.inventory.indexOf(best.id);
      if (removeIdx < 0) return;
      GameState.inventory.splice(removeIdx, 1);
      if (old) GameState.inventory.push(old);
      hero.equipment[slot] = best.id;
      changed++;
    });
    if (changed) {
      recalcHeroFromEquipment(hero);
      if (GameState._returnToVictory && isLastBattleDropEquipped()) {
        markLastBattleDropHandled(GameState._lastBattleDrop?.id);
      }
      InvState.selectedItemId = null;
      InvState.selectedItemIdx = -1;
      saveGame();
    }
    return changed;
  }

  function sanitizeHeroEquipment(hero) {
    if (!hero) return;
    hero.equipment = hero.equipment || { weapon: null, armor: null, artifact: null };
    ['weapon', 'armor', 'artifact'].forEach(slot => {
      const id = hero.equipment[slot];
      if (!id) return;
      const it = itemById(id);
      if (it && inventoryItemFitsHero(it, hero)) return;
      hero.equipment[slot] = null;
      if (id && !(GameState.inventory || []).includes(id)) {
        GameState.inventory = GameState.inventory || [];
        GameState.inventory.push(id);
      }
    });
  }

  function sanitizeAllHeroEquipment() {
    (GameState.heroes || []).forEach(sanitizeHeroEquipment);
  }
  function updateInventoryCloseButton() {
    const el = document.getElementById('btn-close-inv');
    if (!el) return;
    if (GameState._returnToVictory) el.textContent = translateKey('toVictory');
    else if (GameState._returnToBattle) el.textContent = translateKey('toBattle');
    else if (GameState._returnToCity) el.textContent = translateKey('returnTown');
    else el.textContent = translateKey('close');
  }

  function openInventoryFromVictory() {
    GameState._returnToVictory = true;
    GameState._returnToBattle = false;
    GameState._returnToCity = false;
    showScreen('inventory');
    renderInventoryScreen();
  }

  function openInventoryFromCity() {
    GameState._returnToVictory = false;
    GameState._returnToBattle = false;
    GameState._returnToCity = true;
    showScreen('inventory');
    renderInventoryScreen();
  }

  function renderInventoryScreen() {
    const hero = GameState.heroes.find(h => h.id === InvState.activeHeroId) || GameState.heroes[0];
    if (!hero) return;
    recalcHeroFromEquipment(hero);
    renderInventoryConsumables();

    // Update tabs
    document.querySelectorAll('.inv-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.heroTab === hero.id);
    });

    // Hero portrait + stats (sidebar)
    const card = document.getElementById('inv-hero-card');
    const roleLabel2 = { garet: translateText('Warrior'), alira: translateText('Archer'), seris: translateText('Mage') };
    const baseTpl = baseHeroTemplate().find(b => b.id === hero.id) || hero;
    const atkBuff = hero.attack > baseTpl.attack;
    const armBuff = hero.armor > baseTpl.armor;
    const hpPct = Math.round(hero.hp / hero.maxHp * 100);
    const hpBar = `<div class="bar" style="height:4px;margin-top:2px"><div style="height:100%;width:${hpPct}%;background:${hpPct>50?'#2ecc71':hpPct>25?'#f39c12':'#e74c3c'}"></div></div>`;
    card.innerHTML = `<div class="inv-portrait">
      <div class="inv-portrait-name">${hero.name}</div>
      <div class="inv-portrait-class">${roleLabel2[hero.id] || ''} · ${translateKey('heroLevelShort')} ${hero.level}</div>
    </div>
    <div class="inv-stats">
      <div class="stat-row"><span>HP</span><span class="stat-val">${hero.hp}/${hero.maxHp}</span></div>
      ${hpBar}
      <div class="stat-row" style="margin-top:6px"><span>${translateText('Attack')}</span><span class="stat-val ${atkBuff ? 'buffed' : ''}">${hero.attack}${atkBuff ? ' ▲' : ''}</span></div>
      <div class="stat-row"><span>${translateKey('armor')}</span><span class="stat-val ${armBuff ? 'buffed' : ''}">${hero.armor}${armBuff ? ' ▲' : ''}</span></div>
      <div class="stat-row"><span>${translateKey('rangeShortUi')}</span><span class="stat-val">${hero.range}</span></div>
      <div class="stat-row"><span>${translateKey('turn')}</span><span class="stat-val">${hero.move}</span></div>
      ${hero.maxMana ? `<div class="stat-row"><span>${translateKey('mana')}</span><span class="stat-val">${hero.mana}/${hero.maxMana}</span></div>` : ''}
    </div>`;

    const invPerks = document.getElementById('inv-hero-perks');
    if (invPerks) invPerks.innerHTML = renderInvHeroPerksHtml(hero);

    const invActions = document.getElementById('inv-hero-actions');
    if (invActions) {
      const hasBetterGear = ['weapon', 'armor', 'artifact'].some(slot => !!bestInventoryCandidateForSlot(hero, slot));
      invActions.innerHTML = `<div class="inv-action-stack">
        <button type="button" class="btn btn-green" id="btn-inv-equip-best"${hasBetterGear ? '' : ' disabled'}>${translateKey('equipBest')}</button>
        <button type="button" class="btn btn-gold" id="btn-inv-perks" title="${translateKey('progressionTitle')}"><span class="ico ico-perks" aria-hidden="true"></span> ${translateKey('progression')}</button>
      </div>`;
      const bestBtn = document.getElementById('btn-inv-equip-best');
      if (bestBtn) bestBtn.onclick = () => {
        const changed = equipBestForHero(hero);
        const sinfo = document.getElementById('inv-slot-info');
        if (sinfo) sinfo.textContent = changed ? `${translateKey('equippedBest')}: ${changed}` : translateKey('noBetterGear');
        renderInventoryScreen();
        renderPartyStrip();
      };
      const perkBtn = document.getElementById('btn-inv-perks');
      if (perkBtn) perkBtn.onclick = () => openPerkTreeView(hero.id);
    }

    // Paperdoll — hero figure
    const figEl = document.getElementById('inv-hero-figure');
    if (figEl) {
      const tex = getHeroTexture(hero.id);
      if (tex) figEl.innerHTML = `<img src="${HERO_TEXTURE_PATHS[hero.id]}" class="inv-hero-figure-img" alt="" />`;
      else figEl.innerHTML = `<span class="inv-hero-figure-emoji">${hero.emoji}</span>`;
    }

    // Paperdoll — equipment zones
    hero.equipment = hero.equipment || { weapon: null, armor: null, artifact: null };
    const slotNames = { weapon: `⚔ ${translateKey('weapon')}`, armor: `🛡 ${translateKey('armor')}`, artifact: `✨ ${translateKey('artifact')}` };
    // Маски, а не эмодзи: подсказка пустого слота должна брать цвет от CSS,
    // иначе на светлом дереве ✨ так и остаётся бледно-бежевой.
    const slotDefIcons = {
      weapon: '<span class="ico ico-swords" aria-hidden="true"></span>',
      armor: '<span class="ico ico-shield" aria-hidden="true"></span>',
      artifact: '<span class="ico ico-artifact" aria-hidden="true"></span>'
    };
    const rarBadge = r => r === 'epic' ? `<span class="badge badge-epic">${translateKey('epic')}</span>` : r === 'rare' ? `<span class="badge badge-rare">${translateKey('rare')}</span>` : `<span class="badge badge-common">${translateKey('common')}</span>`;

    ['weapon', 'armor', 'artifact'].forEach(slot => {
      const zone = document.getElementById('eq-slot-' + slot);
      const nameEl = document.getElementById('eq-name-' + slot);
      if (!zone) return;
      const id = hero.equipment[slot];
      const it = itemById(id);
      const selectedEquipped = InvState.selectedEquippedSlot === slot && InvState.selectedItemId === id;
      zone.className = 'eq-zone' + (it ? ' eq-filled eq-rarity-' + it.rarity : '') + (selectedEquipped ? ' eq-selected' : '');
      if (nameEl) nameEl.textContent = it ? translateText(it.name) : '';
      if (it) {
        const fx = formatItemMods(it).map(translateText).join(' · ');
        const tip = [translateText(it.name), fx, translateText(it.desc || '')].filter(Boolean).join('\n');
        zone.title = tip;
        zone.innerHTML = `
          <div class="eq-zone-fill">${itemIconMarkup(it, 60)}</div>
          <div class="eq-zone-unequip" title="${translateKey('unequip')}">✕</div>`;
      } else {
        zone.title = '';
        zone.innerHTML = `<div class="eq-zone-fill eq-zone-empty"><span class="eq-zone-def-icon">${slotDefIcons[slot]}</span></div>`;
      }
      zone.onclick = () => {
        if (!id) return;
        InvState.selectedItemId = id;
        InvState.selectedItemIdx = -1;
        InvState.selectedEquippedSlot = slot;
        renderInventoryScreen();
      };
      zone.draggable = inventoryDesktopDragEnabled() && !!it;
      zone.ondragstart = (event) => {
        if (!it || !inventoryDesktopDragEnabled()) { event.preventDefault(); return; }
        setInventoryDragPayload(event, { source: 'equipped', heroId: hero.id, slot, itemId: id });
        zone.classList.add('eq-dragging');
      };
      zone.ondragend = () => zone.classList.remove('eq-dragging');
      zone.ondragover = (event) => {
        if (!inventoryDesktopDragEnabled()) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      };
      zone.ondragenter = () => { if (inventoryDesktopDragEnabled()) zone.classList.add('eq-drop-hover'); };
      zone.ondragleave = () => zone.classList.remove('eq-drop-hover');
      zone.ondrop = (event) => {
        event.preventDefault();
        zone.classList.remove('eq-drop-hover');
        const payload = inventoryDragPayload(event);
        if (!payload || payload.source !== 'bag') return;
        const dragged = itemById(GameState.inventory?.[payload.inventoryIndex]);
        if (!dragged || dragged.id !== payload.itemId) return;
        if (dragged.slot !== slot) {
          inventoryDropFeedback(translateKey('dragWrongSlot'), zone, true);
          return;
        }
        if (!inventoryItemFitsHero(dragged, hero)) {
          inventoryDropFeedback(`${translateKey('itemDoesNotFit')} ${hero.name}`, zone, true);
          return;
        }
        equipInventoryItemAtIndex(hero, payload.inventoryIndex);
      };
      const unequipBtn = zone.querySelector('.eq-zone-unequip');
      if (unequipBtn) {
        unequipBtn.onclick = (event) => {
          event.stopPropagation();
          showGameConfirm(`${translateKey('unequip')} «${translateText(it?.name || id)}»?`).then(ok => {
            if (!ok || hero.equipment?.[slot] !== id) return;
            unequipHeroSlotToInventory(hero, slot);
          });
        };
      }
    });

    // Backpack grid (index-based selection to avoid duplicate-ID bug)
    const bag = document.getElementById('bag-grid');
    const invEntries = (GameState.inventory || []).map((id, inventoryIndex) => ({ id, inventoryIndex })).filter(entry => itemById(entry.id));
    const bestCandidateIds = bestInventoryCandidateIdsForHero(hero);
    if (invEntries.length === 0) {
      bag.innerHTML = `<div class="empty-bag-state">
        <div class="empty-bag-icon" aria-hidden="true">◇</div>
        <strong>${translateKey('emptyBag')}</strong>
        <span>${translateKey('emptyBagHint')}</span>
      </div>`;
      if (!InvState.selectedEquippedSlot) {
        InvState.selectedItemIdx = -1;
        InvState.selectedItemId = null;
      }
    } else {
      bag.innerHTML = invEntries.map(({ id, inventoryIndex }) => {
        const it = itemById(id);
        const active = inventoryIndex === InvState.selectedItemIdx ? 'selected' : '';
        const mismatch = !inventoryItemFitsHero(it, hero);
        const best = bestCandidateIds.has(id);
        const fx = formatItemMods(it).map(translateText).join(' · ');
        const roleHint = mismatch ? `${translateKey('onlyClass')}: ${itemHeroClassLabel(it)}` : '';
        const tip = [translateText(it.name), fx, roleHint, translateText(it.desc || '')].filter(Boolean).join('\n');
        return `<div class="inv-item-card ${active}${best ? ' inv-item-best' : ''}${mismatch ? ' inv-item-mismatch' : ''}" data-idx="${inventoryIndex}" data-inventory-index="${inventoryIndex}" draggable="${inventoryDesktopDragEnabled()}" title="${escapeHtmlAttr(tip)}">
          <div class="inv-item-thumb">
            ${itemIconMarkup(it, 56)}
            ${best ? `<span class="inv-item-best-badge">${translateKey('bestBadge')}</span>` : ''}
            <span class="inv-item-price">${it.price}g</span>
          </div>
        </div>`;
      }).join('');
      bag.querySelectorAll('.inv-item-card').forEach(el => {
        el.onclick = () => {
          const inventoryIndex = parseInt(el.getAttribute('data-inventory-index'));
          InvState.selectedItemIdx = inventoryIndex;
          InvState.selectedItemId = GameState.inventory[inventoryIndex];
          InvState.selectedEquippedSlot = null;
          renderInventoryScreen();
        };
        el.ondragstart = (event) => {
          if (!inventoryDesktopDragEnabled()) { event.preventDefault(); return; }
          const inventoryIndex = parseInt(el.getAttribute('data-inventory-index'));
          setInventoryDragPayload(event, { source: 'bag', inventoryIndex, itemId: GameState.inventory[inventoryIndex] });
          el.classList.add('inv-item-dragging');
        };
        el.ondragend = () => el.classList.remove('inv-item-dragging');
      });
    }
    bag.ondragover = (event) => {
      if (!inventoryDesktopDragEnabled()) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
      bag.classList.add('bag-drop-hover');
    };
    bag.ondragleave = () => bag.classList.remove('bag-drop-hover');
    bag.ondrop = (event) => {
      event.preventDefault();
      bag.classList.remove('bag-drop-hover');
      const payload = inventoryDragPayload(event);
      if (!payload || payload.source !== 'equipped' || payload.heroId !== hero.id) return;
      if (hero.equipment?.[payload.slot] !== payload.itemId) return;
      unequipHeroSlotToInventory(hero, payload.slot);
    };

    // Detail panel
    const detail = document.getElementById('inv-detail');
    const sel = itemById(InvState.selectedItemId);
    if (!sel) { detail.innerHTML = `<div style="color:var(--text-dim);text-align:center;padding:20px 0">${translateKey('pickItem')}</div>`; return; }
    const effects = formatItemMods(sel).map(translateText);
    const statLinesHtml = effects.length
      ? effects.map(e => `<div>${e}</div>`).join('')
      : `<div>${translateKey('specialEffect')}</div>`;
    const descHtml = sel.desc ? `<div class="item-detail-desc">${translateText(sel.desc)}</div>` : '';
    const forRole = itemHeroClassLabel(sel);
    const fitsHero = inventoryItemFitsHero(sel, hero);
    const itemName = translateText(sel.name);
    const viewingEquipped = !!InvState.selectedEquippedSlot && hero.equipment?.[InvState.selectedEquippedSlot] === sel.id;
    detail.innerHTML = `
    <div class="item-detail-scroll">
      <div class="item-detail-headline">
        <div>
          <div class="item-detail-title">${itemName}</div>
          <div class="item-detail-sub">${slotNames[sel.slot] || sel.slot} · ${forRole}</div>
        </div>
        ${rarBadge(sel.rarity)}
      </div>
      ${fitsHero ? '' : `<div class="item-detail-mismatch">${translateKey('notForHero')} ${hero.name}</div>`}
      <div class="item-detail-stats">${statLinesHtml}</div>
      ${descHtml}
    </div>
    ${viewingEquipped ? '' : `<div class="item-detail-btns">
      <button class="btn btn-green" id="inv-equip-btn" style="width:100%;margin:0"${fitsHero ? '' : ' disabled'}>${translateKey('equip')}</button>
      <button class="btn btn-red" id="inv-drop-btn" style="width:100%;margin:0">${translateKey('drop')}</button>
    </div>`}`;
    if (viewingEquipped) return;
    const equipBtn = document.getElementById('inv-equip-btn');
    equipBtn.onclick = () => {
      if (!inventoryItemFitsHero(sel, hero)) {
        void showGameAlert(translateKey('itemDoesNotFit'));
        return;
      }
      const old = hero.equipment[sel.slot];
      const applyEquip = () => {
        const idx = InvState.selectedItemIdx >= 0 ? InvState.selectedItemIdx : GameState.inventory.indexOf(sel.id);
        if (idx >= 0) equipInventoryItemAtIndex(hero, idx);
      };
      if (old) {
        showGameConfirm(`${translateKey('replaceItem')} ${translateText(itemById(old)?.name || old)}?`).then(ok => {
          if (!ok) return;
          applyEquip();
        });
        return;
      }
      applyEquip();
    };
    document.getElementById('inv-drop-btn').onclick = () => {
      showGameConfirm(translateKey('dropItemConfirm')).then(ok => {
        if (!ok) return;
        const dropIdx = InvState.selectedItemIdx >= 0 ? InvState.selectedItemIdx : GameState.inventory.indexOf(sel.id);
        if (dropIdx >= 0) GameState.inventory.splice(dropIdx, 1);
        if (GameState._returnToVictory) markLastBattleDropHandled(sel.id);
        updateVictoryActionButtons();
        InvState.selectedItemId = null; InvState.selectedItemIdx = -1; InvState.selectedEquippedSlot = null;
        saveGame();
        renderInventoryScreen();
      });
    };
    updateInventoryCloseButton();
  }
  /** Everything the shops of a region should avoid repeating: what the party
   *  already carries, and what the other cities of the same region are already
   *  selling. Region 1 has only five commons, eight rares and a single epic, so
   *  without this every town looked like the last one, down to offering back the
   *  sword the player had just bought. */
  function shopAvoidSet(region, cityId) {
    const avoid = new Set(ownedItemIds());
    const stocks = GameState.cityShopStocks || {};
    Object.entries(stocks).forEach(([id, state]) => {
      if (id === cityId) return;
      const cell = (GameState.mapGrid || []).find(node => node.id === id);
      if (cell && cell.region !== region) return;
      ((state?.shopStock?.stock) || []).forEach(item => avoid.add(item.id));
      if (state?.cityState?.secretItemId) avoid.add(state.cityState.secretItemId);
    });
    return avoid;
  }
  /** Premium hidden offer: this region's epics first, then the next region's. */
  function drawSecret(region, avoid, taken) {
    const tiers = [
      ITEM_POOL.filter(i => i.rarity === 'epic' && i.minRegion === region && !avoid.has(i.id) && !taken.has(i.id)),
      ITEM_POOL.filter(i => i.rarity === 'epic' && i.minRegion === region + 1 && !avoid.has(i.id) && !taken.has(i.id)),
      ITEM_POOL.filter(i => i.rarity === 'epic' && i.minRegion <= region && !taken.has(i.id))
    ];
    const pool = tiers.find(list => list.length);
    if (!pool) return null;
    const pick = pool[Math.floor(Math.random() * pool.length)];
    taken.add(pick.id);
    return deepClone(pick);
  }

  function generateShopStock(region, cityId) {
    const currentTier = ITEM_POOL.filter(i => i.minRegion === region);
    const olderTier = ITEM_POOL.filter(i => i.minRegion < region);
    const byRegion = currentTier.length ? [...currentTier, ...olderTier] : ITEM_POOL.filter(i => i.minRegion <= region);
    const avoid = shopAvoidSet(region, cityId);
    const shuffle = arr => [...arr].sort(() => Math.random() - 0.5);
    const taken = new Set();
    /** Prefer this region's tier, then anything unseen, then whatever is left. */
    const draw = rarity => {
      const all = byRegion.filter(i => i.rarity === rarity && !taken.has(i.id));
      const tiers = [
        all.filter(i => i.minRegion === region && !avoid.has(i.id)),
        all.filter(i => !avoid.has(i.id)),
        all.filter(i => i.minRegion === region),
        all
      ];
      const pool = tiers.find(list => list.length);
      if (!pool) return null;
      const pick = shuffle(pool)[0];
      taken.add(pick.id);
      return deepClone(pick);
    };
    const stock = [];
    // Two commons. The whole game ships five of them, so once a region's towns
    // have shared them out, offer a fresh rare rather than repeat a shelf.
    const freshCommons = byRegion.filter(i => i.rarity === 'common' && !avoid.has(i.id)).length;
    for (let i = 0; i < 2; i++) {
      const item = i < freshCommons ? draw('common') : (draw('rare') || draw('common'));
      if (item) stock.push(item);
    }
    // At least one rare item, sometimes two.
    const rare = draw('rare');
    if (rare) stock.push(rare);
    if (Math.random() < 0.3 + (region - 1) * 0.15) {
      const second = draw('rare');
      if (second) stock.push(second);
    }
    // The secret slot may reach one region ahead: region 1 owns a single epic, so
    // without this every town in the forest hid the very same hammer.
    const secretItem = drawSecret(region, avoid, taken) || draw('rare') || stock[0] || deepClone(byRegion[0]);
    return { stock: stock.slice(0, 4), secretItem };
  }

  function upgradeItem(item, region) {
    const nextRarity = { common: 'rare', rare: 'epic' }[item.rarity];
    if (!nextRarity) return item;
    const pool = ITEM_POOL.filter(i =>
      i.rarity === nextRarity &&
      i.slot === item.slot &&
      (i.heroClass === item.heroClass || i.heroClass === 'all' || item.heroClass === 'all') &&
      i.minRegion <= region
    );
    return pool.length ? deepClone(pool[Math.floor(Math.random() * pool.length)]) : item;
  }

  function shouldShowBonusGoldAd() {
    const stock = (GameState.shopStock && GameState.shopStock.stock) || GameState.shopStock;
    if (!stock || !stock.length) return false;
    const cheapest = Math.min(...stock.map(i => i.price));
    const mostWanted = Math.max(...stock.map(i => i.price));
    return GameState.gold >= cheapest && GameState.gold < mostWanted && (mostWanted - GameState.gold) <= 60;
  }

  function getHealCost() {
    const missing = GameState.heroes.reduce((s, h) => s + Math.max(0, h.maxHp - h.hp), 0);
    return Math.max(10, missing * 2);
  }

  /** Enemies flagged miniBoss in enemyDef. The old rules capped only three of
   *  them, and the Dark Knight was not on the list, so an ordinary region 2
   *  mission could field two Dark Knights plus a Stone Golem — three mini-bosses,
   *  while region 3 was capped at one. That is what made the hardest non-boss
   *  fight in the campaign sit in the middle of it. */
  const WAVE_MINI_BOSSES = [ENEMY_IDS.STONE_GOLEM, ENEMY_IDS.DARK_KNIGHT, ENEMY_IDS.BLOOD_KNIGHT, ENEMY_IDS.ARCANE_SENTINEL];
  const WAVE_HEAVY_ARMOR = [ENEMY_IDS.ORC_GUARD, ENEMY_IDS.SHIELDBEARER];
  /** The finale may field an elite pair; earlier acts may not. */
  const miniBossCapForRegion = region => (Number(region) >= 3 ? 2 : 1);
  function waveCompositionAllows(wave, candidate, region = 1) {
    const countGroup = ids => wave.filter(id => ids.includes(id)).length;
    const duplicateCount = wave.filter(id => id === candidate).length;
    const volatile = [ENEMY_IDS.SUICIDE, ENEMY_IDS.PLAGUE_DOCTOR];
    const ranged = [ENEMY_IDS.GOBLIN_ARCHER, ENEMY_IDS.BANDIT_THROWER, ENEMY_IDS.CROSSBOWMAN, ENEMY_IDS.HEXER, ENEMY_IDS.BANSHEE];
    const healers = [ENEMY_IDS.SHAMAN, ENEMY_IDS.PLAGUE_DOCTOR];
    const summoners = [ENEMY_IDS.NECRO, ENEMY_IDS.SHAMAN];
    const controllers = [ENEMY_IDS.SPIDER, ENEMY_IDS.ICE_ELEM, ENEMY_IDS.HEXER, ENEMY_IDS.BANSHEE, ENEMY_IDS.ARCANE_SENTINEL];
    const assassins = [ENEMY_IDS.ASSASSIN, ENEMY_IDS.VOID_STALKER, ENEMY_IDS.BLOOD_KNIGHT];
    if (duplicateCount >= 2) return false;
    if (volatile.includes(candidate) && countGroup(volatile) >= 1) return false;
    if (ranged.includes(candidate) && countGroup(ranged) >= 2) return false;
    if (healers.includes(candidate) && countGroup(healers) >= 1) return false;
    if (summoners.includes(candidate) && countGroup(summoners) >= 1) return false;
    if (controllers.includes(candidate) && countGroup(controllers) >= 2) return false;
    if (assassins.includes(candidate) && countGroup(assassins) >= 2) return false;
    if (WAVE_MINI_BOSSES.includes(candidate) && countGroup(WAVE_MINI_BOSSES) >= miniBossCapForRegion(region)) return false;
    if (WAVE_HEAVY_ARMOR.includes(candidate) && countGroup(WAVE_HEAVY_ARMOR) >= 1) return false;
    return true;
  }

  /** Which slots of a wave carry an elite affix. Derived from the cell id, so the
   *  map preview and the battle that follows always agree, and so a route decision
   *  can be made on real information rather than a surprise at deployment. */
  function eliteAffixesForWave(cell, wave) {
    const affixes = wave.map(() => null);
    if (!cell || !Array.isArray(wave) || !wave.length) return affixes;
    if (['boss', 'final'].includes(cell.type)) return affixes;
    const region = Math.max(1, Math.min(3, Number(cell.region) || 1));
    const chance = ELITE_AFFIX_CHANCE[region] || 0;
    const cap = ELITE_AFFIX_CAP[region] || 1;
    let placed = 0;
    wave.forEach((enemyId, index) => {
      if (placed >= cap) return;
      const def = enemyDef(enemyId);
      if (!def || def.boss || def.miniBoss) return;
      const roll = hashSeed(`${cell.id}:${index}:${enemyId}`);
      if ((roll % 1000) / 1000 >= chance) return;
      affixes[index] = ELITE_AFFIX_IDS[Math.floor(roll / 1000) % ELITE_AFFIX_IDS.length];
      placed += 1;
    });
    return affixes;
  }

  function generateEnemyWaveForCell(cell) {
    if (!cell) return [ENEMY_IDS.SKELETON];
    if (cell.id === 'c_0_0' && !GameState.firstBattleCompleted) {
      return [ENEMY_IDS.SKELETON, ENEMY_IDS.SKELETON, ENEMY_IDS.BANDIT_THROWER];
    }
    const pools = {
      1: [ENEMY_IDS.SKELETON, ENEMY_IDS.GOBLIN_ARCHER, ENEMY_IDS.BOAR, ENEMY_IDS.ZOMBIE, ENEMY_IDS.SHAMAN,
          ENEMY_IDS.BANDIT, ENEMY_IDS.WOLF, ENEMY_IDS.BANDIT_THROWER,
          ENEMY_IDS.SPEARMAN, ENEMY_IDS.BOG_LURKER, ENEMY_IDS.THORN_DRYAD, ENEMY_IDS.RAT_SWARM],
      2: [ENEMY_IDS.ORC_GUARD, ENEMY_IDS.SPIDER, ENEMY_IDS.SUICIDE, ENEMY_IDS.ICE_ELEM, ENEMY_IDS.WATCHER, ENEMY_IDS.DARK_KNIGHT,
          ENEMY_IDS.CULTIST, ENEMY_IDS.HEXER, ENEMY_IDS.SHIELDBEARER, ENEMY_IDS.CROSSBOWMAN, ENEMY_IDS.STONE_GOLEM],
      3: [ENEMY_IDS.NECRO, ENEMY_IDS.CHAOS, ENEMY_IDS.ASSASSIN, ENEMY_IDS.GHOST,
          ENEMY_IDS.VOID_STALKER, ENEMY_IDS.BLOOD_KNIGHT, ENEMY_IDS.BANSHEE, ENEMY_IDS.PLAGUE_DOCTOR, ENEMY_IDS.ARCANE_SENTINEL]
    };
    if (cell.type === 'boss') {
      if (cell.region === 1) return [ENEMY_IDS.LESHY];
      if (cell.region === 2) return [ENEMY_IDS.FIRE_TITAN];
      return [ENEMY_IDS.HYDRA];
    }
    if (cell.type === 'final') return [ENEMY_IDS.DARK_LORD];
    const pool = pools[cell.region];
    let cnt = cell.type === 'dungeon' ? 4 : cell.type === 'arena' ? 1 : 3;
    if (cell.region === 2 && cell.type === 'mission') cnt = 4;
    if (cell.region === 3 && cell.type === 'mission') cnt = 4;
    if (cell.region === 3 && cell.type === 'dungeon') cnt = 4;
    if (isHardcoreMode() && ['mission', 'dungeon', 'arena'].includes(cell.type)) {
      cnt += 1;
    }
    const wave = [];
    for (let i = 0; i < cnt; i++) {
      const allowed = pool.filter(candidate => waveCompositionAllows(wave, candidate, cell.region));
      const candidates = allowed.length ? allowed : pool.filter(candidate => wave.filter(id => id === candidate).length < 2);
      const pick = candidates[randInt(0, candidates.length - 1)];
      wave.push(pick);
    }
    return wave;
  }
  function startBattleForCell(cell, opts) {
    const firstBattle = cell.id === 'c_0_0' && !GameState.firstBattleCompleted;
    const node = {
      id: cell.id,
      region: cell.region,
      type: cell.type,
      enemyWave: (opts && opts.wave) || cell.enemyWavePreview || generateEnemyWaveForCell(cell),
      boss: cell.type === 'boss',
      final: cell.type === 'final',
      firstBattle,
      ambush: !!(opts && opts.ambush),
      routeCommitment: !!cell.routeCommitment,
      scenarioPreview: (opts && opts.scenario) || cell.scenarioPreview || null
    };
    startBattle(node);
    if (opts && opts.skipDeploy) {
      const b = GameState.currentBattle;
      if (!opts.ambush) {
        const alive = b.units.filter(u => u.isHero);
        alive.forEach((h, i) => { h.x = i % 2; h.y = Math.floor(i / 2); });
      }
      beginCombatFromDeploy();
    }
  }
  function applyBattleRewards(cell) {
    const region = (cell && cell.region) || GameState.region || 1;
    GameState._lastBattleDrop = null;
    GameState._lastBattleDropHandled = true;
    const type = (cell && cell.type) || 'mission';
    const firstBattleReward = cell && cell.id === 'c_0_0' && !GameState.firstBattleCompleted;
    let forceRarity = null;
    let dropChance = 0.25;
    if (type === 'dungeon') { dropChance = 0.65; forceRarity = 'rare'; }
    else if (type === 'arena' || type === 'wanderer') dropChance = 0.40;
    else if (type === 'boss' || type === 'final') { dropChance = 1; forceRarity = 'epic'; }

    const enemyIds = GameState._lastBattleEnemyIds || [];
    const eliteBonus = enemyIds.reduce((best, id) => Math.max(best, (LOOT_CHANCE[id] || 0) * 0.25), 0);
    if (CampaignExpansion.isMutatorActive('relic_hunt')) dropChance += 0.16;
    if (GameState.campaignEffects?.mercenaryFirstDrop && GameState.stats.battles <= 1) dropChance -= 0.12;
    dropChance = Math.min(1, Math.max(0, dropChance + eliteBonus));
    if (!firstBattleReward && Math.random() > dropChance) return;

    const drop = selectLootItem(region, firstBattleReward ? 'common' : forceRarity, true);
    GameState.inventory.push(drop.id);
    GameState._lastBattleDrop = drop;
    GameState._lastBattleDropHandled = false;
  }

  function getEquippedItem(hero, slot) {
    if (!hero.equipment || !hero.equipment[slot]) return null;
    return ITEM_POOL.find(i => i.id === hero.equipment[slot]) || null;
  }
  // Choice events: every option exposes its immediate cost or benefit.
  const EVENT_ICONS = { positive: '?', negative: '??', neutral: '??', ambush: '??', treasure: '??', heal: '??', smith: '??', curse: '?', refugees: '??', fog: '??', blessing: '??', trade: '??' };
  function showEventModal(text, type, onContinue, choices = []) {
    const card = document.getElementById('event-card');
    const iconEl = document.getElementById('event-icon-big');
    const typeEl = document.getElementById('event-type-label');
    const textEl = document.getElementById('event-main-text');
    const choiceRoot = document.getElementById('event-choice-list');
    const resultEl = document.getElementById('event-result');
    const ok = document.getElementById('btn-event-ok');
    const typeLabels = { positive: translateKey('eventPositive'), negative: translateKey('eventNegative'), neutral: translateKey('event'), ambush: translateKey('eventAmbush'), treasure: translateKey('eventTreasure'), heal: translateKey('eventHeal'), smith: translateKey('eventSmith'), curse: translateKey('eventCurse'), refugees: translateKey('eventRefugees'), fog: translateKey('eventFog'), blessing: translateKey('eventBlessing'), trade: translateKey('eventTrade') };
    card.className = 'event-card ev-' + (type === 'negative' || type === 'curse' ? 'negative' : type === 'positive' ? 'positive' : 'neutral');
    iconEl.textContent = EVENT_ICONS[type] || '??';
    typeEl.textContent = typeLabels[type] || translateKey('event');
    textEl.textContent = text;
    if (choiceRoot) choiceRoot.innerHTML = '';
    if (resultEl) { resultEl.textContent = ''; resultEl.classList.add('hidden'); }
    if (ok) { ok.classList.toggle('hidden', choices.length > 0); ok.onclick = onContinue || null; }
    choices.forEach(choice => {
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'event-choice-btn';
      btn.innerHTML = `<strong>${escapeHtml(choice.label)}</strong><span>?</span><small>${escapeHtml(choice.detail)}</small>`;
      btn.onclick = () => choice.onSelect?.();
      choiceRoot?.appendChild(btn);
    });
    GameState._eventContinueFn = onContinue || null;
    showScreen('event');
  }

  function triggerEvent(cell) {
    const event = CampaignExpansion.eventForCell(cell);
    const choices = event.choices.map(choice => ({
      label: choice.label,
      detail: choice.detail,
      onSelect: () => {
        const validation = CampaignExpansion.validateEventEffect(choice.effect);
        if (!validation.ok) {
          void showGameAlert(validation.message);
          return;
        }
        cell.completed = true;
        const result = CampaignExpansion.applyEventEffect(choice.effect, cell);
        const choiceRoot = document.getElementById('event-choice-list');
        const resultEl = document.getElementById('event-result');
        const ok = document.getElementById('btn-event-ok');
        if (choiceRoot) choiceRoot.innerHTML = '';
        if (resultEl) { resultEl.textContent = result; resultEl.classList.remove('hidden'); }
        if (ok) {
          ok.classList.remove('hidden');
          ok.textContent = translateKey('continue');
          ok.onclick = () => {
            CampaignExpansion.resolveDelayedEvents();
            saveGame();
            showScreen('map');
            renderMap();
            if (GameState._campaignNotice) {
              const notice = GameState._campaignNotice;
              GameState._campaignNotice = '';
              setTimeout(() => void showGameAlert(notice), 150);
            }
          };
        }
      }
    }));
    showEventModal(event.text, event.type, null, choices);
  }

  // 13: showScreen with fade transition
  function showScreen(name) {
    ActiveScreen = name;
    if (name !== 'menu') GameState.screen = name;
    const screenMap = {
      map: 'map-screen', city: 'city-screen', battle: 'battle-screen',
      inventory: 'inventory-screen', victory: 'victory-screen',
      gameover: 'gameover-screen', ending: 'ending-screen', event: 'event-screen',
      bestiary: 'bestiary-screen', arsenal: 'arsenal-screen'
    };
    const mainMenu = document.getElementById('main-menu');

    const doShow = () => {
      // Clear all opacity overrides first
      document.querySelectorAll('.screen').forEach(s => { s.classList.add('hidden'); s.style.opacity = ''; s.style.transition = ''; });
      mainMenu.classList.add('hidden');
      mainMenu.style.opacity = '';
      mainMenu.style.transition = '';

      if (name === 'menu') {
        document.getElementById('hud-top').classList.add('hidden');
        mainMenu.classList.remove('hidden');
        mainMenu.style.opacity = '0';
        requestAnimationFrame(() => {
          mainMenu.style.transition = 'opacity 0.15s ease';
          mainMenu.style.opacity = '1';
          initMenuScreen();
        });
      } else {
        document.getElementById('hud-top').classList.remove('hidden');
        const targetId = screenMap[name];
        if (targetId) {
          const el = document.getElementById(targetId);
          if (el) {
            el.classList.remove('hidden');
            el.style.opacity = '0';
            requestAnimationFrame(() => { el.style.transition = 'opacity 0.15s ease'; el.style.opacity = '1'; });
          }
        }
      }
      updateHud();
      GameBGM.syncToScreen(name);
      scheduleLocalize(document.body);
    };

    // Find currently visible elements to fade out
    const visibleScreens = Array.from(document.querySelectorAll('.screen:not(.hidden)'));
    const menuVisible = !mainMenu.classList.contains('hidden');
    const hasVisible = visibleScreens.length > 0 || menuVisible;

    if (hasVisible) {
      visibleScreens.forEach(s => { s.style.transition = 'opacity 0.1s ease'; s.style.opacity = '0'; });
      if (menuVisible) { mainMenu.style.transition = 'opacity 0.1s ease'; mainMenu.style.opacity = '0'; }
      setTimeout(doShow, 110);
    } else {
      doShow();
    }
  }
  function openGameMenu() {
    document.getElementById('game-menu-overlay').classList.add('show');
  }
  function closeGameMenu() {
    document.getElementById('game-menu-overlay').classList.remove('show');
  }
  function setDifficulty(mode) {
    GameState.difficulty = mode === 'hardcore' ? 'hardcore' : 'normal';
    const dn = document.getElementById('diff-normal');
    const dh = document.getElementById('diff-hard');
    if (!dn || !dh) return;
    dn.className = 'menu-diff-btn' + (GameState.difficulty === 'normal' ? ' active-normal' : '');
    dh.className = 'menu-diff-btn' + (GameState.difficulty === 'hardcore' ? ' active-hard' : '');
  }

  function setCampaignContract(id) {
    if (!CampaignExpansion.CONTRACTS[id]) return;
    GameState.contract = id;
    document.querySelectorAll('[data-contract]').forEach(button => {
      const contract = CampaignExpansion.CONTRACTS[button.dataset.contract];
      button.classList.toggle('active', button.dataset.contract === id);
      // Иконка — маска с классом, а не эмодзи в тексте: textContent затирал бы
      // разметку, из-за чего кнопки контрактов оставались единственными в меню
      // со старыми эмодзи, хотя в index.html их уже заменили.
      if (contract) {
        const glyph = contract.iconClass
          ? `<span class="ico ${contract.iconClass}" aria-hidden="true"></span>`
          : escapeHtml(contract.icon);
        button.innerHTML = `${glyph} ${escapeHtml(CampaignExpansion.loc(contract.name))}`;
      }
    });
    const label = document.getElementById('menu-contract-label');
    if (label) label.textContent = currentLanguage() === 'ru' ? 'КОНТРАКТ ПОХОДА' : currentLanguage() === 'es' ? 'CONTRATO DE EXPEDICIÓN' : 'EXPEDITION CONTRACT';
    const copy = document.getElementById('menu-contract-copy');
    if (copy) copy.textContent = CampaignExpansion.loc(CampaignExpansion.CONTRACTS[id].summary);
  }

  function initMenuScreen() {
    const starsEl = document.getElementById('menu-stars');
    if (starsEl && starsEl.children.length === 0) {
      for (let i = 0; i < 60; i++) {
        const s = document.createElement('div');
        s.className = 'menu-star' + (Math.random() < 0.15 ? ' big' : '');
        s.style.left = Math.random() * 100 + '%';
        s.style.top = Math.random() * 65 + '%';
        s.style.opacity = (0.2 + Math.random() * 0.7).toFixed(2);
        s.style.position = 'absolute';
        starsEl.appendChild(s);
      }
    }

    const mainMenu = document.getElementById('main-menu');
    if (mainMenu && !mainMenu.dataset.menuHoverBound) {
      mainMenu.dataset.menuHoverBound = '1';
      mainMenu.addEventListener('mouseover', e => {
        const btn = e.target.closest('.menu-btn');
        if (!btn || !mainMenu.contains(btn)) return;
        mainMenu.querySelectorAll('.menu-btn').forEach(b => b.classList.remove('menu-btn-active'));
        btn.classList.add('menu-btn-active');
      });
    }

    let save = null;
    try {
      const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem(LEGACY_SAVE_KEY);
      save = raw ? JSON.parse(raw) : null;
    } catch (_) { save = null; }

    const ashEl = document.getElementById('menu-ash');
    if (ashEl && ashEl.children.length === 0) {
      const flakes = 52;
      for (let i = 0; i < flakes; i++) {
        const f = document.createElement('div');
        f.className = 'menu-ash-flake';
        const drift = (Math.random() - 0.5) * 100;
        const dur = 26 + Math.random() * 34;
        const delay = -(Math.random() * dur);
        const w = 1 + Math.random() * 2;
        const h = 3 + Math.random() * 4;
        f.style.left = Math.random() * 100 + '%';
        f.style.width = w + 'px';
        f.style.height = h + 'px';
        f.style.setProperty('--ash-drift', drift + 'px');
        f.style.animationDuration = dur + 's';
        f.style.animationDelay = delay + 's';
        ashEl.appendChild(f);
      }
    }

    const contBtn = document.querySelector('.menu-btn-continue');
    if (contBtn) {
      if (!save) {
        contBtn.style.opacity = '0.4';
        contBtn.style.cursor = 'not-allowed';
        contBtn.onclick = null;
      } else {
        contBtn.style.opacity = '';
        contBtn.style.cursor = '';
        contBtn.onclick = continueGame;
      }
    }

    setDifficulty(GameState.difficulty === 'hardcore' ? 'hardcore' : 'normal');
    setCampaignContract(GameState.contract || 'hunters');
  }

  function startNewGame() {
    // Every campaign receives a concrete seed, including ordinary menu starts,
    // so the history screen can genuinely replay its map, events and modifiers.
    const campaignSeed = GameState.replaySeed || TEST_SEED || `run-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    GameState.testSeed = campaignSeed;
    applyTestSeed(campaignSeed);
    initHeroesFromTemplate();
    buildWorldMap();
    GameState.gold = isHardcoreMode() ? 10 : 20;
    GameState.turn = 1;
    GameState.inventory = [];
    GameState.consumables = {};
    GameState.stats = { battles: 0, kills: 0, goldEarned: 0, objectivesCompleted: 0, damageTaken: 0, skillfulBattles: 0 };
    GameState.storyScenesSeen = [];
    GameState.pendingStoryScene = null;
    GameState.firstBattleCompleted = false;
    GameState.mapIntroShown = false;
    // Contextual first-battle coaching belongs to every new campaign.
    // The longer onboarding remains first-run only.
    GameState.ftueHintsEnabled = true;
    GameState.ftueSkillsUsed = {};
    GameState.runStartedAt = Date.now();
    GameState.replaySeed = null;
    if (!GameState.difficulty) GameState.difficulty = 'normal';
    CampaignExpansion.startCampaign(GameState.testSeed || Date.now());
    saveGame();
    updateMenuMeta();
    const firstCell = getCurrentCell();
    if (firstCell) startBattleForCell(firstCell, { skipDeploy: false });
    else { showScreen('map'); renderMap(); }
  }

  function replayCampaign(index) {
    const entry = GameState.runHistory?.[index];
    if (!entry || !entry.seed || entry.seed === 'random') return;
    GameState.replaySeed = entry.seed;
    GameState.contract = entry.contract || 'hunters';
    const overlay = document.getElementById('menu-settings-overlay');
    if (overlay) { overlay.classList.remove('show'); overlay.setAttribute('aria-hidden', 'true'); }
    startNewGame();
  }

  function continueGame() {
    if (!localStorage.getItem(SAVE_KEY) && !localStorage.getItem(LEGACY_SAVE_KEY)) {
      void showGameAlert('Save not found.');
      return;
    }
    if (!loadGame()) {
      void showGameAlert(CampaignExpansion.loc({
        ru: 'Не удалось прочитать сохранение. Новая игра не была запущена, чтобы не перезаписать данные.',
        en: 'The save could not be read. A new game was not started, so your data was not overwritten.',
        es: 'No se pudo leer la partida. No se inició una nueva para no sobrescribir los datos.'
      }));
      return;
    }
    const firstCell = getCurrentCell();
    if (!GameState.firstBattleCompleted && firstCell?.id === 'c_0_0') {
      startBattleForCell(firstCell, { skipDeploy: false });
      updateMenuMeta();
      return;
    }
    if (GameState.screen === 'city') {
      const city = getActiveCityNode();
      if (city) {
        enterCity(city, GameState._cityStrangerOnly);
        updateMenuMeta();
        return;
      }
    }
    if (GameState.screen === 'inventory') {
      renderInventoryScreen();
      showScreen('inventory');
      updateMenuMeta();
      return;
    }
    if (GameState.screen === 'battle' && GameState.currentBattle) {
      showScreen('battle');
      updateBattleUI();
      updateMenuMeta();
      return;
    }
    showScreen('map');
    renderMap();
    if (GameState.pendingStoryScene) {
      requestAnimationFrame(() => { void consumePendingStoryScene(); });
    }
    updateMenuMeta();
  }

  function showAbout() {
    void showOnboarding({ manual: true });
  }

  function updateMenuMeta() {
    initMenuScreen();
  }

  function mapNodeIconPath(node) {
    if (node && node.type === 'city') return MAP_CASTLE_ICON;
    return null;
  }

  function regionBossEnemyId(region) {
    if (region === 1) return ENEMY_IDS.LESHY;
    if (region === 2) return ENEMY_IDS.FIRE_TITAN;
    return ENEMY_IDS.HYDRA;
  }

  function mapBossSilhouetteHtml(node) {
    const enemyId = regionBossEnemyId(node.region);
    const src = enemyIconUrl(enemyId);
    return `<div class="map-node-face map-node-face-boss" aria-label="${translateKey('nodeBoss')}">
      <div class="map-boss-silhouette" style="-webkit-mask-image:url('${src}');mask-image:url('${src}')"></div>
    </div>`;
  }

  function mapNodeFaceHtml(node) {
    if (node?.completed && ['boss', 'final'].includes(node.type)) {
      return `<div class="map-node-face map-node-face-defeated-boss" aria-label="${translateKey('bossDefeated')}">☠</div>`;
    }
    if (node?.type === 'boss' && node.region <= GameState.regionUnlocked) {
      return mapBossSilhouetteHtml(node);
    }
    const src = mapNodeIconPath(node);
    const em = node.emoji || '🏘️';
    if (src) {
      return `<div class="map-node-face map-node-face-img"><img src="${src}" alt="" loading="lazy" decoding="async" onerror="this.replaceWith(document.createTextNode('${em}'))"/></div>`;
    }
    return `<div class="map-node-face">${em}</div>`;
  }

  function mapPartyMarkerHtml() {
    return `<div class="map-party-marker" aria-label="${translateKey('party')}"><img src="assets/ui/heroes.png" alt="" loading="lazy" decoding="async" /><span class="map-party-marker-label">${translateKey('party')}</span></div>`;
  }

  function mapCellInfoIconHtml(node) {
    const src = mapNodeIconPath(node);
    const em = node.emoji || '🏘️';
    if (src) {
      return `<div class="cell-info-icon cell-info-icon-img"><img src="${src}" alt="" loading="lazy" onerror="this.parentElement.textContent='${em}';this.parentElement.classList.remove('cell-info-icon-img');"/></div>`;
    }
    return `<div class="cell-info-icon">${em}</div>`;
  }

  /** Wall and gateway decorations for a rendered map node, read back from the
   *  classes WorldMapTopology assigned to it. */
  function mapWallDecorationHtml(el) {
    let html = '';
    // Regional walls are the hard act boundaries and stay loud; internal walls
    // are terrain and must not turn the board into a red grid.
    const side = (name) => el.classList.contains(`map-wall-${name}-regional`) ? ' is-regional' : '';
    if (el.classList.contains('map-wall-top')) html += `<span class="map-wall-seg map-wall-seg-top${side('top')}" aria-hidden="true"></span>`;
    if (el.classList.contains('map-wall-bottom')) html += `<span class="map-wall-seg map-wall-seg-bottom${side('bottom')}" aria-hidden="true"></span>`;
    if (el.classList.contains('map-gateway-down')) html += '<span class="map-gateway-mark map-gateway-mark-down" aria-hidden="true">▼</span>';
    if (el.classList.contains('map-gateway-up')) html += '<span class="map-gateway-mark map-gateway-mark-up" aria-hidden="true">▲</span>';
    return html;
  }

  /** The board has four cell states and a wall, and none of them said what they
   *  meant: a dimmed tile reads as "broken" rather than "seen but not one step
   *  away". The legend is small, permanent, and costs one render. */
  function renderMapLegend() {
    const root = document.getElementById('map-legend');
    if (!root) return;
    const rows = [
      ['legend-swatch-option', 'legendOption'],
      ['legend-swatch-secondary', 'legendSecondary'],
      ['legend-swatch-explored', 'legendExplored'],
      ['legend-swatch-fog', 'legendFog'],
      ['legend-swatch-wall', 'legendWall']
    ];
    root.innerHTML = `<div class="map-legend-title">${translateKey('legendTitle')}</div>` +
      rows.map(([swatch, key]) =>
        `<div class="map-legend-row"><span class="legend-swatch ${swatch}"></span><span>${translateKey(key)}</span></div>`).join('');
  }

  function mapLocationName(node) {
    const names = {
      1: {
        mission: ['Лешачий тракт', 'Мшистый перелесок', 'Волчья просека'],
        dungeon: ['Забытая чаща'], event: ['Перекрёсток судеб'], city: ['Лесной приют'],
        boss: ['Сердце чащи'], wanderer: ['Стоянка странника'], arena: ['Круг старых дубов'],
        camp: ['Костёр под елью', 'Тихая поляна']
      },
      2: {
        mission: ['Обугленный тракт', 'Багровая расщелина', 'Пепельный мост'],
        dungeon: ['Остывшая кузня'], event: ['Пепельный перекрёсток'], city: ['Кузня у разлома'],
        boss: ['Врата пламени'], wanderer: ['Лагерь пилигрима'], arena: ['Огненный круг'],
        camp: ['Привал у жаровни', 'Обжитая штольня']
      },
      3: {
        mission: ['Утонувший тракт', 'Мёртвая гавань', 'Зал приливов'],
        dungeon: ['Затопленный склеп'], event: ['Берег шёпота'], city: ['Пристань изгнанников'],
        boss: ['Чертог глубин'], wanderer: ['Плот торговца'], arena: ['Арена прилива'], final: ['Последний престол'],
        camp: ['Сухой причал', 'Костёр на отмели']
      }
    };
    const fallback = campaignRegionName(node.region);
    const pool = names[node.region]?.[node.type];
    return pool?.[(node.x * 3 + node.y) % pool.length] || fallback;
  }

  /** Rough danger of a generated wave. Same shape as the heuristic in
   *  scripts/balance-seeds.mjs, so the label the player reads and the number the
   *  balance report validates describe the same thing. */
  function waveThreatScore(wave) {
    if (!Array.isArray(wave) || !wave.length) return 0;
    return wave.reduce((total, enemyId) => {
      const d = enemyDef(enemyId);
      if (!d) return total;
      let score = d.hp + d.attack * 6 + d.armor * 4 + d.range * 3 + d.move * 2 + d.speed;
      if (d.miniBoss) score *= 1.25;
      if (d.boss) score *= 1.5;
      if ((d.sizeW || 1) > 1) score *= 1.12;
      return total + Math.round(score);
    }, 0);
  }
  /** Bands are per region: "high" has to mean high for where the party is now,
   *  not high compared to the opening act. Values follow the measured curve in
   *  docs/BALANCE_SEED_REPORT.md. */
  const REGION_THREAT_BANDS = {
    1: { medium: 200, high: 250, extreme: 300 },
    2: { medium: 360, high: 460, extreme: 560 },
    3: { medium: 450, high: 560, extreme: 650 }
  };
  function waveThreatKey(node, wave, affixes = []) {
    if (['boss', 'final'].includes(node.type)) return 'threatExtreme';
    let score = waveThreatScore(wave);
    if (!score) return 'threatLow';
    // Every elite in the wave counts as a fifth of the fight again.
    score = Math.round(score * (1 + 0.2 * affixes.filter(Boolean).length));
    const bands = REGION_THREAT_BANDS[node.region] || REGION_THREAT_BANDS[1];
    if (score >= bands.extreme) return 'threatExtreme';
    if (score >= bands.high) return 'threatHigh';
    if (score >= bands.medium) return 'threatMedium';
    return 'threatLow';
  }

  function mapNodeIntel(node) {
    const rewardKey = node.type === 'city' || node.type === 'camp' ? 'rewardRecovery'
      : node.type === 'event' ? 'rewardUnknown'
      : ['dungeon', 'boss', 'final', 'arena'].includes(node.type) ? 'rewardGear'
      : 'rewardResources';
    const boss = GameState.mapGrid
      .filter(c => c.region === node.region && c.type === 'boss' && !c.completed)
      .sort((a, b) => (Math.abs(a.x - node.x) + Math.abs(a.y - node.y)) - (Math.abs(b.x - node.x) + Math.abs(b.y - node.y)))[0];
    const bossSteps = boss ? WorldMapTopology.shortestDistance(node, boss) : 0;
    const combatNode = ['mission', 'dungeon', 'arena', 'boss', 'final'].includes(node.type);
    if (combatNode && !node.enemyWavePreview) node.enemyWavePreview = generateEnemyWaveForCell(node);
    // The wave the player is shown must be the wave that spawns, mutators and
    // elite affixes included. Campaign mutators can append an enemy, so the count
    // has to be taken after them, not before.
    const baseWave = combatNode ? (node.enemyWavePreview || []) : [];
    const wave = combatNode ? CampaignExpansion.applyMutatorsToWave(baseWave, {
      id: node.id, region: node.region, type: node.type,
      boss: node.type === 'boss', final: node.type === 'final'
    }) : [];
    const waveAffixes = combatNode ? eliteAffixesForWave(node, wave) : [];
    // Threat now follows the actual wave. Reading it off the node type meant a
    // 271-point mission and a 673-point mission both said "medium threat", so a
    // spike was invisible until the party had already committed to the fight.
    const threatKey = combatNode ? waveThreatKey(node, wave, waveAffixes) : 'threatLow';
    const priority = ['threatElite', 'threatHealer', 'threatSummoner', 'threatController', 'threatAssassin', 'threatExplosive', 'threatTank', 'threatRanged'];
    const tagKeys = [];
    if (waveAffixes.some(Boolean)) tagKeys.push('threatElite');
    wave.forEach(enemyId => enemyThreatTags(enemyId).forEach(tag => {
      if (!tagKeys.includes(tag.key)) tagKeys.push(tag.key);
    }));
    tagKeys.sort((a, b) => priority.indexOf(a) - priority.indexOf(b));
    const campaignIntel = CampaignExpansion.routeIntel(node);
    const hasSeerEye = (GameState.heroes || []).some(hero =>
      Object.values(hero.equipment || {}).some(itemId => itemById(itemId)?.mods?.previewEnemies));
    const hasScoutedIntel = (GameState.campaignEffects?.scoutedNodeIds || []).includes(node.id);
    const currentNode = getCurrentCell();
    const hasHunterIntel = !!GameState.campaignEffects?.hunterIntel && !!currentNode && cellNeighbors(currentNode, node);
    // Elites are listed by name of their own, so they must not also be counted
    // among the plain bodies of the same type.
    const enemyCounts = new Map();
    wave.forEach((enemyId, index) => {
      if (waveAffixes[index]) return;
      enemyCounts.set(enemyId, (enemyCounts.get(enemyId) || 0) + 1);
    });
    const eliteNames = wave.map((enemyId, index) => waveAffixes[index]
      ? `${eliteAffixLabel(waveAffixes[index])} ${translateText(enemyDef(enemyId).name)}` : null).filter(Boolean);
    const exactLineup = [...eliteNames, ...[...enemyCounts.entries()]
      .map(([enemyId, count]) => `${translateText(enemyDef(enemyId).name)}${count > 1 ? ` ×${count}` : ''}`)]
      .join(' · ');
    const composition = wave.length
      ? (hasSeerEye || hasScoutedIntel || hasHunterIntel)
        ? `👁 ${exactLineup}`
        : `${translateKey('routeEnemies')}: ${wave.length}${tagKeys.length ? ` · ${tagKeys.slice(0, 2).map(translateKey).join(', ')}` : ''}`
      : '';
    return {
      threat: `${translateKey(threatKey)}${node.routeTension ? ' +' : ''}`,
      reward: campaignIntel.reward || translateKey(rewardKey),
      boss: boss ? `${translateKey('bossDistance')}: ${bossSteps}` : '',
      composition,
      scenario: campaignIntel.scenario,
      risk: campaignIntel.risk,
      region: campaignIntel.region
    };
  }

  /** Share of max HP a camp restores. Camps are what let the board keep its 96
   *  cells while carrying far fewer battles, and they give the route a beat
   *  between fights that the city — a paid service in a fixed place — cannot. */
  const CAMP_REST_FRACTION = 0.25;
  function restAtCamp(node) {
    const healed = [];
    GameState.heroes.forEach(hero => {
      if (hero.hp <= 0) return;
      const before = hero.hp;
      hero.hp = Math.min(hero.maxHp, hero.hp + Math.max(1, Math.round(hero.maxHp * CAMP_REST_FRACTION)));
      if (hero.hp > before) healed.push(`${hero.name} +${hero.hp - before}`);
    });
    node.completed = true;
    node.visited = true;
    saveGame();
    renderMap();
    void showGameAlert(healed.length
      ? `🏕️ ${translateKey('campRested')}: ${healed.join(' · ')}`
      : translateKey('campAlreadyFull'));
  }

  function applyRouteDecision(from, chosen) {
    if (!from || !chosen || !chosen.routeCommitment) return;
    GameState.mapGrid
      .filter(node => node.id !== chosen.id && cellNeighbors(from, node) && !node.completed)
      .forEach(node => { node.routeTension = true; });
  }

  function renderMap() {
    const root = document.getElementById('map-nodes');
    document.getElementById('map-screen')?.setAttribute('data-region', String(GameState.region || 1));
    const mapArsenalButton = document.getElementById('btn-map-arsenal');
    if (mapArsenalButton) mapArsenalButton.innerHTML = `<span class="ico ico-swords" aria-hidden="true"></span> ${escapeHtml(translateKey('arsenal'))}`;
    const info = document.getElementById('map-cell-info');
    const fogCounterEl = document.getElementById('map-fog-counter');
    root.innerHTML = '';
    renderPartyStrip();
    let selectedNode = getCurrentCell();
    let explicitlySelectedNodeId = null;
    const currentCell = selectedNode;
    const mapTypeNames = { mission: translateKey('nodeMission'), city: translateKey('nodeCity'), camp: translateKey('nodeCamp'), dungeon: translateKey('nodeDungeon'), event: translateKey('nodeEvent'), boss: translateKey('nodeBoss'), wanderer: translateKey('nodeWanderer'), arena: translateKey('nodeArena'), final: translateKey('nodeFinal') };
    const selectedCellInfoHtml = (node) => {
      const intel = mapNodeIntel(node);
      const combatNode = ['mission', 'dungeon', 'arena', 'boss', 'final'].includes(node.type);
      const title = intel.scenario
        ? CampaignExpansion.scenarioLabel(intel.scenario)
        : (mapTypeNames[node.type] || node.type);
      const detail = intel.scenario
        ? CampaignExpansion.scenarioShort(intel.scenario)
        : node.type === 'camp'
          ? translateKey(node.completed ? 'rewardCampUsed' : 'rewardCamp')
          : intel.reward;
      const completion = node.completed
        ? `<div class="cell-info-completion ${['boss', 'final'].includes(node.type) ? 'boss-defeated' : ''}">${['boss', 'final'].includes(node.type) ? '☠ ' + translateKey('bossDefeated') : '✓ ' + translateKey('mapCleared')}</div>`
        : (node.visited ? `<div class="cell-info-completion">✓ ${translateKey('mapVisited')}</div>` : '');
      return `<div class="cell-info-heading">
          <strong>${escapeHtml(title)}</strong>
          <span>${escapeHtml(intel.threat)}</span>
        </div>
        ${detail ? `<div class="cell-info-objective"><small>${escapeHtml(CampaignExpansion.loc({ ru: 'ЦЕЛЬ', en: 'OBJECTIVE', es: 'OBJETIVO' }))}</small><span>${escapeHtml(detail)}</span></div>` : ''}
        ${completion}
        ${combatNode && intel.composition ? `<div class="cell-info-enemies">${intel.composition}</div>` : ''}`;
    };
    const panelTitle = document.getElementById('map-panel-title');
    const showInfo = (node) => {
      info.innerHTML = selectedCellInfoHtml(node);
      if (panelTitle) panelTitle.textContent = mapLocationName(node);
    };
    const px = GameState.playerPos.x;
    const py = GameState.playerPos.y;
    const nodeElements = new Map();
    if (fogCounterEl) fogCounterEl.textContent = `${translateKey('opened')}: ${GameState.mapFogVisited.length} / ${MAP_CELL_TOTAL}`;
    renderMapLegend();
    GameState.mapGrid.forEach(node => {
      const el = document.createElement('div');
      el.className = 'map-node';
      el.dataset.x = String(node.x);
      el.dataset.y = String(node.y);
      el.dataset.nodeId = node.id;
      el.dataset.region = String(node.region);
      el.dataset.nodeType = node.type;
      el.classList.add(`map-region-${node.region}`);
      WorldMapTopology.wallClasses(node).forEach(className => el.classList.add(className));
      if (WorldMapTopology.bossZoneContains(node.region, node) && ['boss', 'final'].includes(node.type)) {
        el.classList.add('map-boss-gateway-zone');
      }
      const dist = Math.abs(node.x - px) + Math.abs(node.y - py);
      const adjacent = currentCell ? cellNeighbors(currentCell, node) : false;
      const revealedBoss = node.type === 'boss' && node.region <= GameState.regionUnlocked;
      const explored = !!(node.visited || node.completed);
      if (dist <= 2 || revealedBoss || explored) el.classList.add('visible');
      else el.classList.add('hidden');
      if (adjacent) el.classList.add('map-option');
      else if (dist <= 2 && dist > 0) el.classList.add('map-secondary');

      const unlocked = node.region <= GameState.regionUnlocked && (node.type !== 'final' || GameState.defeatedBosses >= 3);
      if (!unlocked) el.classList.add('locked');
      if (node.completed) el.classList.add('done');
      if (explored) el.classList.add('explored');
      if (node.completed && ['boss', 'final'].includes(node.type)) el.classList.add('boss-defeated');
      if (node.routeTension) el.classList.add('route-tension');
      if (node.x === px && node.y === py) el.classList.add('current');
      if (node.type === 'city') el.classList.add('type-city');
      if (revealedBoss) el.classList.add('type-boss-revealed');
      const typeNames = { mission: translateKey('nodeMission'), city: translateKey('nodeCity'), camp: translateKey('nodeCamp'), dungeon: translateKey('nodeDungeon'), event: translateKey('nodeEvent'), boss: translateKey('nodeBoss'), wanderer: translateKey('nodeWanderer'), arena: translateKey('nodeArena'), final: translateKey('nodeFinal') };
      const typeLbl = unlocked ? (node.completed && ['boss', 'final'].includes(node.type)
        ? translateKey('bossDefeated')
        : node.visited && !node.completed ? translateKey('mapVisited')
        : (typeNames[node.type] || '')) : '';
      const showCellFace = dist <= 2 || revealedBoss || explored;
      const partyMarker = node.x === px && node.y === py ? mapPartyMarkerHtml() : '';
      if (showCellFace) {
        el.innerHTML = `${mapNodeFaceHtml(node)}${typeLbl ? `<small class="map-node-lbl">${typeLbl}</small>` : ''}${partyMarker}`;
      } else {
        el.innerHTML = partyMarker;
      }
      // Walls and gateway arrows are child elements, not pseudo-elements. With
      // internal walls a node can carry two segments at once, and the node's own
      // ::before/::after already belong to fog, the explored stamp and selection.
      el.insertAdjacentHTML('beforeend', mapWallDecorationHtml(el));
      const setInfo = (n) => {
        showInfo(n);
        selectedNode = n;
        explicitlySelectedNodeId = n.id;
        nodeElements.forEach(element => {
          element.classList.remove('map-selected');
          element.removeAttribute('aria-selected');
        });
        const selectedElement = nodeElements.get(n.id);
        selectedElement?.classList.add('map-selected');
        selectedElement?.setAttribute('aria-selected', 'true');
      };
      el.onmouseenter = () => {
        if (!showCellFace) {
          info.innerHTML = `<div class="cell-info-icon">?</div><div class="cell-info-name">${translateKey('fogOfWar')}</div><div>${translateKey('tooFar')}</div>`;
          return;
        }
        if (!unlocked) {
          info.innerHTML = `<div class="cell-info-icon">🔒</div><div class="cell-info-name">${escapeHtml(campaignRegionName(node.region))}</div><div>${translateKey('regionLocked')}</div>`;
          return;
        }
        showInfo(node);
      };
      el.onmouseleave = () => {
        if (selectedNode) showInfo(selectedNode);
      };
      el.onclick = () => {
        if (!showCellFace) return;
        if (!unlocked) {
          void showGameAlert(translateKey('regionStillLocked'));
          return;
        }
        if (explicitlySelectedNodeId === node.id) {
          document.getElementById('btn-map-enter')?.click();
          return;
        }
        setInfo(node);
      };
      root.appendChild(el);
      nodeElements.set(node.id, el);
    });
    if (selectedNode) {
      showInfo(selectedNode);
    }
    updateRegionClouds();
    function enterMapNode(node) {
      if (!node) return;
      if (node.type === 'city') {
        if (CampaignExpansion.isMutatorActive('city_favor') && !GameState.cityFavorClaimed[node.region]) {
          GameState.cityFavorClaimed[node.region] = true;
          GameState.gold += 12;
          GameState._campaignNotice = CampaignExpansion.loc({ ru: 'Город встречает отряд: +12 золота.', en: 'The city welcomes the party: +12 gold.', es: 'La ciudad recibe al grupo: +12 oro.' });
        }
        enterCity(node);
      } else if (node.type === 'camp' && !node.completed) {
        restAtCamp(node);
      } else if (node.type === 'event' && !node.completed) {
        triggerEvent(node);
      } else if (node.type === 'wanderer' && !GameState.wandererUsedByRegion[node.region]) {
        const openWanderer = () => {
          GameState.wandererUsedByRegion[node.region] = true;
          GameState.shopStock = [randomItem(node.region, 'epic'), randomItem(node.region, 'epic'), randomItem(node.region, 'epic')];
          enterCity(node, true);
        };
        if (window.ysdk) {
          showGameConfirm(translateKey('showWandererGoods')).then(ok => {
            if (ok) showRewardedAd(openWanderer);
            else {
              void showGameAlert(translateKey('wandererLeft'));
              GameState.wandererUsedByRegion[node.region] = true;
            }
          });
        } else {
          openWanderer();
        }
      } else if (node.type === 'arena' && !GameState.arenaDoneByRegion[node.region]) {
        const startArena = () => {
          GameState.arenaDoneByRegion[node.region] = true;
          startBattleForCell(node, { wave: [ENEMY_IDS.CHAOS], skipDeploy: false });
        };
        if (window.ysdk) {
          showGameConfirm(translateKey('enterShadowArena')).then(ok => {
            if (ok) showRewardedAd(startArena);
          });
        } else {
          startArena();
        }
      } else if (['mission', 'dungeon', 'boss', 'final'].includes(node.type) && !node.completed) {
        startBattleForCell(node, { skipDeploy: GameState.hardFlags.skipDeployNextBattle });
        GameState.hardFlags.skipDeployNextBattle = false;
      }
    }
    const enterBtn = document.getElementById('btn-map-enter');
    if (enterBtn) enterBtn.onclick = () => {
      const node = selectedNode || getCurrentCell();
      if (!node) return;
      const unlocked = node.region <= GameState.regionUnlocked && (node.type !== 'final' || GameState.defeatedBosses >= 3);
      if (!unlocked) {
        void showGameAlert(translateKey('regionStillLocked'));
        return;
      }
      const cur = getCurrentCell();
      if (!GameState.firstBattleCompleted && cur?.id === 'c_0_0' && node.id !== cur.id) {
        startBattleForCell(cur, { skipDeploy: false });
        return;
      }
      const sameCell = cur && node.x === cur.x && node.y === cur.y;
      if (!sameCell && !cellNeighbors(cur, node)) {
        // A wall between two touching cells is not distance, and saying "too far"
        // about the tile right below the party is how the rule reads as a bug.
        const touching = cur && Math.abs(node.x - cur.x) <= 1 && Math.abs(node.y - cur.y) <= 1;
        void showGameAlert(translateKey(touching ? 'pathBlockedWall' : 'tooFar'));
        return;
      }
      applyRouteDecision(cur, node);
      GameState.playerPos = { x: node.x, y: node.y };
      mapFogVisitedAdd(node.y, node.x);
      node.visited = true;
      GameState.turn += 1;
      GameState.region = node.region;
      CampaignExpansion.resolveDelayedEvents();
      // Movement is a durable campaign checkpoint. This prevents a long map
      // route from falling back to the opening battle after an exit.
      saveGame();
      enterMapNode(node);
      renderMap();
    };
    const bagBtn = document.getElementById('btn-map-bag');
    if (bagBtn) bagBtn.onclick = () => {
      GameState._returnToVictory = false;
      GameState._returnToBattle = false;
      renderInventoryScreen();
      showScreen('inventory');
    };
  }
  function cityItemRarBadge(r) {
    return r === 'epic' ? `<span class="badge badge-epic">${translateKey('epic')}</span>` : r === 'rare' ? `<span class="badge badge-rare">${translateKey('rare')}</span>` : `<span class="badge badge-common">${translateKey('common')}</span>`;
  }

  function getItemSellPrice(it) {
    if (!it) return 0;
    return typeof it.sellPrice === 'number' ? it.sellPrice : Math.floor((it.price || 0) * 0.5);
  }

  function getEquippedItemOwners() {
    const ownersByItemId = new Map();
    for (const hero of (GameState.heroes || [])) {
      const eq = hero.equipment || {};
      for (const slot of ['weapon', 'armor', 'artifact']) {
        const itemId = eq[slot];
        if (!itemId) continue;
        if (!ownersByItemId.has(itemId)) ownersByItemId.set(itemId, []);
        ownersByItemId.get(itemId).push({ hero, slot });
      }
    }
    return ownersByItemId;
  }

  function getSellableInventoryEntries() {
    const ownersByItemId = getEquippedItemOwners();
    return (GameState.inventory || []).map((id, idx) => {
      const item = itemById(id);
      const owners = ownersByItemId.get(id);
      const equipped = owners?.length ? owners.shift() : null;
      return item ? { id, idx, item, equipped } : null;
    }).filter(entry => entry && !entry.equipped);
  }

  function buildCitySellItemCard(entry) {
    const it = entry.item;
    const price = getItemSellPrice(it);
    const effects = formatItemMods(it).map(translateText);
    const statText = effects.join(' · ');
    const descText = it.desc ? translateText(it.desc) : '';
    const r = it.rarity === 'epic' ? 'epic' : it.rarity === 'rare' ? 'rare' : 'common';
    const roleHint = itemHeroClassLabel(it);
    const tooltip = [translateText(it.name), roleHint, statText, descText].filter(Boolean).join(' — ');
    return `<div class="item-card ${r}" title="${escapeHtmlAttr(tooltip)}">
      <div class="card-body">
        <div class="card-icon-name">
          <span class="card-icon">${itemIconMarkup(it, CITY_SHOP_ICON_PX)}</span>
          <span class="card-name">${translateText(it.name)}</span>
        </div>
        <div class="card-stat">${statText}</div>
        ${descText ? `<div class="card-desc">${descText}</div>` : ''}
      </div>
      <div class="card-footer">
        ${cityItemRarBadge(it.rarity)}
        <button type="button" class="btn-sell" data-sell-idx="${entry.idx}">${translateKey('sell')}</button>
        <span class="card-price sell-gain">+${price}g</span>
      </div>
    </div>`;
  }

  function bindCitySellClicks(shopEl, node, strangerOnly) {
    if (!shopEl) return;
    shopEl.querySelectorAll('.btn-sell[data-sell-idx]').forEach(btn => {
      btn.onclick = (ev) => {
        ev.stopPropagation();
        const idx = parseInt(btn.getAttribute('data-sell-idx'), 10);
        const inv = GameState.inventory || [];
        const id = inv[idx];
        const it = itemById(id);
        if (!it) return;
        const sellableEntry = getSellableInventoryEntries().find(entry => entry.idx === idx);
        if (!sellableEntry) {
          renderCityUI(node, strangerOnly);
          return;
        }
        const gain = getItemSellPrice(it);
        showGameConfirm(`${translateKey('sellItemFor')} «${translateText(it.name)}» ${gain} 💰?`).then(ok => {
          if (!ok) return;
          if (!GameState.inventory || GameState.inventory[idx] !== id) {
            renderCityUI(node, strangerOnly);
            return;
          }
          GameState.inventory.splice(idx, 1);
          GameState.gold += gain;
          GameState.stats.goldEarned = (GameState.stats.goldEarned || 0) + gain;
          saveGame();
          renderCityUI(node, strangerOnly);
        });
      };
    });
  }

  function renderCityTraderSellPanel(node, strangerOnly) {
    const sellList = document.getElementById('shop-sell-list');
    if (!sellList) return;
    const entries = getSellableInventoryEntries();
    if (!entries.length) {
      sellList.innerHTML = `<div class="city-sell-empty">${translateKey('noItemsToSell')}</div>`;
      return;
    }
    sellList.innerHTML = entries.map(buildCitySellItemCard).join('');
    syncTraderItemsGridScroll(sellList);
    bindCitySellClicks(sellList, node, strangerOnly);
  }

  function syncTraderItemsGridScroll(gridEl) {
    if (!gridEl) return;
    const n = gridEl.querySelectorAll('.item-card').length;
    gridEl.classList.toggle('items-grid-scroll', n >= 5);
  }

  function renderCityTraderBuyPanel(node, strangerOnly) {
    const shop = document.getElementById('shop-list');
    if (!shop) return;
    const stock = GameState.shopStock && GameState.shopStock.stock ? GameState.shopStock.stock : (GameState.shopStock || []);
    let html = stock.map(buildCityShopItemCard).join('');
    if (window.ysdk && GameState.cityState.secretItemId) {
      if (GameState.cityState.secretRevealed) {
        const item = itemById(GameState.cityState.secretItemId);
        const price = Math.floor(item.price * 0.7);
        html += buildCitySecretEpicCardHTML(item, price);
      } else {
        html += `<div class="item-card epic secret" id="city-secret-card">
            <div class="card-body">
              <div class="card-icon-name">
                <span class="card-icon">❓</span>
                <span class="card-name" style="color:#b57edc">${translateKey('secretGoods')}</span>
              </div>
              <div class="card-stat" style="color:#b57edc">${translateKey('epic')} [AD]</div>
            </div>
            <div class="card-footer">
              <span class="badge badge-epic">${translateKey('secret')}</span>
              <button type="button" class="btn-buy btn-buy-ad" id="btn-secret">${translateKey('openAd')}</button>
              <span class="card-price">—</span>
            </div>
          </div>`;
      }
    }
    shop.innerHTML = html;
    syncTraderItemsGridScroll(shop);
    bindCityShopClicks(shop, node, strangerOnly);
  }

  function setCityTraderTab(traderTab, node, strangerOnly) {
    if (traderTab === 'buy' || traderTab === 'sell') GameState.cityTraderTab = traderTab;
    renderCityUI(node, strangerOnly);
  }

  function buildCityShopItemCard(it) {
    const canBuy = GameState.gold >= it.price;
    const shortfall = Math.max(0, it.price - GameState.gold);
    const effects = formatItemMods(it).map(translateText);
    const statText = effects.join(' · ');
    const descText = it.desc ? translateText(it.desc) : '';
    const r = it.rarity === 'epic' ? 'epic' : it.rarity === 'rare' ? 'rare' : 'common';
    const btnLabel = canBuy ? translateKey('buy') : `−${shortfall}g`;
    const tooltip = [translateText(it.name), statText, descText].filter(Boolean).join(' — ');
    return `<div class="item-card ${r}${canBuy ? '' : ' cant'}" title="${escapeHtmlAttr(tooltip)}">
      <div class="card-body">
        <div class="card-icon-name">
          <span class="card-icon">${itemIconMarkup(it, CITY_SHOP_ICON_PX)}</span>
          <span class="card-name">${translateText(it.name)}</span>
        </div>
        <div class="card-stat">${statText}</div>
        ${descText ? `<div class="card-desc">${descText}</div>` : ''}
      </div>
      <div class="card-footer">
        ${cityItemRarBadge(it.rarity)}
        <button type="button" class="btn-buy" data-buy-btn="${it.id}"${canBuy ? '' : ' disabled'}>${btnLabel}</button>
        <span class="card-price${canBuy ? '' : ' cant'}">${it.price}g</span>
      </div>
    </div>`;
  }

  function buildCitySecretEpicCardHTML(item, price) {
    const canBuy = GameState.gold >= price;
    const shortfall = Math.max(0, price - GameState.gold);
    const btnLabel = canBuy ? translateKey('buy') : `−${shortfall}g`;
    return `<div class="item-card epic secret-revealed${canBuy ? '' : ' cant'}" id="city-secret-card">
      <div class="card-body">
        <div class="card-icon-name">
          <span class="card-icon">${itemIconMarkup(item, CITY_SHOP_ICON_PX)}</span>
          <span class="card-name">${translateText(item.name)}</span>
        </div>
      </div>
      <div class="card-footer">
        ${cityItemRarBadge('epic')}
        <button type="button" class="btn-buy" data-buy-btn="__secret__"${canBuy ? '' : ' disabled'}>${btnLabel}</button>
        <span class="card-price${canBuy ? '' : ' cant'}">${price}g</span>
      </div>
    </div>`;
  }

  function bindCityShopClicks(shopEl, node, strangerOnly) {
    shopEl.querySelectorAll('.btn-buy[data-buy-btn]').forEach(btn => {
      const bid = btn.getAttribute('data-buy-btn');
      if (bid === '__secret__') {
        btn.onclick = (ev) => {
          ev.stopPropagation();
          const item = itemById(GameState.cityState.secretItemId);
          const price = Math.floor(item.price * 0.7);
          if (GameState.gold < price) { void showGameAlert(translateKey('notEnoughGold')); return; }
          GameState.gold -= price;
          GameState.inventory.push(item.id);
          GameState.cityState.secretItemId = null;
          GameState.cityState.secretRevealed = false;
          saveGame();
          renderCityUI(node, strangerOnly);
        };
        return;
      }
      btn.onclick = (ev) => {
        ev.stopPropagation();
        const it = itemById(bid);
        if (!it || GameState.gold < it.price) { if (it) void showGameAlert(translateKey('notEnoughGold')); return; }
        GameState.gold -= it.price;
        GameState.inventory.push(it.id);
        const stock = GameState.shopStock?.stock || GameState.shopStock || [];
        const stockIndex = stock.findIndex(item => item.id === it.id);
        if (stockIndex >= 0) stock.splice(stockIndex, 1);
        saveGame();
        renderCityUI(node, strangerOnly);
      };
    });
    const secretBtn = document.getElementById('btn-secret');
    const secretCardEl = document.getElementById('city-secret-card');
    if (secretBtn && secretCardEl) {
      secretBtn.onclick = (ev) => {
        ev.stopPropagation();
        showRewardedAd(() => {
          GameState.cityState.secretRevealed = true;
          saveGame();
          secretCardEl.classList.add('secret-reveal-play');
          window.setTimeout(() => {
            const item = itemById(GameState.cityState.secretItemId);
            const price = Math.floor(item.price * 0.7);
            secretCardEl.outerHTML = buildCitySecretEpicCardHTML(item, price);
            const shop = document.getElementById('shop-list');
            syncTraderItemsGridScroll(shop);
            if (shop) bindCityShopClicks(shop, node, strangerOnly);
          }, 680);
        });
      };
    }
  }

  function tryUpgradeInventoryItem(itemId, node, strangerOnly) {
    const base = itemById(itemId);
    if (!base || !['common', 'rare'].includes(base.rarity)) return;
    const idx = GameState.inventory.indexOf(itemId);
    if (idx < 0) return;
    const cost = base.rarity === 'common' ? 100 : 200;
    const region = node.region || GameState.region || 1;
    const doUpgrade = () => {
      const upgraded = upgradeItem(base, region);
      if (upgraded === base) {
        void showGameAlert(translateKey('noUpgrades'));
        return;
      }
      const ix = GameState.inventory.indexOf(base.id);
      if (ix >= 0) GameState.inventory[ix] = upgraded.id;
      saveGame();
      showGameAlert(`${translateText(base.name)} → ${translateText(upgraded.name)}!`).then(() => renderCityUI(node, GameState._cityStrangerOnly));
    };
    if (GameState.gold >= cost) {
      showGameConfirm(`${translateKey('upgradeFor')} ${translateText(base.name)} ${cost}💰?`).then(ok => {
        if (ok) {
          GameState.gold -= cost;
          doUpgrade();
        } else if (window.ysdk && !GameState.cityState.adUpgradeUsed) {
          showRewardedAd(() => { GameState.cityState.adUpgradeUsed = true; doUpgrade(); });
        } else {
          void showGameAlert(`${translateKey('needGold')} ${cost}💰`);
        }
      });
    } else if (window.ysdk && !GameState.cityState.adUpgradeUsed) {
      showRewardedAd(() => { GameState.cityState.adUpgradeUsed = true; doUpgrade(); });
    } else {
      void showGameAlert(`${translateKey('needGold')} ${cost}💰`);
    }
  }

  function renderCityAlchemistPanel(node, strangerOnly) {
    const potRoot = document.getElementById('alchemist-potions');
    const upRoot = document.getElementById('alchemist-upgrades');
    if (potRoot) {
      potRoot.innerHTML = SHOP_ITEMS.map(item => {
        const stock = getConsumableCount(item.id);
        const canUse = GameState.heroes.some(h => canUseConsumableOnHero(item, h));
        const icon = itemIconMarkup({ id: item.id, rarity: 'common', emoji: item.emoji || '🧪' }, 32);
        return `<div class="alchemist-row">
          <div class="alchemist-row-icon">${icon}</div>
          <div class="alchemist-row-info">
            <div>${translateText(item.name)}</div>
            <div class="alchemist-row-meta">${item.price}💰 · ${translateKey('stock')}: ${stock} · ${consumableUseHint(item)}</div>
          </div>
          <div class="alchemist-row-actions">
            <button type="button" class="btn btn-green" data-alch-buy="${item.id}">${translateKey('buy')}</button>
            <button type="button" class="btn" data-alch-use="${item.id}"${stock <= 0 || !canUse ? ' disabled' : ''}>${translateKey('apply')}</button>
          </div>
        </div>`;
      }).join('');
      potRoot.querySelectorAll('[data-alch-buy]').forEach(btn => {
        btn.onclick = () => buyConsumable(btn.getAttribute('data-alch-buy'), node, strangerOnly);
      });
      potRoot.querySelectorAll('[data-alch-use]').forEach(btn => {
        btn.onclick = () => tryUseConsumable(btn.getAttribute('data-alch-use'), node, strangerOnly);
      });
    }
    if (upRoot) {
      const seen = new Set();
      const rows = [];
      (GameState.inventory || []).forEach(id => {
        if (seen.has(id)) return;
        seen.add(id);
        const it = itemById(id);
        if (!it || !['common', 'rare'].includes(it.rarity)) return;
        const cost = it.rarity === 'common' ? 100 : 200;
        const icon = itemIconMarkup(it, 32);
        rows.push(`<div class="alchemist-row">
          <div class="alchemist-row-icon">${icon}</div>
          <div class="alchemist-row-info">
            <div>${translateText(it.name)}</div>
            <div class="alchemist-row-meta">${cityItemRarBadge(it.rarity)} · ${translateKey('upgrade')} ${cost}💰</div>
          </div>
          <div class="alchemist-row-actions">
            <button type="button" class="btn btn-green" data-alch-up="${it.id}">${translateKey('upgrade')}</button>
          </div>
        </div>`);
      });
      upRoot.innerHTML = rows.length
        ? rows.join('')
        : `<div style="font-size:9px;color:var(--text-hint);padding:8px;">${translateKey('noUpgradeableGear')}</div>`;
      upRoot.querySelectorAll('[data-alch-up]').forEach(btn => {
        btn.onclick = () => tryUpgradeInventoryItem(btn.getAttribute('data-alch-up'), node, GameState._cityStrangerOnly);
      });
    }
  }

  function runScoutIntel(node) {
    showRewardedAd(() => {
      const resEl = document.getElementById('oracle-result');
      const cur = getCurrentCell();
      const next = GameState.mapGrid.find(c => c.region <= GameState.regionUnlocked && !c.completed && ['mission', 'dungeon', 'boss', 'final'].includes(c.type) && cellNeighbors(cur, c));
      if (!next) {
        if (resEl) {
          resEl.classList.remove('hidden');
          resEl.textContent = translateKey('noNearbyBattles');
        }
        return;
      }
      const wave = generateEnemyWaveForCell(next).map(id => `${enemyDef(id).emoji} ${enemyDef(id).name}`).join(', ');
      if (resEl) {
        resEl.classList.remove('hidden');
        resEl.textContent = `${translateKey('veiraIntel')}: ${wave}`;
      }
    });
  }

  function setCityNpcTab(tab, node, strangerOnly) {
    if (['trader', 'alchemist', 'oracle'].includes(tab)) GameState.cityNpcTab = tab;
    const n = node || getActiveCityNode();
    if (!n) return;
    renderCityUI(n, strangerOnly);
  }

  function renderCityUI(node, strangerOnly) {
    const n = node || getActiveCityNode();
    if (!n) return;
    const tab = GameState.cityNpcTab || 'trader';
    document.querySelectorAll('.npc-tab').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-city-tab') === tab);
    });
    const pt = document.getElementById('city-panel-trader');
    const pa = document.getElementById('city-panel-alchemist');
    const po = document.getElementById('city-panel-oracle');
    if (pt) pt.classList.toggle('hidden', tab !== 'trader');
    if (pa) pa.classList.toggle('hidden', tab !== 'alchemist');
    if (po) po.classList.toggle('hidden', tab !== 'oracle');

    const navNode = n;
    const sn = typeof strangerOnly === 'boolean' ? strangerOnly : GameState._cityStrangerOnly;

    if (tab === 'trader') {
      const traderTab = GameState.cityTraderTab || 'buy';
      document.querySelectorAll('.trader-mode-tab').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-trader-tab') === traderTab);
      });
      const buyWrap = document.getElementById('shop-buy-wrap');
      const sellWrap = document.getElementById('shop-sell-wrap');
      if (buyWrap) buyWrap.classList.toggle('hidden', traderTab !== 'buy');
      if (sellWrap) sellWrap.classList.toggle('hidden', traderTab !== 'sell');
      const rer = document.getElementById('btn-reroll-shop');
      if (rer) rer.style.display = traderTab === 'buy' ? '' : 'none';
      const footer = document.getElementById('shop-footer-text');
      if (footer) {
        footer.textContent = traderTab === 'buy'
          ? translateKey('chooseItemBuy')
          : translateKey('sellGearHint');
      }
      if (traderTab === 'buy') renderCityTraderBuyPanel(n, strangerOnly);
      else renderCityTraderSellPanel(n, strangerOnly);
      document.querySelectorAll('.trader-mode-tab').forEach(btn => {
        btn.onclick = () => setCityTraderTab(btn.getAttribute('data-trader-tab'), navNode, sn);
      });
    }

    if (tab === 'alchemist') renderCityAlchemistPanel(n, strangerOnly);

    document.querySelectorAll('.npc-tab').forEach(btn => {
      btn.onclick = () => setCityNpcTab(btn.getAttribute('data-city-tab'), navNode, sn);
    });
    const oracleBtn = document.getElementById('btn-oracle-center-ad');
    if (oracleBtn) oracleBtn.onclick = () => runScoutIntel(navNode);

    const rer = document.getElementById('btn-reroll-shop');
    if (rer) rer.onclick = () => {
      if (GameState.gold >= 20) {
        GameState.gold -= 20;
        const stockResult = generateShopStock(n.region, n.id);
        const cityState = {
          adUpgradeUsed: !!GameState.cityState?.adUpgradeUsed,
          secretRevealed: false,
          secretItemId: stockResult.secretItem ? stockResult.secretItem.id : selectLootItem(n.region, 'epic').id
        };
        GameState.shopStock = stockResult;
        GameState.cityState = cityState;
        GameState.cityShopStocks = GameState.cityShopStocks || {};
        GameState.cityShopStocks[n.id] = { shopStock: stockResult, cityState };
        saveGame();
        renderCityUI(n, sn);
      } else {
        void showGameAlert(`${translateKey('needGold')} 20💰`);
      }
    };
  }

  function getActiveCityNode() {
    const id = GameState.activeCityNode;
    if (id && GameState.mapGrid && GameState.mapGrid.length) {
      const c = GameState.mapGrid.find(x => x.id === id);
      if (c) return c;
    }
    return typeof getCurrentCell === 'function' ? getCurrentCell() : null;
  }

  function enterCity(node, strangerOnly) {
    const previousActiveCityNode = GameState.activeCityNode;
    GameState.screen = 'city';
    GameState.activeCityNode = node.id;
    GameState._cityStrangerOnly = !!strangerOnly;
    if (!GameState.cityNpcTab) GameState.cityNpcTab = 'trader';
    if (!GameState.cityTraderTab) GameState.cityTraderTab = 'buy';
    if (!strangerOnly) {
      GameState.cityShopStocks = GameState.cityShopStocks || {};
      let shopState = GameState.cityShopStocks[node.id];
      if (!shopState && previousActiveCityNode === node.id && (GameState.shopStock?.stock || GameState.shopStock || []).length) {
        shopState = { shopStock: GameState.shopStock, cityState: GameState.cityState || {} };
      }
      if (!shopState) {
        const stockResult = generateShopStock(node.region, node.id);
        shopState = {
          shopStock: stockResult,
          cityState: {
            adUpgradeUsed: false,
            secretRevealed: false,
            secretItemId: stockResult.secretItem ? stockResult.secretItem.id : selectLootItem(node.region, 'epic').id
          }
        };
      }
      GameState.cityShopStocks[node.id] = shopState;
      GameState.shopStock = shopState.shopStock;
      GameState.cityState = shopState.cityState;
    } else {
      GameState.cityState = GameState.cityState || {};
    }

    const hbox = document.getElementById('city-heroes');
    if (hbox) {
      const healCost = GameState.heroes.reduce((sum, h) => sum + Math.max(0, h.maxHp - h.hp) * 2, 0);
      const allHealthy = healCost === 0;
      hbox.innerHTML = `
        <div class="heroes-bar-title">${translateKey('partyState')}</div>
        ${GameState.heroes.map(h => {
          const pct = Math.round((h.hp / h.maxHp) * 100);
          const indivCost = Math.max(0, h.maxHp - h.hp) * 2;
          const full = h.hp >= h.maxHp;
          return `<div class="hero-row">
            <img class="hero-icon-s-img" src="assets/heroes/${h.id}.png" alt="${h.emoji}" onerror="this.outerHTML='<span class=hero-icon-s>${h.emoji}</span>'">
            <div class="hero-hp-wrap">
              <div class="hero-hp-name">${h.name} · ${h.hp}/${h.maxHp}</div>
              <div class="bar"><div class="bar-hp" style="width:${pct}%"></div></div>
            </div>
            <button type="button" class="hero-heal-btn${full ? ' grey' : ''}" data-heal="${h.id}">${full ? '✓' : `💚 ${translateKey('healOne')} ${indivCost}g`}</button>
          </div>`;
        }).join('')}
        <div class="heal-all-row">
          <button type="button" class="btn btn-green btn-heal-all" id="btn-heal-full" ${allHealthy ? 'disabled' : ''}>${allHealthy ? translateKey('allHealthy') : `💚 ${translateKey('healAll')} · ${healCost}g`}</button>
          ${window.ysdk ? `<button type="button" class="btn btn-ad btn-heal-ad" id="btn-heal-ad" title="${translateKey('adHealTitle')}">${translateKey('freeAdHeal')}</button>` : ''}
        </div>
      `;
      hbox.querySelectorAll('[data-heal]').forEach(btn => {
        btn.onclick = () => {
          const h = GameState.heroes.find(x => x.id === btn.dataset.heal);
          if (!h || h.hp >= h.maxHp) return;
          const cost = Math.max(0, h.maxHp - h.hp) * 2;
          if (GameState.gold < cost) { void showGameAlert(translateKey('notEnoughGold')); return; }
          GameState.gold -= cost;
          h.hp = h.maxHp;
          saveGame();
          enterCity(node, strangerOnly);
        };
      });
      const healAll = document.getElementById('btn-heal-full');
      if (healAll) healAll.onclick = () => {
        const cost = GameState.heroes.reduce((s, h) => s + Math.max(0, h.maxHp - h.hp) * 2, 0);
        if (cost === 0 || GameState.gold < cost) return;
        GameState.gold -= cost;
        GameState.heroes.forEach(h => h.hp = h.maxHp);
        saveGame();
        enterCity(node, strangerOnly);
      };
      const healAd = document.getElementById('btn-heal-ad');
      if (healAd) healAd.onclick = () => showRewardedAd(() => {
        GameState.heroes.forEach(h => h.hp = h.maxHp);
        saveGame();
        enterCity(node, strangerOnly);
      });
    }

    renderCityUI(node, strangerOnly);
    showScreen('city');
  }

  function openPerkTreeView(heroId) {
    openPerkModal(heroId, false);
  }

  function openPerkModal(heroId, pickMode) {
    if (pickMode === undefined) pickMode = true;
    const h = GameState.heroes.find(x => x.id === heroId);
    if (!h) return;
    const modal = document.getElementById('perk-modal');
    const hintEl = document.getElementById('perk-modal-hint');
    const closeBtn = document.getElementById('perk-modal-close');
    const portraitImg = document.getElementById('perk-hero-portrait-img');
    const portraitFallback = document.getElementById('perk-hero-portrait-fallback');
    if (portraitImg && portraitFallback) {
      portraitImg.src = HERO_TEXTURE_PATHS[h.id] || `assets/heroes/${h.id}.png`;
      portraitImg.alt = h.name;
      portraitImg.style.display = 'block';
      portraitFallback.textContent = h.emoji;
      portraitFallback.style.display = 'none';
      portraitImg.onerror = () => {
        portraitImg.style.display = 'none';
        portraitFallback.style.display = 'grid';
      };
    }
    document.getElementById('perk-hero-name').textContent = pickMode
      ? `${h.emoji} ${h.name} — ${translateText('new level')} ${h.level}`
      : `${h.emoji} ${h.name} — ${translateKey('progression')} · ${translateKey('heroLevelShort')} ${h.level}`;
    if (hintEl) {
      hintEl.textContent = pickMode
        ? translateKey('choosePerkHint')
        : `${translateText('View')} · ${translateText('new perks are chosen on level-up')}`;
    }
    if (closeBtn) {
      closeBtn.classList.toggle('hidden', pickMode);
      closeBtn.onclick = () => modal.classList.add('hidden');
    }
    const tree = PERK_TREES[heroId];
    h.perkLevels = h.perkLevels || {};
    const branchNames = Object.keys(tree);

    const branchColors = {
      defense: 'bh-defense', attack: 'bh-attack', leader: 'bh-leader',
      accuracy: 'bh-accuracy', speed: 'bh-speed', traps: 'bh-traps',
      destruction: 'bh-destruction', control: 'bh-control', mystic: 'bh-mystic'
    };
    const branchLabels = PERK_BRANCH_LABELS;
    const perkIcons = PERK_ICONS;

    // Determine which perk each branch is offering next
    const nextPerkByBranch = {};
    branchNames.forEach(br => {
      const idx = h.perkLevels[br] || 0;
      if (idx < tree[br].length) nextPerkByBranch[br] = tree[br][idx];
    });
    const availableBranches = branchNames.filter(br => nextPerkByBranch[br]);

    let selectedBr = null;
    let selectedPerkId = null;

    const box = document.getElementById('perk-tree-ui');
    const detailPanel = document.getElementById('perk-detail-panel');

    function renderPerkTree() {
      box.innerHTML = branchNames.map(br => {
        const perks = tree[br];
        const color = branchColors[br] || 'bh-defense';
        const label = localizedPerkBranch(br);
        const takenCount = h.perkLevels[br] || 0;

        let rows = '';
        perks.forEach((perk, i) => {
          const taken = i < takenCount;
          const isNext = i === takenCount;
          const available = pickMode && isNext && availableBranches.includes(br);
          const locked = i > takenCount;
          let cls = 'perk-skill';
          if (taken) cls += ' unlocked';
          else if (available) cls += ' available';
          else if (!pickMode && isNext) cls += ' next';
          else if (locked) cls += ' locked';
          if (selectedPerkId === perk.id) cls += ' sel';
          const icon = perkIcons[perk.id] || '◆';
          const rule = localizedPerkRule(perk);
          const connector = i < perks.length - 1
            ? `<div class="perk-connector${taken ? ' lit' : ''}"></div>` : '';
          rows += `<div class="${cls}" data-br="${br}" data-idx="${i}" data-id="${perk.id}">
            <div class="perk-skill-icon">${icon}</div>
            <div class="perk-skill-copy">
              <div class="perk-skill-name">${localizedPerkName(perk)}</div>
              <div class="perk-skill-summary">${escapeHtml(rule.summary)}</div>
            </div>
            <div class="perk-skill-tier">${currentLanguage() === 'ru' ? 'УР.' : currentLanguage() === 'es' ? 'NV.' : 'LV.'} ${perk.level || i + 1}</div>
          </div>${connector}`;
        });

        return `<div class="perk-col">
          <div class="perk-col-header ${color}">${label}</div>
          ${rows}
        </div>`;
      }).join('');

      box.querySelectorAll(pickMode ? '.perk-skill:not(.locked)' : '.perk-skill').forEach(el => {
        el.onclick = () => {
          selectedBr = el.dataset.br;
          selectedPerkId = el.dataset.id;
          const idx = +el.dataset.idx;
          const perk = tree[selectedBr][idx];
          const rule = localizedPerkRule(perk);
          const taken = idx < (h.perkLevels[selectedBr] || 0);
          const isNextInBranch = idx === (h.perkLevels[selectedBr] || 0);
          const available = pickMode && !taken && selectedBr in nextPerkByBranch && nextPerkByBranch[selectedBr].id === perk.id;
          const icon2 = perkIcons[perk.id] || '◆';
          let statusBtn;
          if (taken) {
            statusBtn = `<button class="btn btn-dim" style="width:100%">${translateKey('learned')}</button>`;
          } else if (available) {
            statusBtn = `<button class="btn btn-green" id="perk-confirm-btn" style="width:100%">${translateKey('learn')}</button>`;
          } else if (!pickMode && isNextInBranch) {
            const nextLevelLabel = currentLanguage() === 'ru' ? 'На следующем уровне' : currentLanguage() === 'es' ? 'En el próximo nivel' : 'At the next level-up';
            statusBtn = `<button class="btn btn-dim" style="width:100%;cursor:default">⏳ ${nextLevelLabel}</button>`;
          } else {
            statusBtn = `<button class="btn btn-dim" style="width:100%;cursor:not-allowed">🔒 ${translateText('Previous perk first')}</button>`;
          }

          const ruleLabels = currentLanguage() === 'ru'
            ? { trigger:'КОГДА СРАБАТЫВАЕТ', effect:'ЧТО ПРОИСХОДИТ', tier:'уровень в ветке', preview:'ИЗМЕНЕНИЕ СРАЗУ', synergy:'КОМАНДНАЯ СИНЕРГИЯ' }
            : currentLanguage() === 'es'
              ? { trigger:'CUÁNDO SE ACTIVA', effect:'QUÉ OCURRE', tier:'nivel en la rama', preview:'CAMBIO INMEDIATO', synergy:'SINERGIA DE EQUIPO' }
              : { trigger:'WHEN IT TRIGGERS', effect:'WHAT IT DOES', tier:'branch level', preview:'IMMEDIATE CHANGE', synergy:'TEAM SYNERGY' };
          const statPreview = perkStatPreview(perk, h);
          const statPreviewHtml = statPreview
            ? `<div class="perk-detail-stat-preview"><span>${ruleLabels.preview}</span><strong>${escapeHtml(statPreview.label)}: ${statPreview.before} → ${statPreview.after}</strong></div>`
            : '';
          const synergy = perkSynergyText(selectedBr);
          detailPanel.innerHTML = `
            <div class="perk-detail-scroll">
              <div class="perk-detail-head">
                <div class="perk-detail-icon">${icon2}</div>
                <div>
                  <div class="perk-detail-name">${localizedPerkName(perk)}</div>
                  <div class="perk-detail-branch">${localizedPerkBranch(selectedBr)}</div>
                </div>
              </div>
              <div class="perk-detail-tierline">${ruleLabels.tier}: ${perk.level || idx + 1} / ${tree[selectedBr].length}</div>
              <div class="perk-detail-summary">${escapeHtml(rule.summary)}</div>
              ${statPreviewHtml}
              <div class="perk-detail-rules">
                <div class="perk-detail-rule"><span>${ruleLabels.trigger}</span><strong>${escapeHtml(rule.trigger)}</strong></div>
                <div class="perk-detail-rule"><span>${ruleLabels.effect}</span><strong>${escapeHtml(rule.effect)}</strong></div>
              </div>
              <div class="perk-detail-synergy"><span>${ruleLabels.synergy}</span><strong>${escapeHtml(synergy)}</strong></div>
            </div>
            <div class="perk-detail-action">${statusBtn}</div>
          `;
          renderPerkTree();

          const confirmBtn = document.getElementById('perk-confirm-btn');
          if (confirmBtn && pickMode) {
            confirmBtn.onclick = () => {
              document.getElementById('confirm-modal').classList.remove('hidden');
              document.getElementById('confirm-text').textContent = `${translateKey('sure')} ${translateText('Perk')}: «${localizedPerkName(perk)}»`;
              document.getElementById('confirm-yes').onclick = () => {
                h.perks = h.perks || [];
                perk.apply(h);
                h.perkLevels[selectedBr] = (h.perkLevels[selectedBr] || 0) + 1;
                if (!h.perksApplied) h.perksApplied = [];
                h.perksApplied.push({ br: selectedBr, id: perk.id });
                document.getElementById('confirm-modal').classList.add('hidden');
                modal.classList.add('hidden');
                saveGame();
                if (GameState.pendingPerks.length) {
                  openPerkModal(GameState.pendingPerks.shift());
                } else if (GameState.pendingSkillUnlocks && GameState.pendingSkillUnlocks.length) {
                  setTimeout(processSkillUnlockQueue, 200);
                }
              };
              document.getElementById('confirm-no').onclick = () => document.getElementById('confirm-modal').classList.add('hidden');
            };
          }
        };
      });
    }

    renderPerkTree();
    detailPanel.innerHTML = pickMode
      ? `<div style="color:#555577;font-size:10px;line-height:1.6">${translateText('Click a perk for details.')}<br><br>🟢 ${translateKey('studied')}&nbsp;&nbsp;🔵 ${translateText('Choose now')}<br>🔒 ${translateText('Previous perk required')}</div>`
      : `<div style="color:#555577;font-size:10px;line-height:1.6">${translateText('Click a perk for details.')}<br><br>🟢 ${translateKey('studied')}&nbsp;&nbsp;🟡 ${translateText('Next on level-up')}<br>🔒 ${translateText('Locked')}</div>`;
    modal.classList.remove('hidden');
    const initialPerk = box.querySelector(pickMode ? '.perk-skill.available' : '.perk-skill.next, .perk-skill.unlocked');
    if (initialPerk) initialPerk.click();
  }

  function showRewardAd(cb) { showRewardedAd(cb); }

  function claimVictoryAdGold() {
    if (GameState._lastBattleAdClaimed) return null;
    GameState._lastBattleAdClaimed = true;
    const amount = Math.max(0, Number(GameState._lastBattleAdGold) || 0);
    GameState.gold += amount;
    saveGame();
    return amount;
  }

  function enemyAbilityText(enemyId) {
    const m = {
      [ENEMY_IDS.SKELETON]: 'Basic attack.',
      [ENEMY_IDS.GOBLIN_ARCHER]: 'Shoots from range and keeps distance.',
      [ENEMY_IDS.BANDIT_THROWER]: 'Throws from range 2 and backs away from heroes.',
      [ENEMY_IDS.CROSSBOWMAN]: 'Shoots from range 3.',
      [ENEMY_IDS.HEXER]: 'Attacks from range and applies blindness.',
      [ENEMY_IDS.CULTIST]: 'Ranged attack, curse chance.',
      [ENEMY_IDS.THORN_DRYAD]: 'Ranged attack, slow.',
      [ENEMY_IDS.BOAR]: 'Charges toward the target, ignoring forest and water.',
      [ENEMY_IDS.ZOMBIE]: 'Explodes on death.',
      [ENEMY_IDS.SHAMAN]: 'Heals allies.',
      [ENEMY_IDS.LESHY]: 'Does not move. Summons 2 creatures on the first turn, then 1 every other turn (max 4). At 50% HP it summons up to 2 more and gives summons +2 attack.',
      [ENEMY_IDS.ROOT_SENTINEL]: 'Immobile roots strike a hero on an adjacent tile and slow the target for 1 turn.',
      [ENEMY_IDS.FIRE_ELEMENTAL]: 'Fire heals it. Its attack ignites the target tile, and it explodes on death.',
      [ENEMY_IDS.WATER_ELEMENTAL]: 'Moves freely through water, gains +2 armor there, and pushes its target on hit.',
      [ENEMY_IDS.BANDIT]: 'Fast melee fighter.',
      [ENEMY_IDS.WOLF]: 'Hunts the weakest hero.',
      [ENEMY_IDS.SPEARMAN]: 'Empowered melee strike.',
      [ENEMY_IDS.BOG_LURKER]: 'Chance to slow in melee.',
      [ENEMY_IDS.RAT_SWARM]: 'Chance to poison on hit.',
      [ENEMY_IDS.ORC_GUARD]: 'Pierces 2 armor.',
      [ENEMY_IDS.SUICIDE]: 'Explosion deals 20 damage nearby.',
      [ENEMY_IDS.SPIDER]: 'Applies webbing.',
      [ENEMY_IDS.WATCHER]: '+2 movement to allies, keeps distance.',
      [ENEMY_IDS.ICE_ELEM]: 'Freezes on attack.',
      [ENEMY_IDS.NECRO]: 'Summons skeletons.',
      [ENEMY_IDS.CHAOS]: 'AoE around itself, does not move.',
      [ENEMY_IDS.ASSASSIN]: 'Invisible in forest, backstab ×2.',
      [ENEMY_IDS.HYDRA]: 'Three hits per attack, regeneration.',
      [ENEMY_IDS.GHOST]: 'Passes through mountains, only magic works.',
      [ENEMY_IDS.VOID_STALKER]: 'Backstab ×1.5, focuses weak targets.',
      [ENEMY_IDS.BLOOD_KNIGHT]: 'Lifesteal on hit.',
      [ENEMY_IDS.BANSHEE]: 'Chance to stun.',
      [ENEMY_IDS.PLAGUE_DOCTOR]: 'Heals allies and poisons.',
      [ENEMY_IDS.SHIELDBEARER]: 'Reduces incoming damage.',
      [ENEMY_IDS.STONE_GOLEM]: 'Chance to stun.',
      [ENEMY_IDS.ARCANE_SENTINEL]: 'Chance to freeze.',
      [ENEMY_IDS.FIRE_TITAN]: 'Ignites the field, AoE.',
      [ENEMY_IDS.DARK_KNIGHT]: 'Melee mini-boss.',
      [ENEMY_IDS.DARK_LORD]: 'Phase-based boss.'
    };
    return translateText(m[enemyId] || 'Dangerous enemy.');
  }

  function enemyThreatTags(enemyId) {
    const D = ENEMY_IDS;
    const d = enemyDef(enemyId);
    const tags = [];
    const add = (key, cls) => tags.push({ key, cls });
    if ([D.SHAMAN, D.PLAGUE_DOCTOR].includes(enemyId)) add('threatHealer', 'threat-healer');
    if ([D.LESHY, D.NECRO, D.DARK_LORD].includes(enemyId)) add('threatSummoner', 'threat-summoner');
    if ([D.ASSASSIN, D.VOID_STALKER, D.WOLF].includes(enemyId)) add('threatAssassin', 'threat-assassin');
    if ([D.ZOMBIE, D.SUICIDE, D.CHAOS, D.FIRE_TITAN, D.FIRE_ELEMENTAL, D.HYDRA].includes(enemyId)) add('threatExplosive', 'threat-explosive');
    if ([D.SPIDER, D.ICE_ELEM, D.WATER_ELEMENTAL, D.HEXER, D.BANSHEE, D.CULTIST, D.ARCANE_SENTINEL, D.BOG_LURKER, D.THORN_DRYAD, D.STONE_GOLEM, D.ROOT_SENTINEL].includes(enemyId)) add('threatController', 'threat-controller');
    if (d && (d.boss || d.miniBoss)) add('threatBoss', 'threat-boss');
    if ([D.LESHY, D.ORC_GUARD, D.SHIELDBEARER, D.STONE_GOLEM, D.DARK_KNIGHT, D.BLOOD_KNIGHT, D.BOAR].includes(enemyId)) add('threatTank', 'threat-tank');
    if (d && d.range > 1) add('threatRanged', 'threat-ranged');
    return tags;
  }

  function enemyThreatBadgesHtml(enemyId, compact = false) {
    const tags = enemyThreatTags(enemyId);
    if (!tags.length) return '';
    const cls = compact ? 'threat-badges compact' : 'threat-badges';
    return `<div class="${cls}">` + tags.map(t => {
      const label = translateKey(t.key);
      return `<span class="threat-badge ${t.cls}" title="${label}">${label}</span>`;
    }).join('') + `</div>`;
  }

  //══════════ INPUT (battle) ══════════
  canvas.addEventListener('mousemove', e => {
    if (BattleView.dragging) {
      const b = GameState.currentBattle;
      if (BattleView.dragMode === 'deploy-drag' && b && b.phase === 'deploy') {
        const dragHero = b.units.find(u => u.isHero && u.heroId === b.deployDragHeroId);
        const dx = e.clientX - BattleView.lastX;
        const dy = e.clientY - BattleView.lastY;
        if (Math.abs(dx) + Math.abs(dy) > 1) BattleView.moved = true;
        BattleView.lastX = e.clientX;
        BattleView.lastY = e.clientY;
        if (dragHero) {
          const { gx, gy } = eventToGrid(e.clientX, e.clientY);
          if (moveDeployHeroToCell(b, dragHero, gx, gy)) updateBattleUI();
        }
        hideTip();
        BattleView.hoverCell = null;
        return;
      }
      const dx = e.clientX - BattleView.lastX;
      const dy = e.clientY - BattleView.lastY;
      const r = canvasContentRect();
      BattleView.offsetX += dx * (CANVAS_W / r.width);
      BattleView.offsetY += dy * (CANVAS_H / r.height);
      BattleView.lastX = e.clientX;
      BattleView.lastY = e.clientY;
      if (Math.abs(dx) + Math.abs(dy) > 1) BattleView.moved = true;
      clampBattleView();
      hideTip();
      BattleView.hoverCell = null;
      return;
    }
    const b = GameState.currentBattle;
    if (!b || !['deploy', 'combat'].includes(b.phase)) { BattleView.hoverCell = null; hideTip(); return; }
    const { gx, gy } = eventToGrid(e.clientX, e.clientY);
    BattleView.hoverCell = inBounds(gx, gy) ? { gx, gy } : null;
    const u = unitAt(b, gx, gy);
    const tip = document.getElementById('tooltip');
    if (u && !u.isHero) {
      tip.style.display = 'block';
      const hpPct = Math.max(0, Math.min(100, Math.round((u.hp / u.maxHp) * 100)));
      const sts = (u.activeStatuses || []).map(s => s.type === STATUS.FREEZE ? '🧊' : s.type === STATUS.POISON ? '☠️' : s.type === STATUS.SLOW ? '🐢' : '•').join(' ');
      tip.innerHTML = `<b>${u.emoji} ${u.name}</b><br/>
      ${enemyThreatBadgesHtml(u.enemyId, true)}
      HP: ${u.hp}/${u.maxHp}
      <div class="bar" style="height:6px;margin:4px 0">
        <div style="height:100%;width:${hpPct}%;background:#e74c3c"></div>
      </div>
      ${damagePreviewCardHtml(b, getActiveUnit(), u)}
      ${translateKey('battleAttack')}: ${u.attack} | ${translateKey('armor')}: ${u.armor}<br/>
      ${translateKey('statuses')}: ${sts || translateKey('none')}<br/>
      ${u.scenarioTarget ? `<span class="stats-line">${translateKey(u.scenarioTarget === 'ritualist' ? 'ritualTargetTooltip' : 'huntTargetTooltip')}</span><br/>` : ''}
      <span class="stats-line">${battleHoverPreviewText(b, u)}</span><br/>
      <span class="stats-line">${enemyAbilityText(u.enemyId)}</span>`;
      const vw = window.innerWidth, vh = window.innerHeight;
      const tw = 220, th = 120;
      let lx = e.clientX + 12, ly = e.clientY + 12;
      if (lx + tw > vw - 8) lx = vw - tw - 8;
      if (ly + th > vh - 8) ly = vh - th - 8;
      tip.style.left = lx + 'px';
      tip.style.top = ly + 'px';
    } else if (BattleView.hoverCell && inBounds(gx, gy)) {
      const terrain = terrainInfo(b.grid[gy][gx], getActiveUnit() || undefined);
      const ward = b.scenario?.id === 'defense' && b.scenario.ward?.x === gx && b.scenario.ward?.y === gy
        ? b.scenario.ward : null;
      const trap = (b.traps || []).find(item => item.x === gx && item.y === gy);
      const heatWarning = (b.heatWarnings || []).find(item => item.x === gx && item.y === gy);
      const tideWarning = (b.tideWarnings || []).find(item => item.x === gx && item.y === gy);
      const exit = ['escape', 'hunt'].includes(b.scenario?.id) && gx === GRID_W - 1;
      tip.style.display = 'block';
      const effects = terrain.effects.length ? terrain.effects.join('<br/>') : translateKey('terrainNoBonus');
      tip.innerHTML = ward
        ? `<b>🛡️ ${translateKey('wardMarker')} · ${ward.hp}/${ward.maxHp}</b><br/><span class="stats-line">${translateKey('wardTooltip')}</span>`
        : heatWarning
          ? `<b>${translateKey(heatWarning.type === 'lava' ? 'lavaWarning' : 'collapseWarning')}</b><br/><span class="stats-line">${translateKey(heatWarning.type === 'lava' ? 'lavaWarningTooltip' : 'collapseWarningTooltip')}</span>`
          : tideWarning
            ? `<b>${translateKey('tideWarning')}</b><br/><span class="stats-line">${translateKey('tideWarningTooltip')}</span>`
        : trap
          ? `<b>${translateKey('trapMarker')}</b><br/><span class="stats-line">${translateKey('trapTooltip')}</span>`
          : exit
            ? `<b>🚩 ${translateKey('exitMarker')}</b><br/><span class="stats-line">${translateKey('exitTooltip')}</span>`
            : `<b>${translateKey('terrain')}: ${terrain.name}</b><br/><span class="stats-line">${effects}</span>`;
      const vw = window.innerWidth, vh = window.innerHeight;
      const tw = 220, th = 72;
      let lx = e.clientX + 12, ly = e.clientY + 12;
      if (lx + tw > vw - 8) lx = vw - tw - 8;
      if (ly + th > vh - 8) ly = vh - th - 8;
      tip.style.left = lx + 'px';
      tip.style.top = ly + 'px';
    } else hideTip();
  });
  function hideTip() { document.getElementById('tooltip').style.display = 'none'; }
  canvas.addEventListener('mouseleave', () => { BattleView.hoverCell = null; hideTip(); });
  canvas.addEventListener('mousedown', e => {
    if (e.button !== 0) return;
    const b = GameState.currentBattle;
    if (b && b.phase === 'deploy') {
      const { gx, gy } = eventToGrid(e.clientX, e.clientY);
      const hit = unitAt(b, gx, gy);
      if (hit && hit.isHero) {
        b.deployDragHeroId = hit.heroId;
        BattleView.dragging = true;
        BattleView.dragMode = 'deploy-drag';
        BattleView.lastX = e.clientX;
        BattleView.lastY = e.clientY;
        BattleView.moved = false;
        updateBattleUI();
        e.preventDefault();
        return;
      }
    }
    BattleView.dragging = true;
    BattleView.dragMode = 'pan';
    BattleView.lastX = e.clientX;
    BattleView.lastY = e.clientY;
    BattleView.moved = false;
    hideTip();
    e.preventDefault();
  });
  window.addEventListener('mouseup', () => {
    if (!BattleView.dragging) return;
    BattleView.dragging = false;
    BattleView.dragMode = 'none';
    if (BattleView.moved) BattleView.suppressClickUntil = Date.now() + 160;
  });
  canvas.addEventListener('wheel', e => {
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    zoomAt(e.clientX, e.clientY, BattleView.zoom * factor);
    hideTip();
    e.preventDefault();
  }, { passive: false });

  canvas.addEventListener('click', e => {
    const b = GameState.currentBattle;
    if (!b) return;
    if (Date.now() < BattleView.suppressClickUntil) return;
    const { gx, gy } = eventToGrid(e.clientX, e.clientY);
    if (!inBounds(gx, gy)) return;
    canvasBattleClick(gx, gy);
  });
  const touchState = { mode: 'none', startX: 0, startY: 0, startTime: 0 };
  canvas.addEventListener('touchstart', ev => {
    const b = GameState.currentBattle;
    if (!b) return;
    if (ev.touches.length === 1) {
      const t = ev.touches[0];
      const { gx, gy } = eventToGrid(t.clientX, t.clientY);
      const hit = b.phase === 'deploy' ? unitAt(b, gx, gy) : null;
      if (hit && hit.isHero) {
        b.deployDragHeroId = hit.heroId;
        touchState.mode = 'deploy-drag';
        updateBattleUI();
      } else {
        touchState.mode = 'pan';
      }
      touchState.startX = t.clientX;
      touchState.startY = t.clientY;
      touchState.startTime = Date.now();
      BattleView.lastX = t.clientX;
      BattleView.lastY = t.clientY;
      BattleView.moved = false;
    } else if (ev.touches.length >= 2) {
      touchState.mode = 'pinch';
      BattleView.pinchStartDist = clientDist(ev.touches[0], ev.touches[1]);
      BattleView.pinchStartZoom = BattleView.zoom;
    }
    ev.preventDefault();
  }, { passive: false });
  canvas.addEventListener('touchmove', ev => {
    const b = GameState.currentBattle;
    if (!b) return;
    if (touchState.mode === 'pinch' && ev.touches.length >= 2) {
      const d = clientDist(ev.touches[0], ev.touches[1]);
      const m = clientMid(ev.touches[0], ev.touches[1]);
      if (BattleView.pinchStartDist > 0) {
        const ratio = d / BattleView.pinchStartDist;
        zoomAt(m.x, m.y, BattleView.pinchStartZoom * ratio);
      }
      hideTip();
      ev.preventDefault();
      return;
    }
    if (touchState.mode === 'deploy-drag' && ev.touches.length === 1) {
      const t = ev.touches[0];
      const b = GameState.currentBattle;
      const dragHero = b?.units.find(u => u.isHero && u.heroId === b.deployDragHeroId);
      if (dragHero) {
        const { gx, gy } = eventToGrid(t.clientX, t.clientY);
        if (moveDeployHeroToCell(b, dragHero, gx, gy)) updateBattleUI();
      }
      if (Math.abs(t.clientX - touchState.startX) + Math.abs(t.clientY - touchState.startY) > 6) BattleView.moved = true;
      ev.preventDefault();
      return;
    }
    if (touchState.mode === 'pan' && ev.touches.length === 1) {
      const t = ev.touches[0];
      const dx = t.clientX - BattleView.lastX;
      const dy = t.clientY - BattleView.lastY;
      const r = canvasContentRect();
      BattleView.offsetX += dx * (CANVAS_W / r.width);
      BattleView.offsetY += dy * (CANVAS_H / r.height);
      BattleView.lastX = t.clientX;
      BattleView.lastY = t.clientY;
      if (Math.abs(t.clientX - touchState.startX) + Math.abs(t.clientY - touchState.startY) > 6) BattleView.moved = true;
      clampBattleView();
      hideTip();
      ev.preventDefault();
    }
  }, { passive: false });
  canvas.addEventListener('touchend', ev => {
    const b = GameState.currentBattle;
    if (!b) return;
    if ((touchState.mode === 'pan' || touchState.mode === 'deploy-drag') && !BattleView.moved && Date.now() - touchState.startTime < 260) {
      const t = ev.changedTouches[0];
      if (t) {
        const { gx, gy } = eventToGrid(t.clientX, t.clientY);
        if (inBounds(gx, gy)) {
          const active = getActiveUnit();
          const target = unitAt(b, gx, gy);
          const previewable = b.phase === 'combat' && active?.isHero && target && !target.isHero && !b.heroActionDone &&
            (b.mode === 'attack' || b.mode === 'skill');
          const key = `${gx},${gy},${b.pendingSkill || b.mode}`;
          if (previewable && b.touchConfirmKey !== key) {
            b.touchConfirmKey = key;
            b.touchPreviewCell = { gx, gy };
            BattleView.hoverCell = { gx, gy };
            updateBattleUI();
          } else {
            b.touchConfirmKey = null;
            b.touchPreviewCell = null;
            canvasBattleClick(gx, gy);
          }
        }
      }
    }
    if (ev.touches.length === 0) touchState.mode = 'none';
  }, { passive: false });

  //══════════ INIT ══════════
  function init() {
    GameBGM.init();
    BattleSfx.init();
    let storedSaveExists = false;
    try { storedSaveExists = !!(localStorage.getItem(SAVE_KEY) || localStorage.getItem(LEGACY_SAVE_KEY)); } catch (_) {}
    const hasSave = loadGame();
    if (!hasSave && !storedSaveExists) {
      initHeroesFromTemplate();
      buildWorldMap();
      GameState.gold = 20;
      GameState.turn = 1;
      // Starter inventory from the balance notes.
      GameState.inventory = ['steel_sword', 'hunter_bow', 'magic_wand', 'leather', 'luck_amulet'];
      saveGame();
    } else if (!hasSave) {
      console.warn('Stored save exists but could not be loaded; preserving it without overwrite.');
    }
    GameState.inventory = GameState.inventory || [];
    showScreen('menu');
    updateMenuMeta();
    requestAnimationFrame(loop);
    const openInventory = () => {
      GameState._returnToVictory = false;
      GameState._returnToBattle = false;
      GameState._returnToCity = false;
      renderInventoryScreen();
      showScreen('inventory');
    };
    const openInventoryFromBattle = () => {
      GameState._returnToVictory = false;
      GameState._returnToCity = false;
      GameState._returnToBattle = true;
      renderInventoryScreen();
      showScreen('inventory');
    };
    const battleInventoryBtn = document.getElementById('btn-battle-inventory');
    if (battleInventoryBtn) battleInventoryBtn.onclick = openInventoryFromBattle;
    const battleBestiaryBtn = document.getElementById('btn-battle-bestiary');
    if (battleBestiaryBtn) battleBestiaryBtn.onclick = () => {
      GameState._bestiaryReturn = 'battle';
      showScreen('bestiary');
      renderBestiaryScreen();
    };
    const legacyInvBtn = document.getElementById('btn-inventory-map');
    if (legacyInvBtn) legacyInvBtn.onclick = openInventory;
    const mapInvBtn = document.getElementById('btn-map-bag');
    if (mapInvBtn) mapInvBtn.onclick = openInventory;
    const mapBestiaryBtn = document.getElementById('btn-map-bestiary');
    if (mapBestiaryBtn) mapBestiaryBtn.onclick = () => {
      GameState._bestiaryReturn = 'map';
      showScreen('bestiary');
      renderBestiaryScreen();
    };
    const mapArsenalBtn = document.getElementById('btn-map-arsenal');
    if (mapArsenalBtn) mapArsenalBtn.onclick = () => { GameState._arsenalReturn = 'map'; showScreen('arsenal'); renderArsenal(); };
    document.querySelectorAll('[data-arsenal-slot]').forEach(btn => btn.onclick = () => { ArsenalState.slot = btn.dataset.arsenalSlot; ArsenalState.selectedId = null; renderArsenal(); });
    document.getElementById('btn-arsenal-back').onclick = () => { showScreen('map'); renderMap(); GameState._arsenalReturn = null; };
    document.getElementById('btn-close-inv').onclick = () => {
      if (GameState._returnToVictory) {
        GameState._returnToVictory = false;
        updateVictoryActionButtons();
        saveGame();
        showScreen('victory');
        return;
      }
      if (GameState._returnToBattle) {
        GameState._returnToBattle = false;
        showScreen('battle');
        updateBattleUI();
        return;
      }
      if (GameState._returnToCity) {
        GameState._returnToCity = false;
        const node = getActiveCityNode();
        if (node) renderCityUI(node, GameState._cityStrangerOnly);
        showScreen('city');
        return;
      }
      showScreen('map');
      renderMap();
    };
    document.getElementById('btn-vic-inventory').onclick = () => openInventoryFromVictory();
    document.getElementById('btn-event-ok').onclick = () => {
      const fn = GameState._eventContinueFn;
      GameState._eventContinueFn = null;
      showInterstitialAdAtBreak('event', () => {
        if (fn) fn();
        else { showScreen('map'); renderMap(); }
      });
    };
    document.getElementById('btn-leave-city').onclick = () => { saveGame(); showScreen('map'); renderMap(); };
    document.getElementById('btn-city-bag').onclick = () => openInventoryFromCity();
    document.getElementById('btn-city-bestiary').onclick = () => {
      GameState._bestiaryReturn = 'city';
      showScreen('bestiary');
      renderBestiaryScreen();
    };
    document.getElementById('btn-bestiary-back').onclick = () => {
      if (GameState._bestiaryReturn === 'city') showScreen('city');
      else if (GameState._bestiaryReturn === 'battle') { showScreen('battle'); updateBattleUI(); }
      else { showScreen('map'); renderMap(); }
      GameState._bestiaryReturn = null;
    };
    document.getElementById('btn-vic-bestiary').onclick = () => { showScreen('bestiary'); renderBestiaryScreen(); };
    document.getElementById('btn-vic-ad').onclick = () => {
      if (GameState._lastBattleAdClaimed) return;
      showRewardedAd(() => {
        const amount = claimVictoryAdGold();
        if (amount === null) return;
        document.getElementById('btn-vic-ad').disabled = true;
        document.getElementById('btn-vic-ad').style.opacity = '0.4';
        void showGameAlert(`+${amount} 💰 ${translateKey('goldAdded')}`);
      });
    };
    document.getElementById('btn-vic-continue').onclick = () => {
      document.getElementById('victory-screen').classList.add('hidden');
      showScreen('map');
      renderMap();
      if (GameState.pendingStoryScene) {
        requestAnimationFrame(() => { void consumePendingStoryScene(); });
      }
      if (GameState.firstBattleCompleted && !GameState.mapIntroShown && (GameState.stats?.battles || 0) === 1) {
        requestAnimationFrame(() => { void showMapIntroduction(); });
      }
      const _ss = GameState.shopStock && GameState.shopStock.stock ? GameState.shopStock.stock : (GameState.shopStock || []);
      const expensive = _ss.find(i => i.price > GameState.gold && i.price <= GameState.gold + 50);
      if (expensive && window.ysdk && Date.now() - (GameState.adMeta.lastBonusGoldAt || 0) > BONUS_GOLD_CD_MS) {
        showGameConfirm(translateKey('courierAd')).then(ok => {
          if (ok) {
            showRewardedAd(() => {
              GameState.gold += 50;
              GameState.adMeta.lastBonusGoldAt = Date.now();
              saveGame();
              renderMap();
            });
          }
        });
      }
    };
    document.getElementById('btn-ad-revive').onclick = () => {
      if (GameState.battleReviveUsed || !GameState.currentBattle) return;
      showRewardedAd(() => {
        GameState.battleReviveUsed = true;
        GameState.heroes.forEach(h => { h.hp = Math.max(1, Math.floor(h.maxHp * 0.3)); });
        const b = GameState.currentBattle;
        b.units.forEach(u => { if (u.isHero) { const h = GameState.heroes.find(x => x.id === u.heroId); u.hp = h.hp; } });
        showScreen('battle');
        updateBattleUI();
      });
    };
    document.getElementById('btn-load-last').onclick = () => {
      if (GameState.lastSafeSave) {
        Object.assign(GameState, deepClone(GameState.lastSafeSave));
        GameState.currentBattle = null;
        saveGame();
        showScreen('map');
        renderMap();
      }
    };
    document.getElementById('btn-go-title').onclick = () => {
      localStorage.removeItem(SAVE_KEY);
      localStorage.removeItem(LEGACY_SAVE_KEY);
      startNewGame();
    };
    document.getElementById('btn-ending-ok').onclick = () => { showScreen('map'); renderMap(); };
    document.querySelectorAll('[data-hero-tab]').forEach(btn => {
      btn.onclick = () => {
        InvState.activeHeroId = btn.getAttribute('data-hero-tab');
        InvState.selectedItemId = null;
        InvState.selectedItemIdx = -1;
        InvState.selectedEquippedSlot = null;
        renderInventoryScreen();
      };
    });
    document.getElementById('btn-open-menu').onclick = openGameMenu;
    const menuSettingsOverlay = document.getElementById('menu-settings-overlay');
    const btnMenuSettings = document.getElementById('btn-menu-settings');
    const btnMenuSettingsBack = document.getElementById('btn-menu-settings-back');
    const settingMusicEnabled = document.getElementById('setting-music-enabled');
    const settingMusicVolume = document.getElementById('setting-music-volume');
    const settingSfxEnabled = document.getElementById('setting-sfx-enabled');
    const settingSfxVolume = document.getElementById('setting-sfx-volume');
    const settingLanguage = document.getElementById('setting-language');
    const btnOpenSfxAuditor = document.getElementById('btn-open-sfx-auditor');
    const btnSfxAuditorClose = document.getElementById('btn-sfx-auditor-close');
    const btnSfxAuditorReset = document.getElementById('btn-sfx-auditor-reset');
    if (btnMenuSettings && menuSettingsOverlay) {
      btnMenuSettings.onclick = () => {
        const s = loadAudioSettings();
        if (settingMusicEnabled) settingMusicEnabled.checked = s.musicEnabled;
        if (settingMusicVolume) settingMusicVolume.value = String(Math.round(s.musicVolume * 100));
        if (settingSfxEnabled) settingSfxEnabled.checked = s.sfxEnabled;
        if (settingSfxVolume) settingSfxVolume.value = String(Math.round(s.sfxVolume * 100));
        if (settingLanguage) settingLanguage.value = currentLanguage();
        updateRecordsSummary();
        menuSettingsOverlay.classList.add('show');
        menuSettingsOverlay.setAttribute('aria-hidden', 'false');
        scheduleLocalize(menuSettingsOverlay);
      };
    }
    if (btnMenuSettingsBack && menuSettingsOverlay) {
      btnMenuSettingsBack.onclick = () => {
        menuSettingsOverlay.classList.remove('show');
        menuSettingsOverlay.setAttribute('aria-hidden', 'true');
      };
    }
    if (settingMusicEnabled) {
      settingMusicEnabled.onchange = e => {
        saveAudioSettings({ musicEnabled: !!e.target.checked });
        GameBGM.applyVolumeFromSettings();
        GameBGM.syncToScreen(GameBGM.lastScreen);
      };
    }
    if (settingMusicVolume) {
      settingMusicVolume.oninput = e => {
        const v = Math.min(1, Math.max(0, Number(e.target.value) / 100));
        saveAudioSettings({ musicVolume: v });
        GameBGM.applyVolumeFromSettings();
      };
    }
    if (settingSfxEnabled) {
      settingSfxEnabled.onchange = e => {
        saveAudioSettings({ sfxEnabled: !!e.target.checked });
      };
    }
    if (settingSfxVolume) {
      settingSfxVolume.oninput = e => {
        const v = Math.min(1, Math.max(0, Number(e.target.value) / 100));
        saveAudioSettings({ sfxVolume: v });
      };
    }
    if (settingLanguage) {
      settingLanguage.value = currentLanguage();
      settingLanguage.onchange = e => setGameLanguage(e.target.value);
    }
    if (btnOpenSfxAuditor) {
      btnOpenSfxAuditor.classList.toggle('hidden', !SFX_AUDITOR_ENABLED);
      btnOpenSfxAuditor.onclick = SFX_AUDITOR_ENABLED ? openSfxAuditor : null;
    }
    if (SFX_AUDITOR_ENABLED) {
      if (btnSfxAuditorClose) btnSfxAuditorClose.onclick = closeSfxAuditor;
      if (btnSfxAuditorReset) btnSfxAuditorReset.onclick = resetSfxOverrides;
    }
    document.getElementById('btn-menu-continue').onclick = closeGameMenu;
    document.getElementById('btn-menu-tutorial').onclick = () => {
      closeGameMenu();
      void showOnboarding({ manual: true });
    };
    const battleSpeedBtn = document.getElementById('battle-speed-toggle');
    if (battleSpeedBtn) {
      const updateBattleSpeedLabel = () => {
        battleSpeedBtn.textContent = `${translateKey('battleSpeed')}: ×${GameState.battleSpeed === 2 ? 2 : 1}`;
        battleSpeedBtn.title = battleSpeedBtn.textContent;
      };
      updateBattleSpeedLabel();
      battleSpeedBtn.onclick = () => {
        GameState.battleSpeed = GameState.battleSpeed === 2 ? 1 : 2;
        updateBattleSpeedLabel();
        saveGame();
      };
    }
    document.getElementById('btn-menu-save-exit').onclick = () => {
      GameState.screen = ActiveScreen;
      if (!saveGame(true)) {
        void showGameAlert(CampaignExpansion.loc({
          ru: 'Сохранение не записано. Освободите место в браузере и повторите попытку — игра останется открыта.',
          en: 'The game was not saved. Free browser storage and try again; the game will remain open.',
          es: 'No se guardó la partida. Libera espacio del navegador e inténtalo de nuevo.'
        }));
        return;
      }
      closeGameMenu();
      showInterstitialAdAtBreak('menu', () => {
        showScreen('menu');
        updateMenuMeta();
      });
    };
    document.getElementById('btn-menu-exit').onclick = () => {
      discardUnsavedProgress();
      closeGameMenu();
      showInterstitialAdAtBreak('menu', () => {
        showScreen('menu');
        updateMenuMeta();
      });
    };
    if (!window.ysdk) {
      const adBtn = document.getElementById('btn-ad-revive');
      if (adBtn) adBtn.classList.add('hidden');
    }
    updateMenuMeta();
    startI18nObserver();
    setGameLanguage(GameLanguage);
  }
  let yandexGameReadySent = false;
  function notifyYandexGameReady(sdk) {
    if (yandexGameReadySent || !sdk?.features?.LoadingAPI?.ready) return;
    yandexGameReadySent = true;
    const fire = () => {
      try {
        const result = sdk.features.LoadingAPI.ready();
        if (result && typeof result.catch === 'function') result.catch(() => {});
      } catch (_) {}
    };
    // Этим вызовом площадка снимает свой загрузчик, поэтому к нему шрифт должен
    // быть на месте: иначе первый кадр, который видит игрок, набран запасной
    // гарнитурой, а титул меню нарисован под пиксельную.
    //
    // Раньше вызов шёл сразу после init, и document.fonts.ready тут разрешался
    // за миллисекунду — до того, как шрифт вообще запрашивался: @font-face с
    // unicode-range грузится лениво, когда появляется текст из его диапазона.
    // Отсюда ожидание кадра: к следующему кадру меню уже отрисовано, шрифт
    // затребован, и ожидание становится настоящим.
    //
    // Таймер — страховка: если гарнитура не приедет, игра обязана сказать
    // «готово» всё равно, иначе игрок останется на загрузчике площадки.
    const guard = setTimeout(fire, 3000);
    const done = () => { clearTimeout(guard); fire(); };
    if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function') {
      requestAnimationFrame(() => document.fonts.ready.then(done, done));
    } else {
      done();
    }
  }

  if (typeof YaGames !== 'undefined') YaGames.init().then(sdk => {
    window.ysdk = sdk;
    YandexServices.sdk = sdk;
    applySdkLanguage(sdk);
    notifyYandexGameReady(sdk);
    initYandexPlayer(sdk).then(() => {
      submitLeaderboards(loadRecords());
      if (ActiveScreen === 'menu') {
        updateMenuMeta();
        updateRecordsSummary();
        scheduleLocalize(document.body);
      }
    });
    const adBtn = document.getElementById('btn-ad-revive');
    if (adBtn) adBtn.classList.remove('hidden');
  }).catch(() => {});

  // Правая кнопка не открывает меню браузера: требование площадки 1.6.2.7.
  // Вешается на документ, а не на канву: игрок промахивается мимо поля чаще,
  // чем попадает, и меню поверх игры площадка считает дефектом независимо от
  // того, где именно нажали. В самой игре правая кнопка ничего не делает —
  // обработчиков button===2 и auxclick в коде нет, так что отнимать нечего.
  document.addEventListener('contextmenu', event => event.preventDefault());

  // Spacebar: "Start Battle" in deploy phase, "Wait" in combat phase.
  document.addEventListener('keydown', e => {
    if (e.code !== 'Space') return;
    const tag = document.activeElement && document.activeElement.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    e.preventDefault();
    const b = GameState.currentBattle;
    if (!b) return;
    if (b.phase === 'deploy') {
      const sb = document.getElementById('btn-start-battle');
      if (sb) sb.click();
    } else if (b.phase === 'combat') {
      const wb = document.getElementById('btn-wait');
      if (wb) wb.click();
    }
  });

  init();
