import { describe, it, expect } from 'vitest';
import { getPropertyPath, getValueByPath, TextLineSource } from '../../utils/utils';
import suggestionsMapping from '../../base/suggestions-mapping.json';

/**
 * Builds the slice of TextDocument that getPropertyPath walks.
 */
function documentOf(source: string): TextLineSource {
  const lines = source.split('\n');

  return {
    lineAt: (line: number) => {
      if (line < 0 || line >= lines.length) {
        throw new Error(`Illegal value for line: ${line}`);
      }

      return { text: lines[line] };
    },
  };
}

describe('getPropertyPath', () => {
  it('returns nothing at the start of a line', () => {
    const document = documentOf('recipes:');

    expect(getPropertyPath(document, { line: 0, character: 0 })).toBe('');
  });

  it('returns a top level property', () => {
    const document = documentOf(['name: Test', 'recipes:'].join('\n'));

    expect(getPropertyPath(document, { line: 1, character: 8 })).toBe('recipes');
  });

  it('joins a nested property to its parent', () => {
    const document = documentOf(
      ['name: Test', 'config:', '  import:'].join('\n')
    );

    expect(getPropertyPath(document, { line: 2, character: 10 })).toBe(
      'config/import'
    );
  });

  it('walks the whole way up a deeply nested property', () => {
    const document = documentOf(
      [
        'config:',
        '  actions:',
        '    node.settings:',
        '      simpleConfigUpdate:',
      ].join('\n')
    );

    expect(getPropertyPath(document, { line: 3, character: 25 })).toBe(
      'config/actions/node.settings/simpleConfigUpdate'
    );
  });

  it('resolves the parent from inside a sequence', () => {
    const document = documentOf(['install:', '  - node', '  - '].join('\n'));

    expect(getPropertyPath(document, { line: 2, character: 4 })).toBe('install');
  });

  it('skips siblings at the same indentation', () => {
    const document = documentOf(
      ['config:', '  import:', '  actions:'].join('\n')
    );

    expect(getPropertyPath(document, { line: 2, character: 11 })).toBe(
      'config/actions'
    );
  });

  it('stops at the top of the file rather than reading past it', () => {
    // Every line is indented, so the walk never meets a zero-indent line and
    // runs off the top. lineAt would throw on a negative line number.
    const document = documentOf(['  foo:', '    bar:'].join('\n'));

    expect(getPropertyPath(document, { line: 1, character: 9 })).toBe('foo/bar');
  });
});

describe('getValueByPath', () => {
  it('resolves a literal path', () => {
    const value = getValueByPath(
      suggestionsMapping,
      'config/actions/*/grantPermission',
      '/'
    );

    expect(value).toBe('ref:global/permissions');
  });

  it('matches a trailing wildcard segment against a real config name', () => {
    const value = getValueByPath(
      suggestionsMapping,
      'config/actions/node.settings/create',
      '/'
    );

    expect(value).toBe('callback:getConfigContents');
  });

  it('matches a prefixed wildcard segment', () => {
    const value = getValueByPath(
      suggestionsMapping,
      'config/actions/user.role.editor/grantPermissions',
      '/'
    );

    expect(value).toBe('ref:global/permissions');
  });

  it('prefers a specific key over the bare wildcard', () => {
    const value = getValueByPath(
      suggestionsMapping,
      'config/actions/block.block.hero/placeBlockInDefaultTheme/id',
      '/'
    );

    expect(value).toBe('callback:getBlockIds');
  });

  it('does not confuse similarly named siblings', () => {
    // grantPermission and grantPermissions differ by one character and live at
    // the same depth under different parents.
    const value = getValueByPath(
      suggestionsMapping,
      'config/actions/user.role.editor/grantPermission',
      '/'
    );

    expect(value).toBe('ref:global/permissions');
  });

  it('returns false for a path that is not mapped', () => {
    const value = getValueByPath(
      suggestionsMapping,
      'config/actions/node.settings/noSuchAction',
      '/'
    );

    expect(value).toBe(false);
  });

  it('returns false when the path is a different depth to every key', () => {
    const value = getValueByPath(suggestionsMapping, 'config', '/');

    expect(value).toBe(false);
  });
});
