import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStaticServer } from './static-server.mjs';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const port = Number(process.env.PORT) || 5173;
const server = createStaticServer(root);
server.listen(port, '127.0.0.1', () => {
  console.log(`Three Blades: http://127.0.0.1:${port}/index.html`);
});

