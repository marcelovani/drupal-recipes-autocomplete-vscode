# Releasing

A release is a pushed tag. `.github/workflows/publish.yml` does the rest: runs
the suite, checks the tag against `package.json`, builds the `.vsix` once, and
publishes that same file to both registries before creating the GitHub release.

## Making a release

1. Add the entry to `CHANGELOG.md`, and set the matching version in
   `package.json`. The heading must be `## <version> (<date>)` — the workflow
   reads the release notes from it by matching the version.
2. Merge that to `main`.
3. Tag and push:

   ```bash
   git tag -a v1.2.3 -m v1.2.3
   git push origin v1.2.3
   ```

The tag must match `package.json` or the run stops before publishing anything:

```
::error::tag v1.2.3 does not match package.json version 1.2.2
```

That check exists because `vsce` publishes whatever version `package.json`
holds and treats the tag as a label. Without it, tagging a version you forgot
to bump quietly republishes the previous one.

## Two registries

| Registry | Installed by | Secret |
| --- | --- | --- |
| Visual Studio Marketplace | VS Code itself | `VSCE_PAT` |
| [Open VSX](https://open-vsx.org) | Windsurf, Devin, VSCodium, code-server, Gitpod | `OVSX_PAT` |

The forks are contractually barred from the Microsoft marketplace, so an
extension that is only on one of these does not exist for them. Both are
published from the same run, from the same built file, so they cannot drift.

The Open VSX step is `continue-on-error`: a missing namespace or an expired
token there should not hold up the release everybody else installs from. Check
the run afterwards rather than assuming both succeeded.

## Creating `VSCE_PAT`

The marketplace authenticates through Azure DevOps, which is not obvious.

1. Sign in to [dev.azure.com](https://dev.azure.com/) with the **same Microsoft
   account that owns the `marcelovani` publisher**. A different account will
   authenticate fine and then fail with "you do not have permission to publish".
2. If you have no organisation, create one. The name is irrelevant; it exists
   only so Azure will issue you a token.
3. Top right, user settings → **Personal access tokens** → **New Token**.
4. Set **Organization** to **All accessible organizations**. This is the step
   people get wrong — a token scoped to one organisation fails against the
   marketplace with a 401 that does not explain itself.
5. Set **Scopes** to **Custom defined**, then find **Marketplace** and tick
   **Manage**.
6. Create it and copy the token. It is shown once.

```bash
gh secret set VSCE_PAT --repo marcelovani/drupal-recipes-autocomplete-vscode
```

Tokens expire — a year is the maximum. When a release fails on the marketplace
step with a 401, an expired token is the first thing to check.

## Creating `OVSX_PAT`

1. Log in to [open-vsx.org](https://open-vsx.org) with GitHub.
2. **Accept the Publisher Agreement**, under your profile. Publishing is refused
   until you have, and the error does not say so clearly.
3. Profile → **Access Tokens** → generate one, and copy it.
4. Claim the namespace, once:

   ```bash
   npx ovsx create-namespace marcelovani -p <token>
   ```

```bash
gh secret set OVSX_PAT --repo marcelovani/drupal-recipes-autocomplete-vscode
```

## Trying it without publishing

The workflow has a manual trigger with a dry run option, on by default:

> Actions → Publish → Run workflow

It builds, runs the tests, checks what would be packaged, and uploads the
`.vsix` as an artifact — publishing nothing. Worth doing after any change to
the workflow, and to get an installable build for testing.

## Publishing by hand

The pipeline is the way to publish. Doing it by hand skips the tests, the
package check and the tag/version check, and leaves no GitHub release — so it
is for the case where the pipeline itself is broken.

```bash
npm ci
npm test
npm run verify:package
npx vsce package --out extension.vsix
npx vsce publish --packagePath extension.vsix   # needs VSCE_PAT in the environment
npx ovsx publish extension.vsix                 # needs OVSX_PAT
```

Then tag the commit you published from, so git still matches what people have
installed.

There used to be an `npm run publish` script reading `vsce publish ${version}`.
npm does not expand `${version}`; the shell expanded it to nothing, so it
published whatever was in `package.json` — right by accident. It has been
removed rather than fixed, because a one-word command that skips every check is
the wrong thing to have lying around.

## History

`v1.1.0` and `v1.1.1` were published in November 2024 and never tagged; the tags
were backfilled later against the commits that set those versions. Before
`v1.1.2` there were no GitHub releases at all. Tagging is what triggers a
release now, so that particular drift cannot recur.
