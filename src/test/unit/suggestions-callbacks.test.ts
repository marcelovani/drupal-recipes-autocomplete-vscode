import { describe, it, expect, beforeEach } from 'vitest';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  functionMap,
  getConfigContents,
  getConfigItems,
  notImplementedYet,
} from '../../base/suggestions-callbacks';
import { addToCache, cacheItem } from '../../utils/cache';

const fixtureRoot = path.resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  '../fixtures/drupal-site'
);

const settingsFile = path.join(
  fixtureRoot,
  'web/modules/contrib/recipe_test_module/config/install/recipe_test_module.settings.yml'
);

/**
 * The shape the callbacks read off the provider they are handed.
 */
function contextWith(cache: Map<string, cacheItem[]>) {
  return {
    cache,
    drupalWorkspace: { workspaceFolder: { name: 'drupal-site' } },
  };
}

describe('functionMap', () => {
  it('exposes the callbacks named in suggestions-mapping.json', () => {
    expect(Object.keys(functionMap).sort()).toEqual([
      'getComponentNames',
      'getConfigContents',
      'getConfigItems',
      'getMediaTypes',
      'getRegionNames',
      'getVocabularies',
      'notImplementedYet',
    ]);
  });
});

describe('notImplementedYet', () => {
  it('caches a placeholder against the requested path', async () => {
    const cache = new Map<string, cacheItem[]>();

    await notImplementedYet('config/actions/foo/setRegion', contextWith(cache));

    expect(
      cache.get('config/actions/foo/setRegion')?.[0].item.completion
    ).toMatchObject({
      label: 'Sorry, not implemented yet, just DIY for now.',
      symbolType: 'not_implemented',
    });
  });
});

describe('getConfigContents', () => {
  let cache: Map<string, cacheItem[]>;

  beforeEach(() => {
    cache = new Map();
    // processCompletionItem keys config files by their config name.
    addToCache(
      'recipe_test_module.settings',
      `file://${settingsFile}`,
      '',
      'recipe_test_module.settings (CONFIG)',
      'Config',
      'recipe_test_module.settings:\n  ',
      'config',
      cache
    );
  });

  it('reads the config file behind the cached entry', async () => {
    const contents = await getConfigContents(
      'config/actions/recipe_test_module.settings/create',
      contextWith(cache)
    );

    expect(contents).toHaveLength(1);
    expect(contents[0]).toContain('threshold: 10');
  });

  it('caches the contents against the requested path', async () => {
    const detail = 'config/actions/recipe_test_module.settings/create';

    await getConfigContents(detail, contextWith(cache));

    const stored = cache.get(detail);
    expect(stored).toHaveLength(1);
    expect(stored?.[0].item.completion.symbolType).toBe('config_contents');
    expect(stored?.[0].item.completion.documentation).toContain('enabled: true');
  });

  it('labels the entry relative to the workspace folder', async () => {
    const detail = 'config/actions/recipe_test_module.settings/create';

    await getConfigContents(detail, contextWith(cache));

    expect(cache.get(detail)?.[0].item.completion.label).toBe(
      '/web/modules/contrib/recipe_test_module/config/install/recipe_test_module.settings.yml'
    );
  });

  it('returns an empty list when the config name is not cached', async () => {
    const contents = await getConfigContents(
      'config/actions/no.such.config/create',
      contextWith(cache)
    );

    expect(contents).toEqual([]);
  });
});

describe('getConfigItems', () => {
  let cache: Map<string, cacheItem[]>;

  beforeEach(() => {
    cache = new Map();
    addToCache(
      'recipe_test_module.settings',
      `file://${settingsFile}`,
      '',
      'recipe_test_module.settings (CONFIG)',
      'Config',
      'recipe_test_module.settings:\n  ',
      'config',
      cache
    );
  });

  it('returns the top level keys of the config file', async () => {
    const keys = await getConfigItems(
      'config/actions/recipe_test_module.settings/set/property_name',
      contextWith(cache)
    );

    expect(keys).toEqual(['langcode', 'enabled', 'threshold']);
  });

  it('caches each key as a config item', async () => {
    const detail =
      'config/actions/recipe_test_module.settings/set/property_name';

    await getConfigItems(detail, contextWith(cache));

    const items = (cache.get(detail) ?? []).filter(
      (entry) => entry.item.completion.symbolType === 'config_item'
    );

    expect(items.map((entry) => entry.item.completion.label)).toEqual([
      'langcode',
      'enabled',
      'threshold',
    ]);
  });
});
