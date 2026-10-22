# Retraza Supabase Catalog Completion

## October 22 Verified Export Checkpoint

This section supersedes the unavailable-export verdict below. Current verdict:
**A - CATALOG VERIFIED, SCHEMA COMPATIBLE, READY FOR OWNER-APPROVED LIVE TESTING.**
Live acceptance itself has NOT run or passed.

Found Downloads/Supabase Snippet Untitled query.csv, one row/one catalog column.
Extracted the exact JSON cell without reserialization into ignored
logs/shared-catalog.json. Original CSV retained unchanged; extracted text was
compared with the source cell after writing. No timestamp or metadata changed.
JSON valid; project usvopldwiwzlvoqawvcu; checkedAt
2026-10-21T21:01:23.129348+00:00 (October22 02:31 IST); age8.55h on import.
Evidence expires October23 02:31 IST; gates must recheck freshness before a run.
Catalog SHA256 (verifier's canonical JSON):
78efaa6b3ca8722f7325de2c696c580b4ff8f69b221f4fe6fba809b5e4484088.

check:shared passed GET-only metadata checks (16 tables/five RPC signatures).
Catalog verifier exited0; logs/shared-schema-verification.json inspected:
catalogVerified=true, compatible=true, issues=[]. Both evidence files gitignored.
Verified16 tables with their column types/nullability,56 constraints,33 indexes,
16 ownership RLS policies/RLS enabled on all16 tables,20 table triggers and the
enabled Auth profile trigger. All19 selected function definitions/body hashes,
argument/return signatures, security modes/settings and anon/authenticated
EXECUTE permissions match the local baseline. Five application RPCs, unique
active-version index and ownership guards match. These are catalog/design
checks, NOT behavioral cross-user RLS or persisted Golden Path results.

Initial mismatch was only PostgreSQL-version representation: the PGlite baseline
includes type-n NOT NULL rows in pg_constraint, unlike the export. All independent
column attnotnull values and other constraints already matched. Local comparator
now omits only type-n entries proven redundant by an exact NOT NULL column
definition with notNull=true; evidence and SQL query unchanged. Regression
assertions accept both representations while rejecting changed nullability,
missing foreign keys, unknown NOT NULL entries, RLS/trigger/permission drift.
Reference: https://www.postgresql.org/docs/18/release-18.html (NOT NULL catalog change).

### Migration History Review

All eight local migration outcomes are structurally compatible. Their exact
local version IDs are NOT recorded remotely; the remote ledger has eight
differently numbered named records below. This is not eight pending schema
migrations. Do not reapply migrations, fabricate correspondence of SQL bytes,
or repair history automatically. Source SQL text/checksums are not in this export.

| Local version | Related remote named record/version |
| --- | --- |
| 20260827032425 | initial_reversepath_schema / 20260907075037 |
| 20260827032444 | lock_down_profile_trigger_function / 20260907075155 |
| 20260901093000 | enforce_reversepath_ownership_integrity / 20260907075159 |
| 20260903123000 | atomic_plan_version_activation / 20260907075205 |
| 20261011095115 | restrict_internal_ownership_helpers / 20261013145449 |
| 20261013084557 | atomic_execution_updates / 20261013145452 |
| 20261013085758 | atomic_plan_persistence / 20261013145455 |
| 20261013090748 | atomic_checkins_and_strategy_selection / 20261013145457 |

Required remote schema fixes: NONE identified within exported scope.
Required migration-history writes: NONE authorized or needed for these tests.

### Fresh Safe Tests

check:release exited0:80 unit,27 integration,12 SQL passed;0 failed;11 skipped.
Browser28 passed/0 failed/13 skipped. Node build, environment, typecheck, lint
(six existing warnings) and secret scan passed. Final focused typecheck/lint/
formatting checks passed after formatting. Evidence:
logs/catalog-verified-local-checks.log. No unchanged provider calls or deployment.

### Next Approval Checkpoint - NOT Approved

Approve ONLY one run in scope rls against shared project usvopldwiwzlvoqawvcu,
with one fresh UUID, current compatible evidence/file hash, expiry before that
evidence expires, at most two uniquely tagged disposable confirmed users and
only their own profiles/application records. RLS uses normal user sessions for
cross-user read/write-denial assertions across cases/plans/versions/nodes/actions/
check-ins/risks/assumptions. Admin use only for those users' creation and exact
verified individual cleanup. App-owned dependent rows cascade on user deletion;
unrelated users/data untouched; uncertain cleanup is reported, never broadened.
No email sends, live AI calls, migration/Auth changes, resets, GitHub publishing
or deployment. One process, no retries/tracing, single-use run lock. Shared
resources and possible latent RLS defects remain a risk to VibeSprint; owner
must accept that risk. User deletion does not instantly invalidate all JWTs.

Owner-authored approval format and exact PowerShell commands remain in
SHARED_SUPABASE_COMPATIBILITY.md. No approval file/run lock was fabricated and
no live flag was enabled. golden-mock and golden-live each require their own
later approval/new UUID; live permits only Gemini/Groq, max six logical AI
operations/two provider candidates each and zero provider retries.

ONE NEXT OWNER ACTION: approve the scoped two-user RLS checkpoint above.
No remote database, users, VibeSprint, GitHub or hosting changes occurred.

## Previous Checkpoint (Superseded)

October 22, 2026. This checkpoint supersedes earlier requests to repeat the SQL.
The owner reports that the read-only query has already executed successfully.

## A. Catalog Export

- CATALOG FILE FOUND: NO. SOURCE: NOT FOUND.
- JSON VALID / PROJECT MATCH / FRESHNESS: UNKNOWN; no export was available.
- Expected path: logs/shared-catalog.json (confirmed gitignored).
- Checked the project and top-level Downloads JSON files. Only credential-file
  candidates existed in Downloads; their contents were not opened.
- No browser automation/node_repl tool is exposed in this session. The installed
  computer-use skill requires that runtime; no authenticated browser session
  could be inspected. Cookies, credentials and browser profiles were not read.

## B. Database Compatibility

SUPABASE PROJECT: usvopldwiwzlvoqawvcu, shared, not isolated.
GET-only check:shared succeeded: Auth health/settings and REST OpenAPI HTTP200;
16 expected table endpoints and five expected RPC argument signatures present.
Migration ledger returned HTTP406/PGRST106. Surface presence is not compatibility.
No user records were queried.

TABLES VERIFIED: endpoint names only, not definitions.
RLS / RPC SECURITY / INDEXES / OWNERSHIP / AUTH TRIGGER: UNKNOWN remotely.
Columns, PK/FK, unique/one-active-version constraints, candidate consistency,
function bodies, grants and security modes need the actual catalog export.
COMPLETE SCHEMA COMPATIBILITY: UNKNOWN.

All eight authoritative local migrations remain remotely UNVERIFIABLE:

| Migration version | Local purpose | Remote classification |
| --- | --- | --- |
| 20260827032425 | Initial schema | UNVERIFIABLE |
| 20260827032444 | Initial application schema follow-up | UNVERIFIABLE |
| 20260901093000 | Ownership integrity | UNVERIFIABLE |
| 20260903123000 | Atomic activation | UNVERIFIABLE |
| 20261011095115 | Restricted internal helpers | UNVERIFIABLE |
| 20261013084557 | Atomic execution updates | UNVERIFIABLE |
| 20261013085758 | Atomic plan persistence | UNVERIFIABLE |
| 20261013090748 | Atomic check-ins/strategy selection | UNVERIFIABLE |

MIGRATIONS VERIFIED: 0 remotely. MIGRATIONS PENDING: UNKNOWN, not eight pending.
The local eight-migration baseline and read-only catalog comparison regression
passed, but those synthetic results are not remote evidence.

Ran node scripts/verify-shared-catalog.mjs logs/shared-catalog.json unchanged:
exit1, ENOENT (missing input). logs/shared-schema-verification.json is absent;
no report or approval evidence was fabricated. No remediation can be justified
without the catalog. Preserve the downloaded original when it becomes available.

## C. Database Changes

REMOTE DATABASE MODIFIED: NO. MIGRATIONS EXECUTED REMOTELY: NO.
USERS CREATED: NO. TEST RECORDS CREATED REMOTELY: NO.
No cleanup, Auth changes, migration replay, reset, or schema repair attempted.

## D. Tests Actually Executed

npm.cmd run check:release exited0. Evidence:
logs/catalog-completion-local-checks.log.

| Gate | Passed | Failed | Skipped |
| --- | --- | --- | --- |
| Typecheck | PASS | 0 | 0 |
| Lint | PASS, six existing warnings | 0 errors | 0 |
| Unit | 80 | 0 | 0 |
| Deterministic integration | 27 | 0 | 11 |
| Local SQL/PGlite | 12 | 0 | 0 |
| Non-destructive browser | 28 | 0 | 13 |
| Secret scan | 211 source files, 42 client assets | 0 findings | 0 |
| Node production build | PASS | 0 | 0 |

Vercel build not repeated: no application/build configuration changes this turn.
AI calls not repeated: no provider changes. Live RLS/Golden Path were not run.
Local checks force AI mock and disable all live database testing flags.

## E. Live Acceptance Readiness

READY FOR CONTROLLED LIVE RLS: NO.
READY FOR MOCK GOLDEN PATH: NO.
READY FOR LIVE GEMINI/GROQ GOLDEN PATH: NO.
OWNER APPROVAL REQUIRED: YES, after compatible catalog evidence.

Exact future approval: shared project usvopldwiwzlvoqawvcu; one fresh run UUID
and one scope (rls OR golden-mock OR golden-live) per approval. Maximum two
uniquely tagged temporary users; writes only to their owned application rows
and telemetry/idempotency records. Ordinary user sessions exercise RLS/RPCs;
admin credentials only create those users and individually clean users verified
against this run's exact email and server-owned metadata/cleanup token.
Never alter unrelated users/data. Uncertain cleanup targets stay untouched.
RLS/mock scopes make no live AI calls. Live scope permits Gemini/Groq only,
six logical operations, up to two candidate providers each, zero provider retries.
One worker/process, no retries or traces, expiring evidence-bound approval and
single-use run lock. No migrations, Auth configuration, GitHub publishing or
Production promotion included. See SHARED_SUPABASE_COMPATIBILITY.md for the
existing owner-authored approval format; no actual approval was generated.

## F. GitHub Safety

GITHUB PUSH EXECUTED: NO. PR MODIFIED: NO. SOURCE REPOSITORY MODIFIED: NO.
ACTIVE BRANCH: feat/vibesprint-parity.
LOCAL HEAD: ff2cf50832e2dbb880757c65be9dbeeab19555c0.
Existing uncommitted handoff and browser-fixture fixes were preserved.
This turn adds this report and updates the handoff; no code edits or commits.
The existing Retraza Preview and all hosting settings remain untouched.

## G. Final Verdict

C - CATALOG EVIDENCE UNAVAILABLE OR INSUFFICIENT.
All safe local gates passed. Remote compatibility and live acceptance remain
blocked, not failed or passed. No second Supabase project or keys are needed.

## H. One Next Owner Action

Open the already-running Supabase SQL Editor result, click Export > JSON, and
save the downloaded file in your Downloads folder.

Do not repeat the SQL just to export the existing result. Once available, the
agent can copy it intact to logs/shared-catalog.json and validate it locally.
The verifier requires checkedAt less than24h old; actual freshness is currently
unknown and no timestamp will be changed to make old evidence pass.
