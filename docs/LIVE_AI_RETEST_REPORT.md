# Retraza-Kaaush Live AI Retest Report

October22, 2026. LIVE AI GOLDEN PATH: FAIL.
One authorized invocation:0 workflows passed,1 failed,1 additional compact case
intentionally skipped. No second live attempt was started.

## Exact Approval And Preflight

Used only the unique newly created file:
logs/owner-golden-live-4ce33605-57f3-444c-8f29-56a0bed61a82.approval.json.
The attachment's exact-path line was still a placeholder, but this was the only
new file since the previous live attempt. Older approvals were not selected.
Owner-authored acknowledgement/file bytes were not changed.

Verified project usvopldwiwzlvoqawvcu, scope golden-live, fresh unused UUID,
evidence SHA256 and catalog hash, compatible fresh schema/current migration
manifest, maxUsers2, maxAiOperations6, exact origin http://127.0.0.1:4173 and
expiry2026-10-22T07:46:21.4186888+00:00. About28min remained at preflight,
exceeding worst-case inference time plus cleanup allowance. Evidence age10.28h.
No catalog/report regeneration or lock bypass. Port4173 was free before launch.

Inspected actual configured candidates: Gemini/Groq only, at most2 per operation,
SDK and provider retries0, official HTTPS endpoints. Existing models unchanged:
gemini-3.5-flash-lite and openai/gpt-oss-20b. Child-process app limits tightened
to1 classification/1 generation/2 replans; at most2 explanations. No provider
quota/billing changes or upgrades. Mock/OpenRouter/OpenAI/Lovable paths disabled.

Before consuming authorization,27 relevant offline tests and typecheck passed.
Source review confirmed live generation/replan apply compact-profile validation,
real-provider persistence independently repeats it, references/cycles/strategy
branches are checked, mock is explicit-only, and no synthetic nodes are added.

## Actual Workflow Results

| Requested check | Actual result |
| --- | --- |
| Initial real classification | PASS, Groq; clarification answers saved |
| Initial real plan | PASS, Gemini; schema and strict live graph checks |
| Compact profile | PASS for initial graph and successful first replan; second Gemini replan rejected |
| Recommended milestones | 3 in initial selected strategy |
| Executable action/experiment nodes | 6 in initial graph |
| Strategies persisted | 2 initially;4 across two versions |
| Graph persisted | Initially14 nodes/12 edges;35 nodes/29 edges across two versions |
| Strategy selection | Alternative selected and original restored |
| Actions/progress | PASS, IN_PROGRESS/DONE and exact progress preserved after reload |
| Check-ins | PASS, one check-in and changed facts persisted |
| First real replan | Gemini rejected; Groq fallback passed strict validation and persisted candidate |
| First change explanation | Groq attempt failed; Gemini fallback succeeded; diff rendered |
| Candidate rejection | PASS, first candidate rejected |
| Second real replan | FAIL, Gemini graph rejected; Groq fallback AI_RATE_LIMITED |
| Candidate acceptance | NOT REACHED |
| Version history | PARTIAL, initial and rejected candidate persisted; final pointer/history assertions not reached |
| Session recovery | Reload persistence PASS; logout/relogin NOT REACHED |
| Cross-user browser isolation | NOT REACHED; previous RLS/mock results remain separate evidence |

The second replan displayed an AI error toast and expectAiSuccess stopped the
test at the actual failure. Existing generation/graph assertions were not relaxed.
No third candidate version was persisted. Prior active plan/candidate records
remained available until the authorized final account cleanup.

## Actual Provider Budget

Five logical AI operations, eight provider attempts, zero retries; maximum2
candidate providers observed per logical operation. Sixth logical operation
(second change explanation) was not reached. No mock substitution.

| Logical operation | Provider attempts and result |
| --- | --- |
| CLASSIFY_AND_CLARIFY | Groq SUCCESS |
| GENERATE_PLAN_GRAPH | Gemini SUCCESS |
| First REPLAN | Gemini graph-invalid; Groq SUCCESS |
| First EXPLAIN_CHANGE | Groq failed (exact status not retained); Gemini SUCCESS |
| Second REPLAN | Gemini graph-invalid; Groq AI_RATE_LIMITED |

Gemini attempts4, successful results2. Groq attempts4, successful results2.
Do not add provider-attempt counts and call them logical operation counts.
Persisted telemetry retains five final-provider operation results; sanitized
attempt logs additionally prove the failed candidate attempts. Rejected Gemini
outputs passed schema parsing but not graph validation. The exact rejected graph
rules were NOT present in the old diagnostics and must not be guessed.
No additional smoke call, AI retry, RLS run or live test scope was executed.

