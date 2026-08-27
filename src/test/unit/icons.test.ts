import { describe, it, expect } from 'vitest';
import { getIconKind } from '../../utils/icons';

describe('getIconKind', () => {
  it.each([
    ['recipe', 16],
    ['module', 1],
    ['theme', 15],
    ['profile', 18],
    ['content', 14],
    ['permission', 25],
    ['config', 9],
    ['config_item', 5],
    ['config_contents', 13],
    ['not_implemented', 22],
  ])('maps %s to CompletionItemKind %i', (type, expected) => {
    expect(getIconKind(type)).toBe(expected);
  });

  it('falls back to 0 for an unknown type', () => {
    expect(getIconKind('nonsense')).toBe(0);
    expect(getIconKind('')).toBe(0);
  });

  it('gives every symbol type processCompletionItem stores an icon', () => {
    // processCompletionItem stores config entries as 'config' and
    // 'config_item'; the callbacks add 'config_contents' and
    // 'not_implemented'. None of them should reach the fallback.
    for (const type of [
      'recipe',
      'module',
      'theme',
      'profile',
      'content',
      'permission',
      'config',
      'config_item',
      'config_contents',
      'not_implemented',
    ]) {
      expect(getIconKind(type), `${type} has no icon`).not.toBe(0);
    }
  });
});
