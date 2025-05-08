import * as assert from 'assert';
import * as vscode from 'vscode';
import * as fs from 'fs';
import DrupalWorkspace from '../../base/drupal-workspace';

suite('Extension Test Suite', () => {
  let testFilePath: string;
  let testFileUri: vscode.Uri;

  setup(() => {
    testFilePath = '/tmp/test-recipe.yml';
    testFileUri = vscode.Uri.file(testFilePath);
  });

  teardown(() => {
    if (fs.existsSync(testFilePath)) {
      fs.unlinkSync(testFilePath);
    }
  });

  test('Create and edit recipe document', async () => {
    // Create initial document
    const initialContent = '# Recipe test.\n';
    const writeData = new Uint8Array(Buffer.from(initialContent));
    await vscode.workspace.fs.writeFile(testFileUri, writeData);

    // Open document
    const doc = await vscode.workspace.openTextDocument(testFileUri);
    const editor = await vscode.window.showTextDocument(doc);

    // Edit document
    await editor.edit((editBuilder: vscode.TextEditorEdit) => {
      editBuilder.insert(new vscode.Position(1, 0), 'recipe:\n  name: test\n');
    });

    // Verify content
    const updatedDoc = await vscode.workspace.openTextDocument(testFilePath);
    assert.ok(updatedDoc.getText().includes('recipe:'));
    assert.ok(updatedDoc.getText().includes('name: test'));
  });

  test('Workspace initialization', () => {
    const workspaceFolder: vscode.WorkspaceFolder = {
      uri: vscode.Uri.file('/test/workspace'),
      name: 'test',
      index: 0
    };

    const workspace = new DrupalWorkspace(workspaceFolder);
    assert.ok(workspace);
    assert.strictEqual(workspace.workspaceFolder, workspaceFolder);
  });
});
