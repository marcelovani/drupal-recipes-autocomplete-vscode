import { workspace, WorkspaceFolder } from "vscode";

export default function getWorkspaceFolders(): readonly WorkspaceFolder[] {
  return workspace.workspaceFolders ?? [];
}
