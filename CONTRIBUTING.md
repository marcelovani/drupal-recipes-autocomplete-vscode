# Contributing

You can start by searching if there is already an issue in the (project page)[https://github.com/marcelovani/drupal-recipes-autocomplete-vscode/issues]. You can comment on existing issues or create a new issue.

## Working locally

1. Fork and check out the repo
2. Push the changes to your fork
3. Create a pull request and link to the issue

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

