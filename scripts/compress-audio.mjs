/**
 * Звук в один формат и в разумный битрейт.
 *
 * Зачем. В архиве 81 МБ, из них 61 МБ — звук: музыка лежала в 256 кб/с, а
 * эффекты — несжатым 24-битным WAV по два мегабита. Для игры, которую открывают
 * в браузере, это не мелочь: на itch её скачивают целиком при загрузке страницы.
 *
 * Почему всё в MP3, а не в OGG. Вместе с WAV в наборе уже лежали девять .ogg, и
 * это тихая потеря звука на iOS: Safari не играет Vorbis. Один формат, который
 * понимают все браузеры, надёжнее двух, из которых один работает не везде.
 * Задержка кодека в начале эффекта (~25 мс) в пошаговой игре не слышна.
 *
 * Скрипт идемпотентен: второй прогон не находит ни WAV, ни OGG, а MP3 трогает
 * только те, что выше порога, — иначе каждый запуск пережимал бы уже пережатое,
 * и звук деградировал бы от прогона к прогону.
 *
 * Папка assets/audio/_extracted не трогается: это рабочий стол для подбора
 * звуков (экран ?sfx-audit=1), он не в git и в сборку не едет.
 *
 *   node scripts/compress-audio.mjs --dry    показать, что будет сделано
 *   node scripts/compress-audio.mjs          пережать и переписать ссылки
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { extname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const dry = process.argv.includes('--dry');

const MUSIC_KBPS = 112;   // фон, стерео: на слух неотличимо от 256 в браузере
const SFX_KBPS = 96;      // короткие эффекты, чаще моно
const REENCODE_ABOVE = 128; // ниже этого MP3 уже экономный, трогать нечего

const ffmpeg = (() => {
  try {
    return execFileSync('python', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'],
      { encoding: 'utf8' }).trim();
  } catch (_) {
    return 'ffmpeg';
  }
})();

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '_extracted') continue;
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path));
    else out.push(path);
  }
  return out;
}

/** Битрейт и число каналов из вывода ffmpeg: отдельного ffprobe в сборке нет. */
function probe(path) {
  // ffmpeg без выходного файла печатает сведения о потоке и выходит с ошибкой —
  // это его обычное поведение, а не сбой, поэтому читаем stderr из исключения.
  let text = '';
  try {
    text = execFileSync(ffmpeg, ['-hide_banner', '-i', path], { encoding: 'utf8', stdio: ['ignore', 'ignore', 'pipe'] });
  } catch (error) {
    text = String(error.stderr || '');
  }
  const line = text.split('\n').find(row => row.includes('Audio:')) || '';
  const kbps = Number((line.match(/(\d+)\s*kb\/s/) || [])[1] || 0);
  return { kbps, mono: /\bmono\b/.test(line) };
}

const files = walk(resolve(root, 'assets/audio')).filter(path => ['.wav', '.ogg', '.mp3'].includes(extname(path).toLowerCase()));
const renames = new Map();
let before = 0;
let after = 0;

for (const path of files) {
  const ext = extname(path).toLowerCase();
  const size = statSync(path).size;
  before += size;
  const { kbps, mono } = probe(path);
  const isMusic = /bgm_/i.test(path);
  const target = isMusic ? MUSIC_KBPS : SFX_KBPS;

  if (ext === '.mp3' && kbps <= Math.max(REENCODE_ABOVE, target)) { after += size; continue; }

  const outPath = ext === '.mp3' ? `${path}.tmp.mp3` : path.replace(/\.(wav|ogg)$/i, '.mp3');
  const rel = relative(root, path).replaceAll('\\', '/');
  if (dry) {
    console.log(`${ext === '.mp3' ? 'пережать' : 'перекодировать'}  ${rel}  ${(size / 1048576).toFixed(2)} МБ  ${kbps} кб/с`);
    after += Math.round(size * target / Math.max(kbps, target));
    continue;
  }
  execFileSync(ffmpeg, ['-y', '-loglevel', 'error', '-i', path,
    '-codec:a', 'libmp3lame', '-b:a', `${target}k`, ...(mono ? ['-ac', '1'] : []), outPath]);
  if (ext === '.mp3') {
    rmSync(path);
    renameSync(outPath, path);
    after += statSync(path).size;
  } else {
    rmSync(path);
    const newRel = relative(root, outPath).replaceAll('\\', '/');
    renames.set(rel, newRel);
    after += statSync(outPath).size;
  }
  console.log(`${rel} → ${(statSync(ext === '.mp3' ? path : outPath).size / 1048576).toFixed(2)} МБ`);
}

if (!dry && renames.size) {
  // Ссылки на звук лежат в исходниках таблицами путей. Пути внутри _extracted
  // не трогаем: там файлы остались как были.
  for (const name of readdirSync(resolve(root, 'src'))) {
    if (!name.endsWith('.js')) continue;
    const path = resolve(root, 'src', name);
    const source = readFileSync(path, 'utf8');
    // Полный путь в исходниках встречается не всегда: таблица эффектов задаёт
    // хвост пути ('common/death.wav'), а начало подставляет функция. Поэтому
    // после точных замен расширение меняется построчно — кроме строк с путями в
    // _extracted: там файлы остались в прежнем формате.
    let updated = source;
    for (const [from, to] of renames) updated = updated.split(from).join(to);
    updated = updated.split('\n')
      .map(line => (line.includes('_extracted') ? line : line.replace(/\.(wav|ogg)\b/g, '.mp3')))
      .join('\n');
    if (updated !== source) {
      writeFileSync(path, updated);
      console.log(`ссылки обновлены: src/${name}`);
    }
  }
}

console.log(`\nбыло ${(before / 1048576).toFixed(1)} МБ, стало ${(after / 1048576).toFixed(1)} МБ`);
if (dry) console.log('(прогон вхолостую: ничего не изменено)');
