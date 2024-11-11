import {
  CompletionItem,
  CompletionItemProvider,
  TextDocument,
  Position,
  SnippetString,
  languages,
} from 'vscode';

import DrupalWorkspaceProvider from '../base/drupal-workspace-provider';
import suggestionsMapping from '../base/suggestions-mapping.json';
import { functionMap } from '../base/suggestions-callbacks';
import { getValueByPath, getPropertyPath } from '../utils/utils';
import { YamlDiscovery } from '../base/drupal-workspace-yaml-discovery';
import { cacheItem } from '../utils/cache';

export default class RecipesCompletionProvider
  extends DrupalWorkspaceProvider
  implements CompletionItemProvider
{
  static language = 'yaml';
  private yamlDiscovery: YamlDiscovery;

  cache: Map<string, cacheItem[]> = new Map();

  constructor(arg: ConstructorParameters<typeof DrupalWorkspaceProvider>[0]) {
    super(arg);

    this.disposables.push(
      languages.registerCompletionItemProvider(
        {
          language: RecipesCompletionProvider.language,
          scheme: 'file',
          pattern: this.drupalWorkspace.getRelativePattern(
            '**/recipe.{yml,yaml}'
          ),
        },
        this
      )
    );

    this.yamlDiscovery = new YamlDiscovery(
      this.drupalWorkspace,
      this.cache
    );
    this.yamlDiscovery.parseYamlFiles();
  }

  /**
   * Provides completion items.
   *
   * @param TextDocument document
   *   The current document.
   * @param Position position
   *   The cursor position.
   * @returns object
   *   The autocompletion item.
   */
  async provideCompletionItems(document: TextDocument, position: Position) {
    if (!this.drupalWorkspace.hasFile(document.uri)) {
      return [];
    }

    let propertyPath = getPropertyPath(position);
    console.debug(`Property path ${propertyPath}`);

    // Check if the property path matches any wildcard from suggestions-mapping.json.
    const value = getValueByPath(suggestionsMapping, propertyPath, '/');
    if (value !== false) {
      // Split the value to decide how to fetch the information
      // i.e. by reference to another suggestion or callback function.
      const [type, detail] = value.split(':');
      switch (type) {
        case 'ref':
          // Update path to properties.
          propertyPath = detail;
          break;

        case 'callback': {
          const callback = detail;
          if (functionMap[callback]) {
            // Invoke callback function to add more autocomplete suggestions.
            // Callback functions are defined in src/base/suggestion-callbacks.ts
            await functionMap[callback](propertyPath, this);
          } else {
            console.error(`Callback ${callback} is not supported yet.`);
          }
        }
      }
    }

    let cachedItems = this.cache.get(propertyPath) || [];

    // Workaround to remove duplicated entries.
    // @todo Investigate why there are multiple duplications.
    cachedItems = cachedItems.filter((current, index, self) => {
      return index === self.findIndex((i) => i.item.filePath === current.item.filePath);
    });

    console.debug('Filtered options', cachedItems);

    return cachedItems.map((current) => {
      const newCompletionItem: CompletionItem = {
        label: current.item.completion.label,
        detail: current.key,
        documentation: current.item.completion.documentation,
        insertText: new SnippetString(current.item.completion.insertText),
      };
      return newCompletionItem;
    });
  }
}
