---
# Trigger - when should this workflow run?
on:
  pull_request:
    types: [opened]
  workflow_dispatch:  # Manual trigger

# Permissions - what can this workflow access?
permissions:
  contents: read
  issues: read
  pull-requests: read

# AI engine - Gemini (free Google AI Studio tier; avoids Copilot utility-model rate limits).
# The model is pinned: left unpinned the proxy steers to whatever its alias globs
# resolve to, which since 2026-08-10 has been `gemini-3.1-flash-tts-preview` — a
# text-to-speech model with no entry in the AI-credits pricing table.
model: gemini-2.5-pro
engine:
  id: gemini
# Network access
network: defaults

# Concurrency - one shared group for the whole repository, so every run of this
# workflow serializes. The compiler's default group is keyed by PR number, which
# puts audits of different PRs in different groups: they then read the shared
# daily AI-credit counter before any of them has written its own consumption, and
# the budget is overshot by however many happened to start together. Opening
# several PRs at once — a Dependabot batch, say — is enough to trigger it.
#
# `cancel-in-progress: false` costs nothing here because the trigger is
# `pull_request: [opened]`, not `synchronize`: pushing more commits to a PR does
# not re-fire this workflow, so there is no superseded run worth cancelling.
#
# `queue: max` is required, not optional, once the group is shared. The default
# is `queue: single`, which keeps one pending run and *replaces* any older
# pending one — so a burst of PRs would serialize down to one running plus one
# waiting and the rest would be dropped without ever being audited. `max` keeps
# up to 100 pending runs in FIFO order instead. Past 100 runs are still dropped,
# which is an acceptable bound here: it would take 100 pull requests opened
# inside a single audit's runtime to reach it.
concurrency:
  group: "gh-aw-${{ github.workflow }}"
  cancel-in-progress: false
  queue: max

# Outputs - what APIs and tools can the AI use?
safe-outputs:
  report-failure-as-issue: false
  add-comment:
    max: 10

---

# ai-auditor

Audit the changes in this pull request for security vulnerabilities, logic bugs, or performance issues.

## Instructions

1.  Review all file changes in the current pull request.
2.  Identify potential security vulnerabilities (e.g., SQL injection, hardcoded secrets, insecure defaults).
3.  Look for logic bugs, edge cases, or potential runtime errors.
4.  Check for performance bottlenecks or inefficient code patterns.
5.  For each identified issue, provide a concise and constructive comment explaining the problem and suggesting a fix.
6.  Use the `add-comment` tool to post your feedback directly on the PR.

Be thorough but focus on high-impact issues. If no issues are found, post a brief summary comment stating that the audit passed.

## Setup

This workflow uses the Gemini engine and requires the `GEMINI_API_KEY` repository secret (free key from https://aistudio.google.com).