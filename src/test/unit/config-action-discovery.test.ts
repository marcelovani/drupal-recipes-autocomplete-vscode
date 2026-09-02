import { describe, it, expect } from 'vitest';
import {
  actionsFromBundles,
  actionsInPhp,
  collectActions,
  pluralise,
} from '../../base/config-action-discovery';
import coreActions from '../../base/core-config-actions.json';

describe('pluralise', () => {
  it.each([
    ['grantPermission', 'grantPermissions'],
    ['hideComponent', 'hideComponents'],
    ['setThirdPartySetting', 'setThirdPartySettings'],
    ['addImageEffect', 'addImageEffects'],
    ['setFilterConfig', 'setFilterConfigs'],
  ])('turns %s into %s', (singular, plural) => {
    expect(pluralise(singular)).toBe(plural);
  });

  it('does not pluralise a name that already reads as one', () => {
    expect(pluralise('setProperties')).toBe('');
  });
});

describe('actionsInPhp', () => {
  it('reads the id off a ConfigAction plugin', () => {
    const source = `
      #[ConfigAction(
        id: 'doSomething',
        admin_label: new TranslatableMarkup('Do something'),
      )]
      final class DoSomething implements ConfigActionPluginInterface {}
    `;

    expect(actionsInPhp(source, 'mymodule')).toEqual([
      { name: 'doSomething', origin: 'mymodule' },
    ]);
  });

  it('drops the entity type prefix from a scoped id', () => {
    // editor:addItemToToolbar is written as addItemToToolbar in a recipe.
    const source = "#[ConfigAction(id: 'editor:addItemToToolbar')]";

    expect(actionsInPhp(source, 'x').map((a) => a.name)).toEqual([
      'addItemToToolbar',
    ]);
  });

  it('ignores a plugin whose names come from a deriver', () => {
    // The deriver decides, and it needs a running site to do so.
    const source = `
      #[ConfigAction(
        id: 'permissions_per_bundle',
        deriver: PermissionsPerBundleDeriver::class,
      )]
    `;

    expect(actionsInPhp(source, 'x')).toEqual([]);
  });

  it('reads an ActionMethod and its pluralised alias', () => {
    const source = `
      #[ActionMethod(adminLabel: new TranslatableMarkup('Set the thing'))]
      public function setThing(string $value): void {}
    `;

    expect(actionsInPhp(source, 'x').map((a) => a.name)).toEqual([
      'setThing',
      'setThings',
    ]);
  });

  it('honours pluralize: FALSE', () => {
    const source = `
      #[ActionMethod(pluralize: FALSE)]
      public function setThing(string $value): void {}
    `;

    expect(actionsInPhp(source, 'x').map((a) => a.name)).toEqual(['setThing']);
  });

  it('honours an explicit plural', () => {
    const source = `
      #[ActionMethod(pluralize: 'addMultipleThings')]
      public function addThing(string $value): void {}
    `;

    expect(actionsInPhp(source, 'x').map((a) => a.name)).toEqual([
      'addThing',
      'addMultipleThings',
    ]);
  });

  it('honours an explicit name', () => {
    const source = `
      #[ActionMethod(name: 'reallyCalledThis')]
      public function somethingElse(string $value): void {}
    `;

    expect(actionsInPhp(source, 'x').map((a) => a.name)).toContain(
      'reallyCalledThis'
    );
  });

  it('sees past another attribute between the two', () => {
    const source = `
      #[ActionMethod(exists: Exists::ErrorIfNotExists)]
      #[SomethingElse]
      public function setThing(string $value): void {}
    `;

    expect(actionsInPhp(source, 'x').map((a) => a.name)).toContain('setThing');
  });

  it('finds nothing in a file that declares nothing', () => {
    expect(actionsInPhp('<?php class Foo { public function bar() {} }', 'x')).toEqual(
      []
    );
  });
});

describe('actionsFromBundles', () => {
  it('offers a per-bundle action for each entity type present', () => {
    const names = [
      'node.type.article',
      'taxonomy.vocabulary.tags',
      'system.site',
    ];

    expect(actionsFromBundles(names).map((a) => a.name).sort()).toEqual([
      'grantPermissionsForEachNodeType',
      'grantPermissionsForEachTaxonomyVocabulary',
    ]);
  });

  it('offers nothing for an entity type that is not present', () => {
    expect(actionsFromBundles(['system.site'])).toEqual([]);
  });

  it('does not mistake a longer config name that shares the prefix', () => {
    expect(actionsFromBundles(['node.type.article.extra'])).toEqual([]);
  });

  it('offers each entity type once however many bundles it has', () => {
    const names = ['node.type.article', 'node.type.page', 'node.type.blog'];

    expect(actionsFromBundles(names)).toHaveLength(1);
  });
});

describe('collectActions', () => {
  it('includes every action core ships', () => {
    const names = collectActions([], []).map((a) => a.name);

    for (const action of coreActions.actions) {
      expect(names).toContain(action.name);
    }
  });

  it('adds what the codebase contributes', () => {
    const actions = collectActions(
      ['media.type.image'],
      [{ name: 'somethingCustom', origin: 'Provided by mymodule' }]
    );
    const names = actions.map((a) => a.name);

    expect(names).toContain('grantPermissionsForEachMediaType');
    expect(names).toContain('somethingCustom');
  });

  it('does not let a module claim an action core already has', () => {
    const actions = collectActions(
      [],
      [{ name: 'simpleConfigUpdate', origin: 'Provided by mymodule' }]
    );
    const matches = actions.filter((a) => a.name === 'simpleConfigUpdate');

    expect(matches).toHaveLength(1);
    expect(matches[0].origin).toBe('Drupal core');
  });

  it('returns them sorted, with no duplicates', () => {
    const names = collectActions(['node.type.article'], []).map((a) => a.name);

    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    expect(new Set(names).size).toBe(names.length);
  });
});
