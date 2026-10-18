# VibeSprint Parity Report

## Final Production-Source Parity Checkpoint

October19, 2026. Compared production application 8b46434cf02fb59b06417d3e5923e845f8af4707
against existing destination a6c989d plus focused local fixes. All eight migration
files, shared contracts/prompts and workspace implementation remain aligned.
No source repository, Auth configuration, database, hosting or GitHub writes.

Latest counts supersede earlier counts below: 76 unit +27 deterministic
integration +12 SQL =115 passed, zero failed,11 live skips. Browser28 passed,
zero failed,13 skipped. Production Node subset19 passed; both builds, environment,
lint (six old warnings), source/history/client scan and audit pass.

Newly reproduced/fixed: zero-row objective/context mutations reporting success;
generation proceeding on failed source/fact/plan reads; initial regeneration
over already-active plan; post-save generation claim release. Remote logout
failure now distinguishes local signout from unconfirmed global revocation.
Regression files: owned-mutations.test.ts (8), generation-failures.test.ts (6),
local-workspace.spec.ts (11). Test doubles are not live acceptance evidence.

New docs: FINAL_SOURCE_PARITY_MATRIX.md, RETRAZA_DEPLOYMENT_RUNBOOK.md and
OWNER_ACTIONS_REQUIRED.md. scripts/compare-public-visuals.mjs captured18 public
source/destination screenshots at three widths; inspected pairs align. Full
destination workspace/settings render without horizontal overflow at all sizes.

User workflow: no further intermediate questions for deferrable external info.
Catalog remains absent; remote compatibility, live RLS/Golden Path/auth and hosted
acceptance BLOCKED. Do not manufacture evidence or enable approval. Exact next
owner step is SQL Editor read-only catalog export to logs/shared-catalog.json;
then local comparison, then explicit scope approval BEFORE any shared writes.
No second Supabase project/account required. Owner alone pushes/deploys.
Current local production app: http://127.0.0.1:5175/demo.

## October 19 Controlled Release Checkpoint

This section supersedes older isolated-backend-only instructions below.
Shared Supabase reuse is allowed, default READ-ONLY, with verified catalog and
explicit project-specific owner approval before any mutations. No second
account/project required. No GitHub writes or deployment authorized this task.

Final local evidence: 76 unit + 13 deterministic integration + 12 local SQL =
101 passed / 0 failed / 11 gated live integration skipped. Browser 17 passed /
0 failed / 13 skipped; production Node public subset 8 passed. Typecheck, lint
(zero errors/six old warnings), Node/Vercel builds, source/history/client scan
and dependency audit pass. Gemini/Groq real PM intake+graph pass; OpenRouter
optional unavailable. Live RLS/authenticated Golden Path remain BLOCKED.

Implemented focused fixes: empty/dangling graph references, missing-prerequisite
frontier, replan read/write/error/version consistency, sanitized provider smoke
errors and reasoning budget. Added owner-scoped shared approval/network guards,
GET-only API preflight, read-only catalog SQL/local comparator and real-handler
regression harness. Existing Retraza features and immutable reference preserved.

API surface: shared project exposes all16 tables and five expected RPC signatures.
Catalog/ledger/ACL/RLS/index compatibility remains UNKNOWN; owning-account
reconnection is pending. No remote migrations, users, cleanup or Auth changes.
Do not replay migrations merely because management access is absent.

Current runbooks: [readiness](RETRAZA_RELEASE_READINESS.md),
[local evidence](FINAL_LOCAL_VERIFICATION.md),
[shared compatibility](SHARED_SUPABASE_COMPATIBILITY.md),
[manual publishing](MANUAL_GITHUB_RELEASE.md),
[deployment](PRODUCTION_DEPLOYMENT_CHECKLIST.md).

Date: October 19, 2026. Verdict: **C - PARTIAL PARITY, ADDITIONAL WORK REQUIRED**.
The application-code integration and safe local verification are complete.
Full destination acceptance remains blocked by the intentionally read-only shared backend.

## Repository Evidence

Destination draft PR: https://github.com/YellankiKaushik/Retraza-Kaaush/pull/1
Published review snapshot: `a9509eb3bc6b99128e25b9bc50312a546da00884`.
Subsequent delivery-note commits do not change verified application code.

