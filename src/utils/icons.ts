/**
 * Returns icon kind for the respective item.
 * @see https://code.visualstudio.com/docs/editor/intellisense#_types-of-completions
 *
 * @param string type
 *   The property type i.e. module
 *
 * @returns number
 *   The iconKind.
 */
export function getIconKind(type: string): number {
  const iconKinds: { [key: string]: number } = {
    not_implemented: 22,
    recipe: 16,
    module: 1,
    profile: 18,
    config_item: 5,
    config_contents: 13,
    theme: 15,
    content: 14,
    permission: 25,
  };

  return iconKinds[type] !== undefined ? iconKinds[type] : 0;
}
