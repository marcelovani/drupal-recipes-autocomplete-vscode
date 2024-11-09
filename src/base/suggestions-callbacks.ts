import fs from 'fs';
import { URL } from 'url';

interface FunctionDictionary {
  // [key: string]: (detail: string) => string;
  [key: string]: ((...args: any[]) => any) | object | any; // Accepts functions, objects, or any value
}

export const functionMap: FunctionDictionary = {
  getConfigItems,
};

// Used to store generic data from parsed yamls.
interface globalStorageInterface {
  [key: string]: any;
}

// Export a constant that stores an array of key-value.
export const globalStorage: globalStorageInterface[] = [];

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

  // @todo get this from filescache
  const items = globalStorage.filter((item) => item.config === configName);

  // Read each file asynchronously.
  try {
    const fileReadPromises = items.map(async (item) => {
      let label = null;

      const url = new URL(item.path).pathname;

      // Read the files asyncronously.
      const contents = await fs.promises.readFile(url, { encoding: 'utf-8' });

      // Find the index of the workspace folder in the path.
      const workspaceFolder = context.drupalWorkspace.workspaceFolder.name;
      const workspaceIndex = url.indexOf(workspaceFolder);
      if (workspaceIndex !== -1) {
        // Extract the substring starting after the workspace folder.
        label = url.substring(workspaceIndex + workspaceFolder.length);
      }
      else {
        label = url;
      }

      if (typeof context.storeCompletionItem === 'function') {
        context.storeCompletionItem(
          detail,
           // Add index to the label. This is a workaround for cases where the same
           // config name is provided by multiple modules, profiles, themes.
          label,
          contents,
          `${contents}\n  `
        );
      }
    });

    // Wait for all files to be read.
    return await Promise.all(fileReadPromises);
  } catch (err) {
    console.error('Error loading files:', err);
  }
}
