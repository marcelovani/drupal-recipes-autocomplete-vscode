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
import {
  getValueByPath,
  getPropertyPath,
  getExistingValues,
  getInsertedValue,
} from '../utils/utils';
import { YamlDiscovery } from '../base/drupal-workspace-yaml-discovery';
import { PhpDiscovery } from '../base/drupal-workspace-php-discovery';
import { cacheItem } from '../utils/cache';
import { getIconKind } from '../utils/icons';

export default class RecipesCompletionProvider
  extends DrupalWorkspaceProvider
  implements CompletionItemProvider
{
  static language = 'yaml';
  private yamlDiscovery: YamlDiscovery;
  private phpDiscovery: PhpDiscovery;

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
    this.phpDiscovery = new PhpDiscovery(this.drupalWorkspace, this.cache);

    // The action discovery reads the config entities the YAML scan finds, so
    // it has to follow it rather than run alongside.
    this.yamlDiscovery
      .parseYamlFiles()
      .then(() => this.phpDiscovery.discover())
      .catch((error) => console.error('Config action discovery failed', error));
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

    let propertyPath = getPropertyPath(document, position);
    console.debug(`Property path ${propertyPath}`);

    // Where the cursor is in the recipe. propertyPath is about to be rewritten
    // when the mapping points somewhere else, i.e. grantPermissions resolves to
    // global/permissions, and what the recipe already holds lives under the
    // path the author is actually typing at.
    const documentPath = propertyPath;

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
            await functionMap['notImplementedYet'](propertyPath, this);
          }
        }
      }
    }

    let cachedItems = this.cache.get(propertyPath) || [];

    // Action names apply to whatever config is being acted on, so they are
    // cached once under a wildcard rather than per config name.
    if (/^config\/actions\/[^/]+$/.test(propertyPath)) {
      cachedItems = cachedItems.concat(this.cache.get('config/actions/*') ?? []);
    }

    // Workaround to remove duplicated entries.
    // @todo Investigate why there are multiple duplications.
    cachedItems = cachedItems.filter((current, index, self) => {
      return index === self.findIndex((i) => i.item.completion.label === current.item.completion.label);
    });

    // Don't offer what the recipe already has.
    const existing = getExistingValues(document.getText(), documentPath);

    if (existing.size > 0) {
      cachedItems = cachedItems.filter(
        (current) =>
          !existing.has(getInsertedValue(current.item.completion.insertText))
      );
    }

    console.debug('Filtered options', cachedItems);

    return cachedItems.map((current) => {
      const newCompletionItem: CompletionItem = {
        label: current.item.completion.label,
        detail: current.key,
        documentation: current.item.completion.documentation,
        insertText: new SnippetString(current.item.completion.insertText),
        kind: getIconKind(current.item.completion.symbolType),
      };
      return newCompletionItem;
    });
  }
}
