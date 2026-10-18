import { loadEnv } from "vite";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";

export const requiredTables = [
    "profiles",
    "intake_cases",
    "case_context_facts",
    "plans",
    "plan_versions",
    "plan_nodes",
    "plan_edges",
    "strategies",
    "assumptions",
    "risks",
    "actions",
    "check_ins",
    "plan_changes",
    "ai_usage_events",
    "audit_events",
    "idempotency_keys",
];
export const requiredRpcs = [
    "persist_plan_graph",
    "select_plan_strategy",
    "update_execution_node",
    "activate_plan_version_for_user",
    "save_plan_check_in",
];

export function migrationManifestHash() {
    const hash = createHash("sha256");
    for (const file of readdirSync("supabase/migrations")
        .filter((f) => f.endsWith(".sql"))
        .sort())
        hash.update(
            file +
                "\n" +
                readFileSync("supabase/migrations/" + file, "utf8").replace(/\r\n/g, "\n"),
        );
    return hash.digest("hex");
}

export async function readSharedPreflight(
    env = loadEnv("test", process.cwd(), ""),
    request = fetch,
) {
    const url = new URL(env.SUPABASE_URL || env.VITE_SUPABASE_URL);
    if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname))
        throw new Error("Preflight requires HTTPS or localhost.");
    const report = {
        projectRef: url.hostname.split(".")[0],
        checkedAt: new Date().toISOString(),
        migrationManifestHash: migrationManifestHash(),
        compatible: false,
        catalogVerified: false,
        mutationPerformed: false,
        endpoints: [],
        tables: [],
        rpcs: [],
        auth: null,
        migrationHistory: "UNKNOWN",
        missingSurface: [],
    };
    for (const path of [
        "/auth/v1/health",
        "/rest/v1/",
        "/auth/v1/settings",
        "/rest/v1/schema_migrations?select=version,name&limit=1000",
    ]) {
        const ledger = path.includes("schema_migrations");
        try {
            const response = await request(new URL(path, url), {
                method: "GET",
                headers: {
                    apikey: env.SUPABASE_SERVICE_ROLE_KEY,
                    ...(ledger ? { "Accept-Profile": "supabase_migrations" } : {}),
                    Accept: path === "/rest/v1/" ? "application/openapi+json" : "application/json",
                },
                signal: AbortSignal.timeout(10_000),
            });
            const body = await response.json().catch(() => null);
            report.endpoints.push({
                path: ledger ? "migration-ledger" : path,
                status: response.status,
                ...(ledger && body?.code ? { code: body.code } : {}),
            });
            if (path === "/rest/v1/" && response.ok) {
                report.tables = Object.keys(body?.definitions || {})
                    .filter((name) => requiredTables.includes(name))
                    .sort();
                report.rpcs = Object.keys(body?.paths || {})
                    .filter((name) => name.startsWith("/rpc/"))
                    .map((name) => name.slice(5))
                    .filter((name) => requiredRpcs.includes(name))
                    .sort();
                report.rpcArguments = Object.fromEntries(
                    report.rpcs.map((name) => [
                        name,
                        body.paths["/rpc/" + name]?.post?.parameters?.find(
                            (param) => param.in === "body",
                        )?.schema?.properties ??
                            body.paths["/rpc/" + name]?.post?.parameters?.find(
                                (param) => param.in === "body",
                            )?.schema?.$ref ??
                            null,
                    ]),
                );
            }
            if (path === "/auth/v1/settings" && response.ok)
                report.auth = {
                    emailEnabled: body?.external?.email === true,
                    googleEnabled: body?.external?.google === true,
                    signupDisabled: body?.disable_signup === true,
                };
            if (ledger && response.ok && Array.isArray(body))
                report.migrationHistory = body.map(({ version, name }) => ({ version, name }));
        } catch (error) {
            report.endpoints.push({
                path: ledger ? "migration-ledger" : path,
                reachable: false,
                error: error?.cause?.code || error?.name || "connection failed",
            });
        }
    }
    report.missingSurface = [
        ...requiredTables.filter((name) => !report.tables.includes(name)),
        ...requiredRpcs.filter((name) => !report.rpcs.includes(name)),
    ];
    // API metadata cannot establish RLS, indexes, ACLs or migration history.
    // This report deliberately cannot authorize shared writes.
    return report;
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("/shared-preflight.mjs")) {
    const report = await readSharedPreflight();
    mkdirSync("logs", { recursive: true });
    writeFileSync("logs/shared-supabase-preflight.json", JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report));
}
