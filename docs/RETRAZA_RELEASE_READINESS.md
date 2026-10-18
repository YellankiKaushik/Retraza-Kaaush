# Retraza Release Readiness

October 19, 2026. Branch: `feat/vibesprint-parity`.
This report supersedes the earlier isolated-backend-only policy.
Verdict: **B - CODE COMPLETE, LIVE DATABASE/DEPLOYMENT APPROVAL REQUIRED**.

## Actual Scope

- Existing application preserved; no redesign/new product features.
- Reusing the shared Supabase backend is permitted; another project/account is
  NOT required. It remains read-only until verified catalog and scoped approval.
- No GitHub writes, push, PR #1 changes, merge, deployment or reference changes
  performed by this task. Owner publishes manually after review.
- Prepared public /demo is locally runnable; it is not authenticated acceptance.

## Verification

| Group                                 | Passed | Failed | Skipped / blocked                              |
| ------------------------------------- | -----: | -----: | ---------------------------------------------- |
| Environment check                     |      1 |      0 | 0                                              |
| Typecheck                             |      1 |      0 | 0                                              |
| Lint                                  |      1 |      0 | 0; six existing Fast Refresh warnings          |
| Unit                                  |     76 |      0 | 0                                              |
| Deterministic integration             |     13 |      0 | 11 gated live integration cases skipped        |
| Local PostgreSQL/PGlite               |     12 |      0 | 0                                              |
| Public/browser                        |     17 |      0 | 13 live/gated browser cases                    |
| Production Node public subset         |      8 |      0 | 0                                              |
| Node build                            |      1 |      0 | 0                                              |
| Vercel build                          |      1 |      0 | 0                                              |
| Source/history/client secret scan     |      1 |      0 | 0 findings                                     |
| Fetched production client audit       |      1 |      0 | 36 responses; zero findings/errors/failures    |
| Dependency audit                      |      1 |      0 | 0 vulnerabilities                              |
| Live RLS                              |      0 |      0 | 6 cases BLOCKED; included in integration skips |
| Authenticated Golden Path             |      0 |      0 | 2 cases BLOCKED; included in browser skips     |
| Live email/Google/password acceptance |      0 |      0 | BLOCKED; no inbox/callback claim               |
| Hosted preview/production             |      0 |      0 | Not deployed or tested                         |

Normal npm test total: **101 passed, 0 failed, 11 skipped**.
Do not sum overlapping rows as additional test cases. Build/check rows count
successful invocations, not assertion counts. Prior baseline 76 tests passed;
25 additional deterministic assertions now pass.

Live provider evidence: Gemini minimal smoke PASS; Groq initially failed tiny
128-token smoke, then passed a focused 512-token retest (reasoning budget).
Actual PM intake via Groq and graph generation via Gemini PASS, schema and graph
valid. OpenRouter OPTIONAL UNAVAILABLE (401); OpenAI model not configured.
These calls did not connect to Supabase. No repeated unchanged inference runs.

## Defects Fixed

- Empty graph identifiers and dangling assumption validation links now fail validation.
- Missing hard prerequisites no longer incorrectly unlock executable frontier nodes.
- Replan source/fact/read/diff-write errors are no longer silently ignored.
- Post-save replan failure preserves its idempotency claim and saved candidate,
  surfaces a refresh/review message, and does not replace active history.
- Replan returns the transaction-allocated version number under concurrent allocation.
- Dedicated Vitest configuration tests actual handlers, not generated SSR RPC stubs.
- Smoke errors suppress raw SDK headers/bodies; small Groq JSON gets reasoning room.

Graph persistence/action/check-in/strategy/activation RPCs are transaction-tested
locally. The entire replan plus later comparison/idempotency bookkeeping is NOT
one global database transaction. Partial review-detail failure leaves the saved
candidate for explicit review; this is not disguised as atomic success.

## Remaining P1 Release Gates

1. Owning-account catalog access: API exposes all16 tables and five RPC signatures,
   but actual RLS/ACL/index/constraints/bodies/ledger remain unknown. Reconnect
   owning account or export the read-only catalog SQL result and compare locally.
   Do not infer migrations pending or apply them blind.
2. After compatibility, obtain explicit scoped owner approval before two-user RLS
   and mock authenticated Golden Path. Live AI Golden Path is a separately
   reviewed run. Current guards block all such writes.
3. Verify real email delivery/confirmation, complete Google callback, login,
   session restoration, logout/relogin and persisted workflow.
4. Owner configures/deploys an independent Retraza preview, approves shared Auth
   redirect additions without replacing existing entries, then verifies exact
   hosted callback/server/browser/data flow before production promotion.

No known unresolved P0/P1 implementation failure remains in completed local
gates. This does NOT establish unexecuted live acceptance. Optional OpenRouter,
existing Fast Refresh warnings and deprecated inputValidator build warnings do
not block Gemini/Groq demo routing.

## Runbooks

- [Shared schema evidence and exact approval checkpoint](SHARED_SUPABASE_COMPATIBILITY.md)
- [Detailed local evidence](FINAL_LOCAL_VERIFICATION.md)
- [Owner-only GitHub publishing](MANUAL_GITHUB_RELEASE.md)
- [Independent deployment and rollback](PRODUCTION_DEPLOYMENT_CHECKLIST.md)

Safe next command: `npm.cmd run check:shared` (GET-only).
Local production demo: http://127.0.0.1:5174/demo.
