# Final Local Verification

October 19, 2026. Destination: Retraza-Kaaush, feat/vibesprint-parity.
Starting SHA: cd72ae7d2bd0713bec013f7affc9583aac5b3cbe.
Reference SHA unchanged: a58c52921b5eb21287446aff998c196b49e2d100.
No GitHub writes or hosted deployments performed. Tests use ignored credentials
privately; this report contains configuration names only.

## Executed Checks

| Command / group                           | Passed | Failed | Skipped |
| ----------------------------------------- | -----: | -----: | ------: |
| npm.cmd run check:env                     |      1 |      0 |       0 |
| npm.cmd run typecheck                     |      1 |      0 |       0 |
| npm.cmd run lint                          |      1 |      0 |       0 |
| npm.cmd run test:unit                     |     76 |      0 |       0 |
| npm.cmd run test:integration              |     13 |      0 |      11 |
| npm.cmd run test:db                       |     12 |      0 |       0 |
| npm.cmd test                              |    101 |      0 |      11 |
| npm.cmd run build:node                    |      1 |      0 |       0 |
| npm.cmd run build:vercel                  |      1 |      0 |       0 |
| npm.cmd run check:release                 |      1 |      0 |       0 |
| Public/browser suite inside release check |     17 |      0 |      13 |
| Production Node auth-guard/demo subset    |      8 |      0 |       0 |
| node scripts/scan-secrets.mjs --history   |      1 |      0 |       0 |
| Production fetched client audit           |      1 |      0 |       0 |
| npm.cmd audit --json                      |      1 |      0 |       0 |

Checks/build rows count invocations; test rows count cases. No summing overlaps.
Lint has six pre-existing Fast Refresh warnings, zero errors. Builds retain
upstream deprecated inputValidator/chunk-size warnings, not failures.
Client audit: 36 HTML/JS responses; zero secret matches, page errors or failures.
Source/history/client scan: zero findings; .env ignored. Dependency audit: zero
vulnerabilities. No dependencies added/changed by this final task.

Ignored evidence logs: controlled-baseline-_.log, controlled-final-release.log,
controlled-final-vercel.log, controlled-node-server_.log. npm run check:release
forces every live gate false, AI mock and shared mode read-only independently
of .env. Tests use intercepted network or isolated in-memory PostgreSQL.
Public production browser subset uses http://127.0.0.1:5174.

## Live AI (Not Database Evidence)

- Gemini minimal structured response: 1 passed / 0 failed.
- Groq first minimal response: 0 passed / 1 failed at 128 output tokens.
  Focused retest after 512-token reasoning allowance: 1 passed / 0 failed.
- OpenRouter: optional authentication rejected; skipped, NOT passed.
- OpenAI: no configured model; skipped, NOT passed.
- Actual PM intake and structured graph pair: 1 passed / 0 failed.
  Groq intake used 916 input / 1225 output tokens; Gemini graph 1385 / 2581.
  Schema validation and graph/frontier checks passed. No database writes.

Provider error messages now withhold raw SDK diagnostics. Optional failure never
becomes mock success. Deterministic route/timeout/429/schema/quota tests pass.
These structural tests do not fully establish real-world plan usefulness.

## New Coverage And Adversarial Review

25 additional deterministic cases: five scoped-approval/network-cleanup guards,
three graph/frontier regressions, five real replan-handler failure/concurrency
regressions, two read-only preflight/catalog comparison cases and ten planning
scenarios. The mock scenario matrix checks career/PM/technical learning/business,
vague/missing facts/contradictory constraints/unrealistic timeline/competing
strategies/resource changes. Existing cyclic/failed-prerequisite tests remain.
Mock prompts preserve actual constraints; they do not prove semantic feasibility.

Existing local SQL covers concurrent activation, action/check-in/strategy
atomicity, rollback after partial writes, ownership and one active version.
Browser checks cover public/protected routing, failure states, malformed callback,
network failures, prepared completion persistence and mobile sizing. They do not
pretend to prove live account switching or complete shared-auth workflows.

Replan bugs were reproduced before the implementation change. Changed-fact and
source errors fail before inference. Post-candidate failures preserve reservation
and candidate and never report success. The persisted version number wins over
the pre-save estimate. Comparison write remains a separate step, disclosed in
readiness rather than incorrectly labelled one atomic end-to-end transaction.

## Blocked / Not Executed

- Live Supabase RLS: 0 passed / 0 failed / 6 skipped.
- Authenticated Golden Path: 0 passed / 0 failed / 2 skipped.
- Other live signup/OAuth browser cases: blocked; included in 13 browser skips.
- Real inbox delivery, full Google callback and authenticated session/persistence:
  not executed. Intercepted confirmation states are not live auth evidence.
- Shared catalog/ledger/RLS/ACL verification: unknown until owning-account access.
- Shared schema changes, user creation and cleanup: NONE.
- Hosted preview and production acceptance: not executed; no deployment.

See SHARED_SUPABASE_COMPATIBILITY.md for read-only API evidence. The eight-file
local schema passing does not prove those migrations are applied remotely.

## Resume

Reconnect the owning Supabase account, export/inspect the read-only catalog,
compare it locally, then present the exact approval checkpoint BEFORE live writes.
Do not create actual approval evidence or acknowledgements on the owner's behalf.
No automatic GitHub changes. See MANUAL_GITHUB_RELEASE.md for owner commands.
