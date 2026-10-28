/**
 * Размеры под палец и кегль по всей матрице окон.
 *
 * Прошлые проверки раскладки смотрели выход за край и обрезку текста на двух
 * окнах. Размер нажимаемого, зазор между соседями и кегль не мерил никто — и на
 * 812x375 накопилось три десятка кнопок по 20-42 px. Эта проверка обходит все
 * состояния интерфейса на каждом окне матрицы и падает на каждом из четырёх
 * признаков:
 *
 *   1. нажимаемое мельче MIN_TAP по любой стороне;
 *   2. зазор между центрами соседних нажимаемых меньше MIN_GAP;
 *   3. видимый текст мельче MIN_FONT;
 *   4. нажимаемое за краем окна, из которого его нельзя докрутить.
 *
 * Пороги переопределяются из окружения, чтобы было видно: проверка способна
 * падать. MIN_TAP=60 обязан дать красный прогон.
 *
 * Нажимаемое — не только <button>: в игре это div с data-action, его выдаёт
 * cursor:pointer. Закрытое чужим элементом из проверки не выпадает — иначе чем
 * сильнее дефект, тем надёжнее он проходит.
 */
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createStaticServer } from './static-server.mjs';
import { UI_STATE_NAMES, applyUiState } from './ui-states.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const locale = process.env.QA_LANG ? `${process.env.QA_LANG}-${process.env.QA_LANG.toUpperCase()}` : 'ru-RU';

const MIN_TAP = Number(process.env.MIN_TAP || 44);
/**
 * Окна ниже 361 px высоты — остаток после шапки браузера и панели площадки.
 * Три ряда по 44 px в них не помещаются, и выбор только между мельче и
 * спрятать. Порог совпадает с медиазапросом в styles/tap-targets.css.
 */
const MIN_TAP_LOW = Number(process.env.MIN_TAP_LOW || 36);
const MIN_GAP = Number(process.env.MIN_GAP || 6);
const MIN_FONT = Number(process.env.MIN_FONT || 10);
/**
 * Плитки карты и карточки списков: промах выделяет соседа, а не совершает
 * действие — вход в бой, покупка и изучение подтверждаются отдельной кнопкой.
 * Сетка 96 клеток на телефоне поперёк физически не даёт 44 px на клетку, но
 * пол ей всё равно нужен, иначе клетка однажды станет 12 px.
 */
const MIN_SELECT = Number(process.env.MIN_SELECT || 24);
/** Селекторы, для которых действует MIN_SELECT и не действует правило зазора. */
const SELECT_ONLY = '.map-node, .bestiary-card, .inv-item-card, .item-card, .arsenal-card, .perk-skill, .eq-slot, .inv-consumable-row';
/** Отчёт без падения: печатает все находки, код выхода 0. Для разбора. */
const REPORT_ONLY = process.argv.includes('--report');

/**
 * Окна, в которых играют. Высоты взяты из отказов модерации: площадка и
 * браузер съедают шапку и баннер, игре остаётся меньше, чем показывает экран.
 * Портрет не целевая раскладка — там проверяется только экран поворота.
 */
const MATRIX = [
  { name: 'monitor', width: 1920, height: 1080, states: 'core' },
  { name: 'itch-embed', width: 1280, height: 720, states: 'all' },
  { name: 'laptop-window', width: 1024, height: 640, states: 'core' },
  { name: 'phone-landscape', width: 844, height: 320, states: 'core' },
  { name: 'phone-landscape-tall', width: 812, height: 375, states: 'all' },
  { name: 'phone-with-panel', width: 743, height: 360, states: 'core' },
  { name: 'phone-low-window', width: 712, height: 292, states: 'all' },
  { name: 'matrix-floor', width: 568, height: 260, states: 'core' },
  { name: 'portrait-phone', width: 360, height: 603, states: 'gate' },
  { name: 'portrait-floor', width: 320, height: 430, states: 'gate' }
];

/** Состояния, через которые игрок проходит обязательно. Полный список — на трёх окнах. */
const CORE_STATES = [
  'menu', 'menu-settings', 'map', 'map-selected', 'battle-deploy', 'battle-combat',
  'battle-skill-targeting', 'city-trader-buy', 'city-alchemist', 'inventory',
  'inventory-item-selected', 'bestiary', 'victory', 'perk-modal', 'game-menu-overlay',
  'event-screen', 'gameover'
];

const failures = [];
const findings = [];
const check = (name, ok, details = '') => {
  if (ok) { console.log(`PASS ${name}`); return; }
  const line = `${name}${details ? `: ${details}` : ''}`;
  findings.push(line);
  if (!REPORT_ONLY) failures.push(line);
  else console.log(`FIND ${line}`);
};

