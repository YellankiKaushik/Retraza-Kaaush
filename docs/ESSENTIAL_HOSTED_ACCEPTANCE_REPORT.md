# Essential Hosted Acceptance - October22, 2026

## Actual Result

**FAIL**. One authorized essential run, zero retries. Extended workflow skipped.
Run f8f713f3-9ac7-4dd5-9fb7-d911091d94c2 is CONSUMED. Do not rerun it.
Completed 2026-10-22T10:11:28.726Z.

Target: https://retraza-kaaush-6c0xcg7q2-kaushik-yellanki-project.vercel.app
Ready Preview dpl_3G1P2fXbu5g42Q3Z68dxFPUzv13a; project
prj_IIXn3B3nWc8JqCvPoq6C56En7wze. Supabase usvopldwiwzlvoqawvcu.

Before execution the existing guard validated the exact project, UUIDv4,
golden-live scope, essential workflow, origin, owner acknowledgement,
maxUsers2/maxAiOperations6, future expiry, fresh compatible catalog evidence,
matching evidence SHA256 and migration manifest. Run lock was absent.
Approval expired at10:47:46Z; execution and cleanup finished before expiry.
Read-only cloud inspection confirmed Groq-only routes/allowlist, retries0,
Gemini/OpenRouter disabled. No configuration was changed.

## Coverage And Failure

- Hosted password login: PASS using run-owned admin-confirmed temporary accounts.
- Goal creation/classification and clarification persistence: PASS.
- Real AI classification: Groq SUCCESS, schema valid.
- Initial planning: Groq returned schema-valid JSON but graph validation FAILED.
- Runtime diagnostic: validationFailure=assumption-validator, graphValid=false,
  finishReason=stop, timedOut=false, no HTTP error.
- A linked validation node was invalid/missing, or a HIGH assumption did not link
  to an executable ACTION/EXPERIMENT. The diagnostic deliberately identifies only
  this rule family; the exact generated graph was not retained. Do not invent a
  more specific cause or silently repair/replace the generated response.
- No plan, version, strategy, node, edge or action was persisted.
- Action/progress, check-in, candidate replan/acceptance, completed-work
  preservation, history, logout/relogin and User B denial: NOT REACHED.
- Rejection workflow/extended two-replan reliability: NOT RUN.
- Real email confirmation and Google OAuth: NOT VERIFIED by this run.

Playwright: 0 passed, 1 failed essential case, 1 deliberately skipped extended case.
Real operations: 2 Groq attempts / 2 logical operations, 0 retries, 0 other providers.
CLASSIFY_AND_CLARIFY:944 input/908 output tokens, SUCCESS.
GENERATE_PLAN_GRAPH:2871 input/10656 output tokens, AI_GRAPH_INVALID,
schema_valid=true. Total3815 input/11564 output tokens. No further inference.
The aggregate console schemaValidated=false means not every operation succeeded;
the per-operation evidence confirms both JSON schemas were valid.

## Cleanup And Safety

Two uniquely run-tagged temporary accounts created, both verified and deleted.
Cleanup errors:0. Remaining run-owned rows:0 in EACH of all16 application tables:
profiles, intake_cases, case_context_facts, plans, plan_versions, plan_nodes,
plan_edges, strategies, assumptions, risks, actions, check_ins, plan_changes,
ai_usage_events, audit_events and idempotency_keys.

Before cleanup:profiles2/intake_cases1/case_context_facts4/ai_usage_events2/
audit_events1/idempotency_keys1; every other table0. All reads used exact owned
user IDs; deletion required this run's app_metadata and cleanup token.
Existing users modified:NO within the controlled harness scope; no independent
whole-database snapshot was taken. Schema/migrations/Auth configuration changed:NO.
VibeSprint/GitHub/Production/Preview modifications:NONE. No second run.

## Evidence And Offline Checks

Ignored evidence:
- logs/reversepath-e2e-f8f713f3-9ac7-4dd5-9fb7-d911091d94c2.json
- logs/essential-hosted-f8f713f3-9ac7-4dd5-9fb7-d911091d94c2.log
- logs/essential-hosted-f8f713f3-diagnostics.jsonl
- logs/shared-test-runs/f8f713f3-9ac7-4dd5-9fb7-d911091d94c2.lock
- logs/essential-hosted-focused-regressions.log

Focused OFFLINE regression:56 tests PASS across live-plan-profile,
shared-approval, compact-ai, replan-continuity and replan-failures.
Remote writing gates false, backend read-only, AI mock, approval unset.
These are not hosted live acceptance evidence. No application source changed
after the run; validator/prompt already require executable assumption validators.
No speculative assertion weakening or unverified runtime change was made.

## Separate Interactive Auth Checkpoint

Owner has reviewed redirects. Preserve shared Site URL and existing VibeSprint
entries. No agent Auth-setting writes are authorized.

1. Owner opens the exact protected Preview /auth while signed into owning Vercel.
2. Using an owner-controlled mailbox, personally create an account only when
   desired, receive the actual confirmation email, and follow its link back to
   the exact Preview origin. Do not paste credentials or token-bearing links.
3. Verify password sign-in, refresh, sign-out and sign-in again. Record actual
   destination and success/failure without passwords/tokens.
4. Sign out. Choose Continue with Google; owner selects their Google account
   and completes consent personally. Verify Supabase callback at
   https://usvopldwiwzlvoqawvcu.supabase.co/auth/v1/callback and return to this
   Preview /auth followed by authenticated workspace. Refresh/logout/relogin.
5. Retain owner accounts by default. Any agent-created account or deletion
   requires separately approved exact account/scope; consumed test approval
   does not authorize additional identities. Google initiation alone and
   admin-confirmed users are NOT completed OAuth/email delivery evidence.

Release readiness:NO. Actual initial graph generation failure remains a blocker;
essential remaining workflow and real interactive auth still need acceptance.
No Production promotion/publication is authorized.

One next owner action: complete the owner-assisted mailbox/Google check at this
unchanged Preview and report outcomes without secrets. No additional live AI run
should be attempted on this consumed approval; any later retest needs fresh
owner approval after a reviewed reliability correction.
