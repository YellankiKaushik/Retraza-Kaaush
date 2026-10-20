# Retraza Vercel Deployment

October 20, 2026. This is Retraza evidence, not VibeSprint's release evidence.

## Identity

| Item                   | Verified value                                                           |
| ---------------------- | ------------------------------------------------------------------------ |
| Account                | yellankikaushik; OWNER membership                                        |
| Team                   | Kaushik Yellanki Project / kaushik-yellanki-project                      |
| Team ID                | team_UYEpjjRaObtrYF55SYu5rqUl                                            |
| Plan                   | Hobby, active; no upgrade or paid integration enabled                    |
| New project            | retraza-kaaush                                                           |
| Project ID             | prj_IIXn3B3nWc8JqCvPoq6C56En7wze                                         |
| Git connection         | NONE; local CLI upload, no GitHub writes                                 |
| Preview deployment     | dpl_FrVepsubsSfMfyyb1BKQPSV7iFtw                                         |
| Preview URL            | https://retraza-kaaush-f6yk0unsr-kaushik-yellanki-project.vercel.app     |
| State / target         | READY / Preview (API target null, CLI confirms preview)                  |
| Local source SHA       | 5b2bdae702aa3ba64630bc4fd8edaf47541cfaf9                                 |
| Provenance             | Deployment metadata githubCommitSha matches local source; gitSource null |
| Runtime                | Node 24.x, TanStack Start SSR / Nitro                                    |
| Build                  | npm ci; npm run build:vercel; remote build succeeded                     |
| Reserved future domain | retraza-kaaush.vercel.app; verified on NEW project                       |
| Production release     | NOT READY / NOT promoted; no READY Production deployment                 |

Creating the project through the connector returned403; the explicitly scoped
authenticated CLI fallback succeeded. No unrelated team/project was changed.
Project framework is Other, with committed vercel.json and Nitro build output.
Do not deploy this server architecture as a static dist directory.

## First-Upload Safety Incident

The CLI rejected --skip-domain with a Preview target before uploading anything.
The subsequent explicit --target preview upload was nevertheless classified as
Production by Vercel's first-project deployment behavior. This was not accepted
as authorized Production: deployment dpl_Qp3otXDpDpNRXBR94aps2FQvfNWP was canceled
through its exact cancel endpoint while building, before READY. A read confirmed
CANCELED. Its project Production pointer can still refer to that canceled record;
there is no verified or active READY Production application.

A separate --target=preview upload then produced the READY Preview above.
No VibeSprint project/domain/deployment was involved. The canceled audit record
was preserved, not hidden or broadly deleted. Do not retry Production or remove
history automatically. Future deployment must verify target immediately, not
trust the CLI success message's wording.

## Environment

36 entries /35 distinct names are configured on the new project. APP_ENV has
separate preview/production entries; the other34 apply to both environments.
API keys are Sensitive; public/configuration values are Plain. No branch override
or Git integration was added. All required Supabase and Gemini/Groq names exist.
No raw values were printed or committed.

- Public: VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY.
- Server: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY.
- AI: GEMINI_API_KEY, GROQ_API_KEY, existing configured model names, official
  provider endpoints, enabled Gemini/Groq, AI_PROVIDER_MODE=live.
- Routes: fast Groq/Gemini; planning/critic/fallback Gemini/Groq.
- Allowlist: Gemini/Groq only. OpenRouter/OpenAI/Lovable disabled; no optional
  credential was uploaded and no unapproved paid fallback was introduced.
- Live test gates false; test backend mode read-only and isolated=false.
- No SUPABASE_TEST_* overrides, approval paths, run IDs, localhost origins or
  existing event-hosting IDs were copied into deployment configuration.
- Runtime defaults retain bounded attempts/timeout/output and daily quotas.
  Model access does not establish unlimited or zero-cost provider billing.

scripts/retraza-vercel-env.mjs validates the exact project/team, matching
Supabase configuration, required models and official provider endpoints. It
sends private values through CLI stdin, not process arguments or log files.
The API rejected the bulk JSON upload; individual uploads succeeded and their
names/types/targets were verified afterward without printing values.

PUBLIC_APP_URL is an unused legacy setting in the current runtime; it was NOT
copied from localhost or replaced with an invented URL. Real auth redirects derive
from window.location.origin, and Vercel supplies its deployment URL. Current exact
callback is the Preview URL plus /auth. Production's planned callback is
https://retraza-kaaush.vercel.app/auth, not a claim of a live production release.

## Protection And QA

Default Deployment Protection remains enabled. No public source, protection
exception, permanent bypass secret or share link was created.
The owner's existing CLI session supplied short-lived development OIDC identity
to this same project's Preview. scripts/preview-access.mjs proxies requests ONLY
to the exact Retraza HTTPS origin with maxRedirects:0; credentials do not follow
redirects to Supabase, Google or other deployments. Traces are disabled when this
temporary identity is present. Unit regressions verify the boundaries.

Owner-repeatable public checks, without database acceptance:

```powershell
vercel.cmd project inspect --non-interactive
vercel.cmd env run --environment development --scope kaushik-yellanki-project -- node scripts/run-hosted-qa.mjs https://retraza-kaaush-f6yk0unsr-kaushik-yellanki-project.vercel.app
vercel.cmd env run --environment development --scope kaushik-yellanki-project -- node scripts/audit-hosted-client.mjs https://retraza-kaaush-f6yk0unsr-kaushik-yellanki-project.vercel.app
```

Hosted browser28 passed /0 failed /13 skipped. Client audit36 HTML/JS responses:
zero secret findings, page errors or failed responses. Deployment-scoped CLI
request logs over the inspected30-minute window: zero error records, zero5xx.
Connector log access returned403; scoped CLI fallback supplied the evidence.
Real Auth/RLS/Golden Path are NOT verified by these public/intercepted checks.

## Production And Rollback

Production environment variables are prepared, NOT deployment approval.
Before public promotion: verify catalog; obtain exact shared-write scope
approval; run RLS and authenticated mock/live acceptance; approve necessary Auth
redirect additions; verify inbox/Google return; then request Production approval.
Keep the existing VibeSprint Site URL/redirects unchanged.

No prior verified Retraza Production deployment exists. If this Preview regresses,
stop using it or cancel a new in-progress Retraza build. Do not redirect traffic to
or alter VibeSprint. Preserve the READY Preview as evidence. After the first
approved Production release, retain its verified deployment as rollback target.
Code rollback never resets shared database history. No database rollback or
cleanup was performed by this task.
