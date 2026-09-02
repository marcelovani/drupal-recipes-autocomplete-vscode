/**
 * Checks the runtime discovery against the PHP extractor, on real core.
 *
 * The extension finds config actions by matching attributes in PHP rather than
 * parsing it. That is cheap and adds no dependency, but it is only defensible
 * while it agrees with scripts/extract-config-actions.php, which is the same
 * patterns applied by PHP itself. This runs both over a core checkout and
 * reports the difference.
 *
 * Usage, after npm run compile-tests:
 *   node scripts/cross-check-discovery.mjs /path/to/drupal-core src/base/core-config-actions.json
 *
 * Give it the same core commit the JSON was generated from, recorded in its
 * generatedFrom field. Comparing against a different version reports actions
 * that simply moved out of core, which is not a discovery failure.
 *
 * Expect no false positives, and misses only of deriver-produced names such as
 * create or placeBlockInDefaultTheme: a deriver decides those at runtime, so
 * they are folded into core-config-actions.json by hand instead.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { actionsInPhp } from '../out/base/config-action-discovery.js';

const root = process.argv[2];
const expected = new Set(JSON.parse(readFileSync(process.argv[3], 'utf8')).actions.map((a) => a.name));

const found = new Set();
let scanned = 0;

function walk(dir) {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    let st;
    try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) {
      if (entry === 'tests' || entry === 'node_modules' || entry === 'vendor') continue;
      walk(p);
    } else if (entry.endsWith('.php')) {
      const src = readFileSync(p, 'utf8');
      if (!src.includes('ConfigAction') && !src.includes('ActionMethod')) continue;
      scanned++;
      for (const a of actionsInPhp(src, 'core')) found.add(a.name);
    }
  }
}

walk(join(root, 'core'));

// entity_method is the deriver base and is never written in a recipe.
found.delete('entity_method');

const missed = [...expected].filter((n) => !found.has(n));
const extra = [...found].filter((n) => !expected.has(n));

console.log(`scanned ${scanned} php files with an attribute`);
console.log(`php extractor found ${expected.size}, typescript found ${found.size}`);
console.log(`\nmissed by typescript (${missed.length}):\n  ${missed.join('\n  ') || '(none)'}`);
console.log(`\nfound only by typescript (${extra.length}):\n  ${extra.join('\n  ') || '(none)'}`);
