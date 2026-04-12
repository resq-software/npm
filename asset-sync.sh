#!/usr/bin/env bash

# Copyright 2026 ResQ
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

# asset-sync.sh - Synchronize shared design assets to consuming repos.
#
# This script is designed to be placed in any repo at any directory depth.
# It resolves the npm repo's design/assets/ directory relative to its own
# location by searching upward for the wrk/ workspace root, then syncing
# from the design/assets/ source of truth.
#
# Usage:
#   ./asset-sync.sh                    # Sync assets to this repo's public/assets/
#   ./asset-sync.sh --check            # Verify sync status without making changes
#   ./asset-sync.sh --target <path>    # Sync to a custom target directory
#   ./asset-sync.sh --dry-run          # Show what would be synced
#
# Exit codes:
#   0  Sync succeeded or files are in sync (--check mode)
#   1  Mismatch found, sync failed, or UI repo not found

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

CHECK_MODE=false
DRY_RUN=false
TARGET_DIR=""

while [[ $# -gt 0 ]]; do
    case "$1" in
        --check) CHECK_MODE=true; shift ;;
        --dry-run) DRY_RUN=true; shift ;;
        --target)
            TARGET_DIR="$2"
            shift 2
            ;;
        *) echo "Unknown option: $1"; exit 1 ;;
    esac
done

# Resolve the workspace root by walking up from SCRIPT_DIR looking for design/assets/.
find_workspace_root() {
    local dir="$SCRIPT_DIR"
    while [[ "$dir" != "/" ]]; do
        if [[ -d "$dir/design/assets" ]]; then
            echo "$dir"
            return 0
        fi
        dir="$(dirname "$dir")"
    done
    return 1
}

WORKSPACE_ROOT="$(find_workspace_root)" || {
    echo "Error: Could not find workspace root (looking for design/assets/)."
    echo "Ensure this script is somewhere inside the npm workspace."
    exit 1
}

SOURCE_DIR="$WORKSPACE_ROOT/design/assets"

# Default target: public/assets/ relative to the repo root (where this script lives).
if [[ -z "$TARGET_DIR" ]]; then
    # Find the git root of the repo containing this script.
    REPO_ROOT="$(cd "$SCRIPT_DIR" && git rev-parse --show-toplevel 2>/dev/null || echo "$SCRIPT_DIR")"
    TARGET_DIR="$REPO_ROOT/public/assets"
fi

echo "Source: $SOURCE_DIR"
echo "Target: $TARGET_DIR"
echo ""

if [[ "$CHECK_MODE" == "true" ]]; then
    if [[ ! -d "$TARGET_DIR" ]]; then
        echo "Target directory does not exist: $TARGET_DIR"
        echo "Run without --check to create it."
        exit 1
    fi

    DIFF_OUTPUT="$(diff -rq "$SOURCE_DIR" "$TARGET_DIR" 2>&1 || true)"
    if [[ -z "$DIFF_OUTPUT" ]]; then
        echo "Assets are in sync."
        exit 0
    else
        echo "Differences found:"
        echo "$DIFF_OUTPUT"
        exit 1
    fi
elif [[ "$DRY_RUN" == "true" ]]; then
    echo "Would sync the following:"
    rsync -avn --delete "$SOURCE_DIR/" "$TARGET_DIR/" 2>/dev/null || {
        # Fallback if rsync is not available.
        echo "  (rsync not available — would copy all files from source to target)"
        find "$SOURCE_DIR" -type f -printf "  %P\n"
    }
    exit 0
else
    mkdir -p "$TARGET_DIR"
    if command -v rsync &>/dev/null; then
        rsync -av --delete "$SOURCE_DIR/" "$TARGET_DIR/"
    else
        # Fallback: clean target and copy fresh.
        rm -rf "${TARGET_DIR:?}/"*
        cp -r "$SOURCE_DIR/"* "$TARGET_DIR/"
    fi
    echo ""
    echo "Asset sync complete."
fi
