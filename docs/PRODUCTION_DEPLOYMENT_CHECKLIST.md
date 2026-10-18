# Production Deployment Checklist

October 19, 2026. Preparation only: no preview/production deployment performed.

## Independent Vercel Project (Owner UI)

1. In Vercel dashboard choose Add New > Project > import Retraza-Kaaush.
   Do not select Reverse-Engg-VibeSprint or change its existing project/domain.
2. Review Git branch/deployment triggers before enabling them. Owner controls
   GitHub publishing and integrations. Keep this task branch review-only.
3. Use repository root, Node 24, npm ci, npm run build:vercel and the committed
   vercel.json/Nitro configuration. It is SSR, not a static-only application.
4. Add environment names from .env.example via platform secret store separately
   for Preview and Production. Never upload .env or paste secrets in reports.
5. Browser build values: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY.
   Server: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY,
   AI_PROVIDER_MODE, GEMINI_API_KEY, GROQ_API_KEY and their configured model IDs.
   Routes/limits: AI_PROVIDER_ALLOWLIST=gemini,groq; deep route Gemini then Groq;
   fast route Groq then Gemini. Keep optional providers disabled unless verified.
6. Keep all RUN_* live-test gates false and backend test mode read-only in hosted
   app configuration. Owner approval files/run IDs are local test controls, not
   deployment secrets. Do not deploy them.
7. Catalog-verify the existing shared backend. No second account/project required.
   Review missing/conflicting migrations individually; obtain owner approval
   before any schema/ledger change. Compatible migrations are not replayed.
8. With separate explicit approval, ADD exact Retraza callback URLs such as
   https://YOUR_RETRAZA_PREVIEW/auth and https://YOUR_RETRAZA_DOMAIN/auth, plus
   localhost origins used for acceptance. Do not replace VibeSprint Site URL,
   existing redirect entries, Google settings or email confirmation.
   Avoid broad wildcard redirects. Keep Google provider callback tied to shared
   Supabase Auth; verify real browser return, not merely redirect initiation.
9. Only the owner creates a Preview deployment, then provides its exact URL
   for read-only checks. Do not promote automatically.

## Preview Acceptance

- Run check:env, typecheck, lint, unit/integration/local SQL, both target builds,
  source/history/client secret scan and dependency audit locally.
- Public smoke: home/auth/demo, desktop/mobile, refresh/navigation and failed
  callback states. No private provider/server key in fetched HTML/JS.
- Exact HTTPS target, owner approval and verified catalog precede shared writes.
  Run reviewed mock lifecycle first, live Gemini/Groq lifecycle only if approved.
- Verify real email signup/confirmation/inbox, password login/logout, restored
  session and expired callback. Separate owner-approved account for Google
  complete callback. Do not repeatedly consume shared email quota.
- Verify plan generation/activation, frontier, task completion/progress, refresh,
  check-in, reject+accept replan, preserved versions, logout/relogin and cross-user
  read/update/RPC/export denial. A prepared /demo is not authenticated evidence.
- Trace actual browser -> server -> database -> persisted response; do not accept
  mocked browser or PGlite results as hosted acceptance.
- Store sanitized test evidence. All missing live/hosted gates remain BLOCKED.

Owner-run public smoke commands (no automatic deployment):

```powershell
node scripts/run-hosted-qa.mjs https://YOUR_RETRAZA_PREVIEW
node scripts/audit-hosted-client.mjs https://YOUR_RETRAZA_PREVIEW
```

## Production Promotion And Smoke

Review Preview/Production variable differences. A preview built with preview
public env values is not automatically a production build. Owner creates a
production-target staged build with production secrets, verifies its exact URL,
then approves traffic promotion using Vercel UI. Never deploy through VibeSprint
hosting, replace its DNS or change shared Auth without approval.

After promotion repeat public health/auth/demo/client-boundary smoke on the exact
production domain. Any mutating production lifecycle requires separate owner
approval. Verify refresh, callback origin and server functions. Record deployment
ID, commit SHA, configuration names and rollback target, never secret values.

## Rollback

Restore the previous verified Retraza deployment through Vercel UI and smoke
its callbacks/routes. If this is the first deployment, disable/remove Retraza
traffic rather than touching VibeSprint. Code rollback does not roll back database
state. Preserve users/plan history; review a forward-fix migration if necessary.
No database reset, truncate, drop, broad delete or migration-ledger fabrication.

## Two-Minute Demo

0:00 Sign in with approved demo account; paste:
"I want to become a product manager in six months. I currently have no PM
experience, I work full-time, and I can dedicate 10 hours per week."
0:20 Analyze and answer only real clarification facts.
0:40 Generate/review a plan; point to strategy, risks and milestones.
1:05 Activate; show next ready action and dependency reason for blocked tasks.
1:25 Complete one action; refresh to show accurate persisted progress.
1:45 Show a check-in and explain reviewed replans preserve prior versions.
Use /demo only as explicitly labelled prepared fallback, never as live-AI proof.
