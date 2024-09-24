import {
  FileSystemWatcher,
  GlobPattern,
  RelativePattern,
  Uri,
  workspace,
  WorkspaceFolder,
} from 'vscode';
import Disposable from '../disposable';
import { Tail } from '../types';
import RecipesCompletionProvider from '../providers/recipes-completion';

export default class DrupalWorkspace extends Disposable {
  workspaceFolder: WorkspaceFolder;
  private drupalVersion?: number;
  private composerLockWatcher: FileSystemWatcher;

  constructor(workspaceFolder: WorkspaceFolder) {
    super();

    this.workspaceFolder = workspaceFolder;

    this.disposables.push(
      new RecipesCompletionProvider({
        drupalWorkspace: this,
      })
    );

    this.composerLockWatcher = workspace.createFileSystemWatcher(
      this.getRelativePattern('composer.lock')
    );
    this.disposables.push(this.composerLockWatcher);
    this.composerLockWatcher.onDidChange(
      () => {
        this.drupalVersion = undefined;
      },
      this,
      this.disposables
    );
  }

  hasFile(uri: Uri) {
    return this.workspaceFolder === workspace.getWorkspaceFolder(uri);
  }

  getRelativePattern(include: string): RelativePattern {
    return new RelativePattern(this.workspaceFolder, include);
  }

  async findFile(include: GlobPattern): Promise<Uri | undefined> {
    const result = await workspace.findFiles(include, undefined, 1);

    return result.length ? result[0] : undefined;
  }

  async findFiles(
    include: GlobPattern,
    ...args: Tail<Parameters<typeof workspace['findFiles']>>
  ) {
    return workspace.findFiles(include, ...args);
  }

}
