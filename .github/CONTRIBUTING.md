# Contributing

Thanks for your interest in contributing to `@resq-sw/ui`!

> After this page, see [DEVELOPMENT.md](./DEVELOPMENT.md) for local development instructions.

## Code of Conduct

This project contains a [Contributor Covenant code of conduct](./CODE_OF_CONDUCT.md) all contributors are expected to follow.

## Reporting Issues

Please [report an issue on the issue tracker](https://github.com/resq-software/npm/issues/new/choose) if there's any bugfix, documentation improvement, or general enhancement you'd like to see. Please fully fill out all required fields in the most appropriate issue form.

## Sending Contributions

Sending your own changes as contribution is always appreciated!
There are two steps involved:

1. [Finding an Issue](#finding-an-issue)
2. [Sending a Pull Request](#sending-a-pull-request)

### Finding an Issue

With the exception of very small typos, all changes to this repository generally need to correspond to an [unassigned open issue marked as `status: accepting prs`](https://github.com/resq-software/npm/issues?q=is%3Aissue+is%3Aopen+label%3A%22status%3A+accepting+prs%22+no%3Aassignee+).
If this is your first time contributing, consider searching for [issues with the `good first issue` label](https://github.com/resq-software/npm/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22+label%3A%22status%3A+accepting+prs%22+no%3Aassignee+).

#### Issue Claiming

We don't use any kind of issue claiming system.
If an unassigned issue has been marked as `status: accepting prs` and an open PR does not exist, feel free to send a PR.
Please don't post comments asking for permission or stating you will work on an issue.

### Sending a Pull Request

Once you've identified an open issue accepting PRs that doesn't yet have a PR sent, you're free to send a pull request.
Be sure to fill out the pull request template's requested information.

PRs are expected to have a title that adheres to [conventional commits](https://www.conventionalcommits.org/en/v1.0.0) (e.g., `feat: ...`, `fix: ...`).

#### Draft PRs

If you don't think your PR is ready for review, [set it as a draft](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-to-your-work-with-pull-requests/changing-the-stage-of-a-pull-request#converting-a-pull-request-to-a-draft).

#### Granular PRs

Please keep pull requests single-purpose: don't attempt to solve multiple unrelated problems in one pull request.

#### Pull Request Reviews

When a PR is not in draft, it's considered ready for review.
Please don't manually `@` tag anybody to request review.
PRs should have passing [GitHub status checks](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/collaborating-on-repositories-with-code-quality-features/about-status-checks) before review is requested.

#### Requested Changes

After a maintainer reviews your PR, they may request changes.
Once you've made those changes, [re-request review on GitHub](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/reviewing-changes-in-pull-requests/about-pull-request-reviews#re-requesting-a-review).

Please try not to force-push commits to PRs that have already been reviewed.
We squash merge all commits so there's no need to preserve Git history within a PR branch.
