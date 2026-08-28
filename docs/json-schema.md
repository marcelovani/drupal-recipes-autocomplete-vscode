# The JSON schema

Half of what this extension appears to do is not done by this extension. The
key names in `recipe.yml`, and the validation that flags a typo, come from a
JSON schema hosted by [SchemaStore](https://www.schemastore.org) and fetched by
the `redhat.vscode-yaml` extension.

Knowing which half a gap belongs to saves a lot of time.

| | Comes from | Lives in |
| --- | --- | --- |
| Key and action **names**, validation, hover text | `drupal-recipe.json` | [SchemaStore](https://github.com/SchemaStore/schemastore/blob/master/src/schemas/json/drupal-recipe.json) |
| **Values** read from your Drupal codebase — module names, config names, permissions | this extension | `src/base/suggestions-mapping.json` and `src/base/suggestions-callbacks.ts` |

An action that is missing entirely is usually a schema problem. An action whose
name completes but whose values do not is usually ours.

## How it is wired

`package.json` declares the schema against the recipe filenames:

```json
"yamlValidation": [
  {
    "fileMatch": ["recipe.yml", "recipe.yaml"],
    "url": "https://raw.githubusercontent.com/SchemaStore/schemastore/refs/heads/master/src/schemas/json/drupal-recipe.json",
    "$fork": "https://raw.githubusercontent.com/marcelovani/schemastore/refs/heads/drupal-recipes/src/schemas/json/drupal-recipe.json",
    "$url": "file:///path/to/your/schemastore/src/schemas/json/drupal-recipe.json"
  }
]
```

`url` is the one that is used. `$fork` and `$url` are parking spaces: copy either
over `url` to develop against a change before it is merged, and don't commit
that. `$url` expects a clone of SchemaStore of your own — it is not an npm
dependency of this project and nothing installs it for you.

## History

The schema was not created for this extension; it already existed on
SchemaStore, which is why the first release could complete the basic properties
without scanning anything.

- [SchemaStore#4186](https://github.com/SchemaStore/schemastore/issues/4186) —
  the issue asking for the schema to cover more of the recipe format.
- [SchemaStore#4187](https://github.com/SchemaStore/schemastore/pull/4187) —
  merged 4 November 2024. Extended the schema from the config action list,
  fixed the required properties, and gave the default snippet a description so
  new files offer "New Recipe" rather than the filename. This is what took the
  extension from completing roughly a fifth of the static items to most of them.
- [Drupal #3475786](https://www.drupal.org/project/distributions_recipes/issues/3475786)
  — the standing proposal to make the schema the structure that Drupal's own
  recipe documentation and validation are generated from, rather than a
  hand-written copy of them.

Contributing to SchemaStore: their
[CONTRIBUTING.md](https://github.com/SchemaStore/schemastore/blob/master/CONTRIBUTING.md).
Their CI validates schemas with Ajv, and every schema has a test file — for this
one, `src/test/drupal-recipe/drupal-recipe.yml`. A change that adds properties
should extend that test too, as #4187 did.

## Keeping it current

The schema is hand-maintained from Drupal's recipe documentation, and both drift
behind core. Two things follow from that:

**Check the schema against core, not against the docs.** The docs can lag as
easily as the schema. `scripts/extract-config-actions.php` generates the list
from a core checkout, and `src/base/core-config-actions.json` is its committed
output. See [tracking-drupal-recipes.md](./tracking-drupal-recipes.md).

**Some actions cannot be in a static schema at all.**
`PermissionsPerBundleDeriver` generates `grantPermissionsForEach<BundleEntityType>`
from the entity types installed on the site, and `AddModerationDeriver` does the
same for `add<PluralBundleEntityType>`. Those names differ per site. The schema
can only carry the ones core happens to ship, which is the case for scanning the
codebase — see issue #8.

Likewise `EntityMethodDeriver` pluralises every `#[ActionMethod]` name unless
told not to, so `setFilterConfig` implies `setFilterConfigs`. The schema needs
both spellings, as it already has for `grantPermission(s)`.

## Where the schema currently stands

Checked against `drupal/drupal` `11.x`. `input`, `extra` and `config.strict` are
absent from the schema, along with seventeen config actions. The schema sets
`additionalProperties: true`, so none of these are reported as *invalid* — they
simply get no completion and no validation.

Tracked in issue #39.
