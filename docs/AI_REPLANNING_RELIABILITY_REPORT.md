# Retraza-Kaaush - AI Replanning Reliability Report

October 22, 2026. Branch: `feat/vibesprint-parity`.
Destination only; local changes are not deployed or published.
This checkpoint supersedes earlier next-action instructions, not historical evidence.

## A. Root Cause Analysis

### Verified

- The consumed run `4ce33605-57f3-444c-8f29-56a0bed61a82` rejected two Gemini
  replans after schema parsing. Groq rescued the first replan, then returned
  `AI_RATE_LIMITED` on the second. Five logical operations/eight attempts, no
  retries. This is a failed live workflow, not a successful complete acceptance.
- Schema validity is not semantic graph validity. A JSON schema cannot prove
  reference resolution, dependency acyclicity, compact completeness, selected
  route readiness or continuity with previously accepted progress.
- The previous replan snapshot omitted stable node IDs, strategy identities,
  completion criteria and action evidence. It was title/status text truncated to
  12,000 characters; the replan prompt explicitly cleared strategy preference.
- Persistence previously serialized every node as PENDING and omitted action
  completion timestamps/results. Thus accepted completed work could become
  incomplete when a new candidate was activated. This is a confirmed code defect,
  NOT a proven explanation for either historical Gemini rejection.
- Generic direction guidance did not explain the domain's special BLOCKED_BY
  direction (dependent -> prerequisite), unlike REQUIRES/PRECEDES.
- Exhausted fallback messaging hid rate limiting behind generic unavailability.

### Suspected, Not Established

Lossy continuity and conflicting graph-direction guidance could increase invalid
references, changed identities, missing milestones or invalid dependencies.
Multiple large Groq operations within one run could contribute to quota pressure.
Neither hypothesis establishes which graph rule failed or the provider's quota
window. No token/output limit was increased to address these hypotheses.

### Unknown Historical Causes And Quota

The failed Gemini graphs and precise rejected rules were NOT retained. Existing
sanitized diagnostics show schemaValid=true, graphValid=false, finishReason=stop,
outputTokens=3243/3343. This does not establish malformed JSON or truncation.
Do not guess a particular cycle, dangling reference or compact-count violation.
The first failed Groq explanation's exact status is also unknown.

No numeric quota balance, reset time or Retry-After metadata was retained for
the historical rate limit. Current Gemini/Groq quota availability is **UNKNOWN**.
No inference or network quota probe was made in this phase.

Future diagnostics whitelist provider ID, operation, finite token counts,
finish reason, schema/graph validity, timeout, a static rejection rule, bounded
HTTP status and numeric Retry-After (only if actually supplied by the SDK).
They never log prompts, completion evidence, raw provider output, headers, keys,
arbitrary provider strings or exception messages. Retry-After is observational,
not a new retry loop or an assertion of available quota.

## B. Local Fixes

### Application Files

- `src/lib/planner.server.ts`: build continuity from owner-scoped ACTIVE version,
  nodes, edges, strategies and node-owned actions. Reject mismatched version,
  owner, plan, source rows, dangling action membership or missing selection.
  Retain stable tempIds and strategy keys; old metadata without strategy keys
  uses the real strategy UUID, not an invented identity.
- `src/lib/planning.functions.ts`: load this context before generation, including
  actions through their real node/version relationship. Pass the same trusted
  continuity to model validation and atomic persistence. Replan still saves a
  CANDIDATE with its accepted parent, never auto-activates it.
- `src/ai/prompts.server.ts`: distinguish initial planning, candidate replanning,
  preserved history, explanation and user acceptance. Carry objective/criteria,
  current facts, selected/alternative strategies, exact completed/in-progress
  definitions and hard edges. Explain BLOCKED_BY orientation explicitly. Treat
  all notes/context/evidence as data, never policy. Exact accepted definitions
  take precedence over brevity; no filler or synthetic repair instructions.
- `src/ai/plan-contract.ts`: prompt version `v3-replan-continuity`. Structured
  output schema stays provider-compatible; no new required AI status fields.
- `src/ai/orchestrator.server.ts`: apply continuity per provider candidate, so
  graph-invalid Gemini output can fall back within the existing route. Exhaustion
  identifies rate limiting and tells the user their accepted progress is intact.
- `src/ai/diagnostics.server.ts`: static labels for dangling edges, cycles,
  strategy selection, orphan nodes, absent frontier, assumption/risk content,
  lost progress/prerequisites and version relationships. Existing compact labels
  retained; other generic integrity failures remain labeled graph-integrity.
