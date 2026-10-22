# Retraza-Kaaush Live AI Golden Path Report

## Later Retest Checkpoint

This report preserves the FIRST failed run. The newly authorized retest is
documented in LIVE_AI_RETEST_REPORT.md: initial compact plan now PASS (3 milestones/
6 executable nodes), but second replan failed after Gemini graph rejection and
Groq rate limiting. Both new temporary users cleaned; no rows remain. Overall
live acceptance still FAIL, no automatic third run. Read the retest report first.

October22, 2026. LIVE GOLDEN PATH: FAIL. Exactly one authorized invocation.
Tests passed0; failed1; skipped1 (additional compact/live case excluded by the
shared-run contract). Do not substitute prior mock/RLS PASS for this result.

## Approval And Budget

Used newest owner-authored logs/owner-golden-live-294fc033-b92f-4b43-b205-063166633e39.approval.json.
An older approval ending2d5b888d-70ea-4bae-9f41-ada70ba0c5bc was left untouched
and unused. Two files do NOT authorize two runs; no fallback to the older file.
Validated exact project usvopldwiwzlvoqawvcu, golden-live scope, maxUsers2,
maxAiOperations6, exact local app origin http://127.0.0.1:4173, unused UUID,
fresh compatible catalog, report SHA256, catalog hash, current migration manifest
and expiry2026-10-22T07:22:19.1732655+00:00. About28min remained at preflight.
No report/approval/expiry was regenerated or edited.

Configured existing models: Groq openai/gpt-oss-20b, Gemini gemini-3.5-flash-lite.
Provider endpoints verified official HTTPS. Allowlist gemini,groq; other
providers explicitly disabled for the child process. Actual candidate lists
were inspected before launch: at most two per alias. SDK maxRetries0 and
per-provider retry0. Existing application limits were temporarily tightened
in child-process environment to one classification, one generation, two replans;
two possible explanations complete the six-operation reviewed workflow. No
provider quota/billing/account configuration was changed or increased.

Actual budget consumed:2 logical operations,2 provider attempts,0 retries.
- Groq:1 classification;920 input/954 output tokens; schema_valid=true/SUCCESS.
- Gemini:1 initial graph generation;1564 input/1838 output tokens;
  schema_valid=true/SUCCESS under the OLD validators.
- Total2484 input/2792 output tokens. No other providers, fallbacks or mocks.
Run-only provider-attempt logs distinguish retries/fallbacks from logical
operations by correlation ID and operation; observed one candidate each.
No repeated live run, provider smoke test or extra RLS invocation occurred.

## Verified And Not Reached

Live goal classification:PASS, plus real clarification questions and saved answers.
Live initial AI generation:real Gemini output returned and parsed; incomplete
against the compact planning acceptance contract, so overall planning FAIL.
Plan persisted:YES, initial active version; cleaned afterward.
Strategies persisted:YES,2. Graph persisted:YES,6 nodes/5 edges, but too small.
Assumptions2/risks1/action1/check-ins0/diffs0. Selected strategy had one milestone.
Initial UI assumptions/risks/frontier rendered. Initial password login worked.

Actions/progress, check-ins, AI replanning, candidate rejection/acceptance,
multi-version preservation, logout/relogin recovery and cross-user browser
ownership denial:NOT REACHED in this live run. Previous RLS/mock coverage is
separate evidence only. Complete hosted authentication, mailbox and Google
OAuth remain unverified. No rollback failure injection in this browser case.

## Exact Failure And Safe Local Fix

Golden Path expected selected-strategy milestones >=3, received1. The prompt
already required3-5 milestones,6-12 executable nodes, an executable alternative
and a bounded complete graph. The general graph validator checked references,
acyclicity and basic executability but did not enforce that live profile.
It therefore marked an abbreviated six-node plan graph-valid and persisted it.
This was a real missing validation boundary, not a provider-authentication issue.

Local fix (NOT live retested or deployed):
- validateProposal accepts an optional compact-profile check. Real generation/
  replanning enforce it after schema parsing, before a success result; real-source
  persistProposal independently enforces it before any persistence RPC.
- Enforces two strategies,3-5 recommended milestones,6-12 executable nodes,
  an executable branch per strategy,<=24 nodes/48 edges,3-5 assumptions/risks,
  and executable validation for HIGH assumptions, matching existing prompts.
- Prompt explicitly requires a final count check and forbids abbreviated outlines.
- Existing small deterministic mock fixtures and explicit blockers retain their
  behavior. No padding, synthetic work, schema repair or silent mock fallback.
- Golden Path assertions unchanged. Incomplete output is rejected and can use
  only the already-configured bounded fallback; no repair call/retry was added.
- Nine added offline regression cases cover profile bounds, alternate branches,
  unchanged valid output, blockers/mock compatibility, pre-RPC rejection and
  actual-SDK mocked-response rejection. Positive provider fixtures now satisfy
  the compact profile instead of using the intentionally minimal mock plan.
