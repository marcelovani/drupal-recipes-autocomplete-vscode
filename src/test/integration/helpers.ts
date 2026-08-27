import * as vscode from 'vscode';
import * as assert from 'assert';

export const EXTENSION_ID = 'marcelovani.drupal-recipes-autocomplete-vscode';

/**
 * Returns the fixture workspace folder the tests run against.
 */
export function workspaceFolder(): vscode.WorkspaceFolder {
  const folder = vscode.workspace.workspaceFolders?.[0];

  assert.ok(folder, 'Tests must run with the fixture workspace open.');

  return folder;
}

/**
 * Resolves a path inside the fixture workspace.
 */
export function fixtureUri(relativePath: string): vscode.Uri {
  return vscode.Uri.joinPath(workspaceFolder().uri, relativePath);
}

/**
 * Activates the extension and waits for it to finish.
 */
export async function activateExtension(): Promise<vscode.Extension<unknown>> {
  const extension = vscode.extensions.getExtension(EXTENSION_ID);

  assert.ok(extension, `Extension ${EXTENSION_ID} is not installed.`);

  await extension.activate();

  return extension;
}

/**
 * Requests completions at a position in a fixture file.
 */
export async function completionsAt(
  relativePath: string,
  position: vscode.Position
): Promise<vscode.CompletionItem[]> {
  const uri = fixtureUri(relativePath);
  await vscode.workspace.openTextDocument(uri);

  const list = await vscode.commands.executeCommand<vscode.CompletionList>(
    'vscode.executeCompletionItemProvider',
    uri,
    position
  );

  return list?.items ?? [];
}

/**
 * The extension kicks off its YAML scan from the provider constructor without
 * awaiting it, so the cache fills in some time after activation. Poll until the
 * expected suggestions turn up rather than sleeping for a fixed period.
 */
export async function completionLabelsAt(
  relativePath: string,
  position: vscode.Position,
  expected: string[],
  timeoutMs = 20000
): Promise<string[]> {
  const deadline = Date.now() + timeoutMs;
  let labels: string[] = [];

  do {
    const items = await completionsAt(relativePath, position);

    labels = items.map((item) =>
      typeof item.label === 'string' ? item.label : item.label.label
    );

    if (expected.every((label) => labels.includes(label))) {
      return labels;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  } while (Date.now() < deadline);

  assert.fail(
    `Timed out waiting for ${JSON.stringify(expected)} at ${relativePath}:` +
      `${position.line}:${position.character}. Got: ${JSON.stringify(labels)}`
  );
}
