<!-- LOVABLE:BEGIN -->

> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

<!-- LOVABLE:END -->

## Retraza Parity Safety

- Implementation destination: Retraza-Kaaush only.
- The vibesprint-source remote is an immutable read-only reference at
  a58c52921b5eb21287446aff998c196b49e2d100. Never push or deploy that project.
- The Supabase backend currently configured in the local .env is shared and
  strictly read-only. Do not apply remote migrations, create users, run SQL writes,
  clean up users or enable live database tests until a dedicated Retraza backend
  is configured. The test guard must remain fail-closed.
- Use npm/package-lock.json for release verification. Normal tests are deterministic;
  local PostgreSQL tests use PGlite without a remote connection.
- Keep all private credentials server-only. Never print values.
- Read docs/VIBE_SPRINT_HANDOFF.md and docs/RETRAZA_RELEASE_READINESS.md before
  continuing release work. Historical reference PASS claims are not destination evidence.
