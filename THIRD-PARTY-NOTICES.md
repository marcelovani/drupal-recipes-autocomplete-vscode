# Third-party notices

The published extension is a single bundled file, `out/extension.js`, built by
webpack. Code from the projects below is compiled into it, so their notices
travel with it as their licences require.

This file lists what ships. Everything else in `devDependencies` is used only to
build and test, and is not distributed.

---

## yaml

Parses and serialises the YAML in `recipe.yml` and in the Drupal codebase being
scanned.

- <https://github.com/eemeli/yaml>
- ISC licence

```
Copyright Eemeli Aro <eemeli@gmail.com>

Permission to use, copy, modify, and/or distribute this software for any purpose
with or without fee is hereby granted, provided that the above copyright notice
and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND
FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS
OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER
TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

---

## Drupal extension for VS Code

This extension started life as a branch of
[kaermorchen/vscode-drupal](https://github.com/kaermorchen/vscode-drupal), and
parts of its structure remain. That project is MIT licensed, and its copyright
notice is kept in [LICENSE.md](./LICENSE.md) alongside ours, as MIT requires.

---

## Not bundled

The Drupal recipe JSON schema is fetched over HTTP at runtime by
`redhat.vscode-yaml`; it is not part of this extension. It lives at
[SchemaStore](https://github.com/SchemaStore/schemastore) under that project's
own terms. See [docs/json-schema.md](./docs/json-schema.md).
