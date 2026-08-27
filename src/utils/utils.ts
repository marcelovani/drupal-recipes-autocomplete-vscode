import { parse as parseYaml } from 'yaml';

/**
 * The slice of TextDocument that getPropertyPath reads.
 *
 * Declared structurally so the walk can be exercised without a VS Code host.
 * A vscode.TextDocument satisfies it as-is.
 */
export interface TextLineSource {
  lineAt(line: number): { text: string };
}

/**
 * The slice of Position that getPropertyPath reads.
 * A vscode.Position satisfies it as-is.
 */
export interface CursorPosition {
  line: number;
  character: number;
}

/**
 * Flattens a nested object into a single-depth object, example the object:
 * {
 *   config
 *     actions:
 *       foo:
 *         bar: true
 * }
 *
 * After flattening, object becomes { config.actions.foo.bar: true }
 *
 * @param {Object} obj - The object to flatten.
 * @param {string} separator - The character that separates the path parts.
 * @param {string} parentKey - The base key to prefix (used in recursion).
 * @param {Object} result - The accumulator for storing flattened results.
 * @returns {Object} - The flattened object.
 */
const flattenObject = (
  obj: any,
  separator = '.',
  parentKey = '',
  result: any = {}
): any => {
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      const newKey = parentKey ? `${parentKey}/${key}` : key;
      if (
        typeof obj[key] === 'object' &&
        obj[key] !== null &&
        !Array.isArray(obj[key])
      ) {
        flattenObject(obj[key], separator, newKey, result);
      } else {
        result[newKey] = obj[key];
      }
    }
  }
  return result;
};

/**
 * Finds a value in a flattened object by comparing the keys. The keys are tested using regex.
 *
 * @param {Object} obj - The object.
 * @param {string} path - The path to search.
 * @param {string} separator - The character that separates the path parts.
 * @returns {*} - The value at the specified path, or false if not found.
 */
export function getValueByPath(
  obj: any,
  path: string,
  separator: string
): boolean | any {
  // Flatten the object.
  const flattenedObj = flattenObject(obj, separator);

  // Loop through each item in the flattened object.
  for (const key in flattenedObj) {
    if (!Object.prototype.hasOwnProperty.call(flattenedObj, key)) {
      continue;
    }

    // Split the path into an array.
    const pathArray = path.split(separator);

    // Split the key.
    // eslint-disable-next-line prefer-const
    let keyArray = key.split(separator);

    // Check if the arrays contain the same size.
    if (keyArray.length !== pathArray.length) {
      continue;
    }

    // Try to match each item using regex.
    keyArray.forEach((item, index) => {
      // If the regex matches, we copy the item from path to the pathArray.
      if (keyArray[index] !== pathArray[index] && pathArray[index].match(item === '*' ? '.*' : `${item}$`)) {
        keyArray[index] = pathArray[index];
      }
    });

    // Convert keyArray into string, using slashes.
    if (keyArray.join(separator) === pathArray.join(separator)) {
      return flattenedObj[key];
    }
  }

  return false;
}

/**
   * When autocomplete is triggered by pressing ^ + Space we need to find the path of the parent item.
   * The path will be separated by slashes i.e. config/import/foo
   *
   * @todo: Need to update this code to resolve paths that are in the same line i.e.
   * config:
   *   actions:
   *     block.block.foo
   *       placeBlockInDefaultTheme:
   *         id: <- This is the item to autocomplete
   *
   * @param TextLineSource document
   *   The document being completed in.
   * @param CursorPosition position
   *   The cursor position.
   * @returns string
   *   The parent attribute.
   */
export function getPropertyPath(
  document: TextLineSource,
  position: CursorPosition
): string {
  if (position.character === 0) {
    return '';
  }

  let line = position.line;
  let lastCol = 0;
  let path = '';
  const separator = '/';

  // The column of the property being evaluated.
  let propertyCol = 0;

  do {
    // Walking up from an entirely indented document runs off the top of the
    // file, and TextDocument.lineAt throws on an out-of-range line.
    if (line < 0) {
      break;
    }

    const attribute = document.lineAt(line);

    const text = attribute?.text !== undefined ? attribute?.text : '';

    // Check if there are leading spaces before the item.
    const leadingSpaces = text.match(/^ */);
    // Ignore lines with leading spaces.
    if (leadingSpaces && text !== '') {
      // Update propertyCol.
      propertyCol = leadingSpaces[0].length;

      if (lastCol === 0) {
        // Initialise lastCol.
        lastCol = propertyCol;
      }
    }

    // Check if there is a property on the same line.
    if (leadingSpaces && line === position.line && text.trim()[text.trim().length - 1] === ':') {
      // Initialise path.
      path = text.trim().replace(/:$/, '');
    }
    // Traverse the editor upwards.
    // Ignore lines with leading spaces or lines that contain only hyphen.
    else if (leadingSpaces && text !== '' && text.trim() !== '-') {
      // Check if the current item is the parent of previous item.
      if (propertyCol < lastCol) {
        // Update the position of the lastCol.
        lastCol = propertyCol;

        // Remove colon from item.
        const property = text.trim().replace(/:$/, '');

        // Build the path.
        path = property + (path !== '' ? separator : '') + path;
      }
    }
    line--;
  } while (propertyCol > 0);

  return path;
}

/**
 * The values already written under a property path in a recipe.
 *
 * Used to keep the completion list from offering something the recipe already
 * has. The document is parsed as it stands, which mid-edit is often invalid
 * YAML; that is not an error, it just means nothing is filtered.
 *
 * @param string text
 *   The document contents.
 * @param string path
 *   The property path, separated by slashes i.e. config/import.
 * @returns Set<string>
 *   The values present at that path, or an empty set.
 */
export function getExistingValues(text: string, path: string): Set<string> {
  const values = new Set<string>();

  if (path === '') {
    return values;
  }

  let parsed: unknown;

  try {
    parsed = parseYaml(text);
  } catch {
    // A recipe being typed into is invalid more often than not.
    return values;
  }

  let node: unknown = parsed;

  for (const segment of path.split('/')) {
    if (node === null || typeof node !== 'object' || Array.isArray(node)) {
      return values;
    }

    node = (node as Record<string, unknown>)[segment];
  }

  // A sequence holds its entries; a mapping holds them as keys.
  if (Array.isArray(node)) {
    for (const entry of node) {
      if (typeof entry === 'string') {
        values.add(entry);
      }
    }
  } else if (node !== null && typeof node === 'object') {
    for (const key of Object.keys(node)) {
      values.add(key);
    }
  }

  return values;
}

/**
 * The value a completion would insert, without the snippet that follows it.
 *
 * Insert texts carry the continuation a recipe author wants next, i.e.
 * `node\n- ` or `node:\n  - `, so only the first line identifies the item.
 *
 * @param string insertText
 *   The completion's insert text.
 * @returns string
 *   The value it would add to the recipe.
 */
export function getInsertedValue(insertText: string): string {
  const [first] = insertText.split('\n');

  return first
    .trim()
    .replace(/:$/, '')
    .replace(/^['"]|['"]$/g, '');
}
