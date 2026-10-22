# Live RLS Verification

October 22, 2026. LIVE RLS: PASS. Exactly one authorized live invocation.
Project usvopldwiwzlvoqawvcu, scope rls, run UUID
5ab360f0-60df-4eff-b551-cd4c46282fe4.

## Approval And Evidence

Used the owner's nonempty logs/owner-rls-5ab360f0-60df-4eff-b551-cd4c46282fe4.approval.json.
An older zero-byte approval file was left untouched and not used.
Validated exact project/origin, rls scope, acknowledgement, maxUsers2,
maxAiOperations0, UUIDv4, expiry, unused lock, report SHA256, catalog hash,
fresh compatible evidence and current migration manifest before execution.
Expiry was 2026-10-22T06:45:52.3942003+00:00, with about28min remaining at
preflight. No approval/evidence bytes or expiry were changed.
No isolated flag bypass: controlled-shared mode retained.

## Actual Results

Six live tests passed, zero failed/skipped. Single process/worker, retry0,
only tests/integration/supabase-rls.live.test.ts. AI_PROVIDER_MODE=mock;
live AI/smoke/demo/Golden Path/signup gates disabled. No provider calls.

1. Atomic execution completion, failed-edit rollback and cross-user RPC denial.
2. Concurrent edits, milestone prerequisites and action revision serialization.
3. Partial graph rollback, concurrent version allocation and single active version.
4. Check-in rollback and atomic version-scoped strategy selection.
5. User B read/update/delete denial for User A's intake_cases, plans,
   plan_versions, strategies, plan_nodes, actions, assumptions, risks, check_ins
   and plan_changes. Every delete probe retained the row for User A; owner reads
   and export succeeded. User B export was empty. All five application RPCs
   rejected cross-user use, including activation and strategy selection.
6. Parent-child ownership guard rejected a cross-user context-fact insertion.

Temporary users created:2. Deleted:2. Both deletions confirmed successful after
the existing guard re-read exact user/email/run/scope/cleanup-token metadata.
Cleanup errors:0. Remaining run-owned rows:0 across all16 application tables,
including profiles, graph/history, telemetry and idempotency. Follow-up HEAD
counts used only user_id IN (the two IDs created by this process), never a
global scan/cleanup. No retry, second run or unrelated user deletion.
The consumed UUID lock remains in logs/shared-test-runs; never reuse it.

Existing real-user records modified:NO; operations targeted temporary users and
their rows only. Database schema modified:NO. Migration ledger modified:NO.
Shared Auth settings modified:NO. VibeSprint repository/deployment modified:NO.
GitHub push/merge/PR updates:NONE. Production deployment:NONE.

## Local Evidence

All ignored, no credentials in these reports:
- logs/rls-authorized-5ab360f0-60df-4eff-b551-cd4c46282fe4.log
- logs/rls-vitest-5ab360f0-60df-4eff-b551-cd4c46282fe4.json
- logs/reversepath-rls-5ab360f0-60df-4eff-b551-cd4c46282fe4.json

The live harness now records only run IDs, created/deleted temporary account
IDs, count-only cleanup checks and sanitized cleanup errors. It also continues
individual guarded cleanup if another deletion fails, reports uncertain targets,
and allows adequate setup/cleanup hook time for remote latency. No guard was
weakened, broad cleanup added or owner approval fabricated.

Post-run check:release exited0 with every live gate disabled:120 deterministic
unit/integration/SQL tests passed,11 skipped; browser28 passed,13 skipped;
zero failures. Typecheck, Node build and secret scan passed; lint zero errors/
six existing warnings. Evidence: logs/post-authorized-rls-local-checks.log.
This was local regression verification, NOT another live RLS invocation.

## Next Checkpoint - Mock Golden Path NOT Approved

Request a separate owner-approved golden-mock run with a NEW UUID and a NEW
owner-authored approval file. Existing RLS approval/lock cannot be reused.
Target remains shared usvopldwiwzlvoqawvcu. Fresh compatible evidence and its
exact file hash required; current evidence expires 2026-10-22T21:01:23.129Z
(October23 02:31 IST). Do not extend evidence timestamps.

Scope: at most two new tagged disposable confirmed users and only their owned
application/telemetry records. Exact local app origin http://127.0.0.1:4173.
AI_PROVIDER_MODE=mock, maxAiOperations0, one worker, retry0, tracing off.
Only tests/e2e/golden-path.live-supabase.spec.ts with RUN_E2E_GOLDEN=true;
RUN_SUPABASE_RLS_TESTS/RUN_E2E_SIGNUP/live-provider gates false. Verify login,
intake, clarification, deterministic plan persistence/activation, strategies,
graph/frontier, action completion/progress, check-ins/replan, candidate/diff,
accept/reject/history, logout/relogin persistence and second-user denial.
Clean only verified current-run users, report uncertain targets unchanged.

No migrations, ledger repair, Auth config/mailbox/Google testing, live AI,
VibeSprint changes, GitHub publishing or deployment included. Shared backend
resources and any latent application defects remain a risk requiring owner
acceptance. A live Gemini/Groq Golden Path needs its own later approval.
This checkpoint is prepared only: no Golden Path approval file, users or run
were created by the agent. Owner-authored format remains documented in
SHARED_SUPABASE_COMPATIBILITY.md with scope changed only by the owner for the
new run after approval.
