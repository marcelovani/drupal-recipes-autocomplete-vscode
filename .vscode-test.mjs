import { defineConfig } from '@vscode/test-cli';
import * as os from 'node:os';
import * as path from 'node:path';

// VS Code derives its IPC socket path from the user data directory, and a Unix
// domain socket path is capped at 103 characters. Keeping the default puts the
// socket inside the checkout, which overflows the cap in a deep working copy
// (a git worktree, for example) and the host fails to start.
const userDataDir = path.join(os.tmpdir(), 'vscode-test-drupal-recipes');

export default defineConfig({
  files: 'out/test/integration/**/*.test.js',
  workspaceFolder: './src/test/fixtures/drupal-site',
  // The extension declares redhat.vscode-yaml as an extension dependency and
  // will not activate without it.
  installExtensions: ['redhat.vscode-yaml'],
  launchArgs: [`--user-data-dir=${userDataDir}`],
  mocha: {
    timeout: 60000,
  },
});
