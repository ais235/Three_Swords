import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const GAME_RUNTIME_SCRIPTS = Object.freeze([
  'src/game-core.js',
  'src/game-data.js',
  'src/game-state.js',
  'src/campaign-expansion.js',
  'src/battle-system.js',
  'src/game-screens.js'
]);

export function gameRuntimeScriptPaths(root) {
  return GAME_RUNTIME_SCRIPTS.map(path => resolve(root, path));
}

/** Stylesheets index.html actually links, in cascade order. The presentation
 *  used to live in one inline <style> block, so audits could read it straight
 *  out of index.html; it now ships as files and must be loaded the same way. */
export function gameRuntimeStylePaths(root) {
  const markup = readFileSync(resolve(root, 'index.html'), 'utf8');
  return [...markup.matchAll(/<link\s+rel="stylesheet"\s+href="([^"]+)"/g)]
    .map(match => resolve(root, match[1]));
}

export function loadGameRuntimeSource(root) {
  const indexPath = resolve(root, 'index.html');
  const scriptPaths = gameRuntimeScriptPaths(root);
  const missing = scriptPaths.filter(path => !existsSync(path));
  if (missing.length) throw new Error(`Missing runtime script(s): ${missing.join(', ')}`);
  const stylePaths = gameRuntimeStylePaths(root);
  const missingStyles = stylePaths.filter(path => !existsSync(path));
  if (missingStyles.length) throw new Error(`Missing runtime stylesheet(s): ${missingStyles.join(', ')}`);
  return [
    readFileSync(indexPath, 'utf8'),
    ...stylePaths.map(path => readFileSync(path, 'utf8')),
    ...scriptPaths.map(path => readFileSync(path, 'utf8'))
  ].join('\n');
}