- Source: https://github.com/YellankiKaushik/Reverse-Engg-VibeSprint
- Immutable reference SHA: `a58c52921b5eb21287446aff998c196b49e2d100`.
- Documented source production application SHA: `8b46434cf02fb59b06417d3e5923e845f8af4707`.
- Source HEAD rechecked after implementation: the same `a58c52921b5eb21287446aff998c196b49e2d100`.
- Destination: https://github.com/YellankiKaushik/Retraza-Kaaush
- Original destination SHA: `ee2b22fc863c5c6369ad50f52a95a03dd3d94117`.
- Existing-work checkpoint: `2386cab`.
- Verified destination application commit: `3b7a049057736d02dabb02fd685cf80b2f54764c`.
- Branch: `feat/vibesprint-parity`. Subsequent documentation-only commits record release evidence.
- Final branch SHA/PR are reported in the delivery response and Git history.
- No source repository, source deployment or shared database was modified.
- The local source remote has a disabled push URL. Existing destination history is preserved.

## Recalculated Baseline

Compared actual immutable reference and original destination trees:
130 destination files, 191 source files, 76 identical shared files,
47 modified shared files, 68 source-only files, seven destination-only files.
No blanket checkout or merge of unrelated histories was used.

The 76 identical files include domain types, mock proposals, shared UI primitives,
settings, authenticated request attachment and the original four migrations.
They were retained unless a necessary dependent change applied.

## Feature Matrix

MATCHED means equivalent behavior was exercised in the stated local scope,
not that a destination production deployment passed.

| Area               | Source capability                                   | Destination status | Destination evidence and limits                                                                    |
| ------------------ | --------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------- |
| Landing/navigation | Responsive public shell/dashboard entry             | MATCHED            | index.tsx, app-shell.tsx; public browser checks                                                    |
| Authentication     | Email, confirmation, OAuth callbacks, sessions      | NOT TESTED         | Source auth helpers/hook ported; intercepted/error states pass; real destination auth blocked      |
| Demo               | Public prepared plan, completion, persistence/reset | MATCHED            | demo.tsx, demo-plan.ts; desktop/tablet/mobile interaction and refresh tests                        |
| Intake             | Classification, normalization, clarification        | MATCHED            | Shared contracts/mock integration; fresh Groq PM intake; persisted intake blocked                  |
| Planning           | Structured reverse-engineered graph                 | MATCHED            | Compact prompts, schema and graph checks; fresh Gemini PM plan, no DB                              |
| Strategies         | Alternatives and selected path                      | NOT TESTED         | Source workspace and transactional selector ported; isolated SQL selection passes; live UI blocked |
| Dependencies       | Valid IDs, hard cycles, blockers/prerequisites      | MATCHED            | frontier and planner tests; strategy prerequisite closure; mixed BLOCKED_BY cycle tests            |
| Execution          | Start/complete, editing and progress                | NOT TESTED         | Source workspace and RPC ported; SQL completion/rollback and domain progress pass; live UI blocked |
| Replanning         | Candidate review, diff, accept/reject/history       | NOT TESTED         | Source flow ported; mock lifecycle and isolated SQL transitions pass; live workflow blocked        |
| Persistence        | Authoritative Supabase relational graph             | NOT TESTED         | Application serializer executes real SQL in PGlite; dedicated Supabase unavailable                 |
| Database           | Atomic writes, constraints, RLS                     | NOT TESTED         | All eight migrations execute locally; 12 database tests pass; remote application forbidden         |
| AI                 | Real structured generation                          | MATCHED            | Fresh Groq intake/Gemini graph plus provider smoke pass                                            |
| Security           | Owner isolation and server-only secrets             | IMPROVED           | Source defenses plus isolated SQL/ACL tests, read-only test guard, source/client/history scan      |
| E2E                | Full authenticated Golden Path                      | NOT TESTED         | Gated suite ported/extended; intentionally blocked for shared DB                                   |
| Deployment         | Node/Vercel SSR and release checks                  | NOT TESTED         | Both local builds pass; Node production public checks pass; no hosted preview                      |
| Documentation      | Reproducible independent setup                      | MATCHED            | README, architecture reconciliation, readiness and handoff                                         |

## Integrated Behavior And Corrections

