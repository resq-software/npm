<!--
Copyright 2026 ResQ Software

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.
-->

# PR Review Workflow

Use this workflow when reviewing UI pull requests so the review stays chunked, evidence-driven, and resistant to bot noise.

## Purpose

- Review one PR at a time.
- Start with the code and workflow signal, not the conversation blob.
- Treat bot summaries and auxiliary statuses as secondary unless they point to a concrete failing check or code location.

## Primary Signal

Start here first:

- Changed files in the PR
- `CI` workflow results from [ci.yml](./workflows/ci.yml)
- `Chromatic` workflow results from [chromatic.yml](./workflows/chromatic.yml)
- Any workflow files changed by the PR itself, especially [release.yml](./workflows/release.yml)

## Secondary Signal

Use these after the code and main checks:

- `OctoGuide` runs from [octoguide.yml](./workflows/octoguide.yml)
- `Socket Security` comments and neutral alerts
- CodeRabbit summaries
- Gemini summaries
- Labeler and PR size automation

These can be useful, but they are not the place to start.

## Chunk Order

Review each PR in this order:

1. Inventory the open PRs and recent workflow runs.
2. Review workflow and config changes first.
3. Review runtime or helper code second.
4. Review tests, docs, and incidental config last.
5. Read the conversation and triage suggestions into buckets.
6. Read failed workflow logs only after the rollup identifies the failing job.
7. Write findings in severity order, then note suggestions and status.

## Per-PR Checklist

### 1. Inventory

- List open PRs.
- List recent workflow runs.
- Ignore repositories or branches with no open PRs.

### 2. Diff Chunk 1: Workflow And Config

Review:

- `.github/workflows/*`
- release or publish configuration
- `.gitignore`
- package metadata if publishing behavior changes

Questions:

- Does the workflow order make sense?
- Are tokens, permissions, and registries correct?
- Does the change affect visibility, release semantics, or repository association?

### 3. Diff Chunk 2: Runtime Or Helper Code

Review:

- new scripts
- helper modules
- migration or staging logic

Questions:

- Does the helper preserve required metadata?
- Are failure paths explicit?
- Is the script boundary testable?

### 4. Diff Chunk 3: Tests, Docs, And Incidental Files

Review:

- tests
- README or docs edits
- formatting-only or newline-only changes

Questions:

- Does the test match the intended behavior?
- Are docs claiming more than the code guarantees?
- Are incidental changes hiding unrelated edits?

## Conversation Triage

Bucket review comments and bot suggestions into:

- `Actionable`
  - points to a concrete file, line, or failing behavior
- `Noise`
  - generic maintainability advice, summaries, or style suggestions with no clear risk
- `Resolved`
  - already addressed by later commits or green CI reruns

Do not let summary comments drive the review order.

## Workflow Triage

Use this order when interpreting checks:

1. `CI`
2. `Chromatic`
3. PR-specific changed workflow behavior
4. `Socket Security`
5. `OctoGuide`
6. labelers and other metadata automation

If `CI` or `Chromatic` fails:

- identify the failing job from the rollup
- fetch only the failed job logs
- fix or comment on that concrete failure

If a secondary workflow is noisy but non-blocking:

- note it
- do not let it derail the code review

## Review Output Format

Write the final review in this order:

1. Findings
2. Open questions or assumptions
3. Change summary
4. Workflow status

Findings should:

- come first
- include file references
- be ordered by severity
- distinguish real defects from bot suggestions

## Live Review Checklist

- Inventory PRs and recent runs.
- Pick one PR and review only its changed files.
- Review workflow/config files before runtime code.
- Review runtime code before tests and docs.
- Triage comments into actionable, noise, and resolved.
- Use `CI` and `Chromatic` as the main signal.
- Pull failed logs only after the rollup identifies the failing job.
- Write findings first, then suggestions, then status.
