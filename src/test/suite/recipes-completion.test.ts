import * as assert from 'assert';
import * as vscode from 'vscode';
import RecipesCompletionProvider from '../../providers/recipes-completion';
import DrupalWorkspace from '../../base/drupal-workspace';
import { cacheItem } from '../../utils/cache';
import * as utils from '../../utils/utils';

suite('RecipesCompletionProvider Test Suite', () => {
  let provider: RecipesCompletionProvider;
  let workspaceFolder: vscode.WorkspaceFolder;
  let drupalWorkspace: DrupalWorkspace;

  setup(() => {
    workspaceFolder = {
      uri: vscode.Uri.file('/test/workspace'),
      name: 'test',
      index: 0
    };
    drupalWorkspace = new DrupalWorkspace(workspaceFolder);
    provider = new RecipesCompletionProvider({
      drupalWorkspace
    });
  });

  test('provider initialization', () => {
    assert.ok(provider.cache instanceof Map);
  });

  test('provideCompletionItems returns items', async () => {
    // Mock hasFile to always return true
    provider.drupalWorkspace.hasFile = () => true;

    // Mock getPropertyPath to return the correct path
    const originalGetPropertyPath = utils.getPropertyPath;
    Object.defineProperty(utils, 'getPropertyPath', {
      value: () => 'recipe',
      configurable: true
    });

    // Restore original function after test
    teardown(() => {
      Object.defineProperty(utils, 'getPropertyPath', {
        value: originalGetPropertyPath,
        configurable: true
      });
    });
    const document: vscode.TextDocument = {
      getText: () => 'recipe:\n  name: test',
      lineAt: (lineOrPos: number | vscode.Position) => {
        const line = typeof lineOrPos === 'number' ? lineOrPos : lineOrPos.line;
        return {
          text: line === 0 ? 'recipe:' : '  name: test',
          range: new vscode.Range(
            new vscode.Position(line, 0),
            new vscode.Position(line, line === 0 ? 7 : 11)
          ),
          rangeIncludingLineBreak: new vscode.Range(
            new vscode.Position(line, 0),
            new vscode.Position(line, line === 0 ? 8 : 12)
          ),
          lineNumber: line,
          isEmptyOrWhitespace: false,
          firstNonWhitespaceCharacterIndex: line === 0 ? 0 : 2
        };
      },
      offsetAt: () => 0,
      positionAt: (offset: number) => new vscode.Position(0, offset),
      getWordRangeAtPosition: () => undefined,
      validateRange: (range: vscode.Range) => range,
      validatePosition: (position: vscode.Position) => position,
      uri: vscode.Uri.file('/test/workspace/recipe.yml'),
      fileName: '/test/workspace/recipe.yml',
      isUntitled: false,
      languageId: 'yaml',
      version: 1,
      isDirty: false,
      isClosed: false,
      save: async () => true,
      eol: vscode.EndOfLine.LF,
      lineCount: 2
    };

    // Mock cache data
    const testItems: cacheItem[] = [{
      key: 'recipe/name',
      item: {
        filePath: '/test/workspace/recipe.yml',
        parent: 'recipe',
        completion: {
          label: 'name',
          documentation: 'Recipe name',
          insertText: 'name: ${1:value}',
          symbolType: 'property'
        }
      }
    }];
    provider.cache.set('recipe', testItems);
    provider.cache.set('recipe/name', testItems);

    const items = await provider.provideCompletionItems(document, new vscode.Position(1, 2));

    assert.ok(Array.isArray(items));
    assert.ok(items.length > 0);
    assert.ok(items.every((item: vscode.CompletionItem) => {
      return item.label === 'name' &&
        item.detail === 'recipe/name' &&
        item.documentation === 'Recipe name';
    }));

    // Clean up
    provider.cache.clear();
  });

  test('cache management works correctly', () => {
    const testKey = 'test-key';
    const testItems: cacheItem[] = [{
      key: testKey,
      item: {
        filePath: '/test/workspace/recipe.yml',
        parent: 'recipe',
        completion: {
          label: 'test',
          documentation: 'Test item',
          insertText: 'test',
          symbolType: 'property'
        }
      }
    }];

    provider.cache.set(testKey, testItems);
    assert.deepStrictEqual(provider.cache.get(testKey), testItems);
  });
});
