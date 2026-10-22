import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { migrationManifestHash, requiredTables, requiredRpcs } from "./shared-preflight.mjs";

export async function expectedCatalog() {
    const db = new PGlite();
    try {
        await db.exec(`
          CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN;
          CREATE ROLE service_role NOLOGIN BYPASSRLS; CREATE SCHEMA auth;
          CREATE TABLE auth.users(id uuid PRIMARY KEY,email text,raw_user_meta_data jsonb DEFAULT '{}');
          CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
            'SELECT nullif(current_setting(''request.jwt.claim.sub'',true),'''')::uuid';
          GRANT USAGE ON SCHEMA auth,public TO anon,authenticated,service_role;
          CREATE SCHEMA supabase_migrations;
          CREATE TABLE supabase_migrations.schema_migrations(version text,name text);
        `);
        for (const file of readdirSync("supabase/migrations")
            .filter((f) => f.endsWith(".sql"))
            .sort())
            await db.exec(readFileSync("supabase/migrations/" + file, "utf8"));
        const results = await db.exec(
            readFileSync("supabase/SHARED_READ_ONLY_PREFLIGHT.sql", "utf8"),
        );
        return results.find((result) => result.rows?.[0]?.catalog)?.rows[0].catalog;
    } finally {
        await db.close();
    }
}

export function compareCatalog(actual, expected) {
    const issues = [];
    for (const name of requiredTables) {
        const remote = actual.tables?.find((table) => table.name === name);
        const local = expected.tables?.find((table) => table.name === name);
        if (!remote) {
            issues.push(name + ": missing table metadata");
            continue;
        }
        for (const field of ["rls", "columns", "constraints", "indexes", "policies", "triggers"])
            if (
                JSON.stringify(
                    field === "constraints" ? comparableConstraints(remote) : remote[field],
                ) !==
                JSON.stringify(
                    field === "constraints" ? comparableConstraints(local) : local[field],
                )
            )
                issues.push(name + ": " + field + " differs");
    }
    if (JSON.stringify(actual.authProfileTrigger) !== JSON.stringify(expected.authProfileTrigger))
        issues.push("auth profile trigger differs or is missing");
    for (const remote of actual.functions || [])
        if (
            !expected.functions?.some(
                (fn) => fn.name === remote.name && fn.arguments === remote.arguments,
            )
        )
            issues.push(remote.name + ": unexpected function or overload requires review");
    for (const local of expected.functions || []) {
        const remote = actual.functions?.find(
            (fn) => fn.name === local.name && fn.arguments === local.arguments,
        );
        if (!remote || JSON.stringify(remote) !== JSON.stringify(local))
            issues.push(local.name + ": signature/body/ACL/settings differ or are missing");
    }
    for (const name of requiredRpcs)
        if (!actual.functions?.some((fn) => fn.name === name)) issues.push(name + ": missing RPC");
    return issues;
}

function comparableConstraints(table) {
    // PostgreSQL 18 also records column NOT NULL in pg_constraint. attnotnull is
    // compared independently above; omit only entries proven redundant by it.
    return table.constraints?.filter(
        (constraint) =>
            constraint.type !== "n" ||
            !table.columns?.some(
                (column) =>
                    column.notNull === true &&
                    (constraint.definition === "NOT NULL " + column.name ||
                        constraint.definition ===
                            'NOT NULL "' + column.name.replaceAll('"', '""') + '"'),
            ),
    );
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/verify-shared-catalog.mjs")) {
    if (!process.argv[2]) throw new Error("Supply the owner-exported read-only catalog JSON path.");
    const input = JSON.parse(readFileSync(process.argv[2], "utf8"));
    const actual = input.catalog || input?.[0]?.catalog || input;
    if (actual.projectRef !== "usvopldwiwzlvoqawvcu")
        throw new Error("Catalog must identify the reviewed shared project.");
    const age = Date.now() - Date.parse(actual.checkedAt);
    if (!Number.isFinite(age) || age < 0 || age >= 24 * 3600_000)
        throw new Error(
            "Catalog export must be fresh (less than 24 hours old); repeat the read-only query.",
        );
    const expected = await expectedCatalog();
    const issues = compareCatalog(actual, expected);
    const report = {
        projectRef: actual.projectRef,
        checkedAt: actual.checkedAt,
        catalogVerified: true,
        compatible: issues.length === 0,
        migrationManifestHash: migrationManifestHash(),
        catalogSha256: createHash("sha256").update(JSON.stringify(actual)).digest("hex"),
        issues,
        migrations: readdirSync("supabase/migrations")
            .filter((file) => file.endsWith(".sql"))
            .sort()
            .map((file) => {
                const recorded = actual.migrations?.some(
                    (migration) => migration.version === file.slice(0, 14),
                );
                return {
                    file,
                    status: recorded
                        ? issues.length
                            ? "Recorded; structural differences require review"
                            : "Already applied and verified"
                        : issues.length
                          ? "Cannot determine pending/conflicting state without review"
                          : "Structurally present but not recorded",
                };
            }),
    };
    mkdirSync("logs", { recursive: true });
    writeFileSync("logs/shared-schema-verification.json", JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
    if (!report.compatible) process.exitCode = 1;
}
