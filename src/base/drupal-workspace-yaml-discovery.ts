import { workspace, Uri } from 'vscode';
import { parse as parseYaml } from 'yaml';
import { cacheItem, addToCache } from '../utils/cache';
import DrupalWorkspace from './drupal-workspace';

export class YamlDiscovery {
  private drupalWorkspace: DrupalWorkspace;
  private cache: Map<string, cacheItem[]>;

  constructor(
    drupalWorkspace: DrupalWorkspace,
    cache: Map<string, cacheItem[]>
  ) {
    this.drupalWorkspace = drupalWorkspace;
    this.cache = cache;
  }

  /**
   * Finds all yml files in the Drupal codebase, parses the files to detect what type of file it is,
   * stores the items in cache, adds the items to the autocomplete list.
   */
  async parseYamlFiles(): Promise<void> {
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
      const filePath: string = path.toString();

      // Check if file should be skipped.
      const shouldIgnore = (filePath: string, ignoreList: string[]): boolean =>
        ignoreList.some((ignoreItem) => filePath.includes(ignoreItem));

      if (shouldIgnore(filePath, ignore)) {
        continue;
      }

      const type = this.detectFileType(filePath);
      if (type === false) {
        continue;
      }

      // Read file.
      let contents = null;
      try {
        const buffer = await workspace.fs.readFile(path);
        contents = parseYaml(buffer.toString());
      } catch {
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
    type MappingItem = { [key: string]: string };

    // Define the mapping array with the correct type
    const mapping: MappingItem[] = [
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
      mapping: MappingItem[],
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
   * @param string symbolType
   *   The icon to be displayed.
   */
  storeCompletionItem(
    key: string,
    filePath: string,
    parent: string,
    label: string,
    documentation: string,
    insertText: string,
    symbolType: string,
  ): void {
    // Create new completion item.
    addToCache(
      key,
      filePath,
      parent,
      label,
      documentation,
      insertText,
      symbolType,
      this.cache
    );
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
    const filePath: string = path.toString();
    switch (type) {
      case 'theme':
      case 'module':
      case 'profile':
        // Extract the module/theme/profile filename.
        regex = new RegExp(`/${type}s/.*/(.*?)\\.info`);
        match = filePath.match(regex);
        if (match && typeof match[1] !== 'undefined') {
          const text = match[1];
          const label = `${contents.name} (${type.toUpperCase()})`;

          // Add autocomplete suggestions for install.
          this.storeCompletionItem(
            'install',
            filePath,
            '',
            label,
            contents.description,
            `${text}\n- `,
            type,
          );

          // Add autocomplete suggestions for config/import.
          const name = text.split('.')[0];
          this.storeCompletionItem(
            'config/import',
            filePath,
            '',
            label,
            contents.description,
            `${name}:\n  - `,
            type,
          );
        }
        break;

      case 'recipe':
        // Extract the recipe name from filename.
        regex = /\/([^/]+)\/recipe\.yml$/;
        match = filePath.match(regex);
        if (match && typeof match[1] !== 'undefined') {
          const text = match[1];
          const label = `${contents.name} (${type.toUpperCase()})`;

          // Add autocomplete suggestions for recipes.
          this.storeCompletionItem(
            'recipes',
            filePath,
            '',
            label,
            contents.description,
            `${text}\n- `,
            type,
          );
        }
        break;

      case 'config':
        // Extract config name from filename.
        // @todo move to function in utils i.e. extractConfigInfo()
        regex = /\/config\/install\/([^/]+)\.yml$/;
        match = filePath.match(regex);
        if (match && typeof match[1] !== 'undefined') {
          const configName = match[1];
          const label = `${configName} (${type.toUpperCase()})`;

          // Store the config name. The config contents will be fetched when invoked by a callback.
          this.storeCompletionItem(
            configName,
            filePath,
            '',
            label,
            'Config',
            `${configName}:\n  `,
            type,
          );

          // Add autocomplete suggestions for config/actions.
          this.storeCompletionItem(
            'config/actions',
            filePath,
            '',
            label,
            'Config',
            `${configName}:\n  `,
            type,
          );

          // Also add autocomplete for config/import/module_theme_name.
          // @todo: This is not working correctly, we need to get the available configs in the module/config/install folder.
          const name = configName.split('.')[0];
          this.storeCompletionItem(
            `config/import/${name}`,
            filePath,
            '',
            label,
            'Config',
            `${configName}\n- `,
            `${type}_item`,
          );
        }
        break;

      case 'content':
        this.storeCompletionItem(
          'content',
          filePath,
          '',
          'Content is not supported yet',
          'Config',
          `\n- `,
          type,
        );
        break;

      case 'permission':
        // Loop through the permissions.
        for (const key in contents) {
          if (
            Object.prototype.hasOwnProperty.call(contents, key) &&
            contents[key].title
          ) {
            // Store permissions in global object.
            this.storeCompletionItem(
              'global/permissions',
              filePath,
              '',
              `${contents[key].title} (Permission)`,
              'Permission',
              `'${key}'\n- `,
              type,
            );
          }
        }
        break;

      default:
        console.error(`${type} type was not treated.`);
    }
  }
}
