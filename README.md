# Retraza / ReversePath

Turn a natural-language goal, problem or decision into a versioned execution plan.
The existing React 19 / TanStack Start application uses Supabase Auth/PostgreSQL,
server-side AI, Zod validation and deterministic dependency/progress logic.

## Current Verification

The VibeSprint reference is immutable. Its historical release results are not
Retraza verification. See [parity report](docs/VIBESPRINT_PARITY_REPORT.md),
[release readiness](docs/RETRAZA_RELEASE_READINESS.md) and
[handoff](docs/VIBE_SPRINT_HANDOFF.md) for actual results and remaining gates.

**The currently configured shared Supabase backend is strictly read-only.**
Do not migrate, create users, run authenticated tests, or clean up users there.
Configure a dedicated Retraza or local backend before enabling live database tests.

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

## Dedicated Supabase Backend

Use a Retraza-owned project, never the reference project's database.
Set matching browser/server URLs and publishable keys:

- `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`: server-only; supports modern `sb_secret_` keys.

For a fresh dedicated project, apply all eight committed migrations in order.
For an existing dedicated project, inspect migration history and apply only pending
files. Do not repair migration history to pretend SQL was applied.

PowerShell (replace the project-ref placeholder):

```powershell
npx.cmd supabase login
npx.cmd supabase link --project-ref YOUR_RETRAZA_PROJECT_REF
npx.cmd supabase migration list --linked
npx.cmd supabase db push --dry-run
npx.cmd supabase db push
```

Review the CLI output's target before applying. Never use a remote reset.
Do not replay `FINAL_REMOTE_BOOTSTRAP.sql` or historical one-time repair files.
The complete current schema is the versioned files in `supabase/migrations/`.

For local Supabase, install and start Docker Desktop, then:

```powershell
npx.cmd supabase start
npx.cmd supabase migration up --local
```

Docker is required for the full local Supabase stack. It is not required for
`npm.cmd run test:db`, which executes migrations and RLS/transaction checks in
isolated in-memory PostgreSQL (PGlite), with a minimal Auth schema fixture.
Those tests do not establish live Supabase Auth or PostgREST verification.

In the dedicated Supabase dashboard, configure Site URL and Redirect URLs for
your Retraza origin, `/auth`, and required localhost origins. Configure Google
OAuth only with destination-owned credentials and its Supabase callback URL.
Keep email confirmation enabled and verify actual delivery to an owned mailbox.

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

After the dedicated/local backend and all migrations are verified, explicitly
set `RETRAZA_TEST_BACKEND_ISOLATED=true` in its ignored test configuration.
Optional `SUPABASE_TEST_URL`, `SUPABASE_TEST_PUBLISHABLE_KEY`, and
`SUPABASE_TEST_SECRET_KEY` select a separate test backend. Legacy test anon/
service-role names remain fallback aliases. A separate URL needs its own keys.

```powershell
$env:RUN_SUPABASE_RLS_TESTS="true"; npm.cmd run test:integration
Remove-Item Env:RUN_SUPABASE_RLS_TESTS
$env:RUN_E2E_GOLDEN="true"; npm.cmd run test:e2e
Remove-Item Env:RUN_E2E_GOLDEN
```

Unix equivalents use `RUN_LIVE_AI_SMOKE=true npm run test:integration` and
`RUN_E2E_GOLDEN=true npm run test:e2e`. Do not use that assignment syntax in PowerShell.

Live tests create unique temporary accounts and scoped records and clean up only
their own users. The guard always rejects the shared reference database.

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
live gates remain deliberate and require the isolated backend.
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
