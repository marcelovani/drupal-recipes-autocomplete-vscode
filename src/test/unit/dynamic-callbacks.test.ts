import { describe, it, expect, beforeEach } from 'vitest';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  getComponentNames,
  getMediaTypes,
  getRegionNames,
  getVocabularies,
} from '../../base/suggestions-callbacks';
import { addToCache, cacheItem } from '../../utils/cache';

const fixtureRoot = path.resolve(
  fileURLToPath(new URL('.', import.meta.url)),
  '../fixtures/drupal-site'
);

const configDir = path.join(
  fixtureRoot,
  'web/modules/contrib/recipe_test_module/config/install'
);

const themeInfo = path.join(
  fixtureRoot,
  'web/themes/contrib/recipe_test_theme/recipe_test_theme.info.yml'
);

function contextWith(cache: Map<string, cacheItem[]>) {
  return {
    cache,
    drupalWorkspace: { workspaceFolder: { name: 'drupal-site' } },
  };
}

/**
 * Mirrors what YamlDiscovery caches for a config entity.
 */
function cacheConfig(cache: Map<string, cacheItem[]>, configName: string) {
  addToCache(
    configName,
    `file://${path.join(configDir, `${configName}.yml`)}`,
    '',
    `${configName} (CONFIG)`,
    'Config',
    `${configName}:\n  `,
    'config',
    cache
  );
}

/**
 * The labels cached against a path.
 */
const labelsAt = (cache: Map<string, cacheItem[]>, key: string) =>
  (cache.get(key) ?? []).map((entry) => entry.item.completion.label);

describe('getVocabularies', () => {
  let cache: Map<string, cacheItem[]>;

  beforeEach(() => {
    cache = new Map();
    cacheConfig(cache, 'taxonomy.vocabulary.test_tags');
  });

  it('offers the vocabularies in the codebase', async () => {
    const detail = 'config/actions/*/grantPermissionsForEachTaxonomyVocabulary';

    await getVocabularies(detail, contextWith(cache));

    expect(labelsAt(cache, detail)).toEqual(['test_tags']);
  });

  it('does not mistake a longer config name that shares the prefix', async () => {
    cacheConfig(cache, 'taxonomy.vocabulary.test_tags.extra');
    const detail = 'config/actions/*/grantPermissionsForEachTaxonomyVocabulary';

    await getVocabularies(detail, contextWith(cache));

    expect(labelsAt(cache, detail)).toEqual(['test_tags']);
  });

  it('offers nothing when the codebase has no vocabularies', async () => {
    const empty = new Map<string, cacheItem[]>();

    await getVocabularies('x', contextWith(empty));

    expect(labelsAt(empty, 'x')).toEqual([]);
  });
});

describe('getMediaTypes', () => {
  it('offers the media types in the codebase', async () => {
    const cache = new Map<string, cacheItem[]>();
    cacheConfig(cache, 'media.type.test_image');
    const detail = 'config/actions/*/grantPermissionsForEachMediaType';

    await getMediaTypes(detail, contextWith(cache));

    expect(labelsAt(cache, detail)).toEqual(['test_image']);
  });
});

describe('getRegionNames', () => {
  let cache: Map<string, cacheItem[]>;

  beforeEach(() => {
    cache = new Map();
    // Themes are cached under install, which is where the info file path comes from.
    addToCache(
      'install',
      `file://${themeInfo}`,
      '',
      'Recipe Test Theme (THEME)',
      '',
      'recipe_test_theme\n- ',
      'theme',
      cache
    );
  });

  it('reads the regions out of the theme info file', async () => {
    const detail = 'config/actions/*/setRegion';

    await getRegionNames(detail, contextWith(cache));

    expect(labelsAt(cache, detail)).toEqual(['header', 'content', 'footer']);
  });

  it('documents each region with its label and theme', async () => {
    const detail = 'config/actions/*/setRegion';

    await getRegionNames(detail, contextWith(cache));

    expect(cache.get(detail)?.[0].item.completion.documentation).toBe(
      'Header (Recipe Test Theme)'
    );
  });

  it('ignores modules cached alongside the themes', async () => {
    addToCache(
      'install',
      'file:///nowhere/foo.info.yml',
      '',
      'Foo (MODULE)',
      '',
      'foo\n- ',
      'module',
      cache
    );
    const detail = 'config/actions/*/setRegion';

    await getRegionNames(detail, contextWith(cache));

    expect(labelsAt(cache, detail)).toEqual(['header', 'content', 'footer']);
  });

  it('offers nothing when no theme declares regions', async () => {
    const empty = new Map<string, cacheItem[]>();

    await getRegionNames('x', contextWith(empty));

    expect(labelsAt(empty, 'x')).toEqual([]);
  });
});

describe('getComponentNames', () => {
  it('offers the components of the display being changed', async () => {
    const cache = new Map<string, cacheItem[]>();
    cacheConfig(cache, 'core.entity_view_display.node.test.default');
    const detail =
      'config/actions/core.entity_view_display.node.test.default/hideComponent';

    await getComponentNames(detail, contextWith(cache));

    // Both the visible components and the ones already hidden.
    expect(labelsAt(cache, detail).sort()).toEqual(['body', 'langcode', 'links']);
  });

  it('offers nothing when the display is not in the codebase', async () => {
    const cache = new Map<string, cacheItem[]>();
    const detail = 'config/actions/core.entity_view_display.no.such.thing/hideComponent';

    await getComponentNames(detail, contextWith(cache));

    expect(labelsAt(cache, detail)).toEqual([]);
  });
});
