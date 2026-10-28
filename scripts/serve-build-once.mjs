/**
 * Отдать архив сборки один раз и погаснуть.
 *
 * Зачем. Загрузить 16.6 МБ в itch прямой подстановкой файла нельзя: у
 * инструмента браузера предел 10 МБ на вызов. Но страница itch может забрать
 * архив сама — с локального сервера на этой же машине, — и дальше отправить
 * его своим обычным загрузчиком. Файл не покидает машину по чужому маршруту:
 * диск -> localhost -> вкладка пользователя -> его аккаунт.
 *
 * Сервер одноразовый и сам себя гасит: после первой полной отдачи файла и
 * короткой паузы, либо по общему таймауту. Процесса, который переживёт
 * проверку, не остаётся — за это уже платили десятью часами живого
 * dev-сервера в другом проекте.
 *
 * Запуск: node scripts/serve-build-once.mjs [путь-к-файлу] [порт]
 */
import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const file = resolve(root, process.argv[2] || 'dist/three-blades-itch.zip');
const port = Number(process.argv[3]) || 8777;
const LIFETIME_MS = 180000;

const size = statSync(file).size;
const name = basename(file);

const server = createServer((req, res) => {
  /* Страница itch открыта по https, запрос идёт в локальную сеть: браузер
     сначала шлёт предварительный запрос и ждёт разрешения и на источник, и
     на выход в приватную сеть. */
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Access-Control-Allow-Private-Network': 'true',
    'Access-Control-Max-Age': '60'
  };
  if (req.method === 'OPTIONS') {
    res.writeHead(204, headers);
    res.end();
    return;
  }
  res.writeHead(200, {
    ...headers,
    'Content-Type': 'application/zip',
    'Content-Length': String(size),
    'Content-Disposition': `attachment; filename="${name}"`
  });
  const stream = createReadStream(file);
  stream.pipe(res);
  res.on('finish', () => {
    console.log(`отдано ${name}, ${(size / 1048576).toFixed(1)} МБ — гашу сервер`);
    setTimeout(() => shutdown(0), 1500);
  });
});

function shutdown(code) {
  server.close(() => process.exit(code));
  /* Если соединение зависло, не ждём его вечно. */
  setTimeout(() => process.exit(code), 2000).unref();
}

server.listen(port, '127.0.0.1', () => {
  console.log(`http://127.0.0.1:${port}/${name} — ${(size / 1048576).toFixed(1)} МБ, живёт до ${LIFETIME_MS / 1000} с`);
});

setTimeout(() => {
  console.log('время вышло, сервер не понадобился — гашу');
  shutdown(0);
}, LIFETIME_MS);
