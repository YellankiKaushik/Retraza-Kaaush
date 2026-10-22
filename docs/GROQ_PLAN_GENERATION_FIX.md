# Groq Plan Generation - October22, 2026

## Established Cause And Limit

The essential run f8f713f3-9ac7-4dd5-9fb7-d911091d94c2 returned schema-valid
Groq planning JSON, rejected by assumption-validator. No invalid plan persisted;
both temporary users were deleted and all16 tables were clean.

Code confirms why schema success is insufficient: validationNodeTempId was an
undocumented nullable string. JSON Schema does not resolve that string against
nodes or enforce HIGH importance's executable-node relationship. validateProposal
then rejects non-null dangling links, and the live compact profile rejects a
HIGH assumption with no ACTION/EXPERIMENT target. The previous prompt mentioned
the rule briefly but gave no field-level guidance, worked example or reference
audit. The historical output was not retained: which of these invalid cases
Groq actually emitted is UNKNOWN. No invented reconstruction.

## Targeted Changes

- src/ai/plan-contract.ts: prompt version v4-assumption-validators; model-facing
  descriptions on node tempId, strategyKey, importance and validationNodeTempId.
  No response-shape change, dynamic schema constraints or validator relaxation.
- src/ai/prompts.server.ts: shared planning/replanning reference contract. Choose
  useful executable validators before writing pointers, resolve exact declared
  IDs, HIGH requires a non-null ACTION/EXPERIMENT, optional references may use
  JSON null, never string-null/title/strategy/undeclared IDs. Schema-complete
  typed example fragment demonstrates both HIGH and optional assumptions.
  Reference/type/strategy/edge audit preserves meaningful steps, compact counts,
  acyclicity and accepted completion evidence. No blind copying of example work.
- tests/unit/groq-assumption-validation.test.ts:13 deterministic cases through
  actual Groq adapter/SDK parsing with mocked fetch and fictional credentials.
  Missing/empty/dangling/wrong-type references, strategy-as-node mistakes,
  unknown strategies, dangling edges and cycles reject without repair or retry.
  Valid ACTION and EXPERIMENT links persist via mocked atomic RPC; candidate
  save preserves completed node status, completion timestamp and result.
- tests/db/transactions.test.ts: local PGlite test persists the complete compact
  live-profile graph and verifies the real assumption-to-executable foreign-key
  relationship,3 assumptions and2 strategies.

No planner/domain/orchestrator behavior was weakened. Existing validation still
runs before persistence. No automatic repair inference, mock fallback in live
mode, added provider, retry, quota increase, migration or schema change.

## Checks Actually Executed

- Typecheck PASS.
- Lint PASS,0 errors/6 pre-existing Fast Refresh warnings.
- Unit/deterministic integration/local PostgreSQL:177 PASS,0 FAIL,12 gated skips.
- New focused mocked-Groq file:13 PASS.
- Node server build PASS; Vercel preset build PASS.
- Initial combined release audit: exit1 due to one browser navigation
  ERR_NO_BUFFER_SPACE;29 PASS/1 FAIL/13 SKIP. No assertion/retry changes.
- Isolated full browser rerun after builds:30 PASS/0 FAIL/13 SKIP.
- Updated hosted Preview browser:30 PASS/0 FAIL/13 SKIP. Database-writing scopes
  disabled, Supabase network intercepted in browser fixtures.
- Hosted SSR /,/auth,/demo:200 HTML/brand/hydration, protected redirect confirmed.
- Hosted client audit:36 responses,0 secrets/0 page errors/0 failed responses.
- Final local source/client/history secret scan:230 source files/42 client assets,
  0 findings. Mobile390px screenshot inspected.

No actual AI provider request, shared-database mutation, owner approval creation/
consumption, GitHub push, PR update or VibeSprint change in this phase.

## Updated Preview And Rollback

READY Preview: dpl_D437SJqBPg8pJCmKnBnDjhArTeZM
https://retraza-kaaush-pzj0xqmxh-kaushik-yellanki-project.vercel.app

Independently checked project prj_IIXn3B3nWc8JqCvPoq6C56En7wze, team
team_UYEpjjRaObtrYF55SYu5rqUl, scope kaushik-yellanki-project, linked identity,
explicit --target=preview and CLI target=preview after upload. API uses target=null
for this standard Preview, team.id for ownership. Ready/source metadata verified.
Deployed reviewed prebuilt output; server bundle contains v4-assumption-validators.
No Production deployment/promotion. Production pointer remains historical canceled
dpl_Qp3otXDpDpNRXBR94aps2FQvfNWP. Deployment Protection unchanged.

Preceding Ready Preview retained: dpl_3G1P2fXbu5g42Q3Z68dxFPUzv13a.
No prior deployment deleted. Runtime Preview config unchanged: Groq only,
openai/gpt-oss-20b, all routes groq, retries0, Gemini/OpenRouter disabled.
HEAD ff2cf50832e2dbb880757c65be9dbeeab19555c0, branch feat/vibesprint-parity,
dirty local work intentionally preserved, not committed/pushed. Manifest153
source/test/build-input files SHA256:
141cad878021105b0e703de795aaa40c8f5d62ce787a9934a29d4d9fde6854be.
Documentation changed later; metadata does not claim a clean Git commit.

Evidence: logs/groq-validator-{focused,release-audit,browser-isolated,vercel-build,
hosted-browser,hosted-client-audit,hosted-ssr,preview-deploy}.log and
logs/groq-validator-source-identity.json. Older failed live run remains evidence,
not a consumed approval to reuse.

## Exact Owner Checkpoint

Ready for ONE separately approved essential hosted live test; NOT a live PASS.
No remaining local planning defect is established by these checks. Actual Groq
generation/replanning reliability and available quota remain unverified on v4.

1. Owner reviews the exact NEW Preview origin and /auth in Supabase's existing
   redirect allowlist; add only those entries if absent. Preserve shared Site URL,
   VibeSprint redirects and all Auth settings. Agent has made no Auth changes.
2. From repository-root PowerShell, OWNER personally creates fresh approval:

   ```powershell
   & .\scripts\new-owner-essential-approval.ps1 -AppOrigin "https://retraza-kaaush-pzj0xqmxh-kaushik-yellanki-project.vercel.app" -Approve
   ```

   Then authorize that exact new file/run. Never reuse f8f713f3 or any consumed
   approval. If catalog evidence is older than24h, refresh using existing
   read-only SQL export/comparator first; never change evidence timestamps or
   migration history. Current evidence expires2026-10-22T21:01:23.129Z.
3. Existing harness selects workflow=essential, one replan,2 temporary users,
   existing max6 logical operations ceiling (essential uses at most4), Groq only,
   one candidate per operation/retries0, exact origin/hash/expiry/run lock and
   ownership/cleanup-token protection; verify all16 tables afterward.
   This phase did NOT execute it or change the harness guards.
4. Separately owner completes real mailbox signup/received confirmation/password
   login/refresh/logout/relogin and Google consent/callback at this Preview.
   Supabase Google callback remains
   https://usvopldwiwzlvoqawvcu.supabase.co/auth/v1/callback.
   Admin-confirmed tests do not prove email delivery; initiation is not OAuth
   completion. Never paste passwords, tokens or confirmation URLs into chat.
   Owner accounts are retained unless exact cleanup is separately approved.
5. After genuine hosted lifecycle and auth acceptance, owner separately approves
   Production target/redirects/promotion. GitHub review/publication remains manual
   owner-only. Preserve rollback Preview; no source/reference deployment changes.

Next owner action: review the new Preview redirects, personally run the approval
command above, and authorize ONE new essential acceptance run.
