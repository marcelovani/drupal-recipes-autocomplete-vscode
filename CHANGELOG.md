## 1.1.3 (2026-08-29)

 New functionalities
 - The extension is now published to Open VSX as well as the Visual Studio Marketplace, so it can be installed in VS Code forks such as Windsurf, Devin, VSCodium and code-server (#19)

 Under the hood
 - Added THIRD-PARTY-NOTICES.md carrying the notice for the yaml package bundled into the extension, and a copyright line for the work since this project began as a branch of kaermorchen/vscode-drupal, so the attribution matches what actually ships
 - README now states the licence, which it never did
 - A release that reaches one registry and not the other fails visibly instead of reporting success

## 1.1.2 (2026-08-28)

 Bug fixes
  - Fixed node_modules being scanned for suggestions, which was slow on projects with a frontend build and offered npm packages as if they were Drupal modules (#16)
  - Fixed config/import not offering the config a module actually ships, such as system.action.node_delete_action.yml under node (#6)
  - Fixed config suggestions showing no icon (#17)
  - Stopped the published extension carrying its own test files and source maps, cutting the download from 40 files to 8 (#24)

 New functionalities
 - Suggestions no longer include items the recipe already has, for modules, recipes, config imports and permissions alike (#4)

 Under the hood
 - Added unit and integration test suites, and fixed the test runner, which could not launch current VS Code at all (#5)
 - Added a generated list of the config actions Drupal core exposes, with a test that fails when core adds one we have not classified (#29)
 - Pinned @types/vscode to the version engines.vscode advertises, so the compiler enforces the compatibility the extension claims (#18)
 - Updated dependencies, taking npm audit from 26 findings to 4, and enabled Dependabot (#18, #15)
 - Removed a 93MB dependency that nothing imported (#30)
 - Documented the JSON schema the extension depends on, and how to keep up with Drupal's config actions

## 1.1.1 (2024-11-13)

 Bug fixes
  - Fixed bug with text matching on editor
  - Fixed bug with detection of parent property on empty lines
  - Fixed Eslint errors

 New functionalities
 - Major code refactor and clean up
 - Refactored the caching mechanism
 - Added icons for each completion type
 - Updated the mapping for suggestion callbacks
 - Implemented mew callbacks
 - Added support for more Config actions: set/setMultiple, setThirdPartySetting/setThirdPartySettings, simpleConfigUpdate, addTaxonomyVocabularies, addItemToToolbar, addToAllBundles, grantPermission/grantPermissions, setDescription, setLabel, setMessage, setRecipients, setRedirectPath, setRegion, setReply, setRequired, setSettings, setTranslatable, setWeight

## 1.0.7 (2024-11-04)

- Updated documentation and url for Schema Store.

## 1.0.6 (2024-11-03)

 - Updated schemas to provide suggestions for Actions, see https://github.com/marcelovani/drupal-recipes-autocomplete-vscode/issues/1
 - Bug fixes
 - Code improvements

## 1.0.5 (2024-10-22)

- Bug fixes and logic improvements.

## 1.0.1 (2024-09-24)

- Initial release.
