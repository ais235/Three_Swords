/**
 * Build _ya_test.html — the copy of the game the Yandex checker is run against.
 *
 * The checker's runtime probes need a live SDK: without one it cannot tell
 * "never calls LoadingAPI.ready" from "could not observe the call", and half its
 * verdicts come back as "not checked". The published game gets its SDK from the
 * platform at /sdk.js, which is a 404 on a local server, so this build injects a
 * stub in its place.
 *
 * Generated rather than kept by hand: a second copy of index.html is a copy that
 * drifts, and a checker report about a stale page is worse than no report.
 *
 * The stub answers only the surface the game actually uses - grep for `ysdk.` in
 * src/ - and answers it the way the platform does: init resolves with an object,
 * LoadingAPI.ready returns a promise, ads call their callbacks asynchronously,
 * getPlayer returns something that can store and return data.
 *
 * This file must never reach the release archive; scripts/package-release.mjs
 * refuses to build if it sees the checker in a packaged page.
 *
 *   node scripts/make-test-build.mjs
 *   node ~/.claude/tools/yandex-games/check.mjs ./_ya_test.html
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const source = readFileSync(resolve(root, 'index.html'), 'utf8');

const PLATFORM_TAG = '<script src="/sdk.js"></script>';
if (!source.includes(PLATFORM_TAG)) {
  console.error('index.html больше не подключает /sdk.js — заглушку некуда ставить.');
  process.exit(1);
}

const stub = `  <!-- ЗАГЛУШКА SDK. Только для прогона чекера: платформа отдаёт настоящий
       /sdk.js, локально он отвечает 404, и без него половина проверок уходит
       в «не проверено». В релизную сборку этот файл не попадает. -->
  <script>
  (function () {
    const later = (fn, ms) => setTimeout(fn, ms);
    const store = {};
    window.YaGames = {
      init() {
        return Promise.resolve({
          environment: { i18n: { lang: 'ru' }, app: { id: 'test' } },
          features: {
            LoadingAPI: { ready: () => Promise.resolve() },
            GameplayAPI: { start() {}, stop() {} }
          },
          adv: {
            showFullscreenAdv({ callbacks } = {}) {
              later(() => callbacks?.onOpen?.(), 10);
              later(() => callbacks?.onClose?.(true), 60);
            },
            showRewardedVideo({ callbacks } = {}) {
              later(() => callbacks?.onOpen?.(), 10);
              later(() => callbacks?.onRewarded?.(), 40);
              later(() => callbacks?.onClose?.(), 60);
            }
          },
          getPlayer() {
            return Promise.resolve({
              getMode: () => 'lite',
              getName: () => 'Tester',
              setData: (data) => { Object.assign(store, data); return Promise.resolve(); },
              getData: (keys) => Promise.resolve(
                (keys || Object.keys(store)).reduce((acc, key) => (acc[key] = store[key], acc), {})
              ),
              setStats: () => Promise.resolve(),
              getStats: () => Promise.resolve({})
            });
          },
          // Имена методов — те же, что зовёт игра (src/game-state.js,
          // submitLeaderboards). Устаревшие имена здесь были бы двойной ложью:
          // чекер прочитал бы их со страницы и записал игре устаревший API,
          // которого в ней нет, а путь отправки рекордов не исполнился бы вовсе,
          // потому что игра проверяет наличие setScore.
          leaderboards: {
            setScore: () => Promise.resolve(),
            getPlayerEntry: () => Promise.reject(new Error('no entry')),
            getEntries: () => Promise.resolve({ entries: [] })
          }
        });
      }
    };
  })();
  </script>`;

const out = source.replace(PLATFORM_TAG, stub);
const target = resolve(root, '_ya_test.html');
writeFileSync(target, out, 'utf8');
console.log(`Тестовая сборка: ${target}`);
console.log('Проверить: node ~/.claude/tools/yandex-games/check.mjs ./_ya_test.html');
