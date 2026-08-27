/**
 * Stand-in for the `vscode` module, which only exists inside a running
 * extension host.
 *
 * The unit suite exercises logic that does not call into the editor, but the
 * modules holding that logic sit in an import graph that reaches `vscode`.
 * vitest aliases `vscode` here so those modules load; anything a unit test
 * actually depends on belongs in a test double, not in this file.
 */

export class Position {
  constructor(
    readonly line: number,
    readonly character: number
  ) {}
}

export class Uri {
  private constructor(readonly fsPath: string) {}

  static file(fsPath: string): Uri {
    return new Uri(fsPath);
  }

  toString(): string {
    return `file://${this.fsPath}`;
  }
}

export class RelativePattern {
  constructor(
    readonly baseUri: unknown,
    readonly pattern: string
  ) {}
}

export class SnippetString {
  constructor(readonly value: string) {}
}

export class CompletionItem {
  constructor(
    readonly label: string,
    readonly kind?: number
  ) {}
}

export class Disposable {
  dispose(): void {}
}

export const workspace = {
  workspaceFolders: undefined,
  getConfiguration: () => ({}),
  getWorkspaceFolder: () => undefined,
  findFiles: async () => [],
  createFileSystemWatcher: () => ({
    onDidChange: () => new Disposable(),
    dispose: () => {},
  }),
  fs: {
    readFile: async () => new Uint8Array(),
    writeFile: async () => {},
  },
};

export const languages = {
  registerCompletionItemProvider: () => new Disposable(),
};

export const window = {
  activeTextEditor: undefined,
};
