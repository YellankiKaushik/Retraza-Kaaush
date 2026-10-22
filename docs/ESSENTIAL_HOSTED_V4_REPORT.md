# Essential Hosted v4 - October22, 2026

## Verdict

ESSENTIAL HOSTED GOLDEN PATH: **FAIL**.
One authorized run ad62dde0-8c50-443a-87fc-92aca831a91b, CONSUMED.
No retry or second run. Completed2026-10-22T11:55:56.588Z.

Exact Preview:
https://retraza-kaaush-pzj0xqmxh-kaushik-yellanki-project.vercel.app
Deployment dpl_D437SJqBPg8pJCmKnBnDjhArTeZM; v4-assumption-validators.
Supabase usvopldwiwzlvoqawvcu.

Owner-authored file was validated before writes: UUIDv4, unused lock, exact
origin/project/golden-live scope/essential workflow, maxUsers2/maxAiOperations6,
future expiry12:36:46Z, compatible catalog younger than24h, exact schema report
SHA256 and current migration manifest. Ready deployment, project/team and Groq
only/retries0 were independently read back. No guards changed.

## Actual Coverage

- Temporary-user hosted password login:PASS.
- Goal creation, real Groq classification and persisted clarification:PASS.
- Initial plan generation:FAIL before persistence; schema_valid=true,
  outcome=AI_GRAPH_INVALID.
- Sanitized runtime diagnostic: operation GENERATE_PLAN_GRAPH, provider groq,
  validationFailure=strategy-branch, graphValid=false, finishReason=stop,
  timedOut=false, httpStatus=null, retryAfterSeconds=null.
- Exact rule means at least one declared strategy had no ACTION/EXPERIMENT
  node assigned to its key. Which strategy/ID was affected is UNKNOWN because
  raw generated output was not retained. Do not invent a reconstruction.
- Earlier compact checks passed (two strategies, recommended milestone count,
  executable count and size bounds), but strategy coverage did not.
- The HIGH-assumption executable-validator check occurs AFTER strategy-branch;
  therefore this run does NOT establish the v4 assumption fix passed live.
- Plan/graph/strategy persistence:NOT REACHED; each relevant table had0 rows.
- Action completion/progress/check-in/candidate replan/acceptance/completed-work
  preservation/history/logout-relogin/User B denial:NOT REACHED.
- Extended workflow:deliberately SKIPPED.
- Real mailbox confirmation and Google OAuth:NOT VERIFIED.

Playwright0 PASS/1 FAIL/1 SKIP. Real Groq logical operations2/attempts2/retries0.
No Gemini/OpenRouter/mock output:
CLASSIFY_AND_CLARIFY:944 input/893 output tokens,SUCCESS.
GENERATE_PLAN_GRAPH:3438 input/9948 output tokens,AI_GRAPH_INVALID.
Total4382 input/10841 output tokens. Model openai/gpt-oss-20b.

## Cleanup

Temporary users created2/deleted2; exact IDs matched; cleanup errors0.
Before cleanup:profiles2/intake_cases1/case_context_facts4/ai_usage_events2/
audit_events1/idempotency_keys1; all other application tables0.
After verified exact-run cleanup:0 remaining rows in EACH of all16 tables:
profiles,intake_cases,case_context_facts,plans,plan_versions,plan_nodes,plan_edges,
strategies,assumptions,risks,actions,check_ins,plan_changes,ai_usage_events,
audit_events,idempotency_keys.

Existing users/data modified:NO within the guarded run-owned mutation scope;
no independent whole-database snapshot was taken. Cleanup required accounts
created by this process, matching app_metadata run ID and secret cleanup token.
No unrelated account list/delete, global cleanup, schema/migration/Auth changes,
VibeSprint edits, GitHub push/PR/merge or deployment/Production promotion.
Working app and any existing accepted plans were untouched.

## Local Regression And Evidence

56 focused OFFLINE tests PASS/0 FAIL in live-plan-profile,
groq-assumption-validation,shared-approval,replan-continuity,replan-failures.
All live gates disabled, no approval, AI mock/backend read-only. No source fix,
build or deployment was made in this verification phase. Prior177 offline and
30 hosted browser results remain separate historical evidence.

Ignored evidence:
- logs/reversepath-e2e-ad62dde0-8c50-443a-87fc-92aca831a91b.json
- logs/essential-hosted-ad62dde0-8c50-443a-87fc-92aca831a91b.log
- logs/essential-hosted-ad62dde0-diagnostics.jsonl
- logs/essential-hosted-ad62dde0-regressions.log
- logs/shared-test-runs/ad62dde0-8c50-443a-87fc-92aca831a91b.lock

## Remaining Blocker And Next Checkpoint

Genuine current engineering blocker: real Groq initial generation does not
reliably meet strategy-to-executable coverage. Do NOT relax the rule, silently
repair output, substitute mock, increase retries/quota or keep spending on
fresh live tests. Address this offline before considering another authorized
run. The approved essential lifecycle has not passed; Production readiness:NO.

Independent interactive-auth and Production checklists are prepared in
HOSTED_AUTH_AND_PRODUCTION_CHECKPOINT.md. Owner reviewed the current Preview
redirects; no repeat review is requested for that unchanged origin.
Next owner action: complete the mailbox/Google acceptance checks there using
the existing Preview, without generating another live-AI approval yet.
