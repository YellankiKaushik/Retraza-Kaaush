# Retraza / ReversePath

Turn a natural-language goal, problem or decision into a versioned execution plan.
The existing React 19 / TanStack Start application uses Supabase Auth/PostgreSQL,
server-side AI, Zod validation and deterministic dependency/progress logic.

## Current Verification

October23 final publication checkpoint: 230 deterministic tests PASS (13 live
skips),32 local browser tests PASS (13 intentional skips),typecheck/lint and
Node/Vercel builds PASS. Source/history/client secret scan:zero findings.
Latest OpenRouter request returned HTTP200 with an error429 envelope and no
assistant content;schema/compiler not reached. No inference repeated.
All live providers remain disabled. Google auth remains OWNER-VERIFIED PASS.
See FINAL_HOSTED_LAUNCH_STATUS.md for the actual latest deployment and commit
checkpoint. The chronological notes below are historical,not live authorization.

CURRENT:owner does not recognize Groq credential;provenance UNKNOWN,Groq disabled.
One owner-authorized OpenRouter free-model planning request returnedHTTP200 but
failed before a validated result;Gemini official metadata authentication401.
No live provider currently verified/active. Stable Preview F7Cw is SAFETY-ONLY,
all live providers disabled;demo/auth/saved plans remain available. No hidden mock.
221 deterministic tests/32 local browsers/8 focused hosted checks PASS;both builds,
typecheck/lint/security/dependency audit PASS. These do NOT prove real AI planning.
Google stable OWNER-VERIFIED PASS;email confirmation unverified. Production:NO.
[Canonical evidence and owner action](docs/FINAL_HOSTED_LAUNCH_STATUS.md).
All earlier Groq retest instructions below are historical,NOT authorization.

Current v7:218 offline tests and32 local/32 hosted browser tests passed;typecheck,
lint,both builds,security and dependency audit passed. Minimal strict Groq provider
schema is separated from unchanged semantic/runtime validation;nullable nested
unions flattened. READY dpl_69vQJtoRbiPGx9CKW3VLdjVE66Zm serves the stable alias.
The one authorized isolated request BEFORE final union correction returned400
on response_format(anyOf indicator);final real provider success remains unverified.
No retry or shared database write occurred. Stable Google sign-in is
OWNER-VERIFIED PASS;email confirmation unverified. Next gate:separately authorized
provider-only retest,then fresh essential acceptance. Production:NO.
Older results below are historical;[canonical status](docs/FINAL_HOSTED_LAUNCH_STATUS.md).

Latest actual essential v6 acceptance: **FAIL** at initial Groq plan request
(HTTP400,before output/graph validation). Login/classification/saved clarification
passed;no plan persisted,later lifecycle not reached. Both temporary users were
deleted;all16 tables have zero run-owned records. No retry. Detailed provider
rejection reason is unresolved. Local diagnostic correction is NOT deployed and
not a generation fix. See [actual evidence](docs/FINAL_HOSTED_LAUNCH_STATUS.md);
do not issue another live approval yet. Stable Preview remains READY.
The pending-approval preparation and verification counts below are historical.

