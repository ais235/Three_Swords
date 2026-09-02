/**
 * Strip !important from one stylesheet, optionally keeping named properties.
 *
 * The analytic model of the cascade proved untrustworthy, so flags come off by
 * experiment instead: strip, run npm run css:check, and put back only the
 * properties the snapshot says moved. Two or three rounds converge, and every
 * round is verified rather than argued.
 *
 *   node scripts/css-strip-important.mjs styles/typography.css
 *   node scripts/css-strip-important.mjs styles/typography.css --keep=font-size,line-height
 */
import { readFileSync, writeFileSync } from 'node:fs';

const [target, ...rest] = process.argv.slice(2);
if (!target) {
  console.error('Укажите файл, например: node scripts/css-strip-important.mjs styles/typography.css');
  process.exit(1);
}
const keepArg = rest.find(arg => arg.startsWith('--keep='));
const keep = new Set((keepArg ? keepArg.slice('--keep='.length) : '').split(',').map(name => name.trim()).filter(Boolean));

const css = readFileSync(target, 'utf8');
let stripped = 0;
let kept = 0;
const out = css.replace(/([\w-]+)(\s*:\s*[^;{}]*?)\s*!important/g, (match, prop, value) => {
  if (keep.has(prop.trim().toLowerCase())) { kept += 1; return match; }
  stripped += 1;
  return `${prop}${value}`;
});
writeFileSync(target, out, 'utf8');
console.log(`${target}: снято ${stripped}, оставлено ${kept}${keep.size ? ` (${[...keep].join(', ')})` : ''}`);
