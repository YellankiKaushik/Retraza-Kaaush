# Shared Supabase Compatibility

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

October 19, 2026. Project reference: `usvopldwiwzlvoqawvcu`.
Shared with VibeSprint: YES. Another account/project is NOT required.
Remote mutations performed by this task: NONE. Owner write approval: NOT obtained.

## Read-Only Evidence

- Auth health and PostgREST OpenAPI: HTTP 200 using the existing server key.
- All 16 required tables are exposed: profiles, intake_cases, case_context_facts,
  plans, plan_versions, plan_nodes, plan_edges, strategies, assumptions, risks,
  actions, check_ins, plan_changes, ai_usage_events, audit_events, idempotency_keys.
- All five application RPCs are exposed with expected argument names/types:
  activate_plan_version_for_user, persist_plan_graph, update_execution_node,
  save_plan_check_in, select_plan_strategy.
- Auth settings expose email and Google enabled; signups are not disabled.
  This does NOT prove delivery, OAuth callback, session restoration or user RLS.
- Migration ledger REST request returned PGRST106 / HTTP 406 (schema not exposed).
  The connected management account lists only an unrelated project and lacks
  owning-project catalog access. The owner is reconnecting the owning account.
- No user listing, user content queries, account creation or cleanup occurred.
- Raw reports are ignored: logs/shared-supabase-preflight.json.

## Compatibility Status

| Area                          | Status                | Evidence / limitation                                   |
| ----------------------------- | --------------------- | ------------------------------------------------------- |
| Connectivity                  | VERIFIED              | Auth health and REST root                               |
| Tables                        | Surface present       | Column/FK/index/RLS definitions need catalog            |
| RPCs                          | Signatures compatible | Bodies/security-definer/ACL need catalog                |
| Migration ledger              | UNKNOWN               | Not exposed; management permission unavailable          |
| RLS and ownership helpers     | UNKNOWN remotely      | Local migration tests pass only                         |
| One-active-version index      | UNKNOWN remotely      | Verified in local SQL tests, not shared catalog         |
| Auth config                   | Partial               | Provider flags only; existing redirects not overwritten |
| Complete schema compatibility | UNKNOWN               | API surface alone never permits writes                  |

All eight migrations currently classify as **CANNOT BE VERIFIED** remotely.
Neither pending nor applied should be inferred from this list:

1. 20260827032425_8c31d278-02ba-4ccb-9a10-29463f260427.sql
2. 20260827032444_f68e6bbe-d20e-4f3f-a738-4d019d96358b.sql
3. 20260901093000_enforce_reversepath_ownership_integrity.sql
4. 20260903123000_atomic_plan_version_activation.sql
5. 20261011095115_restrict_internal_ownership_helpers.sql
6. 20261013084557_atomic_execution_updates.sql
7. 20261013085758_atomic_plan_persistence.sql
8. 20261013090748_atomic_checkins_and_strategy_selection.sql

The exact eight-file manifest and hashes are generated by the preflight tooling;
the directory is authoritative.

## Exact Next Database Steps

1. Reconnect the account owning this exact project for read-only inspection.
   Alternatively run supabase/SHARED_READ_ONLY_PREFLIGHT.sql in this project's
   SQL Editor. It explicitly uses a read-only transaction and rolls back.
2. Save its single catalog JSON value, not a screenshot, to ignored
   logs/shared-catalog.json. No user rows or credentials are included.
3. Run locally:

```powershell
npm.cmd run check:shared
node scripts/verify-shared-catalog.mjs logs/shared-catalog.json
```

The comparator creates an in-memory PostgreSQL baseline from all eight files
and compares columns, constraints, indexes, RLS policies, enabled ownership/Auth
triggers, function signatures, security settings, LF-normalized bodies and ACL.
Unexpected function overloads and exports older than 24 hours block approval.
It never connects to the remote database.
Formatting/PostgreSQL-version differences can conservatively require manual
review. Do not apply a migration merely to make the comparator green.

4. Inspect logs/shared-schema-verification.json. It classifies recorded+compatible,
   structurally present/unrecorded, conflicting or unverifiable state. An unknown
   ledger or any discrepancy requires review. There is no automatic remote repair.
5. If everything is compatible, do NOT replay migrations. If anything is truly
   pending/conflicting, prepare the exact SQL/ledger plan and obtain separate
   owner approval. No remote migration commands are authorized now.

## Approval Checkpoint (NOT Approved)

