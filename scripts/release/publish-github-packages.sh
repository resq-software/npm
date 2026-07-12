#!/usr/bin/env bash
#
# Copyright 2026 ResQ Systems, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
#
# Publishes every publishable workspace package under packages/* to GitHub
# Packages. For each package this:
#   1. runs `npm pack` (from the already-built workspace),
#   2. rewrites the scope @resq-systems -> @resq-software and points the manifest
#      at the GitHub registry via scripts/release/prepare-github-package.mjs,
#   3. publishes the staged tarball, skipping versions already present.
#
# The package list is discovered from the filesystem — there is no hardcoded
# list to drift out of date. Private packages (and anything without a name) are
# skipped. Publishing is idempotent: a version already on the registry is
# skipped, so re-runs are safe.
#
# Auth: the caller must have already written a GitHub Packages auth token to
# ~/.npmrc (the token is kept out of this script's environment and arguments).
#
# Resilience: a failure publishing one package does not abort the others; the
# script continues and exits non-zero at the end if any package failed, so the
# failure is visible in CI rather than silently swallowed.

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$REPO_ROOT" || exit 1

failed_packages=()

publish_one() {
	local pkg_dir="$1"

	# Every step is guarded with `|| return 1`: bash `set -e` does not apply
	# inside a function invoked in a conditional (`if ! publish_one ...`), so a
	# failing `npm pack`/`tar`/manifest-rewrite would otherwise leave name and
	# version empty and silently "skip" a package that never actually published.
	local pack_filename
	pack_filename="$(
		cd "$pkg_dir" && npm pack --json --ignore-scripts | node -e '
			const fs = require("node:fs");
			const payload = JSON.parse(fs.readFileSync(0, "utf8"));
			process.stdout.write(payload[0].filename);
		'
	)" || return 1
	[ -n "$pack_filename" ] || { echo "  npm pack produced no tarball for $pkg_dir" >&2; return 1; }

	local pkg_slug
	pkg_slug="$(node -e "process.stdout.write(require('./$pkg_dir/package.json').name.replace('@resq-systems/', ''))")" || return 1

	local staging_dir="${RUNNER_TEMP:-/tmp}/resq-${pkg_slug}-github-package"
	rm -rf "$staging_dir"
	mkdir -p "$staging_dir" || return 1
	tar -xzf "$pkg_dir/$pack_filename" -C "$staging_dir" || { rm -f "$pkg_dir/$pack_filename"; return 1; }
	rm -f "$pkg_dir/$pack_filename"

	local staged_dir
	staged_dir="$(node "$REPO_ROOT/scripts/release/prepare-github-package.mjs" "$staging_dir/package")" || return 1

	local name version
	name="$(node -e "process.stdout.write(require('$staged_dir/package.json').name)")" || return 1
	version="$(node -e "process.stdout.write(require('$staged_dir/package.json').version)")" || return 1
	if [ -z "$name" ] || [ -z "$version" ]; then
		echo "  Error: could not resolve name/version for $pkg_dir" >&2
		return 1
	fi

	local existing
	existing="$(npm view "${name}@${version}" version --registry https://npm.pkg.github.com 2>/dev/null || true)"
	if [ "$existing" = "$version" ]; then
		echo "  ${name}@${version} already published to GitHub Packages — skipping."
		return 0
	fi

	echo "  Publishing ${name}@${version} to GitHub Packages"
	npm publish "$staged_dir" --ignore-scripts --registry https://npm.pkg.github.com
}

found_any=0
for pkg_json in packages/*/package.json; do
	# `nullglob` is not enabled, so an unmatched glob yields the literal pattern;
	# skip it rather than feeding a non-existent path to node.
	[ -f "$pkg_json" ] || continue
	found_any=1
	pkg_dir="$(dirname "$pkg_json")"

	# A node failure here (malformed package.json) must be reported, not silently
	# treated as "private or unnamed".
	if ! publishable="$(node -e "const p=require('./$pkg_json'); process.stdout.write(!p.private && p.name ? '1' : '')" 2>/dev/null)"; then
		echo "::error::Failed to read $pkg_json"
		failed_packages+=("$pkg_dir")
		continue
	fi

	if [ -z "$publishable" ]; then
		echo "Skipping $pkg_dir (private or unnamed)."
		continue
	fi

	echo "==> $pkg_dir"
	if ! publish_one "$pkg_dir"; then
		echo "::error::Failed to publish $pkg_dir to GitHub Packages"
		failed_packages+=("$pkg_dir")
	fi
done

if [ "$found_any" -eq 0 ]; then
	echo "::error::No packages found under packages/*/package.json — wrong working directory?" >&2
	exit 1
fi

if [ "${#failed_packages[@]}" -gt 0 ]; then
	echo "GitHub Packages publish failed for: ${failed_packages[*]}"
	exit 1
fi

echo "All publishable packages synced to GitHub Packages."
