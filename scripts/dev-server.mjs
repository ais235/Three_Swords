import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from './static-server.mjs';

// Первым аргументом можно отдать папку: так поднимается собранный архив
// (npm run dev:itch), а не исходники. Разница между ними — вырезанный тег SDK,
// и смотреть глазами надо именно то, что поедет на площадку.
const argument = process.argv[2];
const root = argument
  ? resolve(process.cwd(), argument)
  : resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.env.PORT) || 5173;
const server = createStaticServer(root);
server.listen(port, '127.0.0.1', () => {
  console.log(`Three Blades: http://127.0.0.1:${port}/index.html`);
});