Only after catalog compatibility is confirmed, present this checkpoint to owner:

- Target: shared project usvopldwiwzlvoqawvcu.
- Migrations: currently UNKNOWN; must resolve before enabling any writes.
- Run: exactly one new UUID, one scope (rls OR golden-mock OR golden-live).
- Accounts: two disposable, admin-created/confirmed email-password users; no
  shared email delivery requests. Each email contains run UUID; server-owned
  app_metadata includes run ID, scope and random cleanup token.
- Tables: auth.users and trigger-owned profiles; intake_cases,
  case_context_facts, plans, plan_versions, plan_nodes, plan_edges, strategies,
  assumptions, risks, actions, check_ins, plan_changes; app telemetry may append
  ai_usage_events, audit_events and idempotency_keys.
- Ownership: ordinary-user sessions exercise RLS/RPCs. No service-role data writes.
  Negative cross-user operations must fail; no unrelated user content is touched.
- Cleanup: individual admin delete only for users recorded as created by this
  exact running process, after re-reading exact email and all server tags.
  Cascades remove their owned records. Uncertain/expired cleanup is blocked;
  report retained account IDs to owner, never broaden cleanup.
- Inference: rls/golden-mock use zero live calls. golden-live is reviewed for
  six logical AI operations; Gemini/Groq only, zero per-provider retries.
  Two configured fallback candidates can mean up to twelve provider attempts.
  This is a reviewed workflow budget, not a global production quota override.
- Limits: one process/worker, no retries, no tracing; a single-use local run lock,
  max two account-creation attempts. A crashed run is not automatically resumed.
- Rollback: account creation and app operations are not one global transaction.
  Auth deletion does not instantly revoke all issued JWTs. Use short runs,
  no retained sessions, and review uncertain leftovers manually.
- Shared impact: same Auth/database resources and provider quotas as VibeSprint;
  RLS mistakes or unexpected shared-schema drift could affect it. Explicit owner
  acceptance of that residual risk is required. No config/schema changes included.

## Owner-Authored Approval Format

Do NOT generate an actual approval until the checkpoint is reviewed. Owner writes
an ignored JSON file with these fields (placeholders below are intentionally invalid):

```json
{
    "projectRef": "usvopldwiwzlvoqawvcu",
    "acknowledgement": "I approve temporary test records in shared project usvopldwiwzlvoqawvcu.",
    "scope": "rls",
    "runId": "OWNER_GENERATED_UUID_V4",
    "maxUsers": 2,
    "maxAiOperations": 0,
    "expiresAt": "OWNER_SELECTED_UTC_EXPIRY_WITHIN_24_HOURS",
    "schemaEvidenceFile": "ABSOLUTE_PATH_TO_VERIFIED_REPORT",
    "schemaEvidenceSha256": "SHA256_OF_REPORT_FILE",
    "appOrigin": "http://127.0.0.1:4173"
}
```

Evidence must be compatible, catalog-verified, less than 24h old and match the
current migration manifest; approval binds its file hash. The owner can compute
that hash with Get-FileHash -Algorithm SHA256 (use lowercase in JSON). Set only
the reviewed scope gate, not multiple live gates:

```powershell
$env:RETRAZA_TEST_BACKEND_MODE="controlled-shared"
$env:RETRAZA_SHARED_TEST_APPROVAL_FILE="ABSOLUTE_OWNER_APPROVAL_PATH"
$env:RETRAZA_TEST_RUN_ID="SAME_APPROVED_UUID"
$env:AI_PROVIDER_MODE="mock"
$env:RUN_SUPABASE_RLS_TESTS="true"
node node_modules/vitest/vitest.mjs run tests/integration/supabase-rls.live.test.ts
```

For separately approved Golden Path use a NEW approval/run UUID, scope
golden-mock, maxAiOperations 0, RUN_E2E_GOLDEN=true (RLS gate false) and:

```powershell
npm.cmd run test:e2e -- tests/e2e/golden-path.live-supabase.spec.ts
```

For separately approved golden-live use maxAiOperations 6,
AI_PROVIDER_MODE=live, AI_PROVIDER_ALLOWLIST=gemini,groq and
AI_PROVIDER_MAX_RETRIES=0. App origin must exactly match reviewed base URL.
Never enable signup/OAuth suites under this two-user approval; inbox and Google
acceptance need their own reviewed procedure. Remove live gates and approval
environment variables after the run. Do not set isolated=true for this host.
