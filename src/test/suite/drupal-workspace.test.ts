import * as assert from 'assert';
import * as vscode from 'vscode';
import DrupalWorkspace from '../../base/drupal-workspace';

suite('DrupalWorkspace Test Suite', () => {
  let drupalWorkspace: DrupalWorkspace;
  let workspaceFolder: vscode.WorkspaceFolder;

  setup(() => {
    workspaceFolder = {
      uri: vscode.Uri.file('/test/workspace'),
      name: 'test',
      index: 0
    };
    drupalWorkspace = new DrupalWorkspace(workspaceFolder);
  });

  test('hasFile returns correct result', () => {
    const fileInWorkspace = vscode.Uri.file('/test/workspace/somefile.txt');
    const fileOutsideWorkspace = vscode.Uri.file('/other/path/somefile.txt');

    // Mock workspace.getWorkspaceFolder
    const originalGetWorkspaceFolder = vscode.workspace.getWorkspaceFolder;
    vscode.workspace.getWorkspaceFolder = (uri: vscode.Uri) => {
      return uri.fsPath.startsWith('/test/workspace') ? workspaceFolder : undefined;
    };

    assert.strictEqual(drupalWorkspace.hasFile(fileInWorkspace), true);
    assert.strictEqual(drupalWorkspace.hasFile(fileOutsideWorkspace), false);

    // Restore original function
    vscode.workspace.getWorkspaceFolder = originalGetWorkspaceFolder;
  });

  test('getRelativePattern creates correct pattern', () => {
    const pattern = drupalWorkspace.getRelativePattern('composer.lock');
    assert.strictEqual(pattern.baseUri, workspaceFolder.uri);
    assert.strictEqual(pattern.pattern, 'composer.lock');
  });

  test('findFile returns correct Uri', async () => {
    // Mock workspace.findFiles
    const originalFindFiles = vscode.workspace.findFiles;
    vscode.workspace.findFiles = async () => {
      return [vscode.Uri.file('/test/workspace/found.txt')];
    };

    const result = await drupalWorkspace.findFile('*.txt');
    assert.strictEqual(result?.fsPath, '/test/workspace/found.txt');

    // Restore original function
    vscode.workspace.findFiles = originalFindFiles;
  });
});
