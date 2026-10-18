# Retraza Release Readiness

October 19, 2026. Application commit: `3b7a049057736d02dabb02fd685cf80b2f54764c`.
Implementation branch: `feat/vibesprint-parity`.
Verdict: **C - PARTIAL PARITY, ADDITIONAL WORK REQUIRED**.

Destination draft PR: https://github.com/YellankiKaushik/Retraza-Kaaush/pull/1
The implementation branch is published for review, not approved for merge/release.

## Final Status

SOURCE REPOSITORY MODIFIED: NO  
DESTINATION REPOSITORY UPDATED: YES  
FEATURE PARITY ACHIEVED: NO - code integrated; live acceptance blocked  
ALGORITHM PARITY VERIFIED: YES - stated deterministic/domain and isolated SQL scope  
DATABASE MIGRATIONS COMPLETE: NO - prepared and tested locally; not applied remotely  
LIVE AUTH VERIFIED: NO  
LIVE AI VERIFIED: YES - Gemini and Groq, including actual PM intake/graph  
LIVE RLS VERIFIED: NO - isolated PostgreSQL tests are not live Supabase evidence  
GOLDEN PATH VERIFIED: NO - deterministic lifecycle passes; authenticated live path blocked  
LOCALLY RUNNABLE: YES - Node production public/demo checks pass  
READY FOR GITHUB MERGE: NO - draft review only until live release gates pass  
READY FOR DEPLOYMENT: NO - buildable, but isolated backend/acceptance required  
PRODUCTION DEPLOYED: NO

## Verified Checks

- Environment check, typecheck and lint: PASS; zero lint errors, six existing warnings.
- npm test: 76 passed / 11 explicitly skipped.
- Unit: 58 passed. Deterministic integration: 6 passed. Database: 12 passed.
- Public/browser suite: 17 passed / 13 skipped.
- Actual Node production browser subset: 8 passed.
- Node and Vercel builds: PASS.
- Production client audit: 36 HTML/JS responses, zero private credentials/errors/failures.
- Source/client/destination-history secret scans: zero findings.
- Dependency audit: zero vulnerabilities after compatible fixes.
- Gemini and Groq minimal live smoke: PASS. OpenRouter: OPTIONAL UNAVAILABLE
  (authentication rejected). OpenAI: not configured for a model.
- Controlled PM intake (Groq) and graph (Gemini): PASS; schema and graph valid.
- No destination database integration/cleanup was performed against the shared backend.

## Database Blocker And Exact Setup

The existing local .env backend is SHARED with the immutable reference and strictly
READ-ONLY by the owner's explicit instruction. Its credentials remain untouched.
No database reset, write, migration, new user, cleanup or schema repair is authorized there.

1. Configure a dedicated Retraza-owned Supabase project OR a local Supabase stack.
   Do not use the event project's database or hosting.
2. Privately set these matching destination values in ignored .env:
   VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL,
   SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY.
   Modern publishable/secret API keys are supported; no legacy JWT key is required.
3. Set AI_PROVIDER_MODE=mock for initial local checks.
4. For a dedicated remote project, link only that explicit reference, inspect history,
   dry-run and review the target, then apply pending versioned migrations.
   These are manual future actions, not commands executed by this integration:

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref YOUR_RETRAZA_PROJECT_REF
npx.cmd supabase migration list --linked
npx.cmd supabase db push --dry-run
npx.cmd supabase db push
```

For a new dedicated backend all eight files are required. An existing backend
must receive only its pending files, determined from history. The four additions:

- 20261011095115_restrict_internal_ownership_helpers.sql
- 20261013084557_atomic_execution_updates.sql
- 20261013085758_atomic_plan_persistence.sql
- 20261013090748_atomic_checkins_and_strategy_selection.sql

Do not use FINAL_REMOTE_BOOTSTRAP.sql, historical repair SQL, migration-history
repair or any remote reset as a shortcut.

For local Supabase, Docker Desktop is required and was not available on PATH
during inspection. Install/start Docker before using the project-local CLI:

```powershell
npx.cmd supabase start
npx.cmd supabase migration up --local
```

Use the printed local URL/publishable/secret keys privately. Do not paste values
into chat. PGlite already provides Docker-free SQL verification, but it does not
replace full Supabase Auth/PostgREST/browser acceptance.

## Reopen The Live Gates

Only after the backend is isolated and schema applied:

1. Set RETRAZA_TEST_BACKEND_ISOLATED=true in its ignored configuration.
2. Optional separate test target: SUPABASE_TEST_URL,
   SUPABASE_TEST_PUBLISHABLE_KEY, SUPABASE_TEST_SECRET_KEY. A distinct URL requires
   its own keys. Legacy test aliases remain fallback names.
3. Configure destination Auth Site URL/Redirect URLs, including localhost and
   the exact future Retraza preview/auth callback. Use destination-owned Google
   credentials if Google sign-in is enabled. Preserve email confirmation.
4. Run owner-scoped live SQL/RLS tests with fixture AI before spending inference.
5. Deliberately choose AI_PROVIDER_MODE=live, allowed providers/models, then run
   the authenticated Golden Path. Never treat a skipped test as PASS.
6. Verify real email delivery using an owned disposable mailbox separately.
   Generated confirmation links and intercepted responses do not prove delivery.

```powershell
npm.cmd run check:env
$env:RUN_SUPABASE_RLS_TESTS="true"; npm.cmd run test:integration
Remove-Item Env:RUN_SUPABASE_RLS_TESTS
$env:RUN_E2E_GOLDEN="true"; npm.cmd run test:e2e
Remove-Item Env:RUN_E2E_GOLDEN
```

The test guard refuses the known shared reference hostname even with the opt-in.
It fails before account creation or SQL. Normal tests never need this opt-in.

## Independent Deployment

Build target: Node 24 SSR through TanStack Start/Nitro. Vercel configuration is
prepared and its local build passed. A static-only host is insufficient.

- Create/link a separate Retraza hosting project; no event IDs/domain were copied.
- Install with npm ci; build with npm run build:vercel on Vercel.
- Public build variables: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
- Private server variables: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY, AI_PROVIDER_MODE, allowed provider API keys/models.
- Optional provider routing, quota, retry and output limits are in .env.example.
- For standalone Node use npm run build:node, then npm start; set PORT as needed.
- Verify the exact preview's auth callbacks, refresh, re-login, persistence, full
  Golden Path, RLS and browser-secret audit before approving release.
- No preview/public deployment or production-domain switch was performed.
- Rollback to the previous verified destination deployment. Do not reset the
  database; review a forward-fix migration if schema repair is needed.

## Remaining Release Blockers

| Requirement                               | Severity | Reason / next action                                                | Blocks release |
| ----------------------------------------- | -------- | ------------------------------------------------------------------- | -------------- |
| Dedicated backend and verified migrations | P1       | Configure isolated Retraza/local backend; apply only pending schema | YES            |
| Live authentication/RLS/Golden Path       | P1       | Run the gated acceptance suites and fix actual failures             | YES            |
| Independent hosted preview verification   | P1       | Deploy/test a separate Retraza preview after backend gates          | YES            |

OpenRouter authentication and existing lint warnings are not release blockers.
No unresolved implementation failure was observed in the completed local gates.
Those gates do not prove an untested remote deployment.

See [the parity matrix and complete changed-file inventory](VIBESPRINT_PARITY_REPORT.md).

## Safe Next Command

```powershell
npm.cmd run check:release
```

The application is also running locally at http://127.0.0.1:5173/demo.
Use only the public prepared demo while the backend remains shared/read-only.
