import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createStaticServer } from './static-server.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const failures = [];
const pass = name => console.log(`PASS ${name}`);
const check = (name, condition, details = '') => {
  if (condition) pass(name);
  else failures.push(`${name}${details ? `: ${details}` : ''}`);
};

const server = createStaticServer(root);
await new Promise((resolveListen, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolveListen);
});
const address = server.address();
const url = `http://127.0.0.1:${address.port}/index.html?seed=readability-audit`;

let browser;
try {
  browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--disable-gpu', '--no-first-run', '--no-default-browser-check']
  });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'ru-RU' });
  const page = await context.newPage();

  const tinyText = async (selector, floor) => page.evaluate(({ selector, floor }) => {
    const rootEl = document.querySelector(selector);
    if (!rootEl) return [{ selector, missing: true }];
    return Array.from(rootEl.querySelectorAll('*')).filter(el => {
      const rect = el.getBoundingClientRect();
      const style = getComputedStyle(el);
      const text = (el.textContent || '').trim();
      const size = Number(style.fontSize.replace('px', ''));
      const hasReadableContent = /[A-Za-zА-Яа-яЁё0-9]/.test(text);
      const isLeaf = el.children.length === 0;
      const isVisible = rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      const ignoredDecoration = el.classList.contains('eq-mini-dot') || el.classList.contains('perk-skill-icon');
      return isLeaf && isVisible && hasReadableContent && !ignoredDecoration && size < floor;
    }).slice(0, 12).map(el => ({
      text: (el.textContent || '').trim().slice(0, 60),
      className: el.className,
      fontSize: getComputedStyle(el).fontSize
    }));
  }, { selector, floor });

  const auditScreen = async (name, selector, floor) => {
    const tiny = await tinyText(selector, floor);
    check(`${name} text is at least ${floor}px`, tiny.length === 0, JSON.stringify(tiny));
  };

  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await auditScreen('main menu', '#main-menu', 12);

  // A subset file's unicode-range advertises what it covers, and it can lie: the
  // latin subset of Press Start 2P claims U+2212 but ships no glyph for it, so the
  // minus in "−5 золота" was quietly drawn by the fallback and read as "_5" in the
  // middle of pixel text. Every glyph in this font is exactly one em wide, which
  // makes the fallback measurable: a claimed character that is not one em wide was
  // painted by some other face. Characters outside the declared ranges (emoji, the
  // ▶ ↩ ⚙ button icons) are expected to fall back and are not the subject here.
  const glyphGaps = await page.evaluate(async () => {
    await document.fonts.ready;
    const family = 'Press Start 2P';
    const ranges = [];
    for (const sheet of document.styleSheets) {
      let rules; try { rules = sheet.cssRules; } catch { continue; }
      for (const rule of rules) {
        if (rule.constructor.name !== 'CSSFontFaceRule') continue;
        if (!rule.style.fontFamily.includes(family)) continue;
        for (const part of (rule.style.unicodeRange || '').split(',')) {
          const match = part.trim().match(/^U\+([0-9A-F]+)(?:-([0-9A-F]+))?$/i);
          if (match) ranges.push([parseInt(match[1], 16), parseInt(match[2] || match[1], 16)]);
        }
      }
    }
    if (!ranges.length) return [{ error: 'нет @font-face для ' + family }];

    const measure = text => {
      const span = document.createElement('span');
      span.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font-size:100px;font-family:'${family}'`;
      span.textContent = text;
      document.body.appendChild(span);
      const width = span.getBoundingClientRect().width;
      span.remove();
      return width;
    };

    const chars = new Set();
    for (const el of document.querySelectorAll('#main-menu *')) {
      if (!getComputedStyle(el).fontFamily.includes(family)) continue;
      for (const node of el.childNodes) {
        if (node.nodeType === Node.TEXT_NODE) for (const ch of node.textContent) chars.add(ch);
      }
    }
    // Whitespace is not a glyph question: markup newlines and indentation collapse
    // to zero width in any face.
    const claimed = [...chars].filter(ch => {
      if (/\s/.test(ch) || ch.codePointAt(0) < 0x20) return false;
      const code = ch.codePointAt(0);
      return ranges.some(([from, to]) => code >= from && code <= to);
    });
    return claimed
      .filter(ch => Math.abs(measure(ch) - 100) > 1)
      .map(ch => ({ char: ch, code: 'U+' + ch.codePointAt(0).toString(16).toUpperCase(), advance: Math.round(measure(ch)) }));
  });
  check('menu display font has a glyph for every character it claims',
    glyphGaps.length === 0, JSON.stringify(glyphGaps));

  await page.locator('#btn-new-game').click();
  await page.locator('#battle-screen:not(.hidden)').waitFor({ state: 'visible' });
  await page.evaluate(() => {
    GameState.firstBattleCompleted = true;
    GameState.mapIntroShown = true;
    GameState.currentBattle = null;
    showScreen('map');
    renderMap();
  });
  await page.locator('#map-screen:not(.hidden)').waitFor({ state: 'visible' });

  await auditScreen('world map', '#map-screen', 12);

  await page.locator('#btn-map-bag').click();
  await auditScreen('inventory', '#inventory-screen', 12);
  await page.locator('#btn-inv-perks').click();
  await auditScreen('perk tree', '#perk-modal', 11);
  const perkSizes = await page.evaluate(() => ({
    names: Math.min(...Array.from(document.querySelectorAll('#perk-modal .perk-skill-name')).map(el => Number(getComputedStyle(el).fontSize.replace('px', '')))),
    summaries: Math.min(...Array.from(document.querySelectorAll('#perk-modal .perk-skill-summary')).map(el => Number(getComputedStyle(el).fontSize.replace('px', '')))),
    rules: Math.min(...Array.from(document.querySelectorAll('#perk-modal .perk-detail-rule strong')).map(el => Number(getComputedStyle(el).fontSize.replace('px', ''))))
  }));
  const perkNames = perkSizes.names;
  const perkSummaries = perkSizes.summaries;
  const perkRules = perkSizes.rules;
  check('perk names are at least 12px', perkNames >= 12, String(perkNames));
  check('perk summaries are at least 12px', perkSummaries >= 12, String(perkSummaries));
  check('perk explanations are at least 12px', perkRules >= 12, String(perkRules));
  await page.locator('#perk-modal-close').click();
  await page.locator('#btn-close-inv').click();

  await page.locator('#btn-map-bestiary').click();
  await auditScreen('bestiary', '#bestiary-screen', 12);
  await page.locator('#btn-bestiary-back').click();

  const cityRendered = await page.evaluate(() => {
    const city = GameState.mapGrid.find(node => node.type === 'city');
    if (!city) return false;
    showScreen('city');
    renderCityUI(city, false);
    return true;
  });
  check('city test fixture is available', cityRendered);
  if (cityRendered) {
    await auditScreen('city and shop', '#city-screen', 12);
    const duplicateSale = await page.evaluate(() => {
      const city = GameState.mapGrid.find(node => node.type === 'city');
      const alira = GameState.heroes.find(hero => hero.id === 'alira');
      GameState.inventory = ['hunter_bow', 'hunter_bow'];
      alira.equipment = { ...(alira.equipment || {}), weapon: 'hunter_bow' };
      GameState.cityTraderTab = 'sell';
      recalcHeroFromEquipment(alira);
      renderCityUI(city, false);
      renderCityTraderSellPanel(city, false);
      return {
        cards: document.querySelectorAll('#shop-sell-list .item-card').length,
        equipped: document.querySelectorAll('#shop-sell-list .city-sell-equipped').length
      };
    });
    check('duplicate gear exposes only the unequipped spare for sale', duplicateSale.cards === 1 && duplicateSale.equipped === 0, JSON.stringify(duplicateSale));
    await page.locator('#shop-sell-list .btn-sell').evaluate(button => button.click());
    await page.locator('#confirm-yes').click();
    await page.waitForTimeout(50);
    const duplicateSaleResult = await page.evaluate(() => {
      const alira = GameState.heroes.find(hero => hero.id === 'alira');
      return {
        copiesLeft: GameState.inventory.filter(id => id === 'hunter_bow').length,
        stillEquipped: alira.equipment?.weapon === 'hunter_bow',
        sellCardsLeft: document.querySelectorAll('#shop-sell-list .item-card').length
      };
    });
    check('selling one duplicate removes exactly one spare and keeps equipped gear', duplicateSaleResult.copiesLeft === 1 && duplicateSaleResult.stillEquipped && duplicateSaleResult.sellCardsLeft === 0, JSON.stringify(duplicateSaleResult));
  }
  await page.evaluate(() => {
    showScreen('map');
    renderMap();
  });

  await page.evaluate(() => {
    GameState._lastBattleKills = 3;
    GameState._lastBattleRounds = 2;
    const drop = itemById('steel_sword');
    const garet = GameState.heroes.find(hero => hero.id === 'garet');
    garet.equipment = { ...(garet.equipment || {}), weapon: null };
    recalcHeroFromEquipment(garet);
    GameState.inventory = ['steel_sword'];
    GameState._lastBattleDrop = drop;
    GameState._lastBattleDropHandled = false;
    GameState._lastBattleLabel = 'Проверка читаемости';
    showVictoryUI(32, 10);
  });
  await auditScreen('victory and rewards', '#victory-screen', 12);
  check('new victory loot highlights equip action',
    await page.locator('#btn-vic-inventory.vic-btn-inventory-loot').count() === 1);
  check('continue waits while victory loot is unresolved',
    await page.locator('#btn-vic-continue.vic-btn-continue-ready').count() === 0);
  await page.locator('#btn-vic-inventory').click();
  await page.locator('.inv-item-card[data-idx="0"]').click();
  await page.locator('#inv-equip-btn').click();
  await page.locator('#btn-close-inv').click();
  check('equipped victory loot stops bag highlight',
    await page.locator('#btn-vic-inventory.vic-btn-inventory-loot').count() === 0);
  check('equipped victory loot highlights continue',
    await page.locator('#btn-vic-continue.vic-btn-continue-ready').count() === 1);
  await page.evaluate(() => {
    showScreen('map');
    renderMap();
  });

  const adjacent = page.locator('.map-node.map-option').first();
  await adjacent.click();
  await adjacent.click();
  await page.locator('#btn-start-battle').waitFor({ state: 'visible' });
  await auditScreen('desktop battle deployment', '#battle-screen', 12);
  await page.locator('#btn-battle-briefing-continue').click();
  await page.locator('#btn-start-battle').click();
  await auditScreen('desktop combat HUD', '#battle-screen', 12);

  await page.setViewportSize({ width: 812, height: 375 });
  await page.waitForTimeout(100);
  await auditScreen('mobile landscape combat', '#battle-screen', 10);
  const mobileLayout = await page.evaluate(() => ({
    viewportWidth: innerWidth,
    bodyWidth: document.body.scrollWidth,
    viewportHeight: innerHeight,
    bodyHeight: document.body.scrollHeight
  }));
  check('mobile landscape has no horizontal overflow', mobileLayout.bodyWidth <= mobileLayout.viewportWidth, JSON.stringify(mobileLayout));

  await context.close();
} catch (error) {
  failures.push(`readability execution: ${error.stack || error.message}`);
} finally {
  if (browser) await browser.close();
  await new Promise(resolveClose => server.close(resolveClose));
}

if (failures.length) {
  failures.forEach(failure => console.error(`FAIL ${failure}`));
  process.exit(1);
}

console.log('Readability audit passed.');
