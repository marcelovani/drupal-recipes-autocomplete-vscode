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
import { yaml } from '../utils/yaml';

export default class RecipesCompletionProvider
  extends DrupalWorkspaceProvider
  implements CompletionItemProvider
{
  static language = 'yaml';

  completions: CompletionItem[] = [];
  completionFileCache: Map<string, CompletionItem[]> = new Map();

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

    const yamlInstance = new yaml(this);

    yamlInstance.parseYamlFiles();
  }

  /**
   * Stores autocomplete item in cache.
   *
   * @param string key
   *   The key in the object using slash i.e. config/actions
   * @param string label
   *   The label.
   * @param string documentation
   *   The documentation.
   * @param string insertText
   *   The text to be inserted.
   */
  storeCompletionItem(
    key: string,
    label: string,
    documentation: string,
    insertText: string
  ) {
    const newCompletionItem: CompletionItem = {
      label,
      // We use key to tell what is the parent item. @TODO: We should find a better way to store
      // this info and use detail for the purpose of showing details when the pop up opens.
      detail: key,
      documentation,
      insertText: new SnippetString(insertText),
    };

    let newCompletions: CompletionItem[] = [newCompletionItem];

    // Check cache.
    const cache = this.completionFileCache.get(key);
    if (typeof cache === 'object' && cache.length > 0) {
      // Check if item is in cache.
      if (cache.findIndex((t) => t.label === newCompletionItem.label) !== -1) {
        return;
      }

      // Merge with cached items.
      newCompletions = ([] as CompletionItem[]).concat(...cache);
    }

    // Add to completions list.
    this.completions.push(newCompletionItem);

    // Cache item.
    this.completionFileCache.set(key, newCompletions);
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

    // Get completions for the property path.
    let filtered = this.completions.filter(
      (item) => propertyPath !== '' && item.detail === propertyPath
    );

    // Workaround to remove duplicated entries.
    // @todo Investigate why there are multiple duplications.
    filtered = filtered.filter((item, index, self) => {
      return index === self.findIndex((t) => t.label === item.label);
    });

    console.debug('Filtered options', filtered);

    return filtered.map((item) => {
      // @todo Update item.detail to show a friendly text. Perhaps use detail as object with path and text.
      const newItem = Object.assign({}, item);

      if (newItem.insertText instanceof SnippetString) {
        newItem.insertText = new SnippetString(newItem.insertText.value);
      }
      return newItem;
    });
  }
}
