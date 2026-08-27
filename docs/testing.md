# Testing

The suite is in two layers. Run both with `npm test`.

| Command | Layer | Runs in |
| --- | --- | --- |
| `npm run test:unit` | Unit | Plain Node, about a second |
| `npm run test:integration` | Integration | A real VS Code extension host |
| `npm test` | Both | |
| `npm run test:coverage` | Unit, with a coverage report | |
| `npm run typecheck` | Type check, both TypeScript projects | |

## Unit tests

`src/test/unit/`, run by [vitest](https://vitest.dev). They cover the logic that
does not need an editor: the property path walk, the suggestion mapping lookup,
the cache, the icon mapping, file type detection, and the suggestion callbacks.

Some of those modules sit in an import graph that reaches `vscode`, which only
exists inside an extension host. `vitest.config.mts` aliases it to
`src/test/unit/vscode-stub.ts`. Add to the stub only what is needed to make a
module load — anything a test asserts on belongs in the test itself.

These files are excluded from `tsconfig.json` and type checked by
`tsconfig.unit.json` instead, because vitest runs them as ES modules while the
extension is compiled to CommonJS.

## Integration tests

`src/test/integration/`, run by
[`@vscode/test-cli`](https://github.com/microsoft/vscode-test-cli) in a real VS
Code instance. They open the fixture workspace, activate the extension, and ask
for completions the way the editor does, through
`vscode.executeCompletionItemProvider`.

They must be compiled first — `npm run test:integration` expects
`npm run compile-tests` to have run. `npm test` does both.

The extension starts its YAML scan without awaiting it, so the suggestion cache
fills in shortly after activation. `completionLabelsAt()` in
`src/test/integration/helpers.ts` polls until the expected suggestions appear
rather than sleeping for a fixed period.

## Fixture workspace

`src/test/fixtures/drupal-site/` is a Drupal-shaped tree, a few kilobytes in
size, holding one of everything the completion provider looks for:

```
composer.json                                    requires drupal/core-recommended
recipes/recipe_under_test/recipe.yml             the file most tests complete in
recipes/recipe_actions/recipe.yml                config action paths
web/core/recipes/core_test_recipe/recipe.yml     a recipe to suggest
web/modules/contrib/recipe_test_module/          info, permissions and config
web/themes/contrib/recipe_test_theme/            a theme to suggest
```

The extension only activates when the workspace `composer.json` requires
`drupal/core-recommended`, which is why the fixture has one.

When you add a case, prefer extending the fixture over pointing a test at a real
Drupal codebase: CI has no Drupal to point at.

## Testing against a real codebase

The automated suite does not touch a real site. To try the extension against
one by hand, open a second window with the extension loaded from source:

```bash
code --extensionDevelopmentPath="$PWD" /path/to/a/drupal/codebase --new-window
```

Then open a `recipe.yml` in that codebase and press `Ctrl+Space`.

## Continuous integration

`.github/workflows/pr-checks.yml` runs build, lint, unit and integration as
separate jobs. The integration job wraps the run in `xvfb-run` because the
extension host needs a display and the runners are headless.
