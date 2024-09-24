import { ExtensionContext } from 'vscode';
import DrupalWorkspace from './base/drupal-workspace';
import getWorkspaceFolders from './utils/get-workspace-folders';
import getComposer from './utils/get-composer';

export async function activate(context: ExtensionContext) {
  const drupalWorkspaces = [];

  for (const workspaceFolder of getWorkspaceFolders()) {
    const composer = await getComposer(workspaceFolder);

    if (!composer) {
      continue;
    }

    if ('drupal/core-recommended' in composer.require) {
      drupalWorkspaces.push(new DrupalWorkspace(workspaceFolder));
    }
  }

  if (drupalWorkspaces.length === 0) {
    return;
  }

  context.subscriptions.push(
    ...drupalWorkspaces,
  );
}

export function deactivate() {}
