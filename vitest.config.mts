import { defineConfig } from 'vitest/config';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      // `vscode` is injected by the extension host and cannot be resolved from
      // a plain Node process. See src/test/unit/vscode-stub.ts.
      vscode: path.resolve(fileURLToPath(new URL('.', import.meta.url)), 'src/test/unit/vscode-stub.ts'),
    },
  },
  test: {
    include: ['src/test/unit/**/*.test.ts'],
    environment: 'node',
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/test/**', 'src/types.d.ts'],
    },
  },
});
