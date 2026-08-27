import { describe, it, expect, beforeEach } from 'vitest';
import { Uri } from 'vscode';
import { YamlDiscovery } from '../../base/drupal-workspace-yaml-discovery';
import DrupalWorkspace from '../../base/drupal-workspace';
import { cacheItem } from '../../utils/cache';

/**
 * YamlDiscovery only reaches for the workspace inside parseYamlFiles, which
 * these tests do not exercise.
 */
const noWorkspace = {} as DrupalWorkspace;

describe('YamlDiscovery.detectFileType', () => {
  const discovery = new YamlDiscovery(noWorkspace, new Map());

  it.each([
    ['/site/recipes/my_recipe/recipe.yml', 'recipe'],
    ['/site/recipes/my_recipe/recipe.yaml', 'recipe'],
    ['/site/web/modules/contrib/foo/config/install/foo.settings.yml', 'config'],
    ['/site/web/modules/contrib/foo/foo.permissions.yml', 'permission'],
    ['/site/web/modules/contrib/foo/foo.info.yml', 'module'],
    ['/site/web/themes/contrib/bar/bar.info.yml', 'theme'],
    ['/site/web/profiles/baz/baz.info.yml', 'profile'],
    ['/site/content/node/article.yml', 'content'],
    ['/site/default_content/node/article.yml', 'content'],
  ])('detects %s as %s', (filePath, expected) => {
    expect(discovery.detectFileType(filePath)).toBe(expected);
  });

  it('excludes config schema files', () => {
    expect(
      discovery.detectFileType('/site/web/core/config/schema/core.data_types.schema.yml')
    ).toBe(false);
  });

  it('detects an action config entity as config', () => {
    // These live in a module's config/install and are importable by a recipe.
    // They were excluded by an `_action.yml` entry in the ignore list. Issue #6.
    expect(
      discovery.detectFileType(
        '/site/web/core/modules/node/config/install/system.action.node_delete_action.yml'
      )
    ).toBe('config');
  });

  it('returns false for a file that matches nothing', () => {
    expect(discovery.detectFileType('/site/web/sites/default/services.yml')).toBe(
      false
    );
  });

  it('prefers the earlier mapping entry when a path matches several', () => {
    // A profile contains modules, so /modules/ has to win over /profiles/.
    expect(
      discovery.detectFileType('/site/web/profiles/demo/modules/foo/foo.info.yml')
    ).toBe('module');
  });

  it('prefers recipe over the directory it lives in', () => {
    expect(
      discovery.detectFileType('/site/web/modules/contrib/foo/recipe.yml')
    ).toBe('recipe');
  });
});

describe('YamlDiscovery.processCompletionItem', () => {
  let cache: Map<string, cacheItem[]>;
  let discovery: YamlDiscovery;

  beforeEach(() => {
    cache = new Map();
    discovery = new YamlDiscovery(noWorkspace, cache);
  });

  /**
   * Reads back the labels stored under a cache key.
   */
  const labelsAt = (key: string) =>
    (cache.get(key) ?? []).map((entry) => entry.item.completion.label);

  /**
   * Reads back the insert text stored under a cache key.
   */
  const insertTextAt = (key: string) =>
    (cache.get(key) ?? []).map((entry) => entry.item.completion.insertText);

  it('offers a module under install and config/import', () => {
    discovery.processCompletionItem(
      'module',
      Uri.file('/site/web/modules/contrib/foo/foo.info.yml'),
      { name: 'Foo', description: 'The Foo module.' }
    );

    expect(labelsAt('install')).toEqual(['Foo (MODULE)']);
    expect(insertTextAt('install')).toEqual(['foo\n- ']);
    expect(labelsAt('config/import')).toEqual(['Foo (MODULE)']);
    expect(insertTextAt('config/import')).toEqual(['foo:\n  - ']);
  });

  it('strips the sub-extension from the config/import key', () => {
    // A theme engine info file is named e.g. foo.engine.info.yml; config/import
    // is keyed on the part before the first dot.
    discovery.processCompletionItem(
      'theme',
      Uri.file('/site/web/themes/contrib/bar/bar.starterkit.info.yml'),
      { name: 'Bar', description: 'The Bar theme.' }
    );

    expect(insertTextAt('install')).toEqual(['bar.starterkit\n- ']);
    expect(insertTextAt('config/import')).toEqual(['bar:\n  - ']);
  });

  it('offers a recipe under recipes, named after its directory', () => {
    discovery.processCompletionItem(
      'recipe',
      Uri.file('/site/recipes/my_recipe/recipe.yml'),
      { name: 'My Recipe', description: 'Does a thing.' }
    );

    expect(labelsAt('recipes')).toEqual(['My Recipe (RECIPE)']);
    expect(insertTextAt('recipes')).toEqual(['my_recipe\n- ']);
  });

  it('offers config under its own name, config/actions and config/import/<module>', () => {
    discovery.processCompletionItem(
      'config',
      Uri.file('/site/web/modules/contrib/foo/config/install/foo.settings.yml'),
      { langcode: 'en' }
    );

    expect(labelsAt('foo.settings')).toEqual(['foo.settings (CONFIG)']);
    expect(labelsAt('config/actions')).toEqual(['foo.settings (CONFIG)']);
    expect(labelsAt('config/import/foo')).toEqual(['foo.settings (CONFIG)']);
  });

  it('offers each titled permission under global/permissions', () => {
    discovery.processCompletionItem(
      'permission',
      Uri.file('/site/web/modules/contrib/foo/foo.permissions.yml'),
      {
        'administer foo': { title: 'Administer foo' },
        'view foo': { title: 'View foo' },
      }
    );

    expect(labelsAt('global/permissions')).toEqual([
      'Administer foo (Permission)',
      'View foo (Permission)',
    ]);
    expect(insertTextAt('global/permissions')).toEqual([
      "'administer foo'\n- ",
      "'view foo'\n- ",
    ]);
  });

  it('skips permission entries with no title', () => {
    discovery.processCompletionItem(
      'permission',
      Uri.file('/site/web/modules/contrib/foo/foo.permissions.yml'),
      {
        'administer foo': { title: 'Administer foo' },
        permission_callbacks: ['\\Drupal\\foo\\FooPermissions::permissions'],
      }
    );

    expect(labelsAt('global/permissions')).toEqual(['Administer foo (Permission)']);
  });

  it('keys config/import on the module that provides the config, not its prefix', () => {
    // node's config/install holds system.action.node_delete_action.yml, which a
    // recipe imports by naming the node module. Keying on the config prefix
    // files it under system, where nothing looks for it. Issue #6.
    discovery.processCompletionItem(
      'config',
      Uri.file(
        '/site/web/modules/contrib/foo/config/install/system.action.foo_action.yml'
      ),
      { langcode: 'en' }
    );

    expect(labelsAt('config/import/foo')).toEqual([
      'system.action.foo_action (CONFIG)',
    ]);
    expect(labelsAt('config/import/system')).toEqual([]);
  });

  it('still keys config/import on the module when the prefix matches it', () => {
    discovery.processCompletionItem(
      'config',
      Uri.file('/site/web/modules/contrib/foo/config/install/foo.settings.yml'),
      { langcode: 'en' }
    );

    expect(labelsAt('config/import/foo')).toEqual(['foo.settings (CONFIG)']);
  });

  it('stores nothing when the path does not match the expected shape', () => {
    discovery.processCompletionItem('recipe', Uri.file('/recipe.yml'), {
      name: 'Orphan',
    });

    expect(cache.size).toBe(0);
  });
});