- Demo browser test now waits for the post-reset SSR button to become enabled
  before checking errors/teardown. One first local suite caught a dynamic-import
  hydration/teardown race; final suite passed. No error suppression or app redesign.

## Cleanup

Temporary users created2; deleted2 through existing exact ID/email/run/scope/
cleanup-token checks. Cleanup errors0. Follow-up count-only queries restricted
to those two IDs found0 rows in EACH of all16 application tables. Lock retained
for consumed UUID294fc033-b92f-4b43-b205-063166633e39; never reuse it.
Existing user data modified:NO. Schema/ledger/Auth settings modified:NO.
VibeSprint modified:NO. GitHub push/PR/merge:NO. Production deployment:NO.
Independent Retraza Preview unchanged; local fixes are not deployed there.

## Evidence And Local Regression

Ignored artifacts:
- logs/golden-live-authorized-294fc033-b92f-4b43-b205-063166633e39.log
- logs/reversepath-e2e-294fc033-b92f-4b43-b205-063166633e39.json
- logs/post-golden-live-local-checks.log (first local demo failure retained)
- logs/post-golden-live-local-checks-final.log (final check:release exit0)
- logs/post-golden-live-vercel-build.log (local target build, no deployment)

Final safe release:129 tests passed/0 failed/11 live skips (90 unit/27 integration/
12 SQL); non-destructive browser28/0/13. Typecheck, Node production build and
secret scan PASS; lint0 errors/six existing warnings. All live gates disabled
for regression checks. No new owner approval file was fabricated.
Local Vercel-target build also exited0; output generated locally only, with no
upload, Preview update or Production deployment.

## Consolidated Next Owner Actions

1. Review the local fix and authorize a NEW golden-live run/new owner-authored
   file/UUID, max2 users/max6 operations/Gemini+Groq/retry0 and exact-run cleanup.
   Neither consumed nor older unused approvals will be repurposed. Fresh compatible
   evidence/hash required; current evidence expires2026-10-22T21:01:23.129Z
   (October23 02:31 IST). Successful retest is required before completion claims.
2. After local acceptance, review/approve a separate Preview update to the exact
   verified source snapshot and scoped hosted acceptance. No automatic upload
   or change to current protected Preview has been performed by this task.
3. Inspect shared Supabase Auth redirect allowlist, then explicitly authorize
   ADDITIONS ONLY if missing. For current Preview add exact origin and /auth:
   https://retraza-kaaush-f6yk0unsr-kaushik-yellanki-project.vercel.app
   https://retraza-kaaush-f6yk0unsr-kaushik-yellanki-project.vercel.app/auth
   OAuth code returns to /auth; email signup currently sets emailRedirectTo to
   the origin. Preserve shared VibeSprint Site URL, redirects, Google credentials
   and confirmation settings. Exact local origin4173 and /auth only if needed.
   Actual allowlist contents remain UNKNOWN; missing entries are not assumed.
4. Approve a distinct hosted email/password/mailbox acceptance scope and provide
   access through existing Vercel protection. Verify signup delivery, confirmation
   return, real password login, refresh/relogin/logout and no stale-user cache.
   Preconfirmed local test users do not prove email delivery or hosted auth.
5. Approve owner-assisted Google OAuth round trip on Preview. Existing shared
   Google provider remains untouched. Verify consent/account selection, return,
   authenticated session, relogin and logout. For Supabase OAuth, Google's
   authorized redirect is the shared Supabase /auth/v1/callback, distinct from
   the application /auth redirect. Any necessary provider config changes need
   separate explicit approval; do not rotate shared credentials.
6. Approve a separate hosted authenticated full workflow run with exact Preview
   origin, fresh run/evidence/user budget and reviewed AI budget. Verify hosted
   server functions, ownership, saved graph/version/progress and scoped cleanup.
   Check production-like runtime/client logs for secrets/errors. No live shared
   writes are authorized by public/intercepted hosted QA.
7. Production promotion ONLY after live+hosted gates pass and explicit owner
   approval. Independently approve exact Production origin and /auth allowlist
   additions if absent (planned retraza-kaaush.vercel.app). Preserve VibeSprint;
   retain rollback deployment. No broad wildcard or shared Site URL replacement.
8. Owner manually reviews/commits intended local changes and publishes GitHub.
   Follow MANUAL_GITHUB_RELEASE.md: branch review, secret checks, fetch and
   fast-forward verification, normal feature-branch push; never force/rewrite
   published history. PR#1 review/update/merge remains owner-only and gated on
   acceptance. No agent GitHub actions were executed.

Official auth references checked for this procedure:
https://supabase.com/docs/guides/auth/redirect-urls
https://supabase.com/docs/guides/auth/social-login/auth-google
