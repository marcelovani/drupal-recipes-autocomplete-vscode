import fs from 'fs';
import { URL } from 'url';
import { addToCache, cacheItem } from '../utils/cache';
import { parse } from 'yaml';

interface KnownCallbacks {
  [key: string]: ((...args: any[]) => any) | object | any;
}

export const functionMap: KnownCallbacks = {
  getConfigItems,
  getConfigContents,
  getVocabularies,
  getMediaTypes,
  getRegionNames,
  getComponentNames,
  notImplementedYet,
};

export async function notImplementedYet(
  detail: string,
  context: any
): Promise<any> {
  // Add completion item for config contents.
  addToCache(
    detail,
    '',
    '',
    'Sorry, not implemented yet, just DIY for now.',
    '',
    '',
    'not_implemented',
    context.cache
  );

  console.error(`Callback ${detail} is not supported yet.`);
}

export async function getConfigItems(
  detail: string,
  context: any
): Promise<any> {
  const separator = '/';

  // Get config name from detail.
  const parts = detail.split(separator);

  // Remove the last segment.
  parts.pop();

  // The last segment is the config name.
  const path = parts.join(separator);

  // Get config contents.
  const configContents = await getConfigContents(path, context);

  try {
    // Parse config contents.
    const items = configContents.map((item: string) => parse(item));
    const keys = new Set();

    // Get all keys.
    items.forEach((item: { [key: string]: string }) => {
      // Add each key of the current object to the Set
      Object.keys(item).forEach((key) => keys.add(key));
    });

    keys.forEach((item) => {
        // Add completion item for config contents.
        addToCache(
          detail,
          '',
          '',
          `${item}`,
          'Config item',
          `${item}`,
          'config_item',
          context.cache
        );
    });

    // Convert the Set to an array and return it.
    return Array.from(keys);
  } catch {
    // Ignore errors.
  }
}

export async function getConfigContents(
  detail: string,
  context: any
): Promise<any> {
  const separator = '/';

  // Get config name from detail.
  const parts = detail.split(separator);

  // Remove the last segment.
  parts.pop();

  // The last segment is the config name.
  const configName = parts.pop();

  const cachedItems = context.cache.get(configName) || [];

  // Read each file asynchronously.
  try {
    const fileReadPromises = cachedItems.map(
      // filePath is a string on cacheItem; the union this used to declare was
      // wider than the type it reads from, and newer @types/node rejects it.
      async (current: cacheItem) => {
        const url = new URL(current.item.filePath).pathname;

        // Read the files asyncronously.
        const contents = await fs.promises.readFile(url, { encoding: 'utf-8' });

        // Find the index of the workspace folder in the path.
        const workspaceFolder = context.drupalWorkspace.workspaceFolder.name;
        const workspaceIndex = url.indexOf(workspaceFolder);
        // Label the file relative to the workspace folder where it sits inside
        // one, and by its full path where it does not.
        const label =
          workspaceIndex !== -1
            ? url.substring(workspaceIndex + workspaceFolder.length)
            : url;

        // Add completion item for config contents.
        addToCache(
          detail,
          url,
          '',
          label,
          contents,
          `${contents}\n  `,
          'config_contents',
          context.cache
        );

        return contents;
      }
    );

    // Wait for all files to be read.
    return await Promise.all(fileReadPromises);
  } catch (err) {
    console.error('Error loading files:', err);
  }
}

/**
 * What a callback reads off the completion provider it is handed.
 *
 * The older callbacks in this file take `any`; new ones should not.
 */
interface CallbackContext {
  cache: Map<string, cacheItem[]>;
}

/**
 * Reads and parses a YAML file that a cache item points at.
 *
 * Cached file paths are URIs; fs wants a path.
 *
 * @param string filePath
 *   The file path held on a cache item.
 * @returns unknown
 *   The parsed contents, or null if it could not be read or parsed.
 */
async function readYaml(filePath: string): Promise<unknown> {
  try {
    const path = new URL(filePath).pathname;
    const contents = await fs.promises.readFile(path, { encoding: 'utf-8' });

    return parse(contents);
  } catch {
    // A file that has moved or is mid-edit is not worth failing a completion.
    return null;
  }
}

