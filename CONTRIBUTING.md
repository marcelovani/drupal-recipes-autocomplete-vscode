# Contributing

You can start by searching if there is already an issue in the (project page)[https://github.com/marcelovani/drupal-recipes-autocomplete-vscode/issues]. You can comment on existing issues or create a new issue.

## Working locally

1. Fork and check out the repo
2. Push the changes to your fork
3. Create a pull request and link to the issue

The key names in `recipe.yml` come from a JSON schema on SchemaStore rather than
from this codebase, so a missing key is often a change to make there instead of here.
[docs/json-schema.md](docs/json-schema.md) explains how the two halves fit together,
how to develop against a fork of the schema, and the history of the
[pull request](https://github.com/SchemaStore/schemastore/pull/4187) that the extension
was built on.

### Running the tests

```bash
npm install
npm test
```

That runs the unit tests and then the integration tests. See [docs/testing.md](docs/testing.md)
for what each layer covers and how to add to the fixture workspace.

### Keeping up with Drupal

Drupal keeps adding config actions. [docs/tracking-drupal-recipes.md](docs/tracking-drupal-recipes.md)
explains how to find what has been added since the last release, which of the two
mechanisms a gap belongs to, and how the coverage test stops it drifting again.

### Testing it locally

You can also debug and test it by hand.

1. Click menu Run > Start debugging.
2. You may see a prompt to ask you to run NPM Watch, you can confirm. Watch is used to compile the code, so that it can be debugged.
3. You can see the this by clicking menu View > Terminal.
4. Once the new window opens, you can open an existing Drupal codebase and edit an existing recipe.yml file or create a new one.
5. You can now test the autocomplete suggestions and recipe validations.

### Releasing

A release is a pushed tag: `.github/workflows/publish.yml` runs the suite, checks
the tag matches `package.json`, and publishes to the Visual Studio Marketplace and
Open VSX before creating the GitHub release.

```bash
git tag -a v1.2.3 -m v1.2.3 && git push origin v1.2.3
```

[docs/releasing.md](docs/releasing.md) has the whole of it, including how to create
the `VSCE_PAT` and `OVSX_PAT` secrets — both have a step that is easy to get wrong
and gives an unhelpful error — and how to do a dry run that publishes nothing.
