# Semantic Compiler And Final Acceptance Checkpoint

## Current v6 Correction

FINAL_HOSTED_LAUNCH_STATUS.md is canonical: v6-bounded-assumptions implemented,
213 offline tests PASS/12 skips,32 local and32 hosted browser PASS/13 skips each.
Both builds/typecheck/lint/source+history+client security PASS. One required-slot
assumptions collection replaces BOTH legacy collections described below: three
required non-null entries, two nullable entries; actual SDK wire verified. HIGH
requires owning-strategy executable workIndex; duplicate/placeholder/dangling/
extra content rejects before persistence. Graph and SQL invariants unchanged.
READY dpl_7fYdNrA9pYDrB7Ti8Uhv7biynUva now serves the stable protected Preview.
Prior J2 rollback preserved. No live AI/database writes or consumed approvals.
Essential v6:PENDING NEW OWNER APPROVAL; stable genuine Auth:PENDING;
Production:NO. Exact owner-only approval command is in the canonical report.

## Historical v5 Implementation And Evidence

October22, 2026. Supersedes previous prompt-only next actions.

## Implemented Boundary

Release Groq planning/replanning now requests a typed semantic plan, NOT a graph.
Strategies own milestones, milestones own nonempty executable work. Compiler
generates deterministic SHA256-based tempIds, owning strategy keys, PART_OF edges
and prerequisite-to-dependent REQUIRES edges. Assumptions nested in validating
work get that work's compiled ID; unvalidated assumptions permit LOW/MEDIUM only.
Thus no independently generated strategyKey/edge endpoint/HIGH-validator pointer
is required from the release model. Explicit local prerequisite indexes are
resolved within their own strategy and rejected if missing, cyclic or self-linked.

This is compilation, not post-hoc graph repair. Missing meaningful strategy/work/
milestone content, duplicate identities, foreign accepted references, cycles,
empty completion evidence definitions or compact-profile failures still reject
before persistence. No placeholder tasks, importance downgrade, extra AI repair
calls, quota changes, mock fallback or relaxed graph assertions.

Replans use trusted owner-scoped ACTIVE context. Strategy keys/names/selection
come from that context; accepted work references cannot address another strategy
or user. DONE/IN_PROGRESS definitions omitted by the model are retained by the
server, never regenerated as pending tasks. Existing hard edges between retained
nodes remain; contradictory new dependencies reject. The unchanged persistence
boundary copies exact completion timestamps/results into candidates. Prior
versions/accepted pointer stay unchanged until the existing activation RPC runs.
Legacy milestone IDs can be reused as semantic keys; new local-key paths hash
deterministically. Database row UUIDs remain allocated by existing persistence.

The compiler is enabled on the release Groq generation/replan path. Disabled
Gemini/OpenRouter adapters retain their existing graph contracts for backward
compatibility, not a claim that their output was live retested. Explicit mock
mode retains the existing deterministic mock; live mode never substitutes it.

## Strict Structured Output

Official source: https://console.groq.com/docs/structured-outputs
Reviewed support for openai/gpt-oss-20b, strict=true, required fields, closed
objects, nullable fields and nested anyOf. Installed @ai-sdk/openai-compatible
supportsStructuredOutputs maps JSON generation to response_format.json_schema.
Explicit Groq strictJsonSchema=true is set for the configured OSS20b/120b models.

Mocked actual SDK wire tests recursively verify every object has
additionalProperties=false and all properties required; actual payload uses
json_schema/strict=true. This verifies local configuration/schema serialization,
NOT fresh live-provider schema acceptance or a guarantee of semantic correctness.
No inference or new key/model/provider configuration was used in this phase.

## Changed Implementation

- src/ai/semantic-plan.server.ts: typed contract and deterministic compiler.
- src/ai/orchestrator.server.ts: Groq semantic request, compilation, existing
  graph validation/telemetry/failure handling; SDK retries remain0.
