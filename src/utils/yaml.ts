import { workspace, Uri } from 'vscode';
import { parse as parseYaml } from 'yaml';
import { globalStorage } from '../base/suggestions-callbacks';

export class yaml {
  private context: any;

  constructor(context: any) {
    this.context = context;
  }
  /**
   * Finds all yml files in the Drupal codebase, parses the files to detect what type of file it is,
   * stores the items in cache, adds the items to the autocomplete list.
   */
  async parseYamlFiles(): Promise<void> {
    const files = await this.context.drupalWorkspace.findFiles(
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
   * The items are stored using / i.e. see the object structure below:
   *
   * config:
   *   actions:
   *     node:
   *       - node.settings
   *
   * Path will be config/actions/node
   *
   * @param sting type
   *   The file type.
   * @param Uri path
   *   The file path.
   * @param any contents
   *   The file contents.
   */
  processCompletionItem(type: string, path: Uri, contents: any): void {
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
          this.context.storeCompletionItem(
            'install',
            label,
            contents.description,
            `${text}\n- `
          );

          // Add autocomplete suggestions for config/import.
          let name = text.split('.')[0];
          this.context.storeCompletionItem(
            'config/import',
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
          this.context.storeCompletionItem(
            'recipes',
            label,
            contents.description,
            `${text}\n- `
          );
        }
        break;

      case 'config':
        // Extract config name from filename.
        // @todo move to function in utils i.e. extractConfigInfo()
        regex = /\/config\/install\/([^\/]+)\.yml$/;
        match = filePath.match(regex);
        if (match && typeof match[1] !== 'undefined') {
          let text = match[1];
          let label = `${text} (${type.toUpperCase()})`;

          // Store config info in the global Storage.
          globalStorage.push({
            config: text,
            path: filePath,
          });

          // Add autocomplete suggestions for config/actions.
          this.context.storeCompletionItem(
            'config/actions',
            label,
            'Config',
            `${text}:\n  `
          );

          // Also add autocomplete for config/import/module_theme_name.
          // @todo: This is not working correctly, we need to get the available configs in the module/config/install folder.
          let name = text.split('.')[0];
          this.context.storeCompletionItem(
            `config/import/${name}`,
            label,
            'Config',
            `${text}\n- `
          );
        }
        break;

      case 'content':
        this.context.storeCompletionItem(
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
            this.context.storeCompletionItem(
              'global/permissions',
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
}
