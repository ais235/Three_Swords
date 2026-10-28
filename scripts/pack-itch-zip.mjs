/**
 * Собрать zip для itch.io: `npm run zip:itch`.
 *
 * Зачем свой упаковщик. `Compress-Archive` в Windows PowerShell пишет имена
 * записей с обратными слэшами (`styles\layout.css`). Спецификация zip требует
 * прямых, и распаковщик itch берёт такое имя буквально: на сервере появляется
 * один файл со странным именем вместо папки. Снаружи это выглядит так, что
 * игра запускается, но без единого стиля и ассета — index.html лежит в корне и
 * отдаётся, а всё из подпапок даёт 404. Проверено вживую 28.10.2026: первая
 * залитая сборка открылась голой разметкой.
 *
 * Поэтому архив собирается здесь: прямые слэши гарантированы, и упаковщик сам
 * проверяет готовый файл — есть ли index.html в корне и нет ли обратных слэшей
 * хоть в одном имени.
 *
 * Формат — минимальный zip: локальный заголовок на запись, центральный
 * каталог, концевая запись. Сжатие deflate из zlib. Папки отдельными записями
 * не нужны: распаковщики создают их по путям файлов.
 */
import { createHash } from 'node:crypto';
import { deflateRawSync } from 'node:zlib';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { posix, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const sourceDir = resolve(root, process.argv[2] || 'dist/three-blades-itch');
const target = resolve(root, process.argv[3] || 'dist/three-blades-itch.zip');

/** Таблица CRC-32 — её требует формат, своей в zlib нет. */
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c;
  }
  return table;
})();

function crc32(buffer) {
  let c = -1;
  for (let i = 0; i < buffer.length; i++) c = CRC_TABLE[(c ^ buffer[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function walk(dir, prefix = '') {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    const full = resolve(dir, name);
    const relative = prefix ? posix.join(prefix, name) : name;
    if (statSync(full).isDirectory()) out.push(...walk(full, relative));
    else out.push({ full, name: relative });
  }
  return out;
}

const files = walk(sourceDir);
if (!files.length) throw new Error(`В ${sourceDir} нет файлов`);
if (!files.some(f => f.name === 'index.html')) {
  throw new Error('В корне сборки нет index.html — itch не найдёт точку входа');
}

/* Время в архиве фиксировано: иначе один и тот же набор файлов даёт разные
   байты при каждой упаковке, и нельзя сказать, менялась ли сборка. */
const DOS_TIME = 0;
const DOS_DATE = 33; /* 1 января 1980 года, самая ранняя дата формата */

const locals = [];
const central = [];
let offset = 0;

for (const file of files) {
  const data = readFileSync(file.full);
  const nameBytes = Buffer.from(file.name, 'utf8');
  if (nameBytes.includes(0x5C)) throw new Error(`Обратный слэш в имени: ${file.name}`);

  const compressed = deflateRawSync(data, { level: 9 });
  /* Если сжатие не выиграло, кладём как есть: так делают все упаковщики. */
  const useStore = compressed.length >= data.length;
  const payload = useStore ? data : compressed;
  const method = useStore ? 0 : 8;
  const crc = crc32(data);

  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034B50, 0);
  local.writeUInt16LE(20, 4);           /* версия для распаковки */
  local.writeUInt16LE(0x0800, 6);       /* имена в UTF-8 */
  local.writeUInt16LE(method, 8);
  local.writeUInt16LE(DOS_TIME, 10);
  local.writeUInt16LE(DOS_DATE, 12);
  local.writeUInt32LE(crc, 14);
  local.writeUInt32LE(payload.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nameBytes.length, 26);
  local.writeUInt16LE(0, 28);
  locals.push(local, nameBytes, payload);

  const dir = Buffer.alloc(46);
  dir.writeUInt32LE(0x02014B50, 0);
  dir.writeUInt16LE(20, 4);
  dir.writeUInt16LE(20, 6);
  dir.writeUInt16LE(0x0800, 8);
  dir.writeUInt16LE(method, 10);
  dir.writeUInt16LE(DOS_TIME, 12);
  dir.writeUInt16LE(DOS_DATE, 14);
  dir.writeUInt32LE(crc, 16);
  dir.writeUInt32LE(payload.length, 20);
  dir.writeUInt32LE(data.length, 24);
  dir.writeUInt16LE(nameBytes.length, 28);
  dir.writeUInt16LE(0, 30);
  dir.writeUInt16LE(0, 32);
  dir.writeUInt16LE(0, 34);
  dir.writeUInt16LE(0, 36);
  dir.writeUInt32LE(0, 38);
  dir.writeUInt32LE(offset, 42);
  central.push(dir, nameBytes);

  offset += local.length + nameBytes.length + payload.length;
}

const centralBuffer = Buffer.concat(central);
const end = Buffer.alloc(22);
end.writeUInt32LE(0x06054B50, 0);
end.writeUInt16LE(files.length, 8);
end.writeUInt16LE(files.length, 10);
end.writeUInt32LE(centralBuffer.length, 12);
end.writeUInt32LE(offset, 16);

const zip = Buffer.concat([...locals, centralBuffer, end]);
writeFileSync(target, zip);

/* Проверка готового файла, а не намерения: читаем центральный каталог обратно
   и смотрим на имена глазами распаковщика. */
const check = readFileSync(target);
const names = [];
let cursor = check.length - 22;
while (cursor >= 0 && check.readUInt32LE(cursor) !== 0x06054B50) cursor--;
if (cursor < 0) throw new Error('В собранном архиве нет концевой записи');
let dirOffset = check.readUInt32LE(cursor + 16);
const count = check.readUInt16LE(cursor + 10);
for (let i = 0; i < count; i++) {
  if (check.readUInt32LE(dirOffset) !== 0x02014B50) throw new Error('Повреждён центральный каталог');
  const nameLength = check.readUInt16LE(dirOffset + 28);
  const extraLength = check.readUInt16LE(dirOffset + 30);
  const commentLength = check.readUInt16LE(dirOffset + 32);
  names.push(check.toString('utf8', dirOffset + 46, dirOffset + 46 + nameLength));
  dirOffset += 46 + nameLength + extraLength + commentLength;
}

const problems = [];
if (names.length !== files.length) problems.push(`записей ${names.length}, файлов ${files.length}`);
if (!names.includes('index.html')) problems.push('index.html не в корне архива');
const slashed = names.filter(n => n.includes('\\'));
if (slashed.length) problems.push(`обратные слэши: ${slashed.slice(0, 3).join(', ')}`);
const nested = names.filter(n => n.startsWith('three-blades'));
if (nested.length) problems.push(`сборка завёрнута в лишнюю папку: ${nested[0]}`);

if (problems.length) {
  problems.forEach(line => console.error(`FAIL ${line}`));
  process.exit(1);
}

const digest = createHash('sha256').update(zip).digest('hex').slice(0, 12);
console.log(`${target}`);
console.log(`${names.length} файлов, ${(zip.length / 1048576).toFixed(1)} МБ, sha256 ${digest}`);
console.log('index.html в корне, все имена с прямыми слэшами.');
