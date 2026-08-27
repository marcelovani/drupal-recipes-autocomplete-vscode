import * as assert from 'assert';
import * as vscode from 'vscode';
import { activateExtension, completionLabelsAt, completionsAt } from './helpers';

const RECIPE = 'recipes/recipe_under_test/recipe.yml';
const ACTIONS = 'recipes/recipe_actions/recipe.yml';

suite('Recipe completions', () => {
  suiteSetup(async () => {
    await activateExtension();
  });

  test('install offers the modules and themes in the codebase', async () => {
    const labels = await completionLabelsAt(RECIPE, new vscode.Position(4, 8), [
      'Recipe Test Module (MODULE)',
      'Recipe Test Theme (THEME)',
    ]);

    assert.ok(
      !labels.includes('Core Test Recipe (RECIPE)'),
      'install must not offer recipes.'
    );
  });

  test('recipes offers the recipes in the codebase', async () => {
    await completionLabelsAt(RECIPE, new vscode.Position(3, 8), [
      'Core Test Recipe (RECIPE)',
      'Recipe Actions (RECIPE)',
    ]);
  });

  test('config/import offers modules and themes', async () => {
    await completionLabelsAt(RECIPE, new vscode.Position(6, 10), [
      'Recipe Test Module (MODULE)',
      'Recipe Test Theme (THEME)',
    ]);
  });

  test('config/actions offers the config in the codebase', async () => {
    await completionLabelsAt(RECIPE, new vscode.Position(7, 11), [
      'recipe_test_module.settings (CONFIG)',
    ]);
  });

  test('config suggestions carry an icon', async () => {
    await completionLabelsAt(RECIPE, new vscode.Position(7, 11), [
      'recipe_test_module.settings (CONFIG)',
    ]);

    const items = await completionsAt(RECIPE, new vscode.Position(7, 11));
    const config = items.find(
      (item) => item.label === 'recipe_test_module.settings (CONFIG)'
    );

    assert.strictEqual(config?.kind, vscode.CompletionItemKind.Property);
  });

  test('grantPermissions resolves the ref to the permission list', async () => {
    // config/actions/user.role.*/grantPermissions maps to ref:global/permissions
    // in suggestions-mapping.json, so this exercises the wildcard match and the
    // ref indirection together.
    await completionLabelsAt(ACTIONS, new vscode.Position(6, 23), [
      'Administer recipe test (Permission)',
      'View recipe test (Permission)',
    ]);
  });

  test('simpleConfigUpdate runs the callback and offers the config contents', async () => {
    // config/actions/*/simpleConfigUpdate maps to callback:getConfigContents,
    // which reads the config file off disk.
    const labels = await completionLabelsAt(ACTIONS, new vscode.Position(8, 26), [
      '/web/modules/contrib/recipe_test_module/config/install/recipe_test_module.settings.yml',
    ]);

    assert.ok(labels.length > 0);
  });

  test('does not offer recipe suggestions outside a recipe file', async () => {
    const uri = vscode.Uri.joinPath(
      vscode.workspace.workspaceFolders![0].uri,
      'web/modules/contrib/recipe_test_module/recipe_test_module.info.yml'
    );
    await vscode.workspace.openTextDocument(uri);

    const list = await vscode.commands.executeCommand<vscode.CompletionList>(
      'vscode.executeCompletionItemProvider',
      uri,
      new vscode.Position(1, 12)
    );

    const labels = (list?.items ?? []).map((item) =>
      typeof item.label === 'string' ? item.label : item.label.label
    );

    assert.ok(
      !labels.includes('Recipe Test Module (MODULE)'),
      'The provider is registered for recipe.{yml,yaml} only.'
    );
  });
});

suite('Dependency directories', () => {
  suiteSetup(async () => {
    await activateExtension();
  });

  test('does not suggest modules from vendor or node_modules', async () => {
    // Anchor on a suggestion that is expected, so the assertions below run
    // against a populated cache rather than an empty one.
    const labels = await completionLabelsAt(RECIPE, new vscode.Position(4, 8), [
      'Recipe Test Module (MODULE)',
    ]);

    assert.ok(
      !labels.includes('Vendored Module (MODULE)'),
      'vendor/ must be excluded from the scan.'
    );
    assert.ok(
      !labels.includes('Bundled Module (MODULE)'),
      'node_modules/ must be excluded from the scan.'
    );
  });
});
