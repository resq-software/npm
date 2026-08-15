<!--
  Copyright 2026 ResQ Systems, Inc.

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

# Security Policy

The org-wide policy in
[`resq-software/.github`](https://github.com/resq-software/.github/blob/main/SECURITY.md)
governs this repository. It covers supported versions, what to include in a
report, and the disclosure timeline. Read that first.

## Reporting a vulnerability

**Do not open a public issue for a suspected vulnerability.**

1. **GitHub Security Advisories** (preferred) —
   [open a draft advisory](https://github.com/resq-software/npm/security/advisories/new).
2. **Email** — `security@resq.software`.

## What guards this repository

Two layers, deliberately split, because each catches what the other cannot.

**In CI.** GitHub secret scanning and push protection are enabled repo-wide;
push protection blocks a known provider credential before it ever lands. On top
of that, `.github/workflows/security.yml` calls the org's reusable scan —
CodeQL for `javascript-typescript` and `actions`, plus Semgrep — and
`.github/workflows/ci.yml` gates merges on its result through the
`Security scan gate` job.

Gitleaks is deliberately **off**. It needs a `GITLEAKS_LICENSE` even for public
org repos, and it would duplicate the native scanning already running here. The
switch lives in the reusable workflow if that trade-off ever changes.

**Before CI.** When the `resq` CLI is installed, the pre-commit hook delegates
staged-change checks to `resq`. If the CLI is unavailable, the hook warns and
skips these local checks.
That scanner is local-only and reads [`.secretsignore`](../.secretsignore),
which is *its* allowlist — not CI's, and not GitHub's. The two exclusion
mechanisms are separate by design: GitHub's live in
`.github/secret_scanning.yml`, which this repo does not define, so nothing is
excluded from GitHub's scanning or push protection.

Note what `.secretsignore` does and does not buy. It excludes
`packages/security/tests/fixtures/corpora.ts` **by path**, so the local scanner
does not read that file at all. The credential-shaped strings in it are the
vendors' published placeholders, which is what makes the exclusion safe to
grant — but nothing inspects them, and a real credential committed to that path
would pass the local scan unnoticed. GitHub's secret scanning and push
protection still cover it, and they are what to rely on there.

`.secretsignore` therefore holds paths, not fingerprints, and is not
interchangeable with a `.gitleaksignore`.
