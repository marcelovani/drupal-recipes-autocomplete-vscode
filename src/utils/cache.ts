export interface cacheItem {
  /**
   * A unique identifier for the cache item.
   */
  key: string;

  /**
   * The cache item.
   */
  item: {
    /**
     * The file path of the yml.
     */
    filePath: string;

    /**
     * The parent key.
     */
    parent: string;

    /**
     * The completion object.
     */
    completion: {
      /**
       * The completion label.
       */
      label: string;

      /**
       * The completion documentation.
       */
      documentation: string;

      /**
       * The completion text.
       */
      insertText: string;

      /**
       * Sumbol type.
       */
      symbolType: string;
    };
  };
}

/**
 * Stores autocomplete item in cache.
 *
 * @param string key
 *   The key in the object using slash i.e. config/actions
 * @param string filePath
 *   The file path.
 * @param string parent
 *   The parent key.
 * @param string label
 *   The label.
 * @param string documentation
 *   The documentation.
 * @param string insertText
 *   The text to be inserted.
 * @param string symbolType
 *   The icon to be displayed.
 * @param map cache
 *   The cache object.
 */
export function addToCache(
  key: string,
  filePath: string,
  parent: string,
  label: string,
  documentation: string,
  insertText: string,
  symbolType: string,
  cache: Map<string, cacheItem[]>
): void {
  const cacheItem: cacheItem = {
    key,
    item: {
      filePath,
      parent,
      completion: {
        label,
        documentation,
        insertText,
        symbolType,
      },
    },
  };

  const newCacheItem: cacheItem[] = [cacheItem];

  // Check cache.
  const cacheItems = cache.get(key) || [];
  const combinedItems = cacheItems.concat(newCacheItem);

  // Cache item.
  cache.set(key, combinedItems);
}
