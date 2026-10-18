# Retraza Deployment Runbook

October 19, 2026. Owner-operated; no hosted operation was executed by this task.
Source VibeSprint hosting and database remain unchanged. Local parity is not
production acceptance.

## Create An Independent Project

1. Complete local review using FINAL_SOURCE_PARITY_MATRIX.md and the manual
   GitHub runbook. Only the owner publishes feat/vibesprint-parity; do not merge
   or trigger existing integrations automatically.
2. In Vercel dashboard, Add New > Project > Import Git Repository, select
   YellankiKaushik/Retraza-Kaaush. Never select Reverse-Engg-VibeSprint or reuse
   its project/domain/settings. Review Git deployment triggers before enabling.
3. Root directory: repository root. Framework preset: Other (framework:null in
   committed vercel.json). Node version: 24.x. Install: npm ci. Build:
   npm run build:vercel. Do not replace Nitro SSR output with a static dist folder.
   The build generates .vercel/output server functions and static assets.
4. Before creating a deployment, configure Preview environment names privately
   in Project Settings > Environment Variables. Use .env.example as names-only
   reference. Never upload .env or publish screenshots containing values.

## Environment

Public build-time names: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY.
Server names: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY,
SUPABASE_SERVICE_ROLE_KEY, AI_PROVIDER_MODE, GEMINI_API_KEY, GROQ_API_KEY and
configured GEMINI_MODEL__/GROQ_MODEL__ values. Set allowlist to gemini,groq;
keep deep planning Gemini-first and fast operations Groq-first using AI_ROUTE_*.
Review AI_PROVIDER_TIMEOUT_MS, AI_PROVIDER_MAX_RETRIES, output limits and quotas.
Do not assume configured models imply a free billing tier.

Only public publishable keys belong in VITE_* variables. AI and Supabase secret
keys remain server-only. Optional OpenRouter/OpenAI require deliberate enablement;
their absence does not block working Gemini/Groq. No implicit paid fallback.
All RUN_* live test gates remain false; test mode read-only. Do not deploy owner
approval files, test run IDs or private logs.

Configure Production values separately before its build; public values are
compiled into browser bundles. A tested Preview is not proof of a differently
configured Production build.

## Shared Backend And Auth

Reusing project usvopldwiwzlvoqawvcu is allowed; no second Supabase project/account
required. Export and compare read-only catalog first using OWNER_ACTIONS_REQUIRED.md.
Compatible migrations must not be replayed. Missing/conflicting schema needs a
precise separately approved SQL/ledger plan; never reset a remote database.

After owner approval, add exact Retraza redirect origins/paths while preserving
VibeSprint Site URL, existing redirects, Google provider config and confirmation.
Examples for the eventual actual domains:

- http://localhost:5173/auth
- http://127.0.0.1:5175/auth (current local production inspection)
- https://YOUR_RETRAZA_PREVIEW/auth
- https://YOUR_RETRAZA_PRODUCTION/auth

Also add the exact bare origin only if testing a root confirmation return.
Use actual deployment URLs, not these placeholders. Do not add broad wildcards.
Google's provider callback remains the shared Supabase Auth callback; verify full
Google account selection, same-origin return, refresh and re-login manually.
Redirect initiation alone is not acceptance. Real email inbox delivery needs
owner-controlled mailbox evidence; do not consume signup quota repeatedly.

## Preview

Only the owner authorizes/creates the independent Preview. Record exact commit,
deployment and origin. Run public browser/client checks on that exact origin:

```powershell
node scripts/run-hosted-qa.mjs https://YOUR_RETRAZA_PREVIEW
node scripts/audit-hosted-client.mjs https://YOUR_RETRAZA_PREVIEW
```

Read-only public smoke does not authorize user creation or cleanup. After verified
catalog, present the two-user scoped checkpoint in SHARED_SUPABASE_COMPATIBILITY.md
and wait for explicit approval. Run mock-AI authenticated lifecycle first, then
separately approved minimal Gemini/Groq lifecycle if needed. Verify actual
browser -> API -> persisted data -> refresh/relogin; cross-user negative cases;
exactly one active version and retained rejected/superseded versions.
Real inbox delivery and full Google callback remain independent evidence gates.

## Production And Rollback

Owner reviews all external gates before production. Build a production-target
staged deployment using Production configuration, verify its exact URL, then
approve promotion in Vercel UI. Do not blindly promote Preview assuming variables
are identical. No production promotion, DNS or source alias change is authorized
for the agent.

After promotion check home/auth/demo/assets, callback origin, refresh/server
functions and browser-secret boundaries on the actual production domain.
Any mutating smoke requires separate scope approval. Record sanitized results.

Preserve a prior verified Retraza deployment as rollback target. Restore it via
Vercel UI if runtime acceptance fails, then repeat public smoke. First deployment:
disable Retraza traffic if needed, never redirect to/change VibeSprint.
Code rollback does not undo database writes. Preserve user/version history;
use reviewed forward-fix SQL if necessary. Never reset, drop, truncate or perform
broad cleanup.

See PRODUCTION_DEPLOYMENT_CHECKLIST.md for the two-minute demo script.
