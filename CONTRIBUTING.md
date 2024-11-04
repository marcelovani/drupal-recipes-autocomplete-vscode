# Contributing

You can start by searching if there is already an issue in the (project page)[https://github.com/marcelovani/drupal-recipes-autocomplete-vscode/issues]. You can comment on existing issues or create a new issue.

## Working locally

1. Fork and check out the repo
2. Push the changes to your fork
3. Create a pull request and link to the issue

You may need to fork the repo for Json Schemas, please see these lines on package.json

```
"yamlValidation": [
      {
        "fileMatch": [
          "recipe.yml",
          "recipe.yaml"
        ],
        "url": "https://raw.githubusercontent.com/SchemaStore/schemastore/refs/heads/master/src/schemas/json/drupal-recipe.json",
        "$fork": "https://raw.githubusercontent.com/marcelovani/schemastore/refs/heads/drupal-recipes/src/schemas/json/drupal-recipe.json",
        "$local": "file:///Users/marcelo.vani/Development/Projects/Recipes/schemastore/src/schemas/json/drupal-recipe.json"
      }
    ],
```

The key `url` is what is going to be used for the autocomplete of contextual items and validation. You can use the url from `$fork` or `$local` by copying the url onto the `url` item. Please don't commit this change, this is used only for development purposes.

### Testing it locally

Unit tests are not fully working, but you can debug and test it manually.

1. Click menu Run > Start debugging.
2. You may see a prompt to ask you to run NPM Watch, you can confirm. Watch is used to compile the code, so that it can be debugged.
3. You can see the this by clicking menu View > Terminal.
4. Once the new window opens, you can open an existing Drupal codebase and edit an existing recipe.yml file or create a new one.
5. You can now test the autocomplete suggestions and recipe validations.

### Packaging and deploying

To package you need to use vsce:
```bash
npm install -g @vscode/vsce
vsce package
vsce publish [version]
```

See more details in the (VS Code documentation)[https://code.visualstudio.com/api/working-with-extensions/publishing-extension]

