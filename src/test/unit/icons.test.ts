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
    ['config_item', 5],
    ['config_contents', 13],
    ['not_implemented', 22],
  ])('maps %s to CompletionItemKind %i', (type, expected) => {
    expect(getIconKind(type)).toBe(expected);
  });

  it('falls back to 0 for an unknown type', () => {
    expect(getIconKind('config')).toBe(0);
    expect(getIconKind('')).toBe(0);
  });
});
