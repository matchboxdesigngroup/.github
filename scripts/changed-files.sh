#!/usr/bin/env bash
#
# Lists the files a push or pull request changed, for linters that should only
# check new work (so legacy code doesn't fail every build).
#
# Usage: changed-files.sh <extension-regex> [all|changed] [exclude-regex]
#   extension-regex  e.g. 'php' or 'md|markdown'
#   scope            'changed' (default) or 'all'
#   exclude-regex    paths to drop (relative to the current directory), e.g.
#                    third-party plugins in a whole-site repo: '^wp-content/plugins/'
#
# Run from the directory to lint. Paths are printed one per line, relative to
# the current directory, limited to files under it that still exist.
#
# Expects a full-history checkout (fetch-depth: 0; filter: blob:none is fine)
# and these environment variables, which GitHub Actions sets:
#   GITHUB_EVENT_NAME, GITHUB_EVENT_BEFORE (push only), DEFAULT_BRANCH
#
set -euo pipefail

ext_regex="${1:?extension regex required}"
scope="${2:-changed}"
exclude_regex="${3:-}"
zero_sha="0000000000000000000000000000000000000000"

filter() {
	if [[ -n "$exclude_regex" ]]; then
		grep -E "\.(${ext_regex})\$" | grep -Ev "$exclude_regex" || true
	else
		grep -E "\.(${ext_regex})\$" || true
	fi
}

if [[ "$scope" == "all" ]]; then
	git ls-files -- . | filter
	exit 0
fi

base=""
case "${GITHUB_EVENT_NAME:-}" in
	pull_request | pull_request_target)
		# actions/checkout checks out the PR merge commit; its first parent is
		# the base branch, so HEAD^1..HEAD is exactly the PR's change.
		base="HEAD^1"
		;;
	push)
		before="${GITHUB_EVENT_BEFORE:-}"
		if [[ -n "$before" && "$before" != "$zero_sha" ]] && git cat-file -e "${before}^{commit}" 2>/dev/null; then
			base="$before"
		elif [[ -n "${DEFAULT_BRANCH:-}" ]] && git rev-parse --verify --quiet "origin/${DEFAULT_BRANCH}" >/dev/null; then
			# New branch or force push: compare against where it forked from the default branch.
			base="$(git merge-base "origin/${DEFAULT_BRANCH}" HEAD || true)"
		fi
		;;
esac

if [[ -z "$base" ]]; then
	# Manual/scheduled runs, or no usable base (e.g. first commit): check everything.
	git ls-files -- . | filter
	exit 0
fi

# --no-renames: a rename shows up as an add, and similarity detection would
# need file contents that a blobless clone doesn't have.
git diff --name-only --relative --no-renames --diff-filter=ACM "$base" HEAD -- . | filter
