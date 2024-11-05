import * as assert from 'assert';
import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
// import { workspace } from "vscode";
import getDrupalWorkspaces from '../../utils/workspace';
import RecipesCompletionProvider, * as extension from '../../providers/recipes-completion';
import DrupalWorkspace from '../../base/drupal-workspace';

const getRelativePath = (path: string) => {
  return path.replace(`${vscode.workspace.rootPath}/`, '');
};

const openFile = (relativePath: string) => {
  var openPath = vscode.Uri.file(
    `${vscode.workspace.rootPath}/${relativePath}`
  );
  vscode.workspace.openTextDocument(openPath).then((doc) => {
    vscode.window.showTextDocument(doc);
  });
};

suite('Extension Test Suite', async () => {
  vscode.window.showInformationMessage('Start all tests.');

  function enterText(row: number, col: number, text: string) {
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      editor.edit((editBuilder) => {
        // editBuilder.insert(editor.selection.active, text);
        editBuilder.insert(new vscode.Position(row, col), text);
      });
    }
  }

  function sleep(ms: number): void {
    const start = Date.now();
    // Keep the loop running until the specified time has passed
    while (Date.now() - start < ms) {
      // Do nothing
    }
  }

  function fromActiveTextEditor() {
    if (vscode.window.activeTextEditor) {
      return getRelativePath(
        vscode.window.activeTextEditor.document.uri.fsPath
      );
    }
  }

  test('Create a new document in VSCode', async () => {
    // let workspaceFolders = vscode.workspace.workspaceFolders?? [];
    // console.log("DEBUG","workspaceFolders", workspaceFolders);
    // sleep(1000);

    // let workspaceFolder = workspaceFolders[0].uri.fsPath;
    // const filePath = path.join(workspaceFolder, 'recipe.yml');
    // console.log("DEBUG","workspaceFolder", workspaceFolder);
    const filePath = '/tmp/recipe.yml';

    // Create a new document
    // let doc = await vscode.workspace.openTextDocument({ content: 'config' });

    // Open the document in a new editor
    // await vscode.window.showTextDocument(doc);

    // sleep(1000);

    const file = vscode.Uri.file(filePath);
    console.log('DEBUG', 'file', file);

    // sleep(1000);

    // Save the document to the specified file path
    const writeData = new Uint8Array(Buffer.from(`# Recipe test.\n`));
    await vscode.workspace.fs.writeFile(vscode.Uri.file(filePath), writeData);
    // return;
    // let editor = vscode.window.activeTextEditor;
    // if (!editor) {
    //     vscode.window.showWarningMessage('You must have an open editor window to convert an OpenAPI document');
    //     assert.fail('No workspace open');
    // }

    // console.log("DEBUG editor file", fromActiveTextEditor());

    fs.openSync(file.fsPath, 'r');
    let doc = await vscode.workspace.openTextDocument(file);
    await vscode.window.showTextDocument(doc, vscode.ViewColumn.One, true);

    // if (!workspaceFolders) {
    //   // Ensure that a workspace is open
    //   assert.fail('No workspace open');
    //   return;
    // }
    // console.log("DEBUG","workspaceFolders", workspaceFolders);

    enterText(2, 0, 'conf');

    sleep(10000);
    return;

    // Create a new document
    // doc = await vscode.workspace.openTextDocument({ content: 'Hello, VSCode!' });

    // Open the document in a new editor
    // await vscode.window.showTextDocument(doc);

    // sleep(1000);

    // Verify the document is created and contains the specific content
    const createdDocument = await vscode.workspace.openTextDocument(filePath);
    assert.strictEqual(
      createdDocument.getText(),
      'Hello, VSCode!',
      'The content of the document should be "Hello, VSCode!"'
    );

    // Cleanup
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  });

  // enterText('config');
  // sleep(1000);

  vscode.window.activeTextEditor?.edit;
  vscode.window.activeTextEditor?.document.lineCount;
  let ws = null;
  for (const workspaceFolder of vscode.workspace.workspaceFolders ?? []) {
    ws = new DrupalWorkspace(workspaceFolder);
    console.log('DEBUG', 'debug', ws);
  }
  console.log('DEBUG', 'debug', ws);
  // if (drupalWorkspaces.length === 0) {
  //   return;
  // }

  vscode.window.showInformationMessage('Start all tests.');

  // const autocomplete = new RecipesCompletionProvider();

  test('Sample test', () => {
    assert.strictEqual(-1, [1, 2, 3].indexOf(5));
    assert.strictEqual(-1, [1, 2, 3].indexOf(0));
  });
});
