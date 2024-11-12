import fs from 'fs';
import { URL } from 'url';
import { addToCache } from '../utils/cache';

interface KnownCallbacks {
  [key: string]: ((...args: any[]) => any) | object | any;
}

export const functionMap: KnownCallbacks = {
  getConfigItems,
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
    context.cache
  );

  console.error(`Callback ${detail} is not supported yet.`);
}

export async function getConfigItems(
  detail: string,
  context: any
): Promise<any> {
  // Get config name from detail.
  const parts = detail.split('/');

  // Remove the last segment.
  parts.pop();

  // The last segment is the config name.
  const configName = parts.pop();

  const cachedItems = context.cache.get(configName) || [];

  // Read each file asynchronously.
  try {
    const fileReadPromises = cachedItems.map(
      async (current: {
        item: { filePath: string | { toString: () => string } };
      }) => {
        let label = null;

        const url = new URL(current.item.filePath).pathname;

        // Read the files asyncronously.
        const contents = await fs.promises.readFile(url, { encoding: 'utf-8' });

        // Find the index of the workspace folder in the path.
        const workspaceFolder = context.drupalWorkspace.workspaceFolder.name;
        const workspaceIndex = url.indexOf(workspaceFolder);
        if (workspaceIndex !== -1) {
          // Extract the substring starting after the workspace folder.
          label = url.substring(workspaceIndex + workspaceFolder.length);
        } else {
          label = url;
        }

        // Add completion item for config contents.
        addToCache(
          detail,
          url,
          '',
          label,
          contents,
          `${contents}\n  `,
          context.cache
        );
      }
    );

    // Wait for all files to be read.
    return await Promise.all(fileReadPromises);
  } catch (err) {
    console.error('Error loading files:', err);
  }
}