- Auth initialization/session-race handling, callback cleanup, confirmation-required
  signup, readable rate-limit/delivery errors and direct Google initiation.
  Retraza's earlier password-clearing regression fix is preserved.
- User-specific query keys, dashboard error states, intake duplicate-submit guard
  and source workspace improvements, including strategy-aware frontier/progress
  and milestone completion controls.
- Public prepared PM demo with browser-only persistence, dependency unlocking,
  complete/reset states and explicit non-live provenance.
- Mixed BLOCKED_BY cycle orientation fixed; selected routes include their actual
  hard prerequisites. Skipped/cancelled prerequisites remain unsatisfied.
- Duplicate strategy keys rejected. Existing graph/action/bottleneck checks remain.
- Compact reasoning prompts and schema version reproduce source constraints while
  retaining current model selection through environment variables.
- Zod and graph validation run before success/persistence, including mock proposals.
  Safe diagnostics retain token counts, finish reason and validity without text/keys.
- Atomic graph/version persistence and activation, action edits/completion,
  check-ins/facts and strategy selection replace independent writes.
- Unique idempotency insertion prevents simultaneous request ownership. Failed
  request-receipt writes retain the claim; quota-read failures fail closed.
- Export fails visibly on query errors instead of silently producing incomplete data.
- Licensed bundled fonts remove runtime Google Fonts network dependence.
- Native TanStack/Vite/Nitro configuration adds Node and independent Vercel builds.
- Updated compatible TanStack versions address the confirmed server-function XSS
  advisory. Compatible transitive fixes reduce npm audit from nine findings to zero.

Feasibility remains a stated heuristic, not guaranteed success. Prompts prohibit
invented personal facts and require explicit assumptions. No new autonomous actions
or unrelated product features were added.

## Database Migration Changes

Imported unchanged, versioned source migrations:

1. `20261011095115_restrict_internal_ownership_helpers.sql`
2. `20261013084557_atomic_execution_updates.sql`
3. `20261013085758_atomic_plan_persistence.sql`
4. `20261013090748_atomic_checkins_and_strategy_selection.sql`

The original four migrations remain unchanged. No history entries were fabricated.
RPCs: update_execution_node, persist_plan_graph, save_plan_check_in,
select_plan_strategy, and the revised owner-scoped activate_plan_version_for_user.
RLS and parent ownership checks remain. Plan locking allocates versions safely;
the partial unique active-version index remains enforced.

All eight migrations execute in isolated PGlite PostgreSQL with minimal synthetic
Supabase Auth roles/functions. Tests verify 16 tables, primary/foreign keys, indexes,
RLS policies, restricted helper/RPC ACLs, cross-user denial, rollback and candidate
preservation. This is real local SQL execution, not live hosted Supabase evidence.
PGlite serializes its single connection; hosted concurrent transaction behavior
still requires the gated real-Supabase tests.

**Remote migration application: BLOCKED.** The user confirmed the configured
backend is shared/read-only. No remote SQL, migrations, account creation or cleanup
was performed during this integration. The historical bootstrap/patch SQL was
not replayed. Follow the dedicated-backend steps in RETRAZA_RELEASE_READINESS.md.

## AI Architecture And Exceptions

Retained multi-provider routing rather than replacing it with Gemini-only policy.
Gemini uses the source's pinned official Google adapter; Groq and optional compatible
providers remain. Model IDs are configured, not copied from historical reports.
The source's hardcoded single free-model allowlist was deliberately excluded:
Retraza preserves provider portability and explicit configured privacy boundaries.
Default provider allowlist is Gemini/Groq; optional providers need explicit inclusion.
Invalid nonempty routes/allowlists fail closed; missing/invalid live mode uses mock.

Retries default to zero, capped at two per provider, only 429/503, respecting
bounded numeric/date Retry-After values. Timeouts cap at five minutes; output
tokens cap at 16384. Live provider failures do not silently return mock data.
Daily quotas and per-attempt usage metadata remain server-side.

Fresh AI evidence:

- Gemini minimal schema smoke: PASS, 12 input / 9 output tokens.
- Groq minimal schema smoke: PASS, 190 input / 48 output tokens.
- Optional OpenRouter: authentication rejected; skipped, not passed.
- Optional OpenAI: not configured for a model; skipped.
- PM scenario Groq intake: PASS, 916 input / 732 output tokens.
- PM scenario Gemini graph: PASS, 1394 input / 2367 output tokens;
  schema-valid, graph-valid, milestones/strategies/assumptions/risks and ready work.
