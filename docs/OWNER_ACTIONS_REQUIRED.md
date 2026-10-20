# Owner Actions Required

October 20, 2026. Local work and independent protected Preview are complete.
No GitHub writes or shared database mutations performed. No intermediate file/credential questions
are necessary. No second Supabase account/project is required.

## 1. Most Important: Read-Only Catalog Export

1. Open Supabase dashboard and select project **usvopldwiwzlvoqawvcu**. Confirm
   that exact reference in the dashboard URL before doing anything.
2. Go to **SQL Editor > New query**.
3. Open this repository's **supabase/SHARED_READ_ONLY_PREFLIGHT.sql**. Paste the
   complete file unchanged, including BEGIN TRANSACTION READ ONLY and ROLLBACK.
   It selects only table/function/trigger/ledger metadata, not user rows, secrets,
   file contents or privileged data. This exact query executes in local PGlite
   tests; changed RLS/ACL/triggers are rejected by the local comparator.
4. Click Run. Copy the **catalog JSON value** from the one result row. If the
   dashboard exports a JSON array with a catalog field, that format is accepted
   too. Do not export CSV, screenshots or credentials.
5. Save as **logs/shared-catalog.json** under this repository (create logs if
   necessary). logs is gitignored. Do not stage or commit the export.
6. In PowerShell at repository root run:

```powershell
node scripts/verify-shared-catalog.mjs logs/shared-catalog.json
```

An export must be less than24h old, from the reviewed project, with matching
structure/ownership/ACL. Do not edit it to manufacture compatibility. Formatting/
PostgreSQL version differences may conservatively need manual review.
A failure is a BLOCKED result, not permission to apply migrations.
Current missing export means all eight migrations' remote status remains UNKNOWN.

## 2. Reviewed Live Acceptance (Only After Step 1)

The exact checkpoint is in SHARED_SUPABASE_COMPATIBILITY.md:
project usvopldwiwzlvoqawvcu; migrations currently UNKNOWN; two uniquely tagged
disposable users per approved run; writes only to their profiles, goals/context,
plan/version/graph/strategies/actions/assumptions/risks/check-ins/diffs and
app telemetry/idempotency records. Individual cleanup verifies run ID, email,
scope and server-owned cleanup token. Uncertain targets remain untouched.

Approve one run/scope at a time: RLS OR mock Golden Path. Zero live AI for those
runs. A separately approved live Gemini/Groq Golden Path budgets six logical
operations, at most two candidate providers each, no per-provider retries.
Shared Auth/database/provider quotas may affect VibeSprint. No schema/Auth
configuration changes are included in this testing approval. Account deletion
does not instantly revoke all issued access tokens. No reset or broad cleanup.

Do not create an actual approval JSON until the checkpoint has been reviewed.
See the existing runbook for owner-authored fields/expiry/evidence hash and
exact commands. The agent did not fabricate approval or run mutating tests.

## 3. Auth And Independent Hosting

Approve exact Retraza redirect additions without replacing existing shared Site
URL/Google/confirmation settings. Verify real mailbox receipt and complete Google
round trip. The independent retraza-kaaush Vercel project ALREADY EXISTS; do not
create a duplicate or connect it to stale GitHub code. Its protected Preview is
READY and public/intercepted QA passed28/0/13. See RETRAZA_VERCEL_DEPLOYMENT.md
for the URL, deployment ID, current source and canceled first-upload incident.
Production is NOT released; live acceptance and explicit promotion approval
remain required. Do not touch VibeSprint hosting or domains.

## 4. Manual Publishing

Review local commits, test evidence and working tree. All GitHub operations
belong to owner. Follow MANUAL_GITHUB_RELEASE.md; fetch and confirm fast-forward
again immediately before publishing. Do not force push, update main blindly or
treat publishing code as approval for database/hosting changes. PR #1 was untouched.

## Current Verdict

C - APPLICATION CODE COMPLETE; EXTERNAL AUTH/DATABASE APPROVAL REQUIRED.
Local deterministic/browser/SQL/build gates pass. Authenticated shared acceptance
and Production acceptance remain BLOCKED, not PASSED. Preview public QA alone
does not satisfy them. The single next action is still the read-only catalog export.