/** Собрать нажимаемое и текст на текущем экране. Вся логика — в странице. */
const MEASURE = ({ minTap, minGap, minFont, minSelect, selectOnly }) => {
  const visible = el => {
    const style = getComputedStyle(el);
    if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) < 0.05) return false;
    const rect = el.getBoundingClientRect();
    return rect.width > 1 && rect.height > 1;
  };
  const hiddenScreen = el => el.closest('.hidden') !== null;
  const label = el => {
    const text = (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28);
    const own = String(el.className || '').split(' ').filter(Boolean)[0];
    /* Безымянный узел опознаётся только через родителя — иначе в отчёте
       остаётся «.undefined», и починить находку нельзя. */
    const name = el.id ? `#${el.id}`
      : own ? `.${own}`
      : `${el.tagName.toLowerCase()} в ${el.parentElement ? (el.parentElement.id ? '#' + el.parentElement.id : '.' + (String(el.parentElement.className || '').split(' ').filter(Boolean)[0] || el.parentElement.tagName.toLowerCase())) : '?'}`;
    return `${name}${text ? ` «${text}»` : ''}`;
  };

  /* 1. Нажимаемое. */
  const tappable = [];
  for (const el of document.querySelectorAll('button, [role="button"], a[href], [data-action], [data-node-id], [data-eid], [data-arsenal-id], [data-inventory-index], .item-card, .choice-btn, .menu-btn')) {
    if (hiddenScreen(el) || !visible(el)) continue;
    if (el.disabled) continue;
    tappable.push(el);
  }
  /* div с обработчиком выдаёт себя курсором: добираем их отдельно. */
  for (const el of document.querySelectorAll('div, span, li, td')) {
    if (tappable.includes(el) || hiddenScreen(el) || !visible(el)) continue;
    if (getComputedStyle(el).cursor !== 'pointer') continue;
    /* Родитель уже в списке — считаем его, а не декоративную начинку. */
    if (tappable.some(known => known.contains(el))) continue;
    tappable.push(el);
  }

  /**
   * Слой элемента: экран или открытый поверх него оверлей. Пара из разных
   * слоёв — не соседи: кнопка меню паузы «накладывается» на кнопку карты
   * позади, но палец видит только верхнюю. Без этого проверка выдавала
   * отрицательные зазоры там, где дефекта нет.
   */
  const layerOf = el => el.closest('#game-menu-overlay, #menu-settings-overlay, [id$="-modal"], .screen') || document.body;

  const boxes = tappable.map(el => {
    const rect = el.getBoundingClientRect();
    return { el, label: label(el), rect, selectOnly: el.matches(selectOnly), layer: layerOf(el) };
  });

  const small = boxes
    .map(box => ({ box, floor: box.selectOnly ? minSelect : minTap }))
    .filter(({ box, floor }) => box.rect.width < floor - 0.5 || box.rect.height < floor - 0.5)
    .map(({ box, floor }) => `${box.label} ${Math.round(box.rect.width)}x${Math.round(box.rect.height)} (пол ${floor})`);

  /* 2. Зазоры: пары, у которых промежуток по обеим осям меньше порога. */
  const gaps = [];
  for (let i = 0; i < boxes.length; i++) {
    for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i].rect, b = boxes[j].rect;
      if (boxes[i].el.contains(boxes[j].el) || boxes[j].el.contains(boxes[i].el)) continue;
      if (boxes[i].selectOnly || boxes[j].selectOnly) continue;
      if (boxes[i].layer !== boxes[j].layer) continue;
      const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (overlapX <= 0 && overlapY <= 0) continue; /* по диагонали — палец не промахнётся */
      const gapX = overlapY > 0 ? Math.max(a.left, b.left) - Math.min(a.right, b.right) : Infinity;
      const gapY = overlapX > 0 ? Math.max(a.top, b.top) - Math.min(a.bottom, b.bottom) : Infinity;
      const gap = Math.min(gapX, gapY);
      if (gap < minGap - 0.5 && gap > -minTap) {
        gaps.push(`${boxes[i].label} / ${boxes[j].label} зазор ${Math.round(gap)}`);
      }
    }
  }

  /* 3. Кегль: только листья с настоящим текстом. */
  const tiny = [];
  for (const el of document.querySelectorAll('*')) {
    if (el.children.length || hiddenScreen(el) || !visible(el)) continue;
    const text = (el.textContent || '').trim();
    if (!/[A-Za-zА-Яа-яЁё0-9]/.test(text)) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size < minFont - 0.01) tiny.push(`${label(el)} ${size.toFixed(0)}px`);
  }

  /* 4. Обрезанный текст: надпись шире своей коробки.

     Проверка раскладки по рамкам этого не видит — коробка на месте, а буквы
     из неё вылезли. И ловится это только на том языке, на котором гоняют:
     «Хардкор» обрезался на 3 px, Hardcore — на 22, Difícil — на 9, а прогон
     шёл по-русски. Намеренные усечения (ellipsis, line-clamp) исключены,
     порог 4 px — иначе хвостовой межбуквенный интервал даёт шум. */
  const clipped = [];
  for (const el of document.querySelectorAll('button, a, span, div, p, small, strong, h1, h2, h3, h4, li, td')) {
    if (el.children.length || hiddenScreen(el) || !visible(el)) continue;
    const text = (el.textContent || "").trim();
    if (!/[A-Za-zА-Яа-яЁё0-9]/.test(text)) continue;
    const style = getComputedStyle(el);
    if (style.textOverflow === 'ellipsis' || style.webkitLineClamp !== 'none') continue;
    if (/(auto|scroll)/.test(style.overflowX + style.overflowY)) continue;
    const overflowX = el.scrollWidth - el.clientWidth;
    const overflowY = el.scrollHeight - el.clientHeight;
    if (overflowX > 4 || overflowY > 4) {
      clipped.push(`${label(el)} ${overflowX > 4 ? "по ширине +" + overflowX : "по высоте +" + overflowY}px`);
    }
  }

  /* 5. За краем и докрутить нельзя. */
  const scrollableAncestor = el => {
    let node = el.parentElement;
    while (node && node !== document.body) {
      const style = getComputedStyle(node);
      if (/(auto|scroll)/.test(style.overflowY + style.overflowX)
        && (node.scrollHeight > node.clientHeight + 2 || node.scrollWidth > node.clientWidth + 2)) return node;
      node = node.parentElement;
    }
    return document.documentElement.scrollHeight > innerHeight + 2 ? document.documentElement : null;
  };
  const unreachable = boxes
    .filter(box => box.rect.right > innerWidth + 1 || box.rect.bottom > innerHeight + 1
      || box.rect.left < -1 || box.rect.top < -1)
    .filter(box => !scrollableAncestor(box.el))
    .map(box => `${box.label} [${Math.round(box.rect.left)},${Math.round(box.rect.top)},${Math.round(box.rect.right)},${Math.round(box.rect.bottom)}]`);

  const unique = list => [...new Set(list)];
  return {
    taps: boxes.length,
    small: unique(small),
    gaps: unique(gaps),
    tiny: unique(tiny),
    clipped: unique(clipped),
    unreachable: unique(unreachable)
  };
};

