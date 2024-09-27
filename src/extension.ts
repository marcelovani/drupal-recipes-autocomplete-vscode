import { ExtensionContext } from 'vscode';
import getDrupalWorkspaces from './utils/workspace';

export async function activate(context: ExtensionContext) {
  const drupalWorkspaces = await getDrupalWorkspaces();

  if (drupalWorkspaces.length === 0) {
    return;
  }

  context.subscriptions.push(
    ...drupalWorkspaces,
  );
}

export function deactivate() {}
