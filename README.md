# ReversePath

ReversePath is an AI-assisted goal, problem-solving, decision, and execution workspace. It turns a user's free-form objective into structured application data: an intake case, clarified context, a versioned plan graph, strategies, assumptions, risks, milestones, actions, executable frontier, check-ins, and replans.

The authoritative architecture is in [docs/DEEP_TECHNICAL_ARCHITECTURE.md](docs/DEEP_TECHNICAL_ARCHITECTURE.md).

## Stack

- TypeScript
- React 19
- TanStack Start / TanStack Router
- TanStack Query
- Tailwind CSS
- Supabase Auth and PostgreSQL
- Supabase migrations and Row Level Security
- Server-side AI gateway using OpenAI-compatible structured object generation
- Vitest for automated domain/schema/migration tests

## Local Setup

```sh
npm install
cp .env.example .env
npm run dev
```

Fill `.env` with your own Supabase and AI values before using authenticated or AI-backed flows. Do not commit `.env`.

## Supabase Setup

Create or choose a Supabase project, then apply the migrations in order:

```sh
supabase login
supabase link --project-ref <your-project-ref>
supabase db push
```

The repository owns the database schema under `supabase/migrations/`. Supabase hosts the live database and auth service.

## Required Environment Variables

Public browser variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`

Server variables:

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY`
- `OPENAI_BASE_URL`
- `OPENAI_MODEL_FAST`
- `OPENAI_MODEL_PRIMARY`
- `OPENAI_MODEL_CRITIC`
- `OPENAI_MODEL_FALLBACK`
- `APP_ENV`
- `PUBLIC_APP_URL`
- `AI_DAILY_REQUEST_LIMIT`
- `AI_MAX_OUTPUT_TOKENS`
- `AI_GENERATION_ENABLED`

Optional Lovable-hosted fallback:

- `LOVABLE_API_KEY`

`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, and `LOVABLE_API_KEY` are server-only secrets. Never prefix them with `VITE_`.

## Scripts

```sh
npm run dev
npm run typecheck
npm run lint
npm run test
npm run test:unit
npm run test:db
npm run build
```

## Verification Scope

Automated tests currently cover:

- executable-frontier dependency resolution;
- deterministic progress calculation;
- AI structured-output normalization;
- plan graph validation;
- migration/RLS/ownership-guard structure.

Full Golden Path verification requires a configured Supabase project, applied migrations, test users, and a server-side AI key/model configuration.

## Security Notes

- Authentication uses Supabase Auth.
- Private tables carry `user_id` and enable Row Level Security.
- Migrations include ownership-consistency triggers so relational child records cannot point at another user's parent entities.
- AI requests execute server-side. Browser code must never receive OpenAI or Supabase service-role credentials.
- AI output is schema-validated and graph-validated before persistence.
