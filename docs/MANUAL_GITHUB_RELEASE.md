# Manual GitHub Release

October 19, 2026. The owner alone publishes.
No GitHub push, PR update/comment, merge, workflow dispatch, release or tag
is authorized for the coding agent. The October20 task separately authorized
the independent Retraza project and protected Preview, now READY; no GitHub
connection was added. Shared writes and Production promotion remain unapproved.
Existing draft PR #1 remains unchanged by this task.

## Owner Review

October23: reviewed work is being preserved as focused LOCAL commits. The agent
does not push, update PR1, merge or configure automatic Git deployments. Review
FINAL_HOSTED_LAUNCH_STATUS.md and the actual log; do not create a replacement bulk
commit, amend existing commits, or rerun the earlier staging workflow.

```powershell
git status -sb
git log --oneline origin/feat/vibesprint-parity..HEAD
node scripts/scan-secrets.mjs --history
if ($LASTEXITCODE -ne 0) { throw "Secret scan failed; stop." }
```

Do not create an empty commit or stage secrets/logs/.vercel/build output/owner
approval JSON. Continue with the checks below only after reviewing local commits.

Review local commits on feat/vibesprint-parity, all changed paths, test evidence
and unresolved live acceptance gates. Lovable integration must retain published
history. No amend/rebase of published commits, no force push, no push to main.

STOP - OWNER REVIEW REQUIRED BEFORE GITHUB PUSH

Only after review, in PowerShell at this repository root:

```powershell
Set-Location -LiteralPath 'C:\Users\YellankiKaushik\Desktop\KAUSHIK\ALL Projects\Personal Projects\Personal - Not Completed - Reverse Engg\Reverse Engg - Coding Files'
$ErrorActionPreference = 'Stop'
git status -sb
if ((git remote get-url origin) -ne 'https://github.com/YellankiKaushik/Retraza-Kaaush.git') { throw "Wrong origin; stop." }
if ((git branch --show-current) -ne "feat/vibesprint-parity") { throw "Wrong branch; stop." }
if (git status --porcelain) { throw "Working tree is not clean; stop." }
node scripts/scan-secrets.mjs --history
if ($LASTEXITCODE -ne 0) { throw "Secret scan failed; stop." }
git log --oneline origin/feat/vibesprint-parity..HEAD
git diff --stat origin/feat/vibesprint-parity..HEAD
git fetch origin
if ($LASTEXITCODE -ne 0) { throw "Fetch failed; stop." }
git merge-base --is-ancestor origin/feat/vibesprint-parity HEAD
if ($LASTEXITCODE -ne 0) { throw "Remote diverged; stop for review. Do not force-push." }
git merge-base --is-ancestor origin/main HEAD
if ($LASTEXITCODE -ne 0) { throw "main has advanced; stop for review. Do not rewrite published history." }
if (git status --porcelain) { throw "Working tree is not clean; review before publishing." }
git push origin HEAD:refs/heads/feat/vibesprint-parity
if ($LASTEXITCODE -ne 0) { throw "Push failed; stop. Never force-push." }
git fetch origin
if ($LASTEXITCODE -ne 0) { throw "Fetch failed; stop." }
if ((git rev-parse HEAD) -ne (git rev-parse origin/feat/vibesprint-parity)) { throw "Remote verification failed." }
git status -sb
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
method without rewriting published feature history. To preserve individual
commits, choose GitHub's Create a merge commit (not Squash or Rebase) into main.
Do not run this merge until release/security gates and owner review are complete.
The configured author email was matched to the authenticated GitHub owner profile;
contribution eligibility also depends on GitHub account/email/default-branch rules,
not the number of local commits. No graph or attribution result is guaranteed.

## Deployment

Use PRODUCTION_DEPLOYMENT_CHECKLIST.md. Publishing code is not approval for
database writes, shared Auth changes, deployment or production promotion.
