# Manual GitHub Release

October 19, 2026. The owner alone publishes.
No GitHub push, PR update/comment, merge, workflow dispatch, release, tag or
hosted deployment is authorized for the coding agent in this task.
Existing draft PR #1 remains unchanged by this task.

## Owner Review

Review local commits on feat/vibesprint-parity, all changed paths, test evidence
and unresolved live acceptance gates. Lovable integration must retain published
history. No amend/rebase of published commits, no force push, no push to main.

STOP - OWNER REVIEW REQUIRED BEFORE GITHUB PUSH

Only after review, in PowerShell at this repository root:

```powershell
git status -sb
if ((git branch --show-current) -ne "feat/vibesprint-parity") { throw "Wrong branch; stop." }
git log --oneline origin/feat/vibesprint-parity..HEAD
git diff --stat origin/feat/vibesprint-parity..HEAD
git fetch origin
if ($LASTEXITCODE -ne 0) { throw "Fetch failed; stop." }
git merge-base --is-ancestor origin/feat/vibesprint-parity HEAD
if ($LASTEXITCODE -ne 0) { throw "Remote diverged; stop for review. Do not force-push." }
if (git status --porcelain) { throw "Working tree is not clean; review before publishing." }
git push origin feat/vibesprint-parity
```

These are OWNER commands; the agent has not executed them. Recheck branch name
before publishing. Read-only ls-remote snapshots in the final report confirm
the task left destination and reference refs unchanged.

## Pull Request And Merge

After manual push, inspect existing draft PR #1 in GitHub UI. Update/review it
manually; do not create a duplicate. Do not merge until catalog compatibility,
approved live RLS/authenticated lifecycle and independent hosted preview pass.
Confirm no live database gates are enabled in CI, inspect CI results and ensure
Lovable does not deploy from an unapproved branch. The owner decides merge
method without rewriting published feature history.

## Deployment

Use PRODUCTION_DEPLOYMENT_CHECKLIST.md. Publishing code is not approval for
database writes, shared Auth changes, deployment or production promotion.