- src/ai/prompts.server.ts: compact semantic ownership/continuity instructions.
- src/ai/plan-contract.ts: v5-semantic-compiler, persisted graph interface unchanged.
- tests/helpers/semantic-plan.ts: meaningful offline-only provider fixture.
- tests/unit/semantic-plan.test.ts: determinism, branch ownership, HIGH validator
  construction, schema refusal, missing work/milestones, duplicate IDs, dangling
  prerequisites, cycles, foreign references, retained/omitted completion.
- tests/integration/semantic-generation.test.ts: REAL source generate/replan
  handlers plus real SDK and persistence serialization, mocked HTTP/Supabase.
  Success, strict wire format, missing branches, bad dependencies, rate429 with
  no retry, failed atomic save/no false success, candidate completion preserved.
- tests/db/transactions.test.ts: compiled semantic versions through real LOCAL
  PGlite SQL, rejection/acceptance, one-active history and completion evidence.
  Existing rollback/RLS/transaction tests remain.
- tests/unit/groq-assumption-validation.test.ts: graph-invalid HIGH references
  still reject before RPC at the unchanged persistence boundary. Old raw-Groq
  wire fixtures were replaced by semantic SDK/handler tests, not accepted in live
  production as a backward-compatible escape route.
- tests/unit/replan-provider-fallback.test.ts: disabled optional-provider tests
  now use semantic output for the actual Groq fallback adapter.

## Actual Verification

Full npm run check:release EXIT0:
- Typecheck PASS.
- Lint PASS,0 errors/6 pre-existing Fast Refresh warnings.
- Unit/integration/local SQL:192 PASS/0 FAIL/12 live/config-gated skips.
- Node production build PASS.
- Local browsers:30 PASS/0 FAIL/13 live/config-gated skips.
- Source/client secret scan PASS.

Also: Vercel production-preset BUILD PASS (not Production deployment);
npm audit0 vulnerabilities; hosted STABLE Preview browsers30 PASS/0 FAIL/13 skips;
SSR /,/auth,/demo200+brand+hydration on stable and immutable URLs; unauthenticated
Deployment Protection redirects verified on BOTH. Client audit36 responses,
0 secret findings/0 page errors/0 failed responses. Deployment runtime error-log
query returned0 records over inspected15min. Desktop/mobile demo screenshots
generated; mobile screenshot visually checked.

No shared DB write, account creation/deletion, migration/schema/Auth change,
live AI call, consumed/new owner approval, GitHub push/PR/merge or VibeSprint edit.
These checks are not a hosted authenticated live lifecycle PASS.

## One Preview And Stable Origin

New immutable Preview:
https://retraza-kaaush-1ylcwp1vq-kaushik-yellanki-project.vercel.app
Deployment dpl_J2rCtSRLW5Rk8K8mJvGYe6EbFCfN, READY/Preview.

Stable Retraza-only PREVIEW origin:
https://retraza-kaaush-preview-kaushik-yellanki-project.vercel.app

This unused platform alias returned404 before creation. It is now verified as
project prj_IIXn3B3nWc8JqCvPoq6C56En7wze and the exact new deployment. It is
NOT the Production hostname. Future separately authorized Preview updates can
repoint only this alias after checking project/target/protection, without repeated
Supabase redirect changes. No broad wildcard or unrelated domain was assigned.

Team team_UYEpjjRaObtrYF55SYu5rqUl / scope kaushik-yellanki-project was checked.
Explicit prebuilt --target=preview used once; CLI target=preview and API project/
team/READY/source metadata verified. API standard Preview target is null.
Protection unchanged:all_except_custom_domains. Predecessor Ready Preview
dpl_D437SJqBPg8pJCmKnBnDjhArTeZM retained as rollback, along with older Previews.
Production pointer remains historical CANCELED dpl_Qp3otXDpDpNRXBR94aps2FQvfNWP.
Production hostname retraza-kaaush.vercel.app assignment verified read-only.
Preview/prepared Production Groq-only/retry0 routes and required environment
names read back privately. No environment upload/paid resource/billing change.