- These live runs did not connect to Supabase.
- RouterPlus key ownership was not confirmed; no existing key was sent there.

## Verification Actually Performed

| Check                                                | Result                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------- |
| Dependency installation                              | npm installs/lockfile updates succeeded                             |
| Environment boundary check                           | PASS                                                                |
| Typecheck                                            | PASS                                                                |
| Lint                                                 | PASS; zero errors, six pre-existing Fast Refresh warnings           |
| Unit                                                 | 58 passed                                                           |
| Deterministic integration                            | 6 passed; 11 gated live tests skipped                               |
| Database                                             | 12 passed: four static plus eight real isolated PostgreSQL          |
| Combined npm test                                    | 76 passed, 11 skipped                                               |
| Public/mock browser suite                            | 17 passed, 13 skipped                                               |
| Node production browser subset                       | 8 passed                                                            |
| Local Node production client audit                   | 36 HTML/JS responses; zero secrets, page errors or failed responses |
| Production Node build                                | PASS                                                                |
| Local Vercel SSR build                               | PASS                                                                |
| Source/client/destination-history secret scan        | PASS; zero findings                                                 |
| npm audit                                            | PASS; zero vulnerabilities                                          |
| Live provider smoke                                  | 2 passed, 2 skipped                                                 |
| Live PM intake + graph                               | 1 passed                                                            |
| Remote schema / live RLS / authenticated Golden Path | BLOCKED; not executed against shared backend                        |

Browser skips: unconfigured-auth environment case, confirmation callback, two
Golden Path variants, two workspace cases, Google initiation/session callback,
public real signup, three live goal scenarios, and live user isolation.
Interceptions test UI behavior, not actual delivery/OAuth account selection.
Screenshot/overflow/font checks ran at 1440, 768 and 390 pixels. Desktop/mobile
screenshots were inspected; production subset also verifies demo refresh/reset.

## Destination Features Preserved

- Seven destination-only paths: Bun history files, Lovable integration, Notion
  export contract, cron authorization, preview-session storage and error reporting.
- Lovable project identity and published Git ancestry.
- Existing storage abstraction and configured Supabase bucket.
- Configurable Gemini/Groq/OpenRouter/OpenAI/Lovable-compatible routing.
- Existing signup password clearing and exact Golden Path progress arithmetic.

## Deliberately Excluded

- Source .env/credentials, Supabase settings and Vercel project/deployment IDs.
- Event-only release reports, banners and claims of prior production verification.
- Source-specific confidential share/OIDC fixtures and auto-authorized hosted targets.
- Historical bootstrap/localhost repair SQL execution.
- Source single-model/Gemini-only restriction, superseded by Retraza portability.
- Source raw HTTP/body debug dumps; destination tests keep safe diagnostics.
- No reference hosting, domain, database or GitHub changes.

## Remaining Differences And Release Gates

| Difference                                              | Severity | Exact next step                                                          | Blocks release |
| ------------------------------------------------------- | -------- | ------------------------------------------------------------------------ | -------------- |
| Dedicated destination schema not applied                | P1       | Configure isolated Retraza backend; inspect/push pending migrations      | YES            |
| Real destination auth/confirmation/OAuth unverified     | P1       | Configure destination redirects/providers; execute controlled auth tests | YES            |
| Persisted authenticated Golden Path/live RLS unverified | P1       | Run gated suites against isolated backend; fix actual failures           | YES            |
| No independent hosted preview verification              | P1       | Deploy separate Retraza preview after backend gates, verify exact build  | YES            |
| OpenRouter unavailable                                  | P3       | Optional credential repair; Gemini/Groq already pass                     | NO             |
| Six existing lint warnings                              | P3       | Optional component-export cleanup outside this scope                     | NO             |
| Historical Bun files not refreshed                      | P3       | Use documented npm ci/lockfile workflow                                  | NO             |

## Files Added