const server = createStaticServer(root);
await new Promise((done, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', done); });
const url = `http://127.0.0.1:${server.address().port}/index.html?seed=tap-audit`;

let browser;
try {
  browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--disable-gpu', '--no-first-run', '--no-default-browser-check']
  });

  for (const window of MATRIX) {
    const context = await browser.newContext({ viewport: { width: window.width, height: window.height }, locale });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => typeof startNewGame === 'function');
    const tag = `${window.name} ${window.width}x${window.height}`;

    if (window.states === 'gate') {
      const gate = await page.evaluate(() => {
        const el = document.getElementById('orientation-gate');
        if (!el) return { missing: true };
        const rect = el.getBoundingClientRect();
        return { shown: getComputedStyle(el).display !== 'none' && rect.height > 10 };
      });
      check(`${tag} показывает экран поворота`, gate.shown === true, JSON.stringify(gate));
      await context.close();
      continue;
    }

    const windowTap = window.height > 360 ? MIN_TAP : MIN_TAP_LOW;
    const states = window.states === 'all' ? UI_STATE_NAMES : CORE_STATES;
    for (const state of states) {
      let applied = false;
      try {
        applied = await applyUiState(page, state);
      } catch (error) {
        check(`${tag} ${state} собирается`, false, String(error.message).slice(0, 200));
        continue;
      }
      if (!applied) { check(`${tag} ${state} собирается`, false, 'состояние не построено'); continue; }
      const found = await page.evaluate(MEASURE, {
        minTap: windowTap, minGap: MIN_GAP, minFont: MIN_FONT, minSelect: MIN_SELECT, selectOnly: SELECT_ONLY
      });
      check(`${tag} ${state}: нажимаемое не мельче ${windowTap}px`, found.small.length === 0, found.small.join('; '));
      check(`${tag} ${state}: зазор не меньше ${MIN_GAP}px`, found.gaps.length === 0, found.gaps.slice(0, 8).join('; '));
      check(`${tag} ${state}: текст не мельче ${MIN_FONT}px`, found.tiny.length === 0, found.tiny.join('; '));
      check(`${tag} ${state}: текст не обрезан`, found.clipped.length === 0, found.clipped.slice(0, 8).join('; '));
      check(`${tag} ${state}: всё нажимаемое достижимо`, found.unreachable.length === 0, found.unreachable.join('; '));
    }
    await context.close();
  }
} catch (error) {
  failures.push(`Прогон размеров: ${error.stack || error.message}`);
} finally {
  if (browser) await browser.close();
  await new Promise(done => server.close(done));
}

if (REPORT_ONLY) {
  console.log(`\nНаходок: ${findings.length} (пороги MIN_TAP=${MIN_TAP} MIN_TAP_LOW=${MIN_TAP_LOW} MIN_GAP=${MIN_GAP} MIN_FONT=${MIN_FONT} MIN_SELECT=${MIN_SELECT})`);
  process.exit(0);
}
if (failures.length) {
  failures.forEach(line => console.error(`FAIL ${line}`));
  console.error(`\nFAIL всего ${failures.length} (MIN_TAP=${MIN_TAP} MIN_GAP=${MIN_GAP} MIN_FONT=${MIN_FONT})`);
  process.exit(1);
}
console.log(`Размеры под палец и кегль в порядке (MIN_TAP=${MIN_TAP} MIN_GAP=${MIN_GAP} MIN_FONT=${MIN_FONT}).`);
