# Final Source Parity Matrix

## October 20 Independent Preview Checkpoint

This section supersedes earlier hosting-only blockers below. The owner authorized
a separate no-cost Retraza project, private Preview/Production environment setup
and LOCAL-SOURCE Preview upload, NOT GitHub writes, shared Supabase writes or
Production promotion.

Project retraza-kaaush / prj_IIXn3B3nWc8JqCvPoq6C56En7wze, active Hobby scope
kaushik-yellanki-project. No Git connection.
READY Preview dpl_FrVepsubsSfMfyyb1BKQPSV7iFtw:
https://retraza-kaaush-f6yk0unsr-kaushik-yellanki-project.vercel.app
Exact deployed commit5b2bdae702aa3ba64630bc4fd8edaf47541cfaf9. Later local report
commits do not alter deployed app code. Branch feat/vibesprint-parity; never push.

The first CLI upload was unexpectedly classified Production despite Preview
targeting, canceled before READY, and preserved as an audit record. No READY
Production release. See RETRAZA_VERCEL_DEPLOYMENT.md; do not hide this incident.

Fresh local tests119 passed/0 failed/11 skipped (unit80/integration27/SQL12).
Local and hosted Preview browser suites each28/0/13. Fresh Node production
subset19/0/0. Both local builds, remote Preview build, environment, typecheck,
lint(six old warnings), security scans and audit pass. Hosted36 fetched HTML/JS
responses have zero secret findings/errors/failures; scoped request logs zero
error records/5xx. Real Auth/RLS/Golden Path still BLOCKED.
Fresh Gemini smoke passes; Groq passes focused low-reasoning retest after one400.
Optional OpenRouter disabled; no expensive unchanged planning rerun.

No Supabase users, records, migrations, cleanup or Auth settings changed.
Catalog export absent; management access denied. All8 remote migration statuses
UNKNOWN, not assumed pending. Public key accepted by Auth settings; REST root
metadata requires server secret and returns401 to the publishable key.

Read current reports: FINAL_RETRAZA_COMPLETION.md, RETRAZA_VERCEL_DEPLOYMENT.md,
RETRAZA_SUPABASE_VERIFICATION.md, RETRAZA_PRODUCTION_TEST_REPORT.md.
Exact next owner action: read-only catalog export, then comparator. Only after
compatible evidence present the exact run/scope approval; do not manufacture it.
No need for another Supabase project/account. Public Production requires a later,
separate explicit approval after full live acceptance.
Local production inspection: http://127.0.0.1:5176/demo.

October 19, 2026. Destination branch: feat/vibesprint-parity.
Starting destination HEAD: a6c989d27a886a830bd9e18db1647bfbdfde0fe2.
Immutable production application reference: 8b46434cf02fb59b06417d3e5923e845f8af4707.
Reference documentation/main: a58c52921b5eb21287446aff998c196b49e2d100.

Compared actual Git trees and working code, not filename inventories alone.
Read reference docs/PRODUCTION_RELEASE_VERIFICATION.md: its hosted 15-case
acceptance belongs to VibeSprint, NOT Retraza. No source repository/database/Auth/
hosting changes, remote publishing or hosted deployment occurred here.

## Classification And Evidence

MATCHED means equivalent implementation and the stated LOCAL behavior passed.
IMPLEMENTED BUT UNVERIFIED means code exists but its live/hosted acceptance is
blocked. DESTINATION IMPROVEMENT records intentional tested differences.
No known MISSING/BROKEN core capability remains after the local fixes. This is
not a claim that all possible failure/concurrency cases have been verified.

