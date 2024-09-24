import {
  CompletionItem,
  CompletionItemProvider,
  TextDocument,
  Position,
  workspace,
  SnippetString,
  languages,
  window,
} from 'vscode';

import { parse as parseYaml } from 'yaml';
import DrupalWorkspaceProvider from '../base/drupal-workspace-provider';

export type options = {
  label: string
  insertText: string,
  type: string,
  documentation: string,
  parent: string,
}

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

  async parseYamlFiles() {
    const completions: CompletionItem[] = [];
    const files =  await this.drupalWorkspace.findFiles('**/*.yml', '{vendor, node_modules}');
    const ignore: string[] = [
      '.libraries.yml',
      '.services.yml',
      '.field_type_categories.yml',
      '.link_relation_types.yml',
      'core.entity',
      '/tests/',
    ];

    // Helper function to check if the file should be skipped.
    let shouldIgnore = (filePath: string, ignoreList: string[]): boolean => {
      return ignoreList.some(ignoreItem => filePath.includes(ignoreItem));
    };
    
    let type = '';
    let label = '';

    for (const path of files) {
      // Check cache.
      if (this.completionFileCache.get(path.fsPath)) {
        continue;
      }

      let filePath: string = path.toString();

      // Check if file should be skipped.
      if (shouldIgnore(filePath, ignore)) {
        continue;
      }

      // Check file contents.
      if (filePath.includes('/recipe.yml')) {
        type = 'recipe';
        label = 'Recipe';
      }
      else if (filePath.includes('/profiles/')) {
        type = 'profile';
        label = 'Profile';
      }
      else if (filePath.includes('/modules/')) {
        type = 'module';
        label = 'Module';
      }
      else if (filePath.includes('/themes/')) {
        type = 'theme';
        label = 'Theme';
      }
      else if (filePath.includes('/default_content/') || filePath.includes('/content/')) {
        type = 'content';
        label = 'Content';
      }
      else if (filePath.includes('/config/')) {
        // Exclude config schema.
        if (filePath.includes('/schema/')) {
          continue;
        }
        type = 'config';
        label = 'Config';
      }
      else {
        console.log('Ignored', path);
        continue;
      }

      // Read file.
      let contents = null;
      try {
        let buffer = await workspace.fs.readFile(path);
        contents = parseYaml(buffer.toString());
      }
      catch(err) {
        console.error(err);
      }

      if (contents == null) {
        console.error("Cannot parse", path);
        continue;
      }

      if (type == 'module' || type == 'theme') {
        if (typeof contents.hidden !== 'undefined' && contents.hidden == 'true') {
          // Exclude hidden modules.
          continue;
        }
      }

      // Prepare completion item.
      let regex = null;
      let match = null;
      let insertText = '';
      let parent = '';
      let description = '';
      switch(type) {
        case 'theme':
        case 'module':
        case 'profile':
          regex = new RegExp(`/${type}s/.*\/(.*?)\\.info`);
          match = filePath.match(regex);
          if (match) {
            insertText = match[1];
          }
          else {
            continue;
          }
          label = `${contents.name} (${label})`;
          parent = 'install';
          description = contents.description;
          break;

        case 'recipe':
          regex = /\/([^\/]+)\/recipe\.yml$/;
          match = filePath.match(regex);
          if (match) {
            insertText = match[1];
          }
          else {
            continue;
          }
          label = `${contents.name} (${label})`;
          parent = 'recipes';
          description = contents.description;
          break;
    
        case 'config':
          regex = /\/config\/.*\/([^\/]+)\.yml$/;
          match = filePath.match(regex);
          if (match) {
            insertText = match[1];
          }
          else {
            continue;
          }
          label = `${contents.id} (${label})`;
          parent = 'import';
          description = 'Config';
          break;

        case 'content':
          console.error(`${type} type is not implemented yet.`);
          break;

        default:
          console.error(`${type} type was not treated.`);
      }

      const completion: CompletionItem = {
        label,
        detail: parent,
        documentation: description,
        insertText: new SnippetString(
          `${insertText}\n- `
        ),
      };

      completions.push(completion);

      this.completionFileCache.set(path.fsPath, completions);
    }

    // @todo Investigate why there are multiple duplications.
    this.completions = ([] as CompletionItem[]).concat(
      ...this.completionFileCache.values()
    );
  }

  getParentAttribute(position: Position):string {
      // @todo find parent based on indentation
      if (position.character == 0) {
        return '';
      }

      let line = position.line;
      let match = null;
      do {
        let attribute = window.activeTextEditor?.document
          .lineAt(line)
          .text.substring(0, 1000).trim();

        // Use regex to match text before colon.
        // @todo trim spaces on the left using regex.
        match = attribute?.toString().match(/(\w+):/);

        // Keep going up until we find the parent attribute.
        line--;          
      } while (!match || line == 0);

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
      parentAttribute !== '' && item.detail == parentAttribute
    );

    // Workaround to deal with duplicated entries.
    // @todo fix the caching and remove this.
    filtered = filtered.filter((item, index, self) => {
      let firstOccurrenceIndex = self.findIndex(t => t.label === item.label);
      return index === firstOccurrenceIndex;
    });

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
