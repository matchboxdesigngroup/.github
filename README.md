# Organization-wide GitHub settings for Matchbox

## Community health files

This repo contains the default `CODE_OF_CONDUCT.md` and `CONTRIBUTING.md` files for Matchbox repositories. If your project needs a something other than our defaults, it should be included within the project repo.

Learn more about [creating a default community health file](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/creating-a-default-community-health-file) for our organization.

## Linting

Shared lint workflows that Matchbox repositories opt in to. They run on pull requests and report issues as annotations on the changed lines. **Issues are warnings only; they never fail the build.**

| Workflow | Checks | Config used |
| --- | --- | --- |
| `reusable-phpcs.yml` | PHP against the full [WordPress Coding Standards](https://github.com/WordPress/WordPress-Coding-Standards) and PHP 8.1+ compatibility | The repo's `phpcs.xml(.dist)` / `.phpcs.xml(.dist)`, else the [MDG standard](standards/phpcs/MDG/ruleset.xml) |
| `reusable-markdownlint.yml` | Markdown with [markdownlint-cli2](https://github.com/DavidAnson/markdownlint-cli2-action) | The repo's markdownlint config, else the [MDG default](standards/markdownlint/.markdownlint-cli2.jsonc) |
| `reusable-js-css-lint.yml` | The repo's `lint:js` and `lint:css` npm scripts (`wp-scripts lint-js` / `lint-style`) | The repo's ESLint/Stylelint config, e.g. the [MDG Stylelint config](standards/stylelint/.stylelintrc.json); skipped if the scripts don't exist |
| `reusable-workflow-lint.yml` | GitHub Actions workflow files with [actionlint](https://github.com/rhysd/actionlint) | — |

PHP and Markdown checks only look at files the pull request changed, so existing code isn't flagged. Run the workflow manually (**Actions → Lint → Run workflow**) to check every file. To make a check fail the build, pass `fail-on-error: true` to it.

### Add linting to a repository

1. In the repository, go to **Actions → New workflow** and choose **Matchbox Lint**, or copy [`workflow-templates/mdg-lint.yml`](workflow-templates/mdg-lint.yml) to `.github/workflows/lint.yml`.
2. For a whole-site repo, set `working-directory` to the theme or plugin, e.g. `wp-content/themes/my-theme`. When linting from the repo root, third-party plugins in `wp-content/plugins/` are skipped (PHPCS input `exclude-paths`).
3. Optional: add the project configs below.

### Project PHPCS config

To set a text domain and prefix, copy [`standards/phpcs/phpcs.xml.dist.example`](standards/phpcs/phpcs.xml.dist.example) to `phpcs.xml.dist` in the theme or plugin. It builds on the MDG standard with `<rule ref="MDG"/>`.

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