The [semantic compiler release report](docs/SEMANTIC_COMPILER_RELEASE.md) records
the protected stable [Retraza Preview](https://retraza-kaaush-preview-kaushik-yellanki-project.vercel.app).
Groq now generates nested semantic work; deterministic code constructs graph
ownership, IDs, dependencies and assumption links before unchanged validation and
atomic persistence. Strict JSON Schema/zero retries; no live mock fallback.
Offline213 tests (12 skipped) and local/hosted browser32 tests (13 skipped each)
passed. Typecheck/lint/Node+Vercel builds/source+history+client security passed.
The v6 bounded-assumption correction is implemented: ONE collection with three
required slots and two nullable slots, verified in the actual emitted SDK schema.
READY Preview dpl_7fYdNrA9pYDrB7Ti8Uhv7biynUva serves the stable alias. The
[single approved v5 acceptance](docs/FINAL_HOSTED_LAUNCH_STATUS.md) FAILED aggregate
assumptions-count before persistence; cleanup verified. Its v6 replacement has
not run live: one NEW owner-authored essential approval is the next gate.
No automatic rerun; see the current report for the exact PowerShell command.
OpenRouter key authentication now works, but its one contract request returned404;
it remains disabled. Gemini metadata now returns401 and is disabled too.
Groq alone is selected for all routes; its current key/model metadata check passed.
One verified provider is sufficient; no requirement for all three to pass.

See the current [AI replanning reliability report](docs/AI_REPLANNING_RELIABILITY_REPORT.md)
for offline fixes, exact verification counts and the fresh live-retest checkpoint.
Catalog compatibility, prior live RLS and mock Golden Path passed. The latest
v4 essential real-AI Golden Path failed at strategy-branch; v5 subsequently
failed at aggregate assumptions-count. Local/public tests are not hosted lifecycle
acceptance. Owner reported real Google success on an earlier Preview; stable
request-origin contracts pass, genuine mailbox/stable callback checks remain manual.
[Owner actions](docs/OWNER_ACTIONS_REQUIRED.md) consolidate the remaining gates.

The VibeSprint reference is immutable. Its historical release results are not
Retraza verification. See [parity report](docs/VIBESPRINT_PARITY_REPORT.md),
[release readiness](docs/RETRAZA_RELEASE_READINESS.md) and
[handoff](docs/VIBE_SPRINT_HANDOFF.md) for actual results and remaining gates.

**The shared Supabase backend is read-only by default.** Reusing it is supported;
a second account/project is not required. Remote writes require verified catalog
compatibility and explicit project-specific owner approval for one controlled run.
See [shared compatibility and approval checkpoint](docs/SHARED_SUPABASE_COMPATIBILITY.md).
**No GitHub publishing, shared database writes or Production promotion is authorized.**
The October20 task authorized the independent [Retraza Preview](https://retraza-kaaush-f6yk0unsr-kaushik-yellanki-project.vercel.app), now READY and tested with protection enabled.
See [current completion evidence](docs/FINAL_RETRAZA_COMPLETION.md). Real hosted
authentication and full live-AI acceptance remain unverified; the prepared demo is not live AI.
The owner reviews and publishes manually using [the release runbook](docs/MANUAL_GITHUB_RELEASE.md).

## Install And Run

Use Node 24 and npm. `package-lock.json` is authoritative for this release;
the retained historical Bun files are not the release installation workflow.

PowerShell:

```powershell
npm.cmd ci
if (!(Test-Path .env)) { Copy-Item .env.example .env }
npm.cmd run dev
```

Unix:

```sh
npm ci
test -f .env || cp .env.example .env
npm run dev
```

Edit the ignored local `.env` privately. The dev URL is
http://localhost:5173. Keep `AI_PROVIDER_MODE=mock` for deterministic development.
`/demo` works without login, database writes or inference. Its prepared PM plan,
completion and reset use browser storage only and are explicitly labelled.

## Supabase Backend

The existing shared project may be reused without changing its credentials.
Keep matching browser/server URLs and publishable keys:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`: server-only; supports modern `sb_secret_` keys.

Run `npm.cmd run check:shared` for GET-only surface inspection. All eight
migrations are structurally present in the verified shared catalog; do not replay
them or rewrite the ledger. Catalog evidence must be less than 24 hours old for
each separately approved writing test. To refresh expired evidence, run the prepared
`supabase/SHARED_READ_ONLY_PREFLIGHT.sql` in that project's SQL Editor and save
its single catalog JSON value to an ignored local file. Compare locally:

```powershell
node scripts/verify-shared-catalog.mjs logs/shared-catalog.json
```

Unknown or incompatible results block writes. Review precise differences with
the owner before any migration, ledger repair, Auth change or acceptance test.
Never reset a remote database or replay historical bootstrap/repair SQL.

For local Supabase, install and start Docker Desktop, then:

```powershell
npx.cmd supabase start
npx.cmd supabase migration up --local
```

Docker is required for the full local Supabase stack. It is not required for
`npm.cmd run test:db`, which executes migrations and RLS/transaction checks in
isolated in-memory PostgreSQL (PGlite), with a minimal Auth schema fixture.
Those tests do not establish live Supabase Auth or PostgREST verification.

With owner approval, add exact Retraza `/auth` redirect URLs to the shared
project without overwriting VibeSprint's Site URL or existing redirect entries.
Preserve Google OAuth configuration and email confirmation. Real inbox delivery
and complete Google callbacks are separate acceptance gates, not mock evidence.

## AI Configuration

All provider calls and private keys stay on the server. Only Supabase publishable
configuration belongs in `VITE_` variables.

Gemini uses the official Google adapter. Groq and optional OpenRouter/OpenAI/
Lovable providers retain the compatible adapter. Configure model IDs through
`PROVIDER_MODEL_DEFAULT` or role-specific `PROVIDER_MODEL_FAST/PRIMARY/CRITIC/FALLBACK`.

- Default FAST route: Groq then Gemini.
- Default planning route: Gemini then Groq.
- Default allowlist: `gemini,groq`.
- Optional providers require explicit inclusion in `AI_PROVIDER_ALLOWLIST`,
  an enabled configuration, a key and a model.
- A nonempty invalid route or allowlist fails closed.
- `AI_PROVIDER_MODE=live` enables inference; missing/invalid modes use mock.
  The historical `free-first` mode remains compatible and also makes live calls.
- Live failures never become mock successes.
- `AI_PROVIDER_TIMEOUT_MS` defaults to 90000, capped at 300000.
- `AI_PROVIDER_MAX_RETRIES` defaults to 0, capped at 2 per provider.
  Only 429/503 retry the same provider with bounded Retry-After/backoff.
- `AI_MAX_OUTPUT_TOKENS` defaults to 12000, capped at 16384.
- Shared/operation-specific daily limits are checked before expensive work;
  quota-read errors fail closed.
- `AI_GENERATION_ENABLED` is a retained historical setting, not an implemented switch.

Model access does not establish a free billing tier. Confirm provider billing
before live tests. No paid fallback is enabled implicitly. Optional OpenRouter
authentication failure does not prevent Gemini/Groq routing.

The OpenAI-compatible adapter can use a deliberately configured alternate
`OPENAI_BASE_URL`; keys must belong to that endpoint. RouterPlus credentials
were not confirmed in this run, so no existing key was sent there.

## Verification

```powershell
npm.cmd run check:env
npm.cmd run typecheck
npm.cmd run lint
npm.cmd test
npm.cmd run test:unit
npm.cmd run test:integration
npm.cmd run test:db
npx.cmd playwright install chromium
npm.cmd run test:e2e
npm.cmd run build
npm.cmd run build:vercel
npm.cmd run check:secrets
npm.cmd audit
```

`npm.cmd run check:release` runs local gates with live database/inference tests
disabled. Normal browser checks use mock AI. Live suites are skipped, not passed.

AI-only tests, without database access:

```powershell
$env:RUN_LIVE_AI_SMOKE="true"; npm.cmd run test:integration
Remove-Item Env:RUN_LIVE_AI_SMOKE
$env:RUN_LIVE_DEMO_PLAN="true"; npm.cmd run test:integration
Remove-Item Env:RUN_LIVE_DEMO_PLAN
```

Normal checks keep `RETRAZA_TEST_BACKEND_MODE=read-only` and live gates off.
Controlled shared acceptance requires fresh schema evidence, an owner-authored
approval file, one run UUID, scope, expiry and two-user budget. The agent never
creates actual approval. See the compatibility report for the exact checkpoint.
A truly isolated optional local backend can still use
`RETRAZA_TEST_BACKEND_ISOLATED=true`; this flag never authorizes the shared host.
Optional test key lookup prefers `SUPABASE_TEST_PUBLISHABLE_KEY` /
`SUPABASE_TEST_SECRET_KEY` with legacy aliases, then matching application keys.
Distinct test URLs require their own keys.

Unix env assignment such as `RUN_LIVE_AI_SMOKE=true npm run test:integration`
is not PowerShell syntax. Use the PowerShell blocks above on Windows.

## Deployment

This is SSR, not a static SPA. `npm.cmd run build` creates a Node server;
`npm.cmd start` runs it with the local ignored environment. Use
`npm.cmd run build:vercel` for the independent Vercel build in `vercel.json`.
Create/link a separate Retraza hosting project; never reuse the event project.

Set public Supabase variables before building and private server/provider
variables in the destination platform secret store. Test the exact preview's
callbacks, full authenticated lifecycle, RLS, refresh and relogin before release.
No deployment or production domain change has been performed by this integration.

`node scripts/run-hosted-qa.mjs https://YOUR_RETRAZA_PREVIEW` runs public checks;
live gates remain deliberate and require verified schema and owner approval.
`node scripts/audit-hosted-client.mjs https://YOUR_RETRAZA_PREVIEW` scans fetched
public pages/assets. Neither script permits the reference deployment.

Rollback by restoring the prior verified destination deployment. Preserve database
data; review a forward-fix migration rather than resetting or dropping schema.

## Architecture And Ownership

[Architecture](docs/DEEP_TECHNICAL_ARCHITECTURE.md) explains the existing domain.
RLS and ownership triggers protect user data; owner-scoped transaction RPCs own
graph persistence, action state, check-ins, strategy selection and activation.
Only one version may be active. Candidates require explicit acceptance and old
versions remain available. Planning-data export fails visibly on incomplete reads.

Supabase Storage remains the object-storage adapter. Notion remains a preserved
future export contract, not a database. Lovable metadata, preview auth storage,
error reporting and existing Git history are retained. Never force-push.