/**
 * The bundle ids of a config entity type present in the codebase.
 *
 * Bundles are config entities, so YamlDiscovery has already cached one entry
 * per config name — taxonomy.vocabulary.tags, media.type.image and so on. The
 * ids are the part after the prefix.
 *
 * @param string prefix
 *   The config name prefix i.e. taxonomy.vocabulary.
 * @param map cache
 *   The cache object.
 * @returns string[]
 *   The bundle ids, in the order found.
 */
function getBundleIds(prefix: string, cache: Map<string, cacheItem[]>): string[] {
  const ids = new Set<string>();

  for (const key of cache.keys()) {
    if (key.startsWith(prefix) && !key.includes('/')) {
      const id = key.slice(prefix.length);

      // Guard against a longer config name that merely shares the prefix.
      if (id !== '' && !id.includes('.')) {
        ids.add(id);
      }
    }
  }

  return [...ids];
}

/**
 * Caches one completion per value.
 *
 * @param string detail
 *   The property path the suggestions belong to.
 * @param string[] values
 *   The values to offer.
 * @param string documentation
 *   The documentation to show against each.
 * @param string symbolType
 *   The icon to display.
 * @param any context
 *   The completion provider.
 */
function cacheValues(
  detail: string,
  values: string[],
  documentation: string,
  symbolType: string,
  context: CallbackContext
): void {
  for (const value of values) {
    addToCache(detail, '', '', value, documentation, `${value}\n- `, symbolType, context.cache);
  }
}

/**
 * Suggests the taxonomy vocabularies in the codebase.
 */
export async function getVocabularies(
  detail: string,
  context: CallbackContext
): Promise<string[]> {
  const ids = getBundleIds('taxonomy.vocabulary.', context.cache);

  cacheValues(detail, ids, 'Taxonomy vocabulary', 'config_item', context);

  return ids;
}

/**
 * Suggests the media types in the codebase.
 */
export async function getMediaTypes(
  detail: string,
  context: CallbackContext
): Promise<string[]> {
  const ids = getBundleIds('media.type.', context.cache);

  cacheValues(detail, ids, 'Media type', 'config_item', context);

  return ids;
}

/**
 * Suggests the regions declared by the themes in the codebase.
 *
 * Regions live in a theme's info file under `regions`, which YamlDiscovery does
 * not keep, so the info files the themes were discovered from are read again.
 */
export async function getRegionNames(
  detail: string,
  context: CallbackContext
): Promise<string[]> {
  const themes = (context.cache.get('install') ?? []).filter(
    (item) => item.item.completion.symbolType === 'theme'
  );

  const regions = new Map<string, string>();

  for (const theme of themes) {
    const info = (await readYaml(theme.item.filePath)) as {
      name?: string;
      regions?: Record<string, string>;
    } | null;

    if (info === null || typeof info.regions !== 'object' || info.regions === null) {
      continue;
    }

    for (const [region, label] of Object.entries(info.regions)) {
      // A region defined by several themes keeps the first label seen.
      if (!regions.has(region)) {
        regions.set(region, `${label} (${info.name})`);
      }
    }
  }

  for (const [region, label] of regions) {
    addToCache(detail, '', '', region, label, `${region}\n- `, 'config_item', context.cache);
  }

  return [...regions.keys()];
}

/**
 * Suggests the components of the display being changed.
 *
 * hideComponent applies to an entity form or view display, whose components are
 * the keys under `content` and `hidden` in that display's own config file.
 */
export async function getComponentNames(
  detail: string,
  context: CallbackContext
): Promise<string[]> {
  const parts = detail.split('/');

  // The last segment is the action; the one before it names the config.
  parts.pop();
  const configName = parts.pop();

  if (configName === undefined) {
    return [];
  }

  const cachedItems = context.cache.get(configName) ?? [];
  const components = new Set<string>();

  for (const current of cachedItems) {
    const display = (await readYaml(current.item.filePath)) as Record<
      string,
      unknown
    > | null;

    if (display === null) {
      continue;
    }

    for (const group of ['content', 'hidden']) {
      const entries = display[group];

      if (entries !== null && typeof entries === 'object') {
        Object.keys(entries).forEach((name) => components.add(name));
      }
    }
  }

  cacheValues(detail, [...components], 'Display component', 'config_item', context);

  return [...components];
}
