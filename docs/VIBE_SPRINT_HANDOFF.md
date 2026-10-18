# Vibe Sprint Hyderabad Handoff

Date: October 11, 2026. Branch: `sprint/vibe-hyderabad-2026-10-11`.

## Repository and Safety

The existing repository was found at the user-provided KAUSHIK/ALL Projects location.
Starting state: clean `main`, tracking `origin/main`; remote is YellankiKaushik/Retraza-Kaaush.
Published history is preserved. No push, deployment, migration, database reset, or credential changes were made.
Respect AGENTS.md and the Lovable integration. Pushing/deployment require user approval.

## Completed

- Baseline typecheck, build, lint and deterministic tests executed successfully.
- Installed the Chromium binaries required by the current Playwright version.
- Fixed signup falsely claiming an authenticated session when email confirmation is required.
- Added browser regression coverage for pending email confirmation.
- Updated the authenticated Golden Path to the six-month product-manager scenario and numeric progress/reload assertions.
- Live smoke checks cap output at 128 tokens, report usage and skip optional OpenRouter authentication failures accurately.
- Added the existing OpenAI-compatible adapter to opt-in smoke coverage.
- Connected the documented AI_MAX_OUTPUT_TOKENS setting to the orchestrator.
- Added an opt-in live demo intake/plan validation independent of Supabase.
- Added PowerShell installation instructions to README.md.

## Files Changed

- README.md
- src/routes/auth.tsx
- src/lib/ai-gateway.server.ts
- src/ai/orchestrator.server.ts
- tests/unit/ai-gateway.test.ts
- tests/e2e/auth-guard.spec.ts
- tests/e2e/golden-path.live-supabase.spec.ts
- tests/integration/live-ai-smoke.test.ts
- tests/integration/demo-plan.live.test.ts
- docs/VIBE_SPRINT_HANDOFF.md

## Actual Verification

- Baseline `npm.cmd run typecheck`: PASS.
- Baseline `npm.cmd run test`: 30 passed, 5 skipped.
- Baseline `npm.cmd run build`: PASS; existing inputValidator deprecation warnings.
- Baseline `npm.cmd run lint`: zero errors, six existing Fast Refresh warnings.
- Initial E2E: failed due missing Chromium; after installation/fix, 3 passed, authenticated Golden Path skipped.
- Live RLS: FAIL in setup, AuthRetryableFetchError/fetch failed before any test users were created.
- Live AI: Gemini PASS (13 input/9 output tokens); Groq PASS (190 input/70 output tokens).
- OpenRouter: OPTIONAL UNAVAILABLE (authentication rejected), reported as skipped.
- OpenAI/RouterPlus: skipped; endpoint/model configuration missing, key ownership awaiting user confirmation.
- Final reruns and live PM plan check: pending at this checkpoint.

## Current P0/P1 Blockers

P0: configured Supabase hostname returns NXDOMAIN from Google DNS. Local DNS resolves it to an address that resets TLS. Connected Supabase account does not list this project (only a different inactive project). Do not infer that prior successful live checks still apply today. User has been asked to restore the project or update ignored local configuration with the intended active backend.

P1: RouterPlus ownership of existing OPENAI_API_KEY is unconfirmed. Do not send that credential to RouterPlus without confirmation. OPENAI_BASE_URL, OPENAI_ENABLED and OPENAI_MODEL_* are not configured. Public RouterPlus /v1/models returns HTTP 401.

P1: no approved deployment or verified demo URL. Existing build targets Cloudflare Workers through Nitro; this is a server application, not a static-only SPA.

## Environment Names (Never Values)

VITE_SUPABASE_URL, VITE_SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SERVICE_ROLE_KEY.
AI_PROVIDER_MODE (mock for deterministic tests, live for real providers), AI_PROVIDER_ALLOWLIST, AI_ROUTE_FAST, AI_ROUTE_PRIMARY, AI_ROUTE_CRITIC, AI_ROUTE_FALLBACK, AI_MAX_OUTPUT_TOKENS, AI_PROVIDER_TIMEOUT_MS, AI_PROVIDER_MAX_RETRIES.
GEMINI_API_KEY, GEMINI_MODEL_FAST, GEMINI_MODEL_PRIMARY; GROQ_API_KEY, GROQ_MODEL_FAST.
RouterPlus via existing adapter: OPENAI_API_KEY, OPENAI_BASE_URL, OPENAI_ENABLED, OPENAI_MODEL_DEFAULT/FAST/PRIMARY/CRITIC/FALLBACK. Route it as `openai`, not as a new provider.
RUN_LIVE_AI_SMOKE, RUN_LIVE_DEMO_PLAN, RUN_SUPABASE_RLS_TESTS, RUN_E2E_GOLDEN.

## Exact Next Actions

1. Finish typecheck/unit/build/lint reruns for the focused fixes and the opt-in live PM plan validation.
2. Obtain active backend configuration through ignored .env or restoration in its owning account. Never ask for secret values in chat.
3. Rerun `$env:RUN_SUPABASE_RLS_TESTS="true"; npm.cmd run test:integration` and `$env:RUN_E2E_GOLDEN="true"; npm.cmd run test:e2e` only once backend availability is restored. Tests own unique users and delete only those users.
4. If the user confirms RouterPlus key ownership, query its authenticated model list server-side, choose an inexpensive available model, configure only ignored local environment and validate one small schema response. Never print response headers or raw error objects containing credentials.
5. Review the current diff, obtain push/deployment approval, configure server secrets on the supported hosting target, verify the deployed workflow.

## Two-Minute Demo

- 0:00-0:15: sign in and open New objective.
- 0:15-0:35: enter the PM goal, analyse, answer necessary clarifications.
- 0:35-1:10: generate the plan; show strategies, milestones and dependencies.
- 1:10-1:35: show the executable frontier and mark one concrete action Done.
- 1:35-2:00: show the numeric progress increase and reload to prove persistence.

Do not claim the core demo is complete until the real authenticated journey passes against an available Supabase backend.
