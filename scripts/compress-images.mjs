/**
 * Картинки игры — в WebP.
 *
 * Зачем. После пережатия звука в архиве остаётся 20 МБ картинок, и это самая
 * крупная часть веб-сборки. Арт в игре не пиксельный в техническом смысле: в
 * спрайте 512×512 около семидесяти тысяч цветов, поэтому PNG сжимает его плохо,
 * а повторное сжатие без потерь не даёт ничего — проверено, выигрыш ноль.
 *
 * Почему WebP с потерями и почему 92. Замерено на спрайтах и фонах: поверх
 * игрового фона средняя разница с исходником — около одного уровня из 255, а
 * пикселей, отличающихся заметно (больше 12 из 255), — доли процента. Альфа
 * сохраняется бит в бит. Размер при этом падает в 3–12 раз. WebP понимают все
 * браузеры с 2020 года.
 *
 * Что конвертируется. Только то, что реально уезжает в архив: список берётся из
 * манифеста сборки, а не обходом папки assets. В assets лежат и черновики
 * генератора, и отладочные выгрузки — их незачем ни конвертировать, ни хранить
 * в двух форматах. Мелочь (меньше порога) остаётся PNG: выигрыш в килобайтах не
 * стоит возни со ссылками, а иконка вкладки должна оставаться PNG.
 *
 *   npm run package:release          сначала собрать — нужен манифест
 *   node scripts/compress-images.mjs --dry
 *   node scripts/compress-images.mjs
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dry = process.argv.includes('--dry');
const QUALITY = 92;
const MIN_BYTES = 40 * 1024;
// Иконка вкладки: некоторые браузеры до сих пор не берут favicon в WebP.
const KEEP_PNG = new Set(['assets/ui/emoji/sword.png']);

const manifestPath = resolve(root, 'dist/three-blades/runtime-assets.json');
if (!existsSync(manifestPath)) {
  console.error('Нет манифеста сборки. Сначала: npm run package:release');
  process.exit(1);
}

const ffmpeg = (() => {
  try {
    return execFileSync('python', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'],
      { encoding: 'utf8' }).trim();
  } catch (_) {
    return 'ffmpeg';
  }
})();

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const candidates = manifest.assets
  .filter(asset => asset.path.endsWith('.png') && asset.bytes >= MIN_BYTES && !KEEP_PNG.has(asset.path))
  .map(asset => asset.path)
  .filter(path => existsSync(resolve(root, path)));

let before = 0;
let after = 0;
const renames = new Map();

for (const relative of candidates) {
  const source = resolve(root, relative);
  const target = source.replace(/\.png$/i, '.webp');
  const size = statSync(source).size;
  before += size;
  if (dry) {
    console.log(`${relative}  ${(size / 1024).toFixed(0)} КБ`);
    after += Math.round(size / 4);
    continue;
  }
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', source,
    '-c:v', 'libwebp', '-quality', String(QUALITY), '-compression_level', '6', target]);
  const newSize = statSync(target).size;
  // Редкий случай: мелкая картинка с резкими краями в WebP может вырасти.
  if (newSize >= size) {
    rmSync(target);
    after += size;
    console.log(`пропущено (больше исходника): ${relative}`);
    continue;
  }
  rmSync(source);
  after += newSize;
  renames.set(relative, relative.replace(/\.png$/i, '.webp'));
  console.log(`${relative}  ${(size / 1024).toFixed(0)} → ${(newSize / 1024).toFixed(0)} КБ`);
}

if (!dry && renames.size) {
  const names = new Map([...renames].map(([from, to]) => [basename(from), basename(to)]));
  const targets = [
    ...readdirSync(resolve(root, 'src')).filter(name => name.endsWith('.js')).map(name => `src/${name}`),
    ...readdirSync(resolve(root, 'styles')).filter(name => name.endsWith('.css')).map(name => `styles/${name}`),
    'index.html'
  ];
  for (const relative of targets) {
    const path = resolve(root, relative);
    const source = readFileSync(path, 'utf8');
    let updated = source;
    // Сначала полные пути, затем имена файлов: таблицы иконок хранят хвост пути
    // ('weapons/iron_sword.png'), а не весь путь целиком.
    for (const [from, to] of renames) updated = updated.split(from).join(to);
    for (const [from, to] of names) updated = updated.split(from).join(to);
    if (updated !== source) {
      writeFileSync(path, updated);
      console.log(`ссылки обновлены: ${relative}`);
    }
  }
}

console.log(`\nбыло ${(before / 1048576).toFixed(1)} МБ, стало ${(after / 1048576).toFixed(1)} МБ`);
if (dry) console.log('(прогон вхолостую: оценка, ничего не изменено)');
