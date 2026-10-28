/**
 * Матрица окон на всех трёх языках.
 *
 * Язык — параметр прогона, а не свойство сохранения: у английских и испанских
 * строк другая длина, и дефекты у них свои. Прогон только по-русски пропустил
 * «Hardcore», обрезанный на 22 px, и перки, печатавшиеся поверх соседней
 * плитки. В npm test входит один язык ради времени; этот прогон обязателен
 * перед сборкой, которая уходит наружу.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const script = resolve(root, 'scripts/test-tap-targets.mjs');
let failed = 0;
for (const lang of ['ru', 'en', 'es']) {
  console.log(`\n=== Матрица окон, язык ${lang} ===`);
  const run = spawnSync(process.execPath, [script], {
    stdio: 'inherit',
    env: { ...process.env, QA_LANG: lang }
  });
  if (run.status !== 0) failed++;
}
if (failed) {
  console.error(`\nFAIL языков с находками: ${failed}`);
  process.exit(1);
}
console.log('\nМатрица окон чиста на ru, en и es.');
