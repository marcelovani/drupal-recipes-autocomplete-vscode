import { describe, it, expect, beforeEach } from 'vitest';
import { addToCache, cacheItem } from '../../utils/cache';

describe('addToCache', () => {
  let cache: Map<string, cacheItem[]>;

  beforeEach(() => {
    cache = new Map();
  });

  it('stores a completion under its key', () => {
    addToCache(
      'install',
      'file:///site/web/modules/contrib/foo/foo.info.yml',
      '',
      'Foo (MODULE)',
      'A module.',
      'foo\n- ',
      'module',
      cache
    );

    expect(cache.get('install')).toEqual([
      {
        key: 'install',
        item: {
          filePath: 'file:///site/web/modules/contrib/foo/foo.info.yml',
          parent: '',
          completion: {
            label: 'Foo (MODULE)',
            documentation: 'A module.',
            insertText: 'foo\n- ',
            symbolType: 'module',
          },
        },
      },
    ]);
  });

  it('appends to an existing key rather than replacing it', () => {
    addToCache('install', 'a.yml', '', 'A', '', 'a', 'module', cache);
    addToCache('install', 'b.yml', '', 'B', '', 'b', 'module', cache);

    expect(cache.get('install')).toHaveLength(2);
    expect(cache.get('install')?.map((i) => i.item.completion.label)).toEqual([
      'A',
      'B',
    ]);
  });

  it('keeps separate keys apart', () => {
    addToCache('install', 'a.yml', '', 'A', '', 'a', 'module', cache);
    addToCache('recipes', 'b.yml', '', 'B', '', 'b', 'recipe', cache);

    expect(cache.get('install')).toHaveLength(1);
    expect(cache.get('recipes')).toHaveLength(1);
  });

  it('does not deduplicate identical entries', () => {
    // The provider filters duplicates when it builds completion items, so the
    // cache is expected to hold them. See RecipesCompletionProvider.
    addToCache('install', 'a.yml', '', 'A', '', 'a', 'module', cache);
    addToCache('install', 'a.yml', '', 'A', '', 'a', 'module', cache);

    expect(cache.get('install')).toHaveLength(2);
  });
});
