# Organization-wide GitHub settings for Matchbox

## Community health files

This repo contains the default `CODE_OF_CONDUCT.md` and `CONTRIBUTING.md` files for Matchbox repositories. If your project needs a something other than our defaults, it should be included within the project repo.

Learn more about [creating a default community health file](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file) for our organization.

## Linting

A shared lint workflow that Matchbox repositories opt in to. It runs on pull requests and reports issues as annotations on the changed lines. **Issues are warnings only; they never fail the build.** It works across our stacks (classic WordPress, Roots/Sage, Laravel, TypeScript/React): each check uses the project's own config where it has one, and PHP checks follow the stack the repo picks.

[`reusable-lint.yml`](.github/workflows/reusable-lint.yml) runs these checks in one job:

| Check | Tool | Config used |
| --- | --- | --- |
| PHP | PHPCS and/or [Laravel Pint](https://laravel.com/docs/pint), depending on `php-standard` (see [Choose the PHP standard](#choose-the-php-standard)) | The repo's phpcs config and `pint.json`, else the MDG defaults for its stack |
| Markdown | David Anson's [markdownlint-cli2](https://github.com/DavidAnson/markdownlint-cli2) | The repo's markdownlint config, else the [MDG default](standards/markdownlint/.markdownlint-cli2.jsonc) |
| JavaScript / TypeScript / CSS | The repo's `lint:js` and `lint:css` npm scripts (e.g. `wp-scripts lint-js` / `lint-style`, or `eslint .` / `stylelint "**/*.scss"`) | The repo's ESLint/Stylelint config, e.g. the [MDG Stylelint config](standards/stylelint/.stylelintrc.json); skipped if the scripts don't exist |
| Workflow files | [actionlint](https://github.com/rhysd/actionlint) | — |

Every check reports issues the same way: as warning annotations on the changed lines. Each check only runs, and only installs its tools, when the pull request changed files it covers. PHP and Markdown checks look only at the changed files, so existing code isn't flagged. Run the workflow manually (**Actions → Lint → Run workflow**) to check every file. To make lint errors fail the build, pass `fail-on-error: true`; error-level issues are then reported as errors.

The checks share one job to save Actions minutes: GitHub bills each job rounded up to a whole minute, and in private repositories those minutes come out of the plan's monthly allowance. A typical run is 1–2 minutes, or 2–4 when the npm lint scripts run.

### Add linting to a repository

1. In the repository, go to **Actions → New workflow** and choose **Matchbox Lint**, or copy [`workflow-templates/mdg-lint.yml`](workflow-templates/mdg-lint.yml) to `.github/workflows/lint.yml`.
2. For a whole-site repo, set `working-directory` to the theme or plugin, e.g. `wp-content/themes/my-theme`. When linting from the repo root, third-party plugins in `wp-content/plugins/` are skipped (input `exclude-paths`).
3. Set `php-standard` for the repo's stack (see below). The default, `auto`, only runs what the project already has configured.
4. If the npm scripts that run ESLint and Stylelint aren't named `lint:js` and `lint:css`, set `js-script` and `css-script`. Each script must run ESLint or Stylelint directly (the workflow adds report options to it).
5. Optional: add the project configs below.

### Choose the PHP standard

| `php-standard` | For | Checks |
| --- | --- | --- |
| `auto` (default) | Any repo | Only what the project has: PHPCS with its phpcs config, Pint when it has `pint.json` or requires `laravel/pint`. No PHP check otherwise. |
| `wordpress` | Classic WordPress themes and plugins | PHPCS with the [MDG standard](standards/phpcs/MDG/ruleset.xml): the full [WordPress Coding Standards](https://github.com/WordPress/WordPress-Coding-Standards) and PHP 8.1+ compatibility |
| `sage` | Roots/Sage themes (and other Acorn code) | Pint for code style, as Sage ships it, plus PHPCS with [MDG-Sage](standards/phpcs/MDG-Sage/ruleset.xml): WordPress security, database and API checks and PHP compatibility, without WordPress formatting or naming rules |
| `laravel` | Laravel apps | Pint, with the project's `pint.json` or Pint's Laravel preset |
| `none` | Repos with no PHP to check | Nothing |

Each standard also runs what `auto` would, and the project's own phpcs config or `pint.json` always wins over the MDG default. Blade templates (`*.blade.php`) are skipped: neither PHPCS nor Pint can check them, and Blade escapes `{{ }}` output itself.

Pint has no line numbers, so it adds one annotation per file listing the rules it breaks. Run `vendor/bin/pint` to fix them all.

### Project PHPCS config

To set a text domain and prefix, copy [`standards/phpcs/phpcs.xml.dist.example`](standards/phpcs/phpcs.xml.dist.example) to `phpcs.xml.dist` in the theme or plugin. It builds on the MDG standard with `<rule ref="MDG"/>`; a Sage theme can use `<rule ref="MDG-Sage"/>` instead.

The workflow installs PHPCS, Pint and the MDG standards on their own, without the project's Composer dependencies, so premium plugins or private packages that need credentials don't matter. If the project's phpcs config needs standards beyond MDG, or the project pins its own Pint version, pass `use-project-composer: true` to run `composer install` in the project and use its `vendor/bin/phpcs` and `vendor/bin/pint` instead.

### Run PHPCS locally

This repository is also a Composer package, `matchboxdesigngroup/coding-standards`, so local PHPCS and editor integrations use the same MDG standards (`MDG` and `MDG-Sage`) as the workflow. Sage and Laravel projects already have Pint (`vendor/bin/pint`). In the theme or plugin:

```bash
composer config repositories.mdg-standards vcs https://github.com/matchboxdesigngroup/.github
```

```bash
composer config allow-plugins.dealerdirect/phpcodesniffer-composer-installer true
```

```bash
composer require --dev "matchboxdesigngroup/coding-standards:^1" dealerdirect/phpcodesniffer-composer-installer
```

Then run `vendor/bin/phpcs`, or point your editor at it. `^1` follows the `v1` tag; run `composer update matchboxdesigngroup/coding-standards` to pick up changes.

### Project Stylelint config

The [MDG Stylelint config](standards/stylelint/.stylelintrc.json) follows our CSS standards: the WordPress CSS standards plus alphabetical property order, shorthand properties, and no `!important` without a reason. It allows Tailwind at-rules such as `@apply`. To use it, copy it to `.stylelintrc.json` in the theme and install its packages (Stylelint 17):

```bash
npm install --save-dev @wordpress/stylelint-config stylelint-order
```

When `!important` is unavoidable, explain why in the disable comment:

```scss
/* stylelint-disable-next-line declaration-no-important -- Overrides a plugin style. */
```

### Versions

Repositories call the workflows at `@v1`, a tag that moves forward with non-breaking changes. A change that could break existing repos (new failing checks, renamed inputs) is released as `v2`.

To release, merge to `main`, then move the tag:

```bash
git tag -f v1 && git push -f origin v1
```
