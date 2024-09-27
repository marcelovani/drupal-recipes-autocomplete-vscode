import { workspace } from "vscode";
import getComposer from './composer';
import DrupalWorkspace from "../base/drupal-workspace";

export default async function getDrupalWorkspaces(): Promise<any[]> {
  const drupalWorkspaces = [];

  for (const workspaceFolder of workspace.workspaceFolders ?? []) {
    const composer = await getComposer(workspaceFolder);

    if (!composer) {
      continue;
    }

    if ('drupal/core-recommended' in composer.require) {
      drupalWorkspaces.push(new DrupalWorkspace(workspaceFolder));
    }
  }

  return drupalWorkspaces;
}