- `src/ai/mock-provider.server.ts`: explicit deterministic mode follows accepted
  identity/progress too. This branch never repairs or substitutes a live response.
- `package.json`, `package-lock.json`: narrowly patch Vite 8.1.5 -> 8.1.6,
  Vitest 4.1.11 -> 4.1.12 and transitive launch-editor 2.14.1 -> 2.14.2 after
  the fresh audit found four development-tool vulnerabilities. No force upgrade,
  new framework, install lifecycle scripts, provider/model or quota changes.

Security patch references: [Vite advisory](https://github.com/vitejs/vite/security/advisories/GHSA-9jrq-w75r-8gcw),
[Vitest Windows advisory](https://github.com/vitest-dev/vitest/security/advisories/GHSA-xp26-3454-mjgp),
[launch-editor Windows advisory](https://github.com/vitejs/launch-editor/security/advisories/GHSA-698v-4r3x-3vcv).

### Validation And Persistence

Compact counts remain exactly two strategies, three to five recommended
milestones, six to twelve executable nodes, at most 24 nodes/48 edges, three to
five assumptions/risks and executable validators for HIGH assumptions.
Live validation additionally rejects disconnected nodes, empty risk/assumption
content and a selected route without a ready incomplete action (unless a genuine
blocker is explicit). Existing reference/cycle/type checks remain intact.

Replans must retain completed/in-progress node identity, type, title, strategy,
completion criteria and expected result, plus hard edges between retained nodes.
The server copies verified status/timestamp/result into the NEW candidate using
the existing `persist_plan_graph` RPC. No source rows are overwritten; the RPC
already accepts these fields atomically. No SQL/migration change is needed.
Candidate parent/plan/activation arguments are checked before the save.

RPC failure means no successful candidate response; accepted data remains intact.
Failure AFTER a successful candidate commit still preserves the idempotency claim
and reports saved-but-incomplete review details, requiring refresh rather than
blindly issuing another generation. The entire replan, user-entered changed facts,
later diff and telemetry are NOT one global transaction. User-submitted context
facts may remain saved when generation fails; this does not activate a candidate.
Acceptance/rejection remains explicit and existing database ownership/one-active
version rules remain unchanged. Cross-tab concurrent edits during inference are
not globally serialized by these local changes; continuity is a source snapshot.

### Regression Files And Scope

- `tests/unit/replan-continuity.test.ts`: malformed milestone/edge references,
  cycles, unknown/lost selection, insufficient actions, changed completed work,
  orphan nodes, invalid assumptions/risks, lost hard prerequisites, absent
  frontier, wrong parent/plan/premature activation, valid complex replan and
  copied completion evidence.
- `tests/unit/replan-provider-fallback.test.ts`: actual installed Gemini and
  OpenAI-compatible SDKs with intercepted fetch; rejected Gemini -> valid Groq,
  rejected Gemini -> Groq429, and both503. Exactly two attempts, zero retries,
  no third provider/mock and no accepted-state mutation or private payload logs.
- `tests/unit/compact-ai.test.ts`: SDK-level precise milestone, dangling-edge,
  cycle, orphan and safe diagnostic checks, alongside existing truncation/schema/
  timeout cases. New `tests/helpers/replan-context.ts` supplies offline context.
- `tests/helpers/compact-plan.ts`: connect the existing test-only milestone/action
  chain to the objective; its disconnected graph violated the strengthened live
  contract. The intentionally small general mock fixture is not padded.
- `tests/integration/replan-failures.test.ts`: valid source ownership fixtures,
  candidate transaction/provider failure with no success/activation, and existing
  source/fact/read/diff/idempotency failure regressions.
- `tests/db/transactions.test.ts`: real local PostgreSQL/WASM transaction proves
  completion evidence survives candidate save/activation/reload; actual SQL failure
  after inserts rolls the candidate back and preserves accepted state, followed
  by successful local recovery. No remote database connection exists in this suite.
- `tests/e2e/local-workspace.spec.ts`: intercepted rate-limit/save failures show
  errors, never success or candidate activation, and retain progress after reload.
  Screenshots inspected; existing desktop/tablet/mobile coverage remains intact.
- `tests/e2e/golden-path.live-supabase.spec.ts`: PREPARED ONLY: compare accepted
  completed-node identities, action timestamps/results and selected strategy after
  candidate activation AND relogin. No new user/inference operation or weaker
  assertions. This live suite was skipped, not executed.

## C. Local Verification

Final patched-dependency verification completed successfully.
All live gates/approval paths are disabled in `check:release`; provider tests
intercept fetch and use fictional keys. Browser auth/server requests are intercepted.

| Check                             | Result                                                                   |
| --------------------------------- | ------------------------------------------------------------------------ |
| Unit                              | PASS: 117 passed, zero failed/skipped                                    |
| Deterministic integration         | PASS: 29 passed, zero failed; 11 live cases skipped                      |
| Local SQL                         | PASS: 14 passed, zero failed/skipped                                     |
| Browser                           | PASS: 30 passed, zero failed; 13 live/environment-specific cases skipped |
| Typecheck / lint                  | PASS: zero errors; six pre-existing Fast Refresh warnings                |
| Node / Vercel builds              | PASS: both local production builds; no upload/deployment                 |
| Secret source/client/history scan | PASS: zero findings (final scan recorded separately)                     |
| Dependency audit                  | PASS after narrow patches: zero vulnerabilities                          |

Both pre-patch and final patched-toolchain functional verification: 117 unit +29 deterministic integration +14
local SQL =160 passed, zero failed, 11 gated live integration skips. Browser
30 passed, zero failed, 13 live/environment-specific skips. The original audit
failure (two moderate/two high) is preserved, not hidden. Existing six lint Fast
Refresh warnings and TanStack inputValidator deprecation warnings remain.

Evidence (ignored): `logs/replan-reliability-patched-local-checks.log`,
`logs/replan-reliability-tests.json`,
`logs/replan-reliability-patched-vercel-build.log`,
`logs/replan-reliability-security-final.log` and
`logs/replan-reliability-dependency-audit-final.log`. The earlier audit log retains
the development-tool findings. First focused regression failures were inspected
in terminal output and fixed during implementation. Full patched check:release
exited0; tests remain strict.

## D. Live Status

- Live AI Golden Path: **NOT RETESTED**; previous live result remains FAIL.
- Live Gemini/Groq/other inference calls this phase: **0**.
- Supabase mutations/users/migrations/schema/Auth changes this phase: **0**.
- New/consumed/repurposed approvals: **0**; historical run locks unchanged.
- GitHub pushes/PR updates/merges: **0**. Local changes remain uncommitted.
- VibeSprint repository/database/schema/deployment changes: **0**.
- Retraza Preview/Production deployments or configuration writes: **0**.

## E. Fresh Live Retest Checkpoint - NOT Authorized Or Executed

Offline readiness: **YES** for a separately authorized controlled retest. Provider quota
confirmed: **UNKNOWN**, not a reason to silently retry or enable billing.
No established remaining defect in the offline-covered path is being hidden;
real model compliance and full authenticated acceptance remain unproven.

1. Owner reviews Gemini/Groq dashboards for configured-model access, remaining
   free quota, reset windows and existing billing status. Do not make inference
   requests to probe readiness; do not increase limits, enable billing or upgrade.
   If the dashboards cannot establish readiness, keep it UNKNOWN and defer testing
   or explicitly accept that uncertainty within the same bounded scope.
2. Verify catalog for `usvopldwiwzlvoqawvcu` is compatible, matches all eight
   migration files and is less than24h old. Current evidence timestamp is
   2026-10-21T21:01:23.129348+00:00; expires **2026-10-22T21:01:23.129Z**
   (October23 02:31 IST). This phase did not refresh or rewrite evidence.
   If expired, owner runs `supabase/SHARED_READ_ONLY_PREFLIGHT.sql` unchanged in
   SQL Editor, saves the JSON to ignored `logs/shared-catalog.json`, then runs:

    ```powershell
    node scripts/verify-shared-catalog.mjs logs/shared-catalog.json
    ```

    Inspect compatibility before approval. Never edit timestamps/hash fields,
    replay migrations or repair ledger history to make approval pass. Do not
    regenerate the bound report after the owner has signed it.

3. Owner explicitly authorizes ONE new `golden-live` run and personally authors
   `logs/owner-golden-live-<NEW_UUID_V4>.approval.json` using the existing format
   in `SHARED_SUPABASE_COMPATIBILITY.md`: exact project/acknowledgement/scope,
   fresh unused UUID, short expiry allowing worst-case inference AND cleanup,
   compatible evidence path/exact SHA256, maxUsers2, maxAiOperations6, exact
   local origin `http://127.0.0.1:4173`. The agent must not generate this approval.
4. Preflight existing guards: single-use lock, official Gemini/Groq endpoints,
   allowlist only those two, max two candidate providers per operation, SDK and
   configured retries0, no OpenRouter/OpenAI/Lovable, one worker, no trace/retry,
   only the protected Golden Path file. No separate RLS/scenario/signup suites.
5. Six logical operations maximum: classification +generation +two replans +up
   to two explanations. At most12 attempts, not six guaranteed network calls.
   Invalid graph goes to at most the other approved candidate; if rate-limited
   and no valid fallback remains, show a recoverable error and FAIL/stop. No
   automatic rerun, repair inference, mock substitution or quota increase.
6. Capture sanitized provider/operation/correlation and exact validation labels,
   token/finish/status metadata. Verify actual completion/strategy/version
   preservation, relogin and User B denial; do not infer unexecuted steps passed.
7. Existing exact-run email/app_metadata/run/scope/cleanup-token checks precede
   individual deletion of only two process-recorded accounts. Count run-owned
   rows across all16 tables afterward. Leave uncertain targets untouched and
   report them; keep consumed approval/lock and sanitized outcome evidence.

**Exact next owner action:** review provider dashboard quota/model readiness,
then review this checkpoint and personally issue a NEW scoped approval with fresh
evidence. No new live execution is authorized by this report.

## F. Hosted Release Gates - Preparation Only

Read-only October22 CLI/API inspection confirmed independent project
`retraza-kaaush` / `prj_IIXn3B3nWc8JqCvPoq6C56En7wze`, scope
`kaushik-yellanki-project`, Node24.x, framework Other, build command
`npm run build:vercel`, no Git connection. Existing deployment
`dpl_FrVepsubsSfMfyyb1BKQPSV7iFtw` remains **Ready / Preview** with
`all_except_custom_domains` deployment protection. No configuration changed.

Existing Preview:
https://retraza-kaaush-f6yk0unsr-kaushik-yellanki-project.vercel.app

1. **Supabase redirects:** actual allowlist contents remain unverified. Compare
   before editing. Current code uses window origin for signup confirmation and
   `/auth` for Google return. If missing, separately approve additive exact
   entries for this Preview origin AND its `/auth` URL. Preserve VibeSprint Site
   URL, all old redirects, Google credentials, confirmation and shared Auth settings.
   For the local approved flow use `http://127.0.0.1:4173` and
   `http://127.0.0.1:4173/auth` only if needed. A new deployment needs its OWN
   exact Preview origin entries, not an unrelated wildcard.
2. **Independent Preview update:** after local live acceptance, explicitly approve
   a Retraza-only local-source Preview upload. Current local fixes are NOT deployed.
   Verify target=preview, project/team/origin and protection immediately; retain
   the current Ready deployment. Prior first-upload Production-classification
   incident remains documented in RETRAZA_VERCEL_DEPLOYMENT.md.
3. **Hosted email/password:** separately approve one owner-controlled mailbox
   signup, actual mail receipt/confirmation link, sign-in, refresh, logout/relogin
   on the reviewed new Preview. Preconfirmed admin users are not email-delivery
   proof. Never turn off confirmation or weaken protection to make it pass.
4. **Google OAuth:** owner-assisted real Google consent -> Supabase callback
   `https://usvopldwiwzlvoqawvcu.supabase.co/auth/v1/callback` -> exact Retraza
   Preview `/auth` -> authenticated app, refresh and relogin. Google Console's
   Supabase callback differs from app redirects; preserve existing provider
   credentials/callbacks. Any required shared configuration change needs approval.
5. **Hosted authenticated E2E:** separately approve the exact hosted origin,
   temporary user/AI budget and cleanup. Verify server functions, actual AI,
   database graph/progress/version persistence and cross-user denial. Use scoped
   short-lived Preview access without forwarding identity to other origins or
   disabling protection. Public/intercepted tests are not hosted acceptance.
6. **Production/rollback:** only after those gates, approve exact production
   domain `https://retraza-kaaush.vercel.app` and `/auth` additions if missing,
   review environment/security and explicitly authorize promotion. No verified
   prior Ready Retraza Production exists; preserve the known-good Preview and
   have a maintenance/traffic-withdrawal plan for a failed first release. Later
   releases retain the previous verified Production deployment as rollback target.
   Code rollback never resets or replays the shared database or touches VibeSprint.
7. **Manual GitHub publication:** owner reviews all dirty changes, tests and
   exclusions, commits intentionally, checks latest fast-forward history and
   publishes using MANUAL_GITHUB_RELEASE.md. No agent push, PR#1 update, merge,
   force push, shared-history rewrite or deployment is authorized.

Auth documentation reviewed: [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)
and [Google OAuth](https://supabase.com/docs/guides/auth/social-login/auth-google).

Final verdict: **A - OFFLINE FIX VERIFIED, READY FOR OWNER-APPROVED LIVE RETEST**.
This is not provider quota confirmation or live success. **Production readiness
is NOT claimed.** Prior RLS/mock PASS remain distinct historical gates.
