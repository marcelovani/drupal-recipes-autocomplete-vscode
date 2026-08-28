# Keeping up with Drupal recipes

Drupal keeps adding config actions. This is how to find what has been added
since the last release and decide what the extension needs to do about it.

## Where the extension gets its knowledge

Two separate mechanisms, and it matters which one a gap belongs to.

**Action names come from a JSON schema, not from this repository.**
`package.json` declares a `yamlValidation` entry pointing at SchemaStore's
`drupal-recipe.json`. `redhat.vscode-yaml` fetches it and provides both
validation and completion of the key names. If an action is missing there, the
fix is a pull request to SchemaStore — this repository cannot ship it. There is
a `$fork` URL in the same block for working on the schema before it is merged.

**Values come from this repository.** `src/base/suggestions-mapping.json` maps a
property path to either a `ref:` at another suggestion list or a `callback:` to
a function in `src/base/suggestions-callbacks.ts`, which reads the Drupal
codebase in the workspace. Only actions whose *values* are worth completing from
the codebase need an entry.

So "action X is missing" splits into two different jobs, in two repositories.
[json-schema.md](./json-schema.md) covers the schema half — how it is wired, how to
develop against a fork, and how to contribute a change upstream.

## Source first, documentation second

Read core's source for the list of actions and the documentation for how each
one is written. Documentation is written by people who can forget; source
cannot.

Two things generate an action name:

- A `ConfigAction` plugin class, whose `id` is the action name — unless it names
  a deriver, in which case the deriver decides.
- An `#[ActionMethod]` attribute on a config entity method. `EntityMethodDeriver`
  makes one action per method **plus a pluralised alias** through
  `EnglishInflector`, unless `pluralize: FALSE`. This is why `hideComponents` is
  a real action even though that string appears nowhere in core, and why
  grepping for literal names gives wrong answers.

Some names do not exist until a site is built.
`PermissionsPerBundleDeriver` generates `grantPermissionsForEach<BundleEntityType>`
from the entity types that are installed, so `grantPermissionsForEachMediaType`
exists only where media is. No static list can be complete for those, which is
the argument behind issue #8.

## Finding what changed

**1. Regenerate the action list from core.**

```bash
php scripts/extract-config-actions.php /path/to/drupal-core \
  /path/to/any/drupal/vendor/autoload.php > /tmp/actions.json
```

It needs `symfony/string` from any Drupal install, to pluralise the way core
does. Compare against `src/base/core-config-actions.json`, which records the
core commit it was generated from.

The script reports deriver-based plugins separately, because it cannot resolve
them. Read those derivers by hand — the fixed names they produce are already
folded into `core-config-actions.json`.

**2. Read the documentation for the ones that are new.**

The recipes documentation is a git repository, so it diffs:

```bash
git clone https://git.drupalcode.org/project/distributions_recipes.git
git -C distributions_recipes log --since=<last release date> -- docs/
```

`docs/config_action_list.md` and `docs/config_action_list_contrib.md` are the
action reference; `docs/recipe_author_guide.md` covers the top-level keys
including `input`. Commit messages are usefully literal — "Document setStatus
config action", "Document addNavigationBlock".

This is where the YAML shape comes from. The source gives a name; the docs give
the nested keys underneath it, which is what a mapping entry needs.

**3. Check the change record for anything still unclear.**

Change records carry a worked YAML example and say which version introduced the
action. They are the best single source for a specific action, just not for
knowing the full set.

## Recording the decision

Every action in `core-config-actions.json` must be accounted for in
`src/base/action-coverage.json`, in one of three ways:

- present in `suggestions-mapping.json` — the extension completes its values;
- in `staticOnly` — it takes a scalar or free text and there is nothing in the
  codebase worth suggesting;
- in `pending` — it would benefit from suggestions and has not been done, with a
  note saying what it would need.

`src/test/unit/config-action-coverage.test.ts` enforces that. Add an action to
`core-config-actions.json` without classifying it and the suite fails, naming
the action. That is the mechanism that stops this drifting again: the answer to
"do we cover everything?" is a test run rather than an afternoon of reading.

The same test checks that every `callback:` in the mapping either exists in
`functionMap` or is listed in `unimplementedCallbacks`. That list is not
cosmetic — the provider silently falls back to a "not implemented yet"
placeholder for a callback it cannot find, so without the test a typo and a
deliberate gap look identical.

## After a port

Update `generatedFrom` in `core-config-actions.json` to the core commit read,
shrink `pending` and `unimplementedCallbacks` as entries land, and extend the
fixture under `src/test/fixtures/drupal-site/` so new actions are exercised
through `executeCompletionItemProvider` like the existing ones. See
[testing.md](./testing.md).