| Capability                               | Source file / behavior                                        | Destination / classification                  | Action and severity                                                 | Evidence / resolution                                                                          |
| ---------------------------------------- | ------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Landing presentation, navigation, CTA    | src/routes/index.tsx; app-shell.tsx                           | Same layout; MATCHED                          | None                                                                | GET-only public screenshots and public E2E                                                     |
| Typography/assets/spacing                | styles.css; fonts.css; public/fonts                           | MATCHED; CSS import/formatting differs        | Retain build-compatible import order; P3                            | Same public headings/fonts/sizes; inspected screenshot pairs                                   |
| Mobile/tablet/desktop                    | Same routes and shell                                         | MATCHED locally                               | None                                                                | 1440/768/390; zero measured horizontal overflow                                                |
| Email/password auth form                 | routes/auth.tsx                                               | MATCHED; password clearing retained           | None                                                                | Intercepted login/signup/confirmation/error tests                                              |
| Confirmation/callback recovery           | lib/auth-callback.ts; hooks/use-auth.ts                       | MATCHED locally; live UNVERIFIED              | Owner live acceptance; P1 gate                                      | Callback cleanup/errors/session initialization tests                                           |
| Complete Google account return           | routes/auth.tsx; Supabase shared config                       | IMPLEMENTED BUT UNVERIFIED                    | Preserve shared Site URL; approve exact redirect additions          | Initiation is not complete account login; no live claim                                        |
| Logout/network failure                   | use-auth.ts; app-shell.tsx; settings.tsx                      | DESTINATION IMPROVEMENT                       | Fixed ignored signOut error; P2                                     | Browser regression reproduces failure; local logout occurs, remote revocation warning shown    |
| Session restoration/account switching    | use-auth.ts; user-scoped query keys                           | MATCHED locally                               | None                                                                | Synthetic second-user login never renders previous dashboard cache                             |
| Prepared demo                            | routes/demo.tsx; domain/demo-plan.ts                          | MATCHED                                       | None                                                                | Load, completion, prerequisites, progress, refresh/reset, three sizes                          |
| Dashboard list/cards/loading/empty/error | routes/index.tsx; lib/data.functions.ts                       | MATCHED locally                               | None                                                                | Intercepted owned card/delete/pending/empty browser case                                       |
| Objective deletion                       | data.functions.ts deleteCase                                  | DESTINATION IMPROVEMENT                       | Reject zero affected rows; P2                                       | Two real-handler regressions; scoped user_id predicate retained                                |
| Goal entry/classification                | routes/new.tsx; intake.functions.ts                           | MATCHED                                       | None                                                                | Duplicate-submit browser case; mock contract + previous live Groq intake                       |
| Clarification/context edits              | intake.functions.ts; plans.$caseId.tsx                        | DESTINATION IMPROVEMENT                       | Reject zero affected updates/deletes; P2                            | Six real-handler positive/negative cases; no false success                                     |
| Objective/success/current state          | ai/prompts.server.ts; plan-contract.ts; workspace             | MATCHED locally                               | None                                                                | Contracts/prompts identical; mock scenario assertions and prior live PM pair                   |
| Resources/constraints/gaps               | Same prompts and typed graph                                  | MATCHED locally                               | None                                                                | Context preservation; workspace graph render; no invented facts policy                         |
| Alternative strategies/tradeoffs         | mock-provider.server.ts; workspace; selector RPC              | MATCHED locally                               | Live selection gate remains                                         | Full-plan rendered; SQL strategy atomicity/version scope                                       |
| Feasibility/confidence                   | plan-contract.ts; prompts; workspace metrics                  | MATCHED locally                               | None                                                                | Schema/range checks, confidence reasons and metrics render; semantic usefulness not guaranteed |
| Assumptions/risks                        | plan-contract.ts; planner.server.ts; workspace                | DESTINATION IMPROVEMENT                       | Dangling validation links rejected in previous checkpoint           | Schema/graph regressions and full-plan render                                                  |
| Dependency graph/cycles                  | domain/frontier.ts; planner.server.ts                         | DESTINATION IMPROVEMENT                       | Missing hard prerequisites blocked; prior fix retained              | Mixed BLOCKED_BY cycles, dangling references, skipped/cancelled/failed prerequisites           |
| Strategy prerequisite closure            | domain/frontier.ts                                            | MATCHED                                       | None                                                                | Existing strategy closure tests; full-plan browser                                             |
| Bottleneck                               | plan-contract.ts; workspace                                   | MATCHED locally                               | None                                                                | Valid node reference and visible bottleneck render                                             |
| Frontier/next action                     | domain/frontier.ts; workspace                                 | MATCHED plus missing-node hardening           | None                                                                | Pure ranking/closure tests and ready/blocked browser rendering                                 |
| Actions/start/completion/edit            | execution.functions.ts; action-execution.server.ts; workspace | MATCHED locally                               | Live transaction acceptance remains                                 | Local SQL partial-failure/concurrency tests; intercepted completion at three sizes             |
| Accurate progress                        | domain/frontier.ts progressOf; workspace                      | MATCHED locally                               | None                                                                | Actual status-derived unit assertions; browser refresh after intercepted completion            |
| Check-in/context changes                 | execution.functions.ts; save_plan_check_in RPC                | MATCHED locally                               | Live persistence gate remains                                       | Local SQL check-in atomicity/rollback; complete form rendered                                  |
| Initial plan generation                  | planning.functions.ts                                         | DESTINATION IMPROVEMENT                       | Fail on source/context/plan read errors before inference; P1        | Three failing-before-fix handler regressions now pass                                          |
| Regeneration of accepted plan            | planning.functions.ts                                         | DESTINATION IMPROVEMENT                       | Existing active version requires replan, not blind regeneration; P1 | Handler regression; no AI/persist call on already-active plan                                  |
| Post-save generation failure             | planning.functions.ts                                         | DESTINATION IMPROVEMENT                       | Preserve claim and saved plan; remove redundant status write; P1    | Handler regression; status is committed by existing graph RPC                                  |
| Replan/diff/reject/accept                | planning.functions.ts; workspace; activation RPC              | DESTINATION IMPROVEMENT locally               | Retain earlier read/write checks and authoritative numbering        | Replan failure regressions, lifecycle tests, local SQL; live browser BLOCKED                   |
| Version/history preservation             | plans.$caseId.tsx; version RPC/index                          | MATCHED locally                               | None                                                                | Candidate/active/superseded/rejected SQL states; one-active constraint                         |
| Idempotency                              | telemetry.server.ts                                           | MATCHED plus post-save claim preservation     | None                                                                | Duplicate-claim/replay/failure tests; complete lifecycle is not one global transaction         |
| Account settings                         | routes/settings.tsx                                           | MATCHED plus pending/error logout state       | None                                                                | Three-size browser/account email and failure feedback                                          |
| Data export                              | data-export.server.ts; settings.tsx                           | MATCHED locally                               | Live cross-user acceptance gate remains                             | Fail-closed export unit test; browser no-download-on-error; prepared live RLS export denial    |
| AI adapters/models                       | Source direct Gemini; destination ai-gateway.server.ts        | DESTINATION IMPROVEMENT                       | Retain configurable Gemini/Groq; optional providers opt-in          | Adapter/routing/schema/429/timeout/quota tests; no silent live-to-mock fallback                |
| Database schema/RPC signatures           | All eight supabase/migrations files                           | MATCHED local files; remote UNVERIFIED        | Catalog/ledger inspection; P1 external gate                         | Files identical to production; 12 local SQL/static tests                                       |
| Ownership/RLS/helper ACL                 | Same migrations/auth middleware                               | MATCHED locally; live UNVERIFIED              | Owner-scoped two-user approval after catalog                        | Local PostgreSQL role/ownership/ACL tests; six live cases BLOCKED                              |
| Environment/server boundaries            | Supabase clients + gateway                                    | MATCHED with Retraza-specific integrations    | Preserve modern keys and server-only secrets                        | Environment, source/history/client scans; zero findings                                        |
| Lovable/Notion/storage/cron              | Destination-only integrations                                 | DESTINATION IMPROVEMENT / preserved contracts | Do not remove; no source deployment IDs copied                      | Code inspection; no extra product features introduced                                          |
| Node/Vercel SSR                          | vite.config.ts; vercel.json; server.ts                        | MATCHED local deployment capability           | Owner independent project and hosted acceptance; P1 gate            | Both builds pass; 19 production Node browser cases; no remote deployment                       |

