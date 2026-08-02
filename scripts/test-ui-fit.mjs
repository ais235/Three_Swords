import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { createStaticServer } from './static-server.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const failures = [];
const check = (name, ok, details = '') => {
  if (ok) console.log(`PASS ${name}`);
  else failures.push(`${name}${details ? `: ${details}` : ''}`);
};

const server = createStaticServer(root);
await new Promise((done, fail) => {
  server.once('error', fail);
  server.listen(0, '127.0.0.1', done);
});
const url = `http://127.0.0.1:${server.address().port}/index.html?seed=ui-fit-audit`;

let browser;
try {
  browser = await chromium.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--disable-gpu', '--no-first-run', '--no-default-browser-check']
  });

  for (const viewport of [{ name: 'desktop', width: 1440, height: 900 }, { name: 'mobile', width: 812, height: 375 }]) {
    const context = await browser.newContext({ viewport, locale: 'ru-RU' });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: 'domcontentloaded' });

    const audit = async (label, selector) => {
      const result = await page.evaluate(({ selector }) => {
        const rootEl = document.querySelector(selector);
        if (!rootEl) return { missing: true };
        const rr = rootEl.getBoundingClientRect();
        const viewportOverflow = rr.left < -1 || rr.top < -1 || rr.right > innerWidth + 1 || rr.bottom > innerHeight + 1;
        const bad = Array.from(rootEl.querySelectorAll('button, [role="button"], p, small, strong, h1, h2, h3, h4, .btn, [class*="title"], [class*="text"], [class*="desc"], [class*="label"]'))
          .filter(el => {
            const r = el.getBoundingClientRect();
            const s = getComputedStyle(el);
            const text = (el.textContent || '').trim();
            if (!text || r.width <= 0 || r.height <= 0 || s.display === 'none' || s.visibility === 'hidden') return false;
            const clipped = el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2;
            const outsideBounds = r.left < rr.left - 1 || r.top < rr.top - 1 || r.right > rr.right + 1 || r.bottom > rr.bottom + 1;
            let parent = el.parentElement;
            let insideScroller = false;
            while (parent && parent !== rootEl) {
              const ps = getComputedStyle(parent);
              if (/(auto|scroll)/.test(ps.overflowY + ps.overflowX)) { insideScroller = true; break; }
              parent = parent.parentElement;
            }
            const outside = outsideBounds && !insideScroller;
            return clipped || outside;
          })
          .slice(0, 16)
          .map(el => {
            const r = el.getBoundingClientRect();
            return ({
            text: (el.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 80),
            className: String(el.className).slice(0, 80),
            client: [el.clientWidth, el.clientHeight],
            scroll: [el.scrollWidth, el.scrollHeight],
            rect: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)],
            clipped: el.scrollWidth > el.clientWidth + 2 || el.scrollHeight > el.clientHeight + 2
          });
          });
        return { viewportOverflow, bad, root: [Math.round(rr.x), Math.round(rr.y), Math.round(rr.width), Math.round(rr.height)] };
      }, { selector });
      check(`${viewport.name} ${label} stays inside viewport`, !result.missing && !result.viewportOverflow, JSON.stringify(result));
      check(`${viewport.name} ${label} has no clipped controls or text`, !result.missing && result.bad.length === 0, JSON.stringify(result.bad));
    };

    await audit('main menu', '#main-menu');
    await page.locator('#btn-menu-settings').click();
    await audit('settings', '#menu-settings-overlay');
    await page.locator('#btn-menu-settings-back').click();

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
    await audit('map', '#map-screen');

    await page.locator('#btn-map-bag').click();
    await page.evaluate(() => {
      if (!GameState.inventory.length) {
        GameState.inventory.push('luck_amulet');
        renderInventoryScreen();
      }
    });
    await audit('inventory', '#inventory-screen');
    const inventoryItems = page.locator('#bag-grid .inv-item-card');
    const inventoryItemCount = await inventoryItems.count();
    if (inventoryItemCount) {
      await inventoryItems.first().click();
      const inventoryAction = await page.locator('#inv-detail .item-detail-btns').evaluate(el => {
        const rect = el.getBoundingClientRect();
        const panel = el.closest('#inv-detail').getBoundingClientRect();
        return rect.top >= panel.top - 1 && rect.bottom <= panel.bottom + 1 && rect.bottom <= innerHeight + 1;
      });
      check(`${viewport.name} inventory actions are visible without scrolling`, inventoryAction);
      check(`${viewport.name} inventory comparison is hidden`, await page.locator('#inv-detail .item-compare').count() === 0);
      check(`${viewport.name} inventory detail does not duplicate item art`, await page.locator('#inv-detail .item-icon-wrap').count() === 0);
    }
    await page.locator('#btn-inv-perks').click();
    await audit('perk modal', '#perk-modal');
    await page.locator('#perk-tree-ui .perk-skill').first().click();
    const perkAction = await page.locator('#perk-detail-panel .perk-detail-action').evaluate(el => {
      const rect = el.getBoundingClientRect();
      const panel = el.closest('#perk-detail-panel').getBoundingClientRect();
      return {
        visible: rect.top >= panel.top - 1 && rect.bottom <= panel.bottom + 1 && rect.bottom <= innerHeight + 1,
        rect: [Math.round(rect.left), Math.round(rect.top), Math.round(rect.right), Math.round(rect.bottom)],
        viewportHeight: innerHeight
      };
    });
    check(`${viewport.name} perk action is visible without scrolling`, perkAction.visible, JSON.stringify(perkAction));
    await page.locator('#perk-modal-close').click();
    await page.locator('#btn-close-inv').click();

    await page.locator('#btn-map-bestiary').click();
    await audit('bestiary', '#bestiary-screen');
    await page.locator('#btn-bestiary-back').click();

    await page.evaluate(() => {
      const city = GameState.mapGrid.find(node => node.type === 'city');
      GameState.activeCityNode = city.id;
      GameState._cityStrangerOnly = false;
      showScreen('city');
      renderCityUI(city, false);
    });
    await audit('city', '#city-screen');
    await page.locator('#btn-city-bag').click();
    await page.locator('#inventory-screen:not(.hidden)').waitFor({ state: 'visible' });
    const inventoryOpenedFromCity = await page.evaluate(() => ({
      inventoryVisible: !document.getElementById('inventory-screen').classList.contains('hidden'),
      returnFlag: GameState._returnToCity
    }));
    check(`${viewport.name} city opens inventory with return target`, inventoryOpenedFromCity.inventoryVisible && inventoryOpenedFromCity.returnFlag === true, JSON.stringify(inventoryOpenedFromCity));
    await page.locator('#btn-close-inv').click();
    await page.locator('#city-screen:not(.hidden)').waitFor({ state: 'visible' });
    const returnedToCity = await page.evaluate(() => ({
      cityVisible: !document.getElementById('city-screen').classList.contains('hidden'),
      returnFlagCleared: GameState._returnToCity === false
    }));
    check(`${viewport.name} inventory returns to city`, returnedToCity.cityVisible && returnedToCity.returnFlagCleared, JSON.stringify(returnedToCity));

    await page.evaluate(() => {
      GameState._lastBattleKills = 12;
      GameState._lastBattleRounds = 8;
      GameState._lastBattleDrop = itemById('steel_sword');
      GameState._lastBattleLabel = 'Испытание длинного названия награды';
      showVictoryUI(123, 25);
    });
    await audit('victory', '#victory-screen');

    await page.evaluate(() => { showScreen('gameover'); });
    await audit('game over', '#gameover-screen');
    await page.evaluate(() => { showScreen('ending'); if (typeof renderEndingSummary === 'function') renderEndingSummary(); });
    await audit('ending', '#ending-screen');

    await page.evaluate(() => showEventModal(
      'Путники нашли древнее святилище с длинной надписью, предупреждающей о последствиях каждого решения.',
      'treasure',
      null,
      [
        { label: 'Исследовать осторожно', detail: 'Получить награду, но потратить часть припасов.' },
        { label: 'Забрать сокровище', detail: 'Большая награда с риском внезапной засады.' },
        { label: 'Пройти мимо', detail: 'Ничего не получить и сохранить безопасность отряда.' }
      ]
    ));
    await audit('event choices', '#event-screen');

    await page.evaluate(() => { showScreen('map'); renderMap(); void showOnboarding({ manual: true }); });
    await audit('onboarding', '#onboarding-modal');
    await page.locator('#onboarding-skip').click();

    await page.evaluate(() => { void showStoryScene('region1'); });
    await page.locator('#story-modal:not(.hidden)').waitFor({ state: 'visible' });
    await audit('story dialogue', '#story-modal');
    for (let storyLine = 0; storyLine < 3; storyLine++) await page.locator('#story-next').click();

    await page.evaluate(() => void showGameAlert('Очень длинное системное сообщение должно полностью помещаться в диалоге и переноситься на новые строки без обрезания.'));
    await audit('alert dialog', '#game-alert-modal');
    await page.locator('#game-alert-ok').click();

    await page.evaluate(() => void showGameConfirm('Подтвердить действие с длинным пояснением возможных последствий для всего отряда?'));
    await audit('confirm dialog', '#confirm-modal');
    await page.locator('#confirm-no').click();

    await page.evaluate(() => void showGamePickOne('Выберите героя, которому подходит найденное снаряжение', [
      { value: 'garet', label: 'Гарет — воин передней линии' },
      { value: 'alira', label: 'Алира — стрелок дальнего боя' },
      { value: 'seris', label: 'Сэрис — маг поддержки' }
    ]));
    await audit('choice dialog', '#game-prompt-modal');
    await page.locator('#game-prompt-cancel').click();

    await page.evaluate(() => void showSkillUnlockPopup('garet', {
      icon: '🛡', name: 'Несокрушимая линия',
      desc: 'Гарет защищает союзников и получает дополнительную броню до начала следующего хода.', cd: 3
    }));
    await audit('skill unlock', '#skill-unlock-modal');
    await page.locator('#btn-skill-unlock-ok').click();

    await page.evaluate(() => { showScreen('map'); renderMap(); });
    await page.evaluate(() => startBattleForCell(getCurrentCell(), { skipDeploy: false }));
    await page.locator('#btn-start-battle').waitFor({ state: 'visible' });
    await audit('battle deployment', '#battle-screen');
    await page.locator('#btn-battle-briefing-continue').click();
    await page.locator('#btn-start-battle').click();
    await audit('battle combat', '#battle-screen');
    await page.locator('#btn-open-menu').click();
    await audit('pause menu', '#game-menu-overlay');

    await context.close();
  }
} catch (error) {
  failures.push(`UI fit execution: ${error.stack || error.message}`);
} finally {
  if (browser) await browser.close();
  await new Promise(done => server.close(done));
}

if (failures.length) {
  failures.forEach(failure => console.error(`FAIL ${failure}`));
  process.exit(1);
}
console.log('UI fit audit passed.');
