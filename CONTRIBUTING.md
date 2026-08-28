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

Releases are published by `.github/workflows/publish.yml` when a version tag is
pushed. It runs the whole suite, checks the tag matches `package.json`, then
publishes to the Visual Studio Marketplace **and** Open VSX, and creates the
GitHub release with the changelog entry attached.

1. Add the entry to `CHANGELOG.md` and set the matching version in `package.json`.
2. Merge that to `main`.
3. Tag and push:

   ```bash
   git tag -a v1.2.3 -m v1.2.3 && git push origin v1.2.3
   ```

Two repository secrets are needed:

| Secret | For | Where from |
| --- | --- | --- |
| `VSCE_PAT` | Visual Studio Marketplace | Azure DevOps personal access token, Marketplace > Manage |
| `OVSX_PAT` | Open VSX | open-vsx.org, after claiming the `marcelovani` namespace |

Open VSX is what the VS Code forks install from — Windsurf, Devin, VSCodium,
code-server — since they cannot use the Microsoft marketplace. Publishing there
fails soft, so a missing token holds up nobody else's install.

Use the workflow's manual run (`workflow_dispatch`) with **dry run** left on to
build and check a release without publishing anything.

### Packaging and deploying by hand
Add entry in the Changelog with version number/date and list of changes.
Update the version in package.json to match the version in the Changelog.

To package you need to using:
```bash
npm run package
npm run publish
```

See more details in the (VS Code documentation)[https://code.visualstudio.com/api/working-with-extensions/publishing-extension]

