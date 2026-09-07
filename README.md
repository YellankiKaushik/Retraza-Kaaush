# ReversePath

ReversePath is an AI-assisted goal, problem-solving, decision, and execution workspace. It turns a user's free-form objective into structured application data: intake, clarified context, versioned plan graph, strategies, assumptions, risks, milestones, actions, executable frontier, check-ins, and replans.

The authoritative architecture is in [docs/DEEP_TECHNICAL_ARCHITECTURE.md](docs/DEEP_TECHNICAL_ARCHITECTURE.md).

## Stack

- TypeScript, React 19, TanStack Start, TanStack Router, TanStack Query
- Tailwind CSS and shadcn-style UI primitives
- Supabase Auth, PostgreSQL, Storage, migrations, and Row Level Security
- Server-side AI gateway using OpenAI-compatible structured object generation
- Free-first AI routing: Groq for fast work, Gemini for planning, OpenRouter fallback, optional OpenAI fallback
- Vitest for unit/database/integration tests
- Playwright for browser E2E tests

## Install

```sh
npm install
cp .env.example .env
```

Fill `.env` with your own values. Do not commit `.env`.

For zero-cost local development and normal automated tests, keep:

```sh
AI_PROVIDER_MODE=mock
```

## Supabase Setup

Create or choose a Supabase project, then apply the migrations:

```sh
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

For local Supabase without a global CLI install:

```sh
npx supabase start
npx supabase db reset
```

Copy the local API URL, publishable key, and secret key into `.env`. The repository owns the schema under `supabase/migrations/`; Supabase PostgreSQL is the only authoritative structured-data store. Local Supabase requires Docker; if Docker is not running, `npx supabase start` will report that before tests can use the local database.

## AI Provider Configuration

AI requests run only on the server. Browser code must never receive provider keys or `SUPABASE_SERVICE_ROLE_KEY`.

Default route behavior:

- `FAST`: Groq, Gemini, OpenRouter, OpenAI
- `PRIMARY`: Gemini, Groq, OpenRouter, OpenAI
- `CRITIC`: Gemini, Groq, OpenRouter, OpenAI
- `FALLBACK`: Gemini, Groq, OpenRouter, OpenAI

Set route env vars such as `AI_ROUTE_FAST=groq,gemini,openrouter` to override. Set `AI_PROVIDER_ALLOWLIST` to enforce privacy/provider policy; providers outside the allowlist are never used as fallback.

Enable a provider only when you have configured both its key and model:

- `GEMINI_API_KEY`: Google AI Studio
- `GROQ_API_KEY`: Groq Console
- `OPENROUTER_API_KEY`: OpenRouter dashboard
- `OPENAI_API_KEY`: OpenAI API platform

Model IDs are configured with provider-specific env vars such as `GEMINI_MODEL_PRIMARY`, `GROQ_MODEL_FAST`, and `OPENROUTER_MODEL_FALLBACK`. OpenRouter free model/router IDs are intentionally not hardcoded because availability changes.

Failure handling:

- bounded retries via `AI_PROVIDER_MAX_RETRIES`;
- per-call timeout via `AI_PROVIDER_TIMEOUT_MS`;
- per-user daily request limits via `AI_DAILY_REQUEST_LIMIT` and optional operation-specific overrides such as `AI_LIMIT_GENERATE_PLAN_GRAPH_PER_DAY`;
- 429, timeout, and malformed structured output can fall through to the next allowed configured provider;
- invalid outputs are never persisted unless they pass the shared Zod domain contracts and graph validation;
- if no provider can complete the request, existing plans remain usable and the user sees an AI-unavailable error.

## Storage

Current MVP file storage uses Supabase Storage:

```sh
OBJECT_STORAGE_PROVIDER=supabase
SUPABASE_STORAGE_BUCKET=reversepath-files
```

The code includes a small object-storage interface so future large-object storage, such as Cloudflare R2 for exports or archived artifacts, can be added without making the MVP depend on another database.

## Notion

Notion is not used as application storage. The codebase includes only a future-facing `Export Plan to Notion` interface; the MVP does not depend on Notion.

## Scripts

```sh
npm run dev
npm run typecheck
npm run lint
npm run test
npm run test:unit
npm run test:integration
npm run test:db
npm run test:e2e
npm run build
```

Install Playwright browsers when needed:

```sh
npx playwright install chromium
```

## Tests

Normal tests use deterministic mock AI and do not require paid provider calls.

- Unit: AI contracts, provider router, orchestrator mock behavior, frontier, graph validation, plan diff
- Integration: deterministic Golden Path lifecycle with mock AI and real domain logic
- Database static validation: migrations, RLS declarations, ownership triggers, activation RPC
- Browser E2E: public shell and unauthenticated protected-route guard

Optional live checks:

PowerShell:

```powershell
$env:RUN_LIVE_AI_SMOKE="true"; npm run test:integration
$env:RUN_SUPABASE_RLS_TESTS="true"; npm run test:integration
$env:RUN_E2E_GOLDEN="true"; npm run test:e2e
```

Unix shells:

```sh
RUN_LIVE_AI_SMOKE=true npm run test:integration
RUN_SUPABASE_RLS_TESTS=true npm run test:integration
RUN_E2E_GOLDEN=true npm run test:e2e
```

Vitest and Playwright load `.env` for live test configuration. For normal MVP verification, live Supabase tests use `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`. Optional `SUPABASE_TEST_URL`, `SUPABASE_TEST_PUBLISHABLE_KEY`, and `SUPABASE_TEST_SECRET_KEY` override those values when you want to point tests elsewhere; legacy `SUPABASE_TEST_ANON_KEY` and `SUPABASE_TEST_SERVICE_ROLE_KEY` are supported only as fallbacks. Live AI smoke tests require the target provider key and model env var.

Live Supabase tests are safe for the shared MVP project: they create unique temporary users and test-owned rows, delete only those users at cleanup, and never truncate, drop, reset, or bulk-delete unrelated data. The authenticated E2E Golden Path runs the app against the same configured Supabase values and uses live Gemini/Groq routing; OpenRouter remains an optional fallback.

If Supabase CLI authentication is unavailable while bootstrapping the remote schema, run [supabase/FINAL_REMOTE_BOOTSTRAP.sql](supabase/FINAL_REMOTE_BOOTSTRAP.sql) once in the Supabase SQL Editor for the target project. That file is generated from the committed migrations and does not include destructive reset/delete operations.

## Security Notes

- Authentication uses Supabase Auth.
- Private tables carry `user_id` and enable Row Level Security.
- Migrations include ownership-consistency triggers so child records cannot point at another user's parent entities.
- AI requests execute server-side through provider adapters.
- AI output is schema-validated and graph-validated before persistence.
- Deterministic logic owns executable frontier, dependency satisfaction, action status transitions, plan activation, version numbering, progress calculation, authorization, and plan diff generation where possible.
