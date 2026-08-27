import * as assert from 'assert';
import * as vscode from 'vscode';
import { EXTENSION_ID, activateExtension, workspaceFolder } from './helpers';

suite('Activation', () => {
  test('the fixture workspace is a Drupal codebase', async () => {
    const composer = await vscode.workspace.fs.readFile(
      vscode.Uri.joinPath(workspaceFolder().uri, 'composer.json')
    );

    assert.ok(
      'drupal/core-recommended' in
        JSON.parse(Buffer.from(composer).toString()).require,
      'The fixture must require drupal/core-recommended or the extension will not activate.'
    );
  });

  test('the extension activates', async () => {
    const extension = await activateExtension();

    assert.strictEqual(extension.isActive, true);
  });

  test('a completion provider is registered for recipe.yml', async () => {
    await activateExtension();

    const items = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider',
      vscode.Uri.joinPath(
        workspaceFolder().uri,
        'recipes/recipe_under_test/recipe.yml'
      ),
      new vscode.Position(3, 8)
    );

    assert.ok(items, 'Expected a completion list for recipe.yml.');
  });

  test('the yaml validation contribution targets recipe files', () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    const contributes = extension?.packageJSON.contributes;

    assert.deepStrictEqual(contributes.yamlValidation[0].fileMatch, [
      'recipe.yml',
      'recipe.yaml',
    ]);
    assert.ok(
      contributes.yamlValidation[0].url.startsWith('https://'),
      'The schema URL must be fetchable.'
    );
  });
});
