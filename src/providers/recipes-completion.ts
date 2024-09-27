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
          pattern: this.drupalWorkspace.getRelativePattern('**/recipe.yml'),
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
      { "/recipe.yml": "recipe" },
      { "/config/": "config" },
      { "/modules/": "module" },
      { "/themes/": "theme" },
      { "/profiles/": "profile" },
      { "/default_content/": "content" },
      { "/content/": "content" },
    ];

    // Check if the file path matches any of the items in the mapping.
    const findValueByKey = (mapping: any[], filePath: string): string | boolean => {
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
    switch(type) {
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
          this.storeCompletionItem(filePath, 'install', label, contents.description, `${text}\n- `);
          // Also add autocomplete for config.import. i.e. module/theme name.
          let name = text.split('.')[0];
          this.storeCompletionItem(filePath, 'import', label, type, `${name}:\n  - `);
        }
        break;

      case 'recipe':
        // Extract the recipe name from filename.
        regex = /\/([^\/]+)\/recipe\.yml$/;
        match = filePath.match(regex);
        if (match && typeof match[1] !== 'undefined') {
          let text = match[1];
          let label = `${contents.name} (${type.toUpperCase()})`;
          this.storeCompletionItem(filePath, 'recipes', label, contents.description, `${text}\n- `);
        }
        break;

      case 'config':
        // Extract config name from filename.
        regex = /\/config\/.*\/([^\/]+)\.yml$/;
        match = filePath.match(regex);
        if (match && typeof match[1] !== 'undefined') {
          let text = match[1];
          let label = `${text} (${type.toUpperCase()})`;
          this.storeCompletionItem(filePath, 'actions', label, 'Config', `${text}:\n  `);
          // Also add autocomplete for config.import.module_name. i.e. the config id.
          // @todo: This is not working, we need to list the available configs, not the name of the config.
          let name = text.split('.')[0];
          this.storeCompletionItem(filePath, name, label, 'Config', `${text}\n- `);
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
   *   The file path.
   * @param string parent
   *   Used to store the key of the parent item.
   * @param string label
   *   The label.
   * @param string documentation
   *   The documentation.
   * @param string insertText
   *   The text to be inserted.
   */
  storeCompletionItem(path: string, parent: string, label: string, documentation: string, insertText: string) {
    const completion: CompletionItem = {
      label,
      detail: parent,
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
    const files =  await this.drupalWorkspace.findFiles('**/*.yml', '{vendor, node_modules}');
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

      // Check cache.
      if (this.completionFileCache.has(filePath)) {
        this.completionFileCache.delete(filePath);
        continue;
      }

      // Check if file should be skipped.
      let shouldIgnore = (filePath: string, ignoreList: string[]): boolean => ignoreList.some(ignoreItem => filePath.includes(ignoreItem));
    
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
      }
      catch(err) {
        // Ignore the error, we will test the contents below.
      }

      if (contents === null) {
        console.error(`Cannot parse ${filePath}`);
        continue;
      }

      if (type === 'module' || type === 'theme') {
        if (typeof contents.hidden !== 'undefined' && contents.hidden === 'true') {
          // Exclude hidden modules.
          continue;
        }
      }

      this.processCompletionItem(type.toString(), path, contents);
    }

    this.completions = ([] as CompletionItem[]).concat(
      ...this.completionFileCache.values()
    );

    // Workaround to remove duplicated entries.
    // @todo Investigate why there are multiple duplications.
    // this.completions = this.completions.filter((item, index, self) => {
    //   let firstOccurrenceIndex = self.findIndex(t => t.label === item.label);
    //   return index === firstOccurrenceIndex;
    // });
  }

  getParentAttribute(position: Position):string {
      if (position.character === 0) {
        return '';
      }

      let line = position.line;
      let match = null;

      do {
        line--;
        let attribute = window.activeTextEditor?.document.lineAt(line);

        // Check if the column position of the attribute is grater than the cursor position.
        const spaces = attribute?.text.match(/^ */);
        if (spaces) {
          let attributePosition = spaces[0].length;
          if (attributePosition < position.character) {
            // Use regex to match text before colon.
            match = attribute?.text.trim().match(/(\w+):/);
          }
        }

      } while (line > 0 && !match);

      return match ? match[1] : '';
  }

  async provideCompletionItems(document: TextDocument, position: Position) {
    if (!this.drupalWorkspace.hasFile(document.uri)) {
      return [];
    }

    const linePrefix = document
      .lineAt(position)
      .text.substring(0, position.character);

    let parentAttribute = this.getParentAttribute(position);

    // Get completions for the parent item.
    let filtered = this.completions.filter((item) =>
      parentAttribute !== '' && item.detail?.includes(parentAttribute)
    );

    return filtered.map((item) => {
      const newItem = Object.assign({}, item);

      if (newItem.insertText instanceof SnippetString) {
        newItem.insertText = new SnippetString(
          newItem.insertText.value
        );
      }
      return newItem;
    });
  }
}
