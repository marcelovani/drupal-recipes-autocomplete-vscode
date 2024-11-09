import {
  Position,
  window,
} from 'vscode';

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
    if (obj.hasOwnProperty(key)) {
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
    if (!flattenedObj.hasOwnProperty(key)) {
      continue;
    }

    // Split the path into an array.
    const pathArray = path.split(separator);

    // Split the key.
    const keyArray = key.split(separator);

    // Check if the arrays contain the same size.
    if (keyArray.length !== pathArray.length) {
      continue;
    }

    // Try to match each item using regex.
    keyArray.forEach((item, index) => {
      // If the regex matches, we copy the item from path to the pathArray.
      if (pathArray[index].match(item === '*' ? '.*' : item)) {
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
   * @param Position position
   *   The cursor position.
   * @returns string
   *   The parent attribute.
   */
export function getPropertyPath(position: Position): string {
  if (position.character === 0) {
    return '';
  }

  let line = position.line;
  let lastCol = 0;
  let path = '';

  // The column of the property being evaluated.
  let propertyCol = 0;

  do {
    let attribute = window.activeTextEditor?.document.lineAt(line);

    // Check if there are leading spaces before the item.
    const spaces = attribute?.text.match(/^ */);
    if (attribute?.text !== '' && spaces) {
      propertyCol = spaces[0].length;

      // Initialise lastCol.
      if (lastCol === 0) {
        lastCol = propertyCol;
      }

      // Check if the current item is the parent of previous item.
      if (propertyCol < lastCol) {
        // Update the position of the lastCol.
        lastCol = propertyCol;

        // Remove colon from item.
        const property = attribute?.text.trim().replace(/:$/, '');

        // Build the path.
        path = property + (path !== '' ? '/' : '') + path;
      }
    }
    line--;
  } while (propertyCol > 0);

  return path;
}
