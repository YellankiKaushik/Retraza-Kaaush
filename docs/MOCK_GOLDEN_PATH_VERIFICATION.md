# Mock Golden Path Verification

October 22, 2026. MOCK GOLDEN PATH: PASS.
One authorized workflow passed, zero failed, one extra live-only compact case
intentionally skipped. Exactly one invocation; no retry or second user pair.

## Approval And Runtime

Project usvopldwiwzlvoqawvcu; scope golden-mock; owner run UUID
e690d114-3fd5-41be-938b-f149b8a11f4d. Used the matching owner-authored file in
logs, unchanged. Validated acknowledgement, maxUsers2, maxAiOperations0,
project/origin, unused UUID lock, expiry, evidence SHA256/catalog hash and current
migration manifest. Evidence compatible/fresh, about9.54h old. Approval expiry
2026-10-22T07:02:58.5750508+00:00, with about29min remaining at preflight.
No evidence report regenerated or approval fabricated/extended.

Existing run-e2e runner started its own local app at http://127.0.0.1:4173;
port was free before launch. Exact reviewed Golden Path file only, one worker,
retry0, tracing off. AI_PROVIDER_MODE=mock; RLS/signup/live AI gates disabled.
Six persisted AI usage events had provider=mock only. No real model calls.
The local app/server was shut down by the runner after the test.

## Workflow Actually Verified

- Admin-confirmed disposable account password login through the real app.
- Natural-language goal creation, classification and real Supabase persistence.
- Deterministic mock plan generation and saved plan/graph/strategies.
- Strategies/assumptions/risks/frontier rendered; selected an alternative route
  and restored the original selection.
- Action IN_PROGRESS then DONE, exact numerical progress increment, and
  completed state/progress preserved after page reload.
- Saved check-in and changed capacity facts.
- First replan persisted a candidate and what-changed diff; rejected it.
- Second replan candidate accepted, preserving prior version history.
- Real database version assertions: three versions, active version3, one
  REJECTED version, exactly one ACTIVE version matching plans.active_version_id.
- Logout and password login again restored the saved versions/state.
- User B login could not load User A's private plan.

Before cleanup the two-user-scoped counts were: profiles2, intake_cases1,
case_context_facts3, plans1, plan_versions3, plan_nodes18, plan_edges12,
strategies6, assumptions6, risks6, actions6, check_ins1, plan_changes2,
ai_usage_events6, audit_events9, idempotency_keys4. Thus graph entities/edges
were genuinely persisted; this does not claim detailed visual graph interaction.

## Coverage Limits

- Clarification saving was NOT exercised: this objective did not request it.
  The harness conditionally skips the form when none is displayed.
- No injected database/provider failures or rollback assertions in this browser
  workflow. Those were covered by the previous RLS/local suites, not rerun live.
- Cross-user browser coverage is denied plan loading. No additional RLS suite
  was authorized or run; the preceding six-test RLS result remains separate.
- This is real local email/password authentication for preconfirmed test users,
  not public signup, mailbox delivery, Google OAuth, expired-session recovery or
  complete hosted Preview/Production authentication acceptance.
- No real AI generation, real AI plan persistence or model quality verified.
- Development-server logs contain request/navigation abort diagnostics (including
  status500 on aborted requests). The workflow assertions and cleanup passed;
  do not represent this as an error-free production request-log audit.

## Cleanup And Evidence

Temporary users created:2; deleted:2. Deletion used the existing guard's exact
current-process ID/email/server-run/scope/cleanup-token recheck. Both succeeded;
cleanupErrors=[]. Count-only follow-up reads filtered to these two user IDs
confirmed zero remaining rows in ALL16 application tables, including telemetry
and idempotency. No broad deletion, user listing or unrelated-row cleanup.
Consumed run lock retained; never reuse this UUID/approval.

Existing real-user data modified:NO. Schema/migration ledger/Auth config:NO.
Live AI calls:0. GitHub publishing/PR/merge:NONE. VibeSprint changes:NONE.
Vercel/Production deployment:NONE.

Ignored evidence:
- logs/golden-mock-authorized-e690d114-3fd5-41be-938b-f149b8a11f4d.log
- logs/reversepath-e2e-e690d114-3fd5-41be-938b-f149b8a11f4d.json

Local-only harness additions record completed stages, optional branch coverage,
usage-provider evidence, current-run pre/post row counts and guarded individual
cleanup results. They do not change approval scope or application behavior.

Post-run check:release exited0 with every live gate disabled:120 local
unit/integration/SQL tests passed,11 skipped; browser28 passed,13 skipped;
zero failures. Typecheck, Node build and secret scan PASS; lint zero errors/
six existing warnings. Evidence: logs/post-golden-mock-local-checks.log.
This was local regression checking, not another live mock/RLS/provider run.

## Separate Live Gemini/Groq Checkpoint - NOT Approved

Owner must author a NEW approval JSON for scope golden-live with a NEW UUID.
Same shared project usvopldwiwzlvoqawvcu; exact local app origin
http://127.0.0.1:4173; maxUsers2; maxAiOperations6. Require fresh compatible
catalog evidence and its exact report hash; current evidence expires
2026-10-22T21:01:23.129Z (October23 02:31 IST). Never extend evidence timestamps
or reuse the RLS/mock approval or consumed UUIDs.

Authorize six logical operations (intake, plan, two replans, two explanations),
Gemini/Groq only, up to two provider candidates per operation, zero per-provider
retries. This may make up to12 provider attempts and consume actual quota/credits.
Primary planning Gemini, fast operations Groq; no OpenRouter/OpenAI/Lovable calls.
Use AI_PROVIDER_MODE=live, AI_PROVIDER_ALLOWLIST=gemini,groq,
AI_PROVIDER_MAX_RETRIES=0; one worker, retries0, trace off, reviewed test file
only. Disable RLS/signup/smoke gates. Maximum two newly tagged disposable users,
only their records, existing verified individual cleanup and16-table count check.
Report uncertain cleanup without broadening deletes.

Same workflow with REAL structured AI and actual persisted usage/graph/version
integrity assertions. No schema/Auth/mailbox/Google changes, unrelated users,
VibeSprint/GitHub changes or deployment included. Shared-resource/model-quota
risk must be accepted by owner. Real hosted auth remains a separate acceptance
gate. This checkpoint is prepared only: NO live approval file created, NO live
AI run executed, and no owner acknowledgement fabricated.