## Visual Inspection

scripts/compare-public-visuals.mjs captured source and destination home/auth/demo
at all three widths (18 screenshots). Only GET/HEAD were allowed; Supabase/Auth
and server-function traffic were blocked. Demo interactions were browser-local
only. Report/screenshots are ignored under logs/parity-visual/.

Public headings, Space Grotesk family and 48/36/24/30px display sizes matched;
no overflow. Source/destination mobile home and desktop demo screenshot pairs
were visually inspected and aligned. Destination-only full workspace/settings
screenshots were also captured at all three sizes and mobile workspace inspected.
No source authenticated session was used, so pixel parity of authenticated source
screens is NOT claimed. Their implementation matches the production workspace.

## Verification And Limits

Current local suite: 76 unit, 27 deterministic integration, 12 local SQL =
115 passed / 0 failed / 11 live integration skipped.
Browser: 28 passed / 0 failed / 13 skipped. Production Node subset: 19 passed.
Eleven added browser cases are intercepted synthetic-session tests, not a real
authenticated Golden Path. Fourteen added handler cases use mocked Supabase and
actual application handlers. Earlier failures were reproduced before fixing.

Typecheck, lint (six existing warnings), environment/release gates, Node/Vercel
builds, source/history/client audit and dependency audit pass.
Live Gemini/Groq results are retained from the preceding October 19 checkpoint;
this comparison phase made NO new provider inference calls or database mutations.
OpenRouter remains optional unavailable. Provider/token budgets were not broadened.

Full live auth, shared schema/ledger, two-user RLS, authenticated Golden Path and
independent hosted Preview remain BLOCKED. No migration requirement is inferred.
The catalog file is absent; owner actions are consolidated in OWNER_ACTIONS_REQUIRED.md.