- `.vercelignore`
- `docs/RETRAZA_RELEASE_READINESS.md`
- `docs/VIBESPRINT_PARITY_REPORT.md`
- `docs/VIBE_SPRINT_HANDOFF.md`
- `public/fonts/ibmplexmono-OFL.txt`
- `public/fonts/reversepath-font-0.ttf`
- `public/fonts/reversepath-font-1.ttf`
- `public/fonts/reversepath-font-2.ttf`
- `public/fonts/reversepath-font-3.ttf`
- `public/fonts/reversepath-font-4.ttf`
- `public/fonts/reversepath-font-5.ttf`
- `public/fonts/spacegrotesk-OFL.txt`
- `scripts/audit-hosted-client.mjs`
- `scripts/build.mjs`
- `scripts/check-env.mjs`
- `scripts/final-release-audit.mjs`
- `scripts/run-hosted-qa.mjs`
- `scripts/scan-secrets.mjs`
- `scripts/test-environment.mjs`
- `src/ai/diagnostics.server.ts`
- `src/domain/demo-plan.ts`
- `src/fonts.css`
- `src/lib/action-execution.server.ts`
- `src/lib/auth-callback.ts`
- `src/lib/auth-errors.ts`
- `src/lib/data-export.server.ts`
- `src/routes/demo.tsx`
- `supabase/migrations/20261011095115_restrict_internal_ownership_helpers.sql`
- `supabase/migrations/20261013084557_atomic_execution_updates.sql`
- `supabase/migrations/20261013085758_atomic_plan_persistence.sql`
- `supabase/migrations/20261013090748_atomic_checkins_and_strategy_selection.sql`
- `tests/db/transactions.test.ts`
- `tests/e2e/auth-states.spec.ts`
- `tests/e2e/confirmation-callback.spec.ts`
- `tests/e2e/demo.spec.ts`
- `tests/e2e/fixtures.ts`
- `tests/e2e/oauth.spec.ts`
- `tests/e2e/planning-scenarios.spec.ts`
- `tests/e2e/signup-confirmation.spec.ts`
- `tests/e2e/user-isolation.spec.ts`
- `tests/e2e/workspace.spec.ts`
- `tests/helpers/gemini-response.ts`
- `tests/integration/demo-plan.live.test.ts`
- `tests/integration/execution-handler.test.ts`
- `tests/integration/gemini-adapter.test.ts`
- `tests/unit/auth-callback.test.ts`
- `tests/unit/auth-errors.test.ts`
- `tests/unit/compact-ai.test.ts`
- `tests/unit/data-export.test.ts`
- `tests/unit/demo-plan.test.ts`
- `tests/unit/idempotency.test.ts`
- `tests/unit/test-environment.test.ts`
- `vercel.json`

## Files Modified

- `.env.example`
- `.gitignore`
- `AGENTS.md`
- `README.md`
- `docs/DEEP_TECHNICAL_ARCHITECTURE.md`
- `docs/VIBE_SPRINT_HANDOFF.md`
- `package-lock.json`
- `package.json`
- `scripts/run-e2e.mjs`
- `src/ai/orchestrator.server.ts`
- `src/ai/plan-contract.ts`
- `src/ai/prompts.server.ts`
- `src/components/app-shell.tsx`
- `src/domain/frontier.ts`
- `src/hooks/use-auth.ts`
- `src/integrations/supabase/client.ts`
- `src/integrations/supabase/types.ts`
- `src/lib/ai-gateway.server.ts`
- `src/lib/data.functions.ts`
- `src/lib/execution.functions.ts`
- `src/lib/intake.functions.ts`
- `src/lib/planner.server.ts`
- `src/lib/planning.functions.ts`
- `src/lib/telemetry.server.ts`
- `src/routeTree.gen.ts`
- `src/routes/__root.tsx`
- `src/routes/auth.tsx`
- `src/routes/index.tsx`
- `src/routes/new.tsx`
- `src/routes/plans.$caseId.tsx`
- `src/styles.css`
- `tests/e2e/auth-guard.spec.ts`
- `tests/e2e/golden-path.live-supabase.spec.ts`
- `tests/helpers/test-env.ts`
- `tests/integration/live-ai-smoke.test.ts`
- `tests/integration/supabase-rls.live.test.ts`
- `tests/unit/ai-gateway.test.ts`
- `tests/unit/frontier.test.ts`
- `tests/unit/planner-validation.test.ts`
- `vite.config.ts`

## Files Removed

None.
