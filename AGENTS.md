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
- The configured Supabase backend is shared and read-only by default. Reuse is
  allowed; another account/project is not required. Verify its actual catalog
  before proposing changes. Remote schema/Auth changes and test writes require
  explicit owner approval at the documented project-specific checkpoint.
  Never pretend this host is isolated. Preserve fail-closed guards and exact-run
  ownership checks before cleanup. Do not manufacture owner approval files.
- No GitHub writes, pushes, PR updates, merges, workflow dispatches or deployment
  are authorized. Local commits are allowed; inspect/disable publishing hooks.
  The owner alone performs publishing using docs/MANUAL_GITHUB_RELEASE.md.
- Use npm/package-lock.json for release verification. Normal tests are deterministic;
  local PostgreSQL tests use PGlite without a remote connection.
- Keep all private credentials server-only. Never print values.
- Read docs/VIBE_SPRINT_HANDOFF.md and docs/RETRAZA_RELEASE_READINESS.md before
  continuing release work. Historical reference PASS claims are not destination evidence.
