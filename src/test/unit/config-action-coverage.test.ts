import { describe, it, expect } from 'vitest';
import suggestionsMapping from '../../base/suggestions-mapping.json';
import coreActions from '../../base/core-config-actions.json';
import coverage from '../../base/action-coverage.json';
import { functionMap } from '../../base/suggestions-callbacks';

/**
 * Every key the mapping uses under config/actions, at any depth.
 *
 * The mapping mixes three kinds of key — config name patterns like
 * `block.block.*`, action names, and the parameter names underneath an action —
 * so membership here means "the mapping mentions it", not "it is an action".
 */
const mappedKeys = new Set<string>();

(function collect(node: Record<string, unknown>) {
  for (const [key, value] of Object.entries(node)) {
    if (key === 'comment') {
      continue;
    }

    mappedKeys.add(key);

    if (value && typeof value === 'object' && !Array.isArray(value)) {
      collect(value as Record<string, unknown>);
    }
  }
})(suggestionsMapping.config.actions as unknown as Record<string, unknown>);

/**
 * Every `callback:` and `ref:` the mapping points at.
 */
function collectTargets() {
  const callbacks = new Set<string>();
  const refs = new Set<string>();

  const read = (value: string) => {
    const [kind, ...rest] = value.split(':');
    const detail = rest.join(':');

    if (kind === 'callback') {
      callbacks.add(detail);
    }

    if (kind === 'ref') {
      refs.add(detail);
    }
  };

  (function walk(node: unknown) {
    if (typeof node === 'string') {
      read(node);
      return;
    }

    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    if (node && typeof node === 'object') {
      Object.values(node).forEach(walk);
    }
  })(suggestionsMapping.config.actions);

  return { callbacks, refs };
}

const { callbacks, refs } = collectTargets();

describe('core config action coverage', () => {
  it('accounts for every config action core exposes', () => {
    // A core action must be mapped, deliberately left static, or on the
    // backlog. Anything else is an action that appeared in core and nobody
    // noticed — which is the drift this test exists to catch.
    const unaccounted = coreActions.actions
      .map((action) => action.name)
      .filter(
        (name) =>
          !mappedKeys.has(name) &&
          !coverage.staticOnly.includes(name) &&
          !(name in coverage.pending)
      );

    expect(unaccounted, 'Re-run scripts/extract-config-actions.php and classify these in action-coverage.json').toEqual([]);
  });

  it('does not classify an action twice', () => {
    const both = coverage.staticOnly.filter((name) => name in coverage.pending);

    expect(both).toEqual([]);
  });

  it('does not classify actions core no longer has', () => {
    const known = new Set(coreActions.actions.map((action) => action.name));
    const stale = [
      ...coverage.staticOnly,
      ...Object.keys(coverage.pending),
    ].filter((name) => !known.has(name));

    expect(stale, 'These are classified but are not in core any more').toEqual([]);
  });

  it('records which core checkout the action list came from', () => {
    expect(coreActions.generatedFrom.commit).toMatch(/^[0-9a-f]{7,}$/);
    expect(coreActions.generatedFrom.branch).toBeTruthy();
  });
});

describe('suggestions-mapping targets', () => {
  it('names only callbacks that exist or are known to be missing', () => {
    const missing = [...callbacks].filter(
      (name) => !(name in functionMap) && !coverage.unimplementedCallbacks.includes(name)
    );

    expect(missing, 'Add the callback to suggestions-callbacks.ts, or record it in action-coverage.json').toEqual([]);
  });

  it('has no callbacks listed as missing that are now implemented', () => {
    const landed = coverage.unimplementedCallbacks.filter((name) => name in functionMap);

    expect(landed, 'Implemented — remove from unimplementedCallbacks in action-coverage.json').toEqual([]);
  });

  it('points every ref at a key the discovery actually produces', () => {
    const unknown = [...refs].filter((target) => !coverage.refTargets.includes(target));

    expect(unknown, 'A ref pointing at a key nothing writes yields no suggestions').toEqual([]);
  });

  it('still resolves the callbacks it does implement', () => {
    for (const name of Object.keys(functionMap)) {
      expect(typeof functionMap[name]).toBe('function');
    }
  });
});
