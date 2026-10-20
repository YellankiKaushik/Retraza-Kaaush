# Retraza Supabase Verification

October 20, 2026. Project usvopldwiwzlvoqawvcu is SHARED with VibeSprint.
Reuse is allowed; there is no independent backend/data isolation.

## Actual Read-Only Evidence

- Browser/server URLs match the reviewed project. Their publishable keys match,
  use the modern publishable format and are accepted by Auth settings (HTTP200).
- Auth settings report email/Google enabled and signup not disabled. They do not
  prove complete Google login, inbox delivery, confirmation policy or redirects.
- Publishable-key access to REST root metadata returns401, "Secret API key
  required". This is NOT an invalid publishable-key conclusion: Auth settings
  accepts it, and REST's schema metadata requires the server secret.
- Server-secret metadata preflight: Auth health200, REST OpenAPI200,
  Auth settings200; all16 required tables and five expected app RPC signatures.
- Migration ledger REST inspection406/PGRST106 (schema not exposed).
- Management connector still lists only an unrelated project; requesting this
  project's migrations returns permission denied.
- logs/shared-catalog.json is absent. No substitute evidence was fabricated.

No table rows/user records, remote SQL writes, migrations, account creation,
cleanup or shared Auth settings were modified. No live-write approval obtained.

## Migration Classification

| Migration                                                  | Remote classification |
| ---------------------------------------------------------- | --------------------- |
| 20260827032425_8c31d278-02ba-4ccb-9a10-29463f260427.sql    | UNKNOWN               |
| 20260827032444_f68e6bbe-d20e-4f3f-a738-4d019d96358b.sql    | UNKNOWN               |
| 20260901093000_enforce_reversepath_ownership_integrity.sql | UNKNOWN               |
| 20260903123000_atomic_plan_version_activation.sql          | UNKNOWN               |
| 20261011095115_restrict_internal_ownership_helpers.sql     | UNKNOWN               |
| 20261013084557_atomic_execution_updates.sql                | UNKNOWN               |
| 20261013085758_atomic_plan_persistence.sql                 | UNKNOWN               |
| 20261013090748_atomic_checkins_and_strategy_selection.sql  | UNKNOWN               |

The local files match production-source migrations and execute in isolated SQL
tests. Public API visibility is not evidence for remote columns/FKs/indexes/RLS/
helper ACL/body/triggers, ledger or transaction implementation.
No migration is proven pending. Do not replay the8 files or a bootstrap script.
If compatible, reuse unchanged. If different, review the exact difference,
locks/privileges/shared-app impact and obtain separate owner approval.

## One Catalog Procedure

1. Open the owning Supabase dashboard and confirm project reference
   usvopldwiwzlvoqawvcu in its URL.
2. SQL Editor > New query. Paste supabase/SHARED_READ_ONLY_PREFLIGHT.sql unchanged.
3. Run the complete file including BEGIN TRANSACTION READ ONLY and ROLLBACK.
   It reads only table/function/trigger/index/policy/ledger metadata, no users,
   secrets or server files. The exact query is executed by local PGlite tests.
4. Copy the single catalog JSON cell, or export the JSON row array with its
   catalog field. Save as logs/shared-catalog.json; no CSV/screenshots/credentials.
5. From repository root run:

```powershell
node scripts/verify-shared-catalog.mjs logs/shared-catalog.json
```

The export must be fresh (<24h). The local comparator creates its baseline from
all8 migrations and verifies columns, constraints, indexes, RLS policies, enabled
ownership/Auth triggers, signatures/bodies/settings/grants and unexpected
overloads. It writes only ignored local evidence, never the remote database.
Mismatch or unavailable ledger means REVIEW/BLOCKED, not an automatic repair.

## Auth Redirects: Proposed Only

Existing shared Site URL, redirects and Google credentials were not readable
through the available management connection and were NOT overwritten.
After explicit owner approval, ADD only needed entries under Authentication >
URL Configuration > Redirect URLs, preserving every existing VibeSprint entry:

- https://retraza-kaaush-f6yk0unsr-kaushik-yellanki-project.vercel.app/auth
- The exact bare Preview origin only if testing a root confirmation callback.
- http://127.0.0.1:5176/auth and localhost:5173/auth if those local callbacks
  are required and not already allowed.
- https://retraza-kaaush.vercel.app/auth only for the eventual approved Production.

Do not add broad wildcards or change the shared Site URL to Retraza. Full Google
account return and real confirmation inbox delivery remain NOT VERIFIED.

## Live-Write Checkpoint: NOT Approved / Not Yet Eligible

First obtain compatible catalog evidence. Then present the exact scope:
project usvopldwiwzlvoqawvcu, fresh evidence hash, run UUID, expiry, two new
uniquely tagged disposable users per scope, own-profile/goal/context/plan/version/
graph/strategy/action/assumption/risk/check-in/diff/telemetry/idempotency records.
Use ordinary-user JWTs to exercise RLS; no service-role data writes.

Cleanup individually verifies current-run creation, exact email, run/scope and
random server-owned cleanup token. Uncertain accounts remain untouched.
No global listing/cleanup, resets, truncation, drops or unrelated deletions.
No Supabase users were created, so no live cleanup was attempted or claimed PASS.

Order after explicit approval: six-case two-user RLS; mock authenticated full
Golden Path; separately approved live Gemini/Groq Golden Path. Each scope gets a
new run/approval; max two users. Mock/RLS budget0 inference; live budget6 logical
operations with Gemini/Groq only and zero provider retries, at most12 candidate
attempts. Sharing Auth/database/provider quotas can affect VibeSprint.
Deleting users does not instantly revoke all access tokens; failures may leave
owned fixtures for manual review. No automatic schema/Auth changes are included.

Use the owner-authored approval format in SHARED_SUPABASE_COMPATIBILITY.md.
Do not set isolated=true for this shared hostname. Approval file/evidence/run
values were not manufactured or enabled by the agent. Live acceptance BLOCKED.
