import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const GAME_RUNTIME_SCRIPTS = Object.freeze([
  'src/game-core.js',
  'src/game-data.js',
  'src/game-state.js',
  'src/battle-system.js',
  'src/game-screens.js'
]);

export function gameRuntimeScriptPaths(root) {
  return GAME_RUNTIME_SCRIPTS.map(path => resolve(root, path));
}

export function loadGameRuntimeSource(root) {
  const indexPath = resolve(root, 'index.html');
  const scriptPaths = gameRuntimeScriptPaths(root);
  const missing = scriptPaths.filter(path => !existsSync(path));
  if (missing.length) throw new Error(`Missing runtime script(s): ${missing.join(', ')}`);
  return [readFileSync(indexPath, 'utf8'), ...scriptPaths.map(path => readFileSync(path, 'utf8'))].join('\n');
}
