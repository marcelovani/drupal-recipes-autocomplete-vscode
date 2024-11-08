# Drupal Recipes Autocomplete: VS Code Extension
VS Code extension that provides autocomplete for Drupal Recipes

![Autocomplete](docs/drupal-recipes-autocomplete.gif)

## Features

- Provides autocomplete suggestions for Drupal recipes.
- Provides validation for recipe.yml.

## Instructions

- Enable the extension in VS Code as usual
- Create a file called recipe.yml inside a folder on an existing Drupal codebase. The extension will provide autocomplete functionality fetching details from the Drupal codebase.
- To trigger autocomplete, use ^ + Space.

## Contribute

Contributions are more than welcome! Read [CONTRIBUTING.md](./CONTRIBUTING.md) for more information.

## Repository
https://github.com/marcelovani/drupal-recipes-autocomplete-vscode

## TODO
- List the extension as NPM package in https://www.npmjs.com/
- Use schemas to provide autocomplete items, depends on https://www.drupal.org/project/distributions_recipes/issues/3475786
- Automatically generate composer.json for the Recipe
- Support Default Content
- Do not show autocomplete items that are already in the Recipe
- Add unit tests
