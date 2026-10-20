# Retraza Production Test Report

October 20, 2026. Production is NOT released. This file records local-production
build and independent hosted PREVIEW evidence, not Production acceptance.

Deployed source:5b2bdae702aa3ba64630bc4fd8edaf47541cfaf9.
Preview:dpl_FrVepsubsSfMfyyb1BKQPSV7iFtw, READY.
https://retraza-kaaush-f6yk0unsr-kaushik-yellanki-project.vercel.app

## Actual Counts

| Group                              | Passed | Failed | Skipped |
| ---------------------------------- | -----: | -----: | ------: |
| check:env                          |      1 |      0 |       0 |
| Typecheck                          |      1 |      0 |       0 |
| Lint invocation                    |      1 |      0 |       0 |
| Unit                               |     80 |      0 |       0 |
| Deterministic integration          |     27 |      0 |      11 |
| Isolated local SQL                 |     12 |      0 |       0 |
| npm test combined                  |    119 |      0 |      11 |
| Local browser suite                |     28 |      0 |      13 |
| Local Node production subset       |     19 |      0 |       0 |
| Hosted Preview browser suite       |     28 |      0 |      13 |
| Node build                         |      1 |      0 |       0 |
| Vercel local build                 |      1 |      0 |       0 |
| Remote Preview build               |      1 |      0 |       0 |
| check:release                      |      1 |      0 |       0 |
| Source/history/client secret audit |      1 |      0 |       0 |
| Hosted fetched client audit        |      1 |      0 |       0 |
| Dependency audit                   |      1 |      0 |       0 |

Rows overlap: npm test, check:release and individual groups are not additive.
Checks/build rows count invocations; unit/integration/browser rows count cases.
Lint has six existing Fast Refresh warnings, zero errors. Both targets retain
upstream deprecation/chunk warnings, not build failures.

Live Gemini smoke:1 passed. Groq first512-token smoke:1 failed HTTP400; focused
retest with low reasoning effort for configured gpt-oss:1 passed. No adapter/model
architecture changed and no automatic retry loop was added. Live plan/classification
contracts remain previous October19 evidence; no new expensive unchanged graph run.
Optional OpenRouter remains previously auth-rejected/disabled, not passed.
No live DB or provider-backed persisted replan was executed.

## Hosted Scope

Home/auth/demo/assets, protected-route redirect, loading/error/callback states,
desktop/tablet/mobile demo and refresh/reset passed against the actual HTTPS
Preview with protection enabled. Synthetic-session workspace/settings, action
feedback/refresh, duplicate-submit guard, account-cache switching and export
failure tests intercept ALL server functions/auth responses. These11 cases
verify hosted client behavior, NOT actual sign-in, RLS or persistence.

Screenshots were captured at1440/768/390; mobile Preview demo was visually
inspected. No horizontal overflow in tested surfaces. No new app design.
The browser/asset audit fetched36 HTML/JS responses:0 private credentials,
0 page errors,0 failed responses. Short-lived protection headers stayed on the
exact Retraza origin and did not follow redirects. No trace captured them.

Deployment-filtered CLI logs over the inspected30-minute window:0 error records,
0 HTTP5xx. Connector log reads were forbidden; existing scoped CLI supplied
counts. Remote npm ci/build succeeded and deployment reached READY.
Default Deployment Protection remains enabled; no permanent share bypass created.

## Skipped / Blocked

- Live RLS:0 passed/0 failed/6 skipped.
- Authenticated Golden Path:0 passed/0 failed/2 skipped variants (full and compact).
  Mock/live approvals are separate modes of these tests, not additional successes.
- Other gated browser cases remain in the13 skips: unconfigured-client case,
  real confirmation callback/signup, Google initiation/session, live workspace,
  scenarios and cross-user isolation.
- Baseline's11 integration skips include6 RLS,4 provider-smoke and1 actual PM
  contract test. Separate smoke runs above are not merged into baseline counts.
- Real email inbox confirmation, Google account return, shared schema/RLS and
  persisted logout/relogin have not been verified for Retraza.
- No public Production deployment or Production acceptance tests completed.
  The first auto-targeted Production attempt was canceled before READY; see
  RETRAZA_VERCEL_DEPLOYMENT.md. No source VibeSprint changes.

## Evidence Files (Ignored)

logs/end-to-end-baseline.log, end-to-end-final-local.log,
end-to-end-vercel-build.log, end-to-end-node-browser.log,
retraza-preview-build.log, retraza-preview-browser.log.
Public metadata: logs/shared-supabase-preflight.json.
No catalog was fabricated. .env and generated Vercel credentials remain ignored.
No dependencies changed in this phase; npm audit reports zero vulnerabilities.

## Reproduce Public Preview QA

```powershell
vercel.cmd env run --environment development --scope kaushik-yellanki-project -- node scripts/run-hosted-qa.mjs https://retraza-kaaush-f6yk0unsr-kaushik-yellanki-project.vercel.app
vercel.cmd env run --environment development --scope kaushik-yellanki-project -- node scripts/audit-hosted-client.mjs https://retraza-kaaush-f6yk0unsr-kaushik-yellanki-project.vercel.app
```

These commands force live gates OFF. Shared acceptance requires the separate
verified-catalog and owner-approved run procedure; no protection bypass does
or may authorize database mutations.