## Cleanup And Restrictions

Temporary users created2; deleted2. Cleanup errors0. Existing exact-current-run
ID/email/run/scope/server-cleanup-token checks ran before each deletion.
Follow-up HEAD/count reads filtered to those two IDs found0 rows in every table:
profiles, intake_cases, case_context_facts, plans, plan_versions, plan_nodes,
plan_edges, strategies, assumptions, risks, actions, check_ins, plan_changes,
ai_usage_events, audit_events, idempotency_keys. No unrelated-row cleanup.
Consumed UUID lock preserved. Owner approval/evidence hashes remain unchanged.

Existing user data modified:NO. Schema/ledger/Auth config modified:NO.
GITHUB PUSH:NO. VIBESPRINT MODIFIED:NO. PREVIEW/PRODUCTION DEPLOYMENT:NO.
All remote records/users created by this run were removed; uncertain targets0.

## Local Follow-Up And Regression

No validation or acceptance requirement was weakened after failure. No new live
inference. Added only bounded diagnostic rule labels for future graph rejection:
known compact rule or graph-integrity, never raw errors/prompts/provider payloads.
Unknown/arbitrary diagnostic strings are suppressed by a whitelist. This does
NOT retroactively identify the rejection rule in this consumed run. Existing
offline regression asserts the precise milestone-count label and no secret leak.

Harness waits now cover two sequential approved providers, without retries or
additional candidates, and initial persisted graph counts are saved before
assertions/cleanup. Both changes preceded this authorized invocation.

The first post-run local suite had one parallel Vite client-module load failure
in the demo pageerror assertion (27 passed/1 failed/13 skipped). A strict serial
browser run passed28/0/13. Default Playwright workers is now1 for the one shared
dev server, avoiding concurrent optimizer startup contention; no pageerror
assertion/filter was removed. Final default check:release exited0:
- Unit90, deterministic integration27, local SQL12:129 passed/0 failed/11 skipped.
- Browser28 passed/0 failed/13 skipped, one worker, no retry.
- Typecheck PASS; lint0 errors/six existing warnings; Node build PASS.
- Local Vercel build PASS; no upload/deployment. Source/client secret scan PASS.

Ignored evidence:
- logs/golden-live-retest-4ce33605-57f3-444c-8f29-56a0bed61a82.log
- logs/reversepath-e2e-4ce33605-57f3-444c-8f29-56a0bed61a82.json
- logs/post-live-retest-local-checks.log (first parallel failure)
- logs/post-live-retest-browser-serial.log
- logs/post-live-retest-local-checks-final.log
- logs/post-live-retest-vercel-build.log

## Next Release Steps - NOT Authorized

Current blocker: full real-AI workflow has not passed. Initial completeness fix
is now live-verified, but Gemini replan rejection plus Groq rate limiting prevented
acceptance/session/cross-user completion. Do not immediately loop more calls or
upgrade provider plans. Review new rule diagnostics and provider quota availability;
any future run requires a NEW explicit owner approval/file/UUID and fresh evidence.
Current catalog evidence expires2026-10-22T21:01:23.129Z (October23 02:31 IST).
No older or consumed approval can be repurposed automatically.

After a successful separately authorized local live acceptance:
1. Review shared Supabase Preview redirect configuration, approve additive-only
   exact Preview origin and /auth entries if missing; preserve VibeSprint Site
   URL, existing redirects, confirmation settings and Google credentials.
2. Separately authorize a verified local-source Retraza Preview update; no Preview
   or Production change occurred in this task. Keep deployment protection.
3. Authorize real hosted email/password signup/delivery/confirmation/login/
   refresh/logout acceptance with an owner-controlled mailbox. Local preconfirmed
   password users are not hosted email acceptance evidence.
4. Authorize owner-assisted Google consent/callback/session/relogin verification.
   Supabase /auth/v1/callback is distinct from application /auth. No provider or
   shared Auth settings may change without their own approval.
5. Authorize a new exact-origin hosted authenticated E2E run with reviewed temporary
   user/AI budgets and verified cleanup. Local acceptance does not prove hosted.
6. Only after all gates pass, obtain separate Production origin/Auth review and
   explicit promotion authorization, with rollback target preserved.
7. Owner manually reviews/commits/publishes GitHub changes using
   MANUAL_GITHUB_RELEASE.md; no force/rewrite, agent pushes or PR updates.

The detailed exact Preview URLs and manual publishing procedure remain in
LIVE_AI_GOLDEN_PATH_REPORT.md and RETRAZA_VERCEL_DEPLOYMENT.md. Production-ready
status is NOT claimed. All later release actions above are prepared only.
