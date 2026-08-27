/**
 * Fails if the packaged extension would carry anything it should not.
 *
 * .vscodeignore is easy to get wrong: vsce keeps a file that matches no ignore
 * pattern OR matches any negation, so a broad negation silently overrides every
 * ignore in the file no matter where they sit. That is how the compiled tests
 * and every source map ended up in a published build once already.
 *
 * This asserts the properties that matter rather than an exact file list, so
 * adding a doc does not fail the build.
 */
import { listFiles } from '@vscode/vsce';

const FORBIDDEN = [
  { label: 'compiled tests', matches: (f) => f.startsWith('out/test/') },
  { label: 'source maps', matches: (f) => f.endsWith('.map') },
  { label: 'TypeScript sources', matches: (f) => f.endsWith('.ts') },
  { label: 'the src directory', matches: (f) => f.startsWith('src/') },
  { label: 'test fixtures', matches: (f) => f.includes('/fixtures/') },
  { label: 'node_modules', matches: (f) => f.startsWith('node_modules/') },
];

const REQUIRED = ['package.json', 'out/extension.js', 'README.md'];

const files = (await listFiles({ cwd: process.cwd() })).map((f) =>
  f.split('\\').join('/')
);

const problems = [];

for (const rule of FORBIDDEN) {
  const hits = files.filter(rule.matches);

  if (hits.length > 0) {
    problems.push(`Would package ${rule.label}:\n  ${hits.join('\n  ')}`);
  }
}

for (const required of REQUIRED) {
  if (!files.includes(required)) {
    problems.push(`Would not package ${required}, which the extension needs.`);
  }
}

if (problems.length > 0) {
  console.error(problems.join('\n\n'));
  console.error(`\nFull list (${files.length} files):\n  ${files.join('\n  ')}`);
  process.exit(1);
}

console.log(`Package contents look right (${files.length} files):`);
console.log(files.map((f) => `  ${f}`).join('\n'));
