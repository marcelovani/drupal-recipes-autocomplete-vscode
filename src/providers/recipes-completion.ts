import {
  CompletionItem,
  CompletionItemProvider,
  TextDocument,
  Position,
  workspace,
  SnippetString,
  languages,
  window,
  Uri,
} from 'vscode';

import { parse as parseYaml } from 'yaml';
import DrupalWorkspaceProvider from '../base/drupal-workspace-provider';
import suggestionsMapping from './suggestions-mapping.json';

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

    this.parseYamlFiles();
  }

  /**
   * Detects the yml type.
   *
   * @param string filePath
   *   The file path.
   * @returns string|boolean
   *   Returns the file type or false.
   */
  detectFileType(filePath: string): string | boolean {
    // List of types, the order is important, for example:
    // A profile can contain modules, so we need to test for modules first.
    const mapping = [
      { '/recipe.yml': 'recipe' },
      { '/recipe.yaml': 'recipe' },
      { '/config/': 'config' },
      { '.permissions.': 'permission' },
      { '/modules/': 'module' },
      { '/themes/': 'theme' },
      { '/profiles/': 'profile' },
      { '/default_content/': 'content' },
      { '/content/': 'content' },
    ];

    // Check if the file path matches any of the items in the mapping.
    const findValueByKey = (
      mapping: any[],
      filePath: string
    ): string | boolean => {
      for (const item of mapping) {
        for (const [key, type] of Object.entries(item)) {
          if (filePath.includes(key)) {
            // Exception.
            if (type === 'config' && filePath.includes('/schema/')) {
              return false;
            }
            return type!.toString();
          }
        }
      }
      console.log(`Excluded ${filePath}`);
      return false;
    };

    return findValueByKey(mapping, filePath);
  }

  /**
   * Creates the completion item and stores in cache.
   * @todo rename this. it should be something like build completion tree
   * The items are stored using dot-notation i.e. see the object structure below, the path will be config.actions.node
   *
   * config:
   *   actions:
   *     node:
   *       - node.settings
   *
   * @param sting type
   *   The file type.
   * @param Uri path
   *   The file path.
   * @param any contents
   *   The file contents.
   */
  processCompletionItem(type: string, path: Uri, contents: any) {
    // Prepare completion item.
    let regex = null;
    let match = null;
    let filePath: string = path.toString();
    switch (type) {
      case 'theme':
      case 'module':
      case 'profile':
        // Extract the module/theme/profile filename.
        regex = new RegExp(`/${type}s/.*\/(.*?)\\.info`);
        match = filePath.match(regex);
        if (match && typeof match[1] !== 'undefined') {
          let text = match[1];
          let label = `${contents.name} (${type.toUpperCase()})`;

          // Add autocomplete suggestions for install.
          this.storeCompletionItem(
            'install',
            label,
            contents.description,
            `${text}\n- `
          );

          // Add autocomplete suggestions for config.import.
          let name = text.split('.')[0];
          this.storeCompletionItem(
            'config.import',
            label,
            contents.description,
            `${name}:\n  - `
          );
        }
        break;

      case 'recipe':
        // Extract the recipe name from filename.
        regex = /\/([^\/]+)\/recipe\.yml$/;
        match = filePath.match(regex);
        if (match && typeof match[1] !== 'undefined') {
          let text = match[1];
          let label = `${contents.name} (${type.toUpperCase()})`;

          // Add autocomplete suggestions for recipes.
          this.storeCompletionItem(
            'recipes',
            label,
            contents.description,
            `${text}\n- `
          );
        }
        break;

      case 'config':
        // Extract config name from filename.
        regex = /\/config\/.*\/([^\/]+)\.yml$/;
        match = filePath.match(regex);
        if (match && typeof match[1] !== 'undefined') {
          let text = match[1];
          let label = `${text} (${type.toUpperCase()})`;

          // Add autocomplete suggestions for config.actions.
          this.storeCompletionItem(
            'config.actions',
            label,
            'Config',
            `${text}:\n  `
          );

          // Also add autocomplete for config.import.module/theme.
          // @todo: This is not working correctly, we need to get the available configs in the module/config/install folder.
          let name = text.split('.')[0];
          this.storeCompletionItem(
            `config.import.${name}`,
            label,
            'Config',
            `${text}\n- `
          );
        }
        break;

      case 'content':
        this.storeCompletionItem(
          'content',
          'Content is not supported yet',
          'Config',
          `\n- `
        );
        break;

      case 'permission':
        // Loop through the permissions.
        for (const key in contents) {
          if (contents.hasOwnProperty(key) && contents[key].title) {
            // Store permissions in global object.
            this.storeCompletionItem(
              'global.permissions',
              `${contents[key].title} (Permission)`,
              'Permission',
              `'${key}'\n- `
            );
          }
        }
        break;

      default:
        console.error(`${type} type was not treated.`);
    }
  }

  /**
   * Stores autocomplete item in cache.
   *
   * @param string path
   *   The path in the object using dot-notation i.e. config.actions
   * @param string label
   *   The label.
   * @param string documentation
   *   The documentation.
   * @param string insertText
   *   The text to be inserted.
   */
  storeCompletionItem(
    path: string,
    label: string,
    documentation: string,
    insertText: string
  ) {
    const completion: CompletionItem = {
      label,
      // We use detail to tell what is the parent item. @TODO: We should find a better way to store
      // this info and use detail for the purpose of showing details when the pop up opens.
      detail: path,
      documentation,
      insertText: new SnippetString(insertText),
    };

    let completions: CompletionItem[] = [];

    // Merge with existing cache items.
    let cached = this.completionFileCache.get(path);
    if (cached) {
      completions = cached;
    }
    completions.push(completion);

    this.completionFileCache.set(path, completions);
  }

  /**
   * Finds all yml files in the Drupal codebase,
   * parses the files to detect what type of file it is,
   * stores the items in cache, adds the items to the
   * autocomplete list.
   * @todo Move this function to a separate file.
   */
  async parseYamlFiles() {
    const files = await this.drupalWorkspace.findFiles(
      '**/*.yml',
      '{vendor, node_modules}'
    );

    // List of types that are not supported yet.
    const ignore: string[] = [
      '.libraries.yml',
      '.services.yml',
      '.field_type_categories.yml',
      '.breakpoints.yml',
      '.starterkit.yml',
      '.link_relation_types.yml',
      '_action.yml',
      '.menu.yml',
      '/tests/',
      '/components/',
    ];

    for (const path of files) {
      let filePath: string = path.toString();

      // Check if file should be skipped.
      let shouldIgnore = (filePath: string, ignoreList: string[]): boolean =>
        ignoreList.some((ignoreItem) => filePath.includes(ignoreItem));

      if (shouldIgnore(filePath, ignore)) {
        continue;
      }

      let type = this.detectFileType(filePath);
      if (type === false) {
        continue;
      }

      // Read file.
      let contents = null;
      try {
        let buffer = await workspace.fs.readFile(path);
        contents = parseYaml(buffer.toString());
      } catch (err) {
        // Ignore the error, we will test the contents below.
      }

      if (contents === null) {
        console.error(`Cannot parse ${filePath}`);
        continue;
      }

      if (type === 'module' || type === 'theme') {
        if (
          typeof contents.hidden !== 'undefined' &&
          contents.hidden === 'true'
        ) {
          // Exclude hidden modules.
          continue;
        }
      }

      this.processCompletionItem(type.toString(), path, contents);
    }

    this.completions = ([] as CompletionItem[]).concat(
      ...this.completionFileCache.values()
    );
  }

  /**
   * When autocomplete is triggered by pressing ^ + Space we need to find the path of the parent item.
   * The path will be in dot-notation i.e. config.import.foo
   *
   * @param Position position
   *   The cursor position.
   * @returns string
   *   The parent attribute.
   */
  getPropertyPath(position: Position): string {
    if (position.character === 0) {
      return '';
    }

    let line = position.line;
    let lastCol = 0;
    let path = '';

    // The column of the property being evaluated.
    let propertyCol = 0;

    do {
      let attribute = window.activeTextEditor?.document.lineAt(line);

      // Check if there are leading spaces before the item.
      const spaces = attribute?.text.match(/^ */);
      if (spaces) {
        propertyCol = spaces[0].length;

        // Initialise lastCol.
        if (lastCol === 0) {
          lastCol = propertyCol;
        }

        // Check if the current item is the parent of previous item.
        if (propertyCol < lastCol) {
          // Update the position of the lastCol.
          lastCol = propertyCol;

          // Remove colon from item.
          const property = attribute?.text.trim().replace(/:$/, '');

          // Build the dot path.
          path = property + (path !== '' ? '.' : '') + path;
        }
      }
      line--;
    } while (propertyCol > 0);

    return path;
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

    let propertyPath = this.getPropertyPath(position);

    // @todo remove console logs
    console.log(`Parent attribute ${propertyPath}`);

    /**
     * Flattens a nested object into a single-depth object with dot-notation keys.
     * @todo move to utils.
     *
     * @param {Object} obj - The object to flatten.
     * @param {string} [parentKey=''] - The base key to prefix (used in recursion).
     * @param {Object} [result={}] - The accumulator for storing flattened results.
     * @returns {Object} - The flattened object.
     */
    const flattenObject = (obj: any, parentKey = '', result: any = {}): any => {
      for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
          const newKey = parentKey ? `${parentKey}.${key}` : key;
          if (typeof obj[key] === 'object' && obj[key] !== null && !Array.isArray(obj[key])) {
            flattenObject(obj[key], newKey, result);
          } else {
            result[newKey] = obj[key];
          }
        }
      }
      return result;
    };

    /**
     * Finds a value in a flattened object using a dot-notation path.
     * @todo move to utils
     *
     * @param {Object} obj - The object.
     * @param {string} path - The path to search with dot-notation.
     * @returns {*} - The value at the specified path, or false if not found.
     */
    const getValueByPath = (obj: any, path: string): any => {
      // Flatten the object, converting the keys to dot-notation.
      const flattenedObj = flattenObject(obj);

      // Split the path into an array.
      const pathArray = path.split('.');

      // Loop through each item in the flattened object.
      for (const key in flattenedObj) {
        if (flattenedObj.hasOwnProperty(key)) {
          // Split the key for all dots and store in an array
          const keyArray = key.split('.');
          // @todo this is redundant.
          let ind = -1;

          // Loop through every item.
          keyArray.forEach((element, index) => {
             // Remove values with '*' from the array.
            if (element === '*') {
              ind = index;
              keyArray.splice(index, 1);
              if (ind < pathArray.length) {
                // Remove the corresponding item from pathArray.
                pathArray.splice(ind, 1);
              }
            }
          });

          // Convert keyArray into string, using dot-notation.
          if (keyArray.join('.') === pathArray.join('.')) {
            return flattenedObj[key];
          }
        }
      }

      return false;
    };

    // Check if the property path matches any wildcard from suggestions-mapping.json.
    let path = getValueByPath(suggestionsMapping, propertyPath);
    if (path !== false) {
      // Update path to properties.
      propertyPath = path;
    }

    // Get completions for the property path.
    let filtered = this.completions.filter(
      (item) => propertyPath !== '' && item.detail === propertyPath
    );

    // Workaround to remove duplicated entries.
    // @todo Investigate why there are multiple duplications.
    filtered = filtered.filter((item, index, self) => {
      let firstOccurrenceIndex = self.findIndex((t) => t.label === item.label);
      return index === firstOccurrenceIndex;
    });

    console.log('Filtered options', filtered);

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
