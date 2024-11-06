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
    // A profile can contain modules, so we need to test for modules firt.
    const mapping = [
      { '/recipe.yml': 'recipe' },
      { '/recipe.yaml': 'recipe' },
      { '/config/': 'config' },
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
   * The items are stored using dot annotation i.e. see the object structure below, the path will be config.actions.node
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

          // Add autocomplete for install. i.e. module/theme name.
          this.storeCompletionItem(
            'install',
            label,
            contents.description,
            `${text}\n- `
          );

          // Also add autocomplete for config.import. i.e. module/theme name.
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
          this.storeCompletionItem(
            'config.actions',
            label,
            'Config',
            `${text}:\n  `
          );
          // Also add autocomplete for config.import.module_name. i.e. the config id.
          // @todo: This is not working, we need to list the available configs, not the name of the config.
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
        console.warn(`${type} type is not implemented yet.`);
        break;

      default:
        console.error(`${type} type was not treated.`);
    }
  }

  /**
   * Stores autocomplete item in cache.
   *
   * @param string path
   *   The path in the object using dot annotation i.e. config.actions
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
   * The path will be in dot annotation i.e. config.import.foo
   *
   * @param Position position
   *   The cursor position.
   * @returns string
   *   The parent attribute.
   */
  getPropertyTrail(position: Position): string {
    if (position.character === 0) {
      return '';
    }

    let line = position.line;

    let lastCol = 0;

    // let match = null;

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

    let parentAttribute = this.getPropertyTrail(position);

    // @todo remove console logs
    console.log(`Parent attribute ${parentAttribute}`);

    // Get completions for the parent item.
    let filtered = this.completions.filter(
      (item) => parentAttribute !== '' && item.detail?.includes(parentAttribute)
    );

    // Workaround to remove duplicated entries.
    // @todo Investigate why there are multiple duplications.
    filtered = filtered.filter((item, index, self) => {
      let firstOccurrenceIndex = self.findIndex((t) => t.label === item.label);
      return index === firstOccurrenceIndex;
    });

    console.log('Filtered options', filtered);

    return filtered.map((item) => {
      const newItem = Object.assign({}, item);

      if (newItem.insertText instanceof SnippetString) {
        newItem.insertText = new SnippetString(newItem.insertText.value);
      }
      return newItem;
    });
  }
}
