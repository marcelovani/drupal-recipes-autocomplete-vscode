import { describe, it, expect } from 'vitest';
import { getExistingValues, getInsertedValue } from '../../utils/utils';

const RECIPE = [
  "name: 'Test'",
  'install:',
  '  - node',
  '  - text',
  'config:',
  '  import:',
  '    node: "*"',
  '  actions:',
  '    user.role.editor:',
  '      grantPermissions:',
  "        - 'access content'",
  "        - 'view own unpublished content'",
].join('\n');

describe('getExistingValues', () => {
  it('reads the entries of a sequence', () => {
    expect(getExistingValues(RECIPE, 'install')).toEqual(
      new Set(['node', 'text'])
    );
  });

  it('reads the keys of a mapping', () => {
    expect(getExistingValues(RECIPE, 'config/import')).toEqual(
      new Set(['node'])
    );
  });

  it('walks a deep path', () => {
    expect(
      getExistingValues(
        RECIPE,
        'config/actions/user.role.editor/grantPermissions'
      )
    ).toEqual(new Set(['access content', 'view own unpublished content']));
  });

  it('returns nothing for a path the recipe does not have', () => {
    expect(getExistingValues(RECIPE, 'recipes')).toEqual(new Set());
    expect(getExistingValues(RECIPE, 'config/actions/user.role.admin')).toEqual(
      new Set()
    );
  });

  it('returns nothing for an empty path', () => {
    expect(getExistingValues(RECIPE, '')).toEqual(new Set());
  });

  it('returns nothing rather than throwing on invalid yaml', () => {
    // Half-typed recipes are invalid far more often than they are valid.
    expect(getExistingValues('install:\n  - node\n :::bad', 'install')).toEqual(
      new Set()
    );
  });

  it('returns nothing when the path runs through a scalar', () => {
    expect(getExistingValues(RECIPE, 'name/nope')).toEqual(new Set());
  });
});

describe('getInsertedValue', () => {
  it.each([
    ['node\n- ', 'node'],
    ['node:\n  - ', 'node'],
    ["'access content'\n- ", 'access content'],
    ['"access content"\n- ', 'access content'],
    ['foo.settings:\n  ', 'foo.settings'],
    ['bar.starterkit\n- ', 'bar.starterkit'],
    ['plain', 'plain'],
  ])('reduces %j to %j', (insertText, expected) => {
    expect(getInsertedValue(insertText)).toBe(expected);
  });
});