Source HEAD ff2cf50832e2dbb880757c65be9dbeeab19555c0, feat/vibesprint-parity,
ahead4 with earlier local changes preserved; this work uncommitted/unpushed.
Reviewed manifest157 source/test/build-input files SHA256:
0fa3a1cf8df786a740e3593281362b49f54c480cbf07573a5e845f09ab0608fa.
Build meta records HEAD/hash/gitDirty1/v5. Docs changed after upload.

Evidence: logs/semantic-release-audit.log, semantic-vercel-build.log,
semantic-dependency-audit.json, semantic-source-identity.json,
semantic-preview-deploy.log, semantic-stable-alias-{preflight,set}.log,
semantic-hosted-{browser,client,ssr}.log and semantic-runtime-errors.jsonl.
Intermediate failing test logs are retained; FINAL check:release above passed.
One new handler fixture initially omitted expected_result/default model, fixed
to reflect actual DB/runtime rather than weakening completion/call assertions.

## ONE Owner Bundle Before Final Essential Acceptance

Engineering is ready locally for ONE separately approved live run; current
provider quota and real semantic response reliability are UNKNOWN, not PASS.
No approval is requested for Production yet.

1. In shared Supabase URL Configuration, review/add ONLY these exact stable
   Preview entries if missing (actual allowlist contents unavailable to agent):

   ```text
   https://retraza-kaaush-preview-kaushik-yellanki-project.vercel.app
   https://retraza-kaaush-preview-kaushik-yellanki-project.vercel.app/auth
   ```

   Keep shared Site URL, VibeSprint redirects and all existing entries/settings.
   No broad wildcard, Google credential changes or confirmation disablement.
2. Personally run from repository-root PowerShell:

   ```powershell
   & .\scripts\new-owner-essential-approval.ps1 -AppOrigin "https://retraza-kaaush-preview-kaushik-yellanki-project.vercel.app" -Approve
   ```

   Then authorize the exact newly authored file. The script/harness enforce
   fresh compatible catalog evidence/hash/current migrations, new UUID, exact
   origin/project, golden-live/essential, expiry and unused lock. Existing
   catalog expires2026-10-22T21:01:23.129Z; if stale, refresh the read-only export/
   comparison before authoring, never alter timestamps/ledger or replay migrations.
   Agent must not author approval or reuse consumed ad62dde0/f8f713f3/older files.
3. Later approved essential run ONLY:2 temporary users, Groq only, one candidate,
   retries0, at most4 logical operations (classify,plan,replan,explain), existing
   approval ceiling6, no repair/scenarios/extra RLS run. Verify owned persistence,
   both executable strategies, completion/progress/reload/check-in, one candidate/
   acceptance/completed evidence/history/logout-relogin/User B denial. Exact-run
   metadata/cleanup-token guards and0 rows across all16 tables remain mandatory.

## Unavoidable Auth And Release Gates

Owner uses stable /auth with own mailbox:actual signup/received confirmation,
password login/refresh/logout/relogin. Then Google account selection/consent and
real Supabase callback back to stable /auth/authenticated workspace. No secrets/
confirmation URLs in chat; owner accounts retained unless separately approved.
Google callback remains https://usvopldwiwzlvoqawvcu.supabase.co/auth/v1/callback.
Do not create more accounts using an essential approval. Admin-confirmed test
users are not proof of email delivery. Initiation is not completed OAuth.

After essential and real auth PASS, separately review exact Production redirect
requirements https://retraza-kaaush.vercel.app and /auth, preserving shared settings.
Owner separately authorizes the reviewed Production artifact/promotion and public
access behavior. No Production permission is implied by Preview or test approval.
For first-release failure, use an approved withdrawal/maintenance procedure;
historical canceled Production is not a usable rollback. Preview rollback means
repointing ONLY the stable Preview alias to the preserved Ready predecessor,
never database reset or a VibeSprint/Production domain change.

Owner-only Git publication commands remain in MANUAL_GITHUB_RELEASE.md.
Production readiness:NO until real acceptance/auth gates pass. Prior Supabase
catalog/live RLS/mock PASS remains historical; schema/security unchanged.
