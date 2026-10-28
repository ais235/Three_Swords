/**
 * Собрать фоновую музыку игры: `npm run music`.
 *
 * Семь треков считаются из партитур в `scripts/music/tracks.mjs` и кладутся
 * поверх `assets/audio/.../bgm_*.mp3`. Генератор детерминированный: один и тот
 * же исходник даёт один и тот же звук, поэтому музыку можно править как код —
 * поменял гармонию, пересобрал, послушал.
 *
 * Почему вообще своя музыка. У прежних семи треков происхождение не было
 * записано нигде: ни в коммите, которым их добавили, ни в документах, ни в
 * метаданных файлов. Выпускать 17 МБ звука неизвестной лицензии — риск, не
 * видимый до претензии. Теперь автор музыки — сам проект.
 *
 * Флаги:
 *   --wav     оставить несжатые WAV рядом с mp3 (для разбора)
 *   --only=N  собрать один трек по номеру из списка
 */
import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SR, toWav } from './music/engine.mjs';
import { TRACKS, renderTrack } from './music/tracks.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const keepWav = process.argv.includes('--wav');
const onlyArg = process.argv.find(arg => arg.startsWith('--only='));
const only = onlyArg ? Number(onlyArg.slice('--only='.length)) : null;

/* Битрейт. Синтезированная музыка — это чистые тоны без шума записи, и она
 * держит низкий битрейт заметно лучше живой. 96 кбит/с стерео: на фоне игры
 * неотличимо от 192, а вес сборки падает вдвое относительно прежних треков. */
const KBPS = 96;

const ffmpeg = (() => {
  try {
    return execFileSync('python', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())'],
      { encoding: 'utf8' }).trim();
  } catch {
    return 'ffmpeg';
  }
})();

/** Замеры готового буфера: тишина и перегруз видны числом, а не на слух. */
function measure(buffer) {
  let peak = 0;
  let energy = 0;
  let silentFrames = 0;
  const frames = buffer.length / 2;
  for (let i = 0; i < frames; i++) {
    const left = buffer[i * 2];
    const right = buffer[i * 2 + 1];
    const value = Math.max(Math.abs(left), Math.abs(right));
    peak = Math.max(peak, value);
    energy += (left * left + right * right) / 2;
    if (value < 0.001) silentFrames++;
  }
  const rms = Math.sqrt(energy / frames);
  return {
    seconds: frames / SR,
    peak,
    rms,
    rmsDb: 20 * Math.log10(rms || 1e-9),
    silentShare: silentFrames / frames
  };
}

const problems = [];
let totalBytes = 0;

TRACKS.forEach((track, index) => {
  if (only !== null && only !== index + 1) return;

  const started = Date.now();
  const buffer = renderTrack(track);
  const stats = measure(buffer);

  const target = resolve(root, track.file);
  mkdirSync(dirname(target), { recursive: true });
  const wavPath = target.replace(/\.mp3$/i, '.wav');
  writeFileSync(wavPath, toWav(buffer));

  execFileSync(ffmpeg, [
    '-y', '-loglevel', 'error',
    '-i', wavPath,
    '-codec:a', 'libmp3lame',
    '-b:a', `${KBPS}k`,
    '-joint_stereo', '1',
    target
  ]);
  if (!keepWav) rmSync(wavPath, { force: true });

  const bytes = statSync(target).size;
  totalBytes += bytes;

  /* Пороги — не вкусовщина, а признаки сломанного рендера: трек, который
     вышел тише -30 дБ, на фоне игры не слышен вовсе, а доля тишины больше
     четверти означает, что часть партитуры не сыграла. */
  if (stats.rmsDb < -30) problems.push(`${track.file}: слишком тихо, RMS ${stats.rmsDb.toFixed(1)} дБ`);
  if (stats.peak > 0.995) problems.push(`${track.file}: перегруз, пик ${stats.peak.toFixed(3)}`);
  if (stats.silentShare > 0.25) problems.push(`${track.file}: тишина на ${(stats.silentShare * 100).toFixed(0)}% длины`);
  if (stats.seconds < 45) problems.push(`${track.file}: короче 45 с (${stats.seconds.toFixed(0)} с)`);

  console.log(
    `${String(index + 1).padStart(2)}. ${track.title.padEnd(22)} ` +
    `${stats.seconds.toFixed(0).padStart(3)} с  ` +
    `${(bytes / 1048576).toFixed(2)} МБ  ` +
    `пик ${stats.peak.toFixed(2)}  RMS ${stats.rmsDb.toFixed(1)} дБ  ` +
    `${((Date.now() - started) / 1000).toFixed(1)} с счёта`
  );
});

console.log(`\nВсего ${(totalBytes / 1048576).toFixed(1)} МБ при ${KBPS} кбит/с.`);

if (problems.length) {
  problems.forEach(line => console.error(`FAIL ${line}`));
  process.exit(1);
}
console.log('Музыка собрана.');
