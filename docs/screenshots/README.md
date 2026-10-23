# Application Screenshot Evidence

Captured October 23, 2026 with Playwright Chromium against local Retraza.
All eight images are real rendered UI, not generated artwork or reference-project screenshots.

| Image               | Route          | Data                                        |
| ------------------- | -------------- | ------------------------------------------- |
| landing-desktop.png | /              | Public landing                              |
| public-demo.png     | /demo          | Prepared offline demo                       |
| dashboard.png       | /              | Intercepted synthetic session/objective     |
| goal-planning.png   | /new           | Synthetic input, no submission              |
| strategy-graph.png  | /plans/:caseId | Existing deterministic mock workspace       |
| action-progress.png | /plans/:caseId | Fixture with one completed action           |
| version-history.png | /plans/:caseId | Replan controls, active v1 and initial diff |
| mobile-view.png     | /demo          | Prepared demo, 390px viewport               |

Private images are demonstrations, not proof of hosted authentication, remote persistence
or live AI replanning. No real user accounts, goals, emails, tokens or database records appear.
The mock workspace is an existing UI fixture, not current live-provider contract output.

Reproduce with local placeholders and all live gates disabled:

```powershell
$env:RETRAZA_CAPTURE_DOCS="true"
$env:PLAYWRIGHT_PORT="4187"
$env:VITE_SUPABASE_URL="http://127.0.0.1:54321"
$env:SUPABASE_URL="http://127.0.0.1:54321"
$env:SUPABASE_TEST_URL="http://127.0.0.1:54321"
$env:VITE_SUPABASE_PUBLISHABLE_KEY="screenshot-publishable-placeholder"
$env:SUPABASE_PUBLISHABLE_KEY="screenshot-publishable-placeholder"
$env:SUPABASE_SERVICE_ROLE_KEY="screenshot-only-placeholder"
$env:RETRAZA_TEST_BACKEND_MODE="read-only"
$env:RUN_E2E_GOLDEN="false"
$env:RUN_E2E_SIGNUP="false"
$env:RUN_E2E_SCENARIOS="false"
$env:RUN_SUPABASE_RLS_TESTS="false"
$env:RUN_LIVE_AI_SMOKE="false"
$env:RUN_LIVE_DEMO_PLAN="false"
$env:RUN_OPENROUTER_PLAN_SMOKE="false"
node scripts/run-e2e.mjs tests/e2e/local-workspace.spec.ts --grep "documentation screenshots"
```

Auth and server-function requests are intercepted. The test checks rendered content
and horizontal overflow. PNGs use CSS-pixel scale and are below 150 KB individually.
No production UI changed to capture them. The version view intentionally shows only
the existing single-version fixture; no candidate acceptance evidence was invented.
