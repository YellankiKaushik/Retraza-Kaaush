import { expect, it } from "vitest";
import {
    readSharedPreflight,
    requiredTables,
    requiredRpcs,
} from "../../scripts/shared-preflight.mjs";
import { expectedCatalog, compareCatalog } from "../../scripts/verify-shared-catalog.mjs";

it("uses only GET metadata endpoints and never promotes an API-surface match to write approval", async () => {
    const calls: Array<{ path: string; method: string }> = [];
    const result = await readSharedPreflight(
        {
            SUPABASE_URL: "https://usvopldwiwzlvoqawvcu.supabase.co",
            SUPABASE_SERVICE_ROLE_KEY: "fictional-private-test-key",
        },
        async (input, init) => {
            const url = new URL(input);
            calls.push({ path: url.pathname, method: init.method });
            if (url.pathname.includes("schema_migrations"))
                return Response.json({ code: "PGRST106" }, { status: 406 });
            if (url.pathname === "/rest/v1/")
                return Response.json({
                    definitions: Object.fromEntries(requiredTables.map((name) => [name, {}])),
                    paths: Object.fromEntries(requiredRpcs.map((name) => ["/rpc/" + name, {}])),
                });
            return Response.json({
                external: { email: true, google: true },
                disable_signup: false,
            });
        },
    );
    expect(calls.every((call) => call.method === "GET")).toBe(true);
    expect(result.missingSurface).toEqual([]);
    expect(result.compatible).toBe(false);
    expect(result.catalogVerified).toBe(false);
    expect(result.migrationHistory).toBe("UNKNOWN");
    expect(JSON.stringify(result)).not.toContain("fictional-private-test-key");
});
it("executes the read-only catalog query locally and rejects changed RLS or RPC permissions", async () => {
    const expected = await expectedCatalog();
    expect(expected.tables).toHaveLength(16);
    expect(compareCatalog(expected, expected)).toEqual([]);
    const altered = structuredClone(expected);
    altered.tables[0].rls = false;
    altered.tables.find((table) => table.name === "plans").triggers = [];
    altered.authProfileTrigger = [];
    altered.functions.find((fn) => fn.name === "persist_plan_graph").anonExecute = true;
    const issues = compareCatalog(altered, expected);
    expect(issues.some((issue) => issue.includes("rls"))).toBe(true);
    expect(issues.some((issue) => issue.includes("persist_plan_graph"))).toBe(true);
    expect(issues.some((issue) => issue.includes("plans: triggers"))).toBe(true);
    expect(issues.some((issue) => issue.includes("auth profile trigger"))).toBe(true);
}, 30_000);
