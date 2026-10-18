import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, afterAll, describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { mockPlanProposal } from "@/ai/mock-provider.server";
import { persistProposal } from "@/lib/planner.server";

// Real PostgreSQL in WASM; never reads .env or opens a remote connection.
describe("isolated PostgreSQL migrations, transactions and ownership", () => {
    let db: PGlite;
    const owner = crypto.randomUUID();
    const stranger = crypto.randomUUID();
    beforeAll(async () => {
        db = new PGlite();
        await db.exec(`
            CREATE ROLE anon NOLOGIN;
            CREATE ROLE authenticated NOLOGIN;
            CREATE ROLE service_role NOLOGIN BYPASSRLS;
            CREATE SCHEMA auth;
            CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}');
            CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
                'SELECT nullif(current_setting(''request.jwt.claim.sub'', true), '''')::uuid';
            GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
            GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
        `);
        for (const file of readdirSync("supabase/migrations")
            .filter((f) => f.endsWith(".sql"))
            .sort())
            await db.exec(readFileSync(join("supabase/migrations", file), "utf8"));
        await db.query(
            "INSERT INTO auth.users (id,email) VALUES ($1,'owner@example.test'),($2,'stranger@example.test')",
            [owner, stranger],
        );
        await asUser(owner);
    }, 30_000);
    afterAll(async () => {
        await db?.close();
    });

    async function asUser(id: string) {
        await db.exec("RESET ROLE");
        await db.query("SELECT set_config('request.jwt.claim.sub',$1,false)", [id]);
        await db.exec("SET ROLE authenticated");
    }
    async function query(sql: string, params: unknown[] = []) {
        return (await db.query<Record<string, unknown>>(sql, params)).rows;
    }
    async function newPlan() {
        await asUser(owner);
        const [goal] = await query(
            "INSERT INTO public.intake_cases(user_id,raw_text) VALUES($1,'Isolated test goal') RETURNING id",
            [owner],
        );
        const [plan] = await query(
            "INSERT INTO public.plans(user_id,case_id) VALUES($1,$2) RETURNING id",
            [owner, goal!.id],
        );
        return { planId: plan!.id as string, caseId: goal!.id as string };
    }
    function client() {
        return {
            rpc: async (
                name: string,
                args: { target_plan_id: string; payload: unknown; activate: boolean },
            ) => {
                expect(name).toBe("persist_plan_graph");
                try {
                    const [row] = await query(
                        "SELECT public.persist_plan_graph($1,$2::jsonb,$3) AS result",
                        [args.target_plan_id, JSON.stringify(args.payload), args.activate],
                    );
                    return { data: row!.result, error: null };
                } catch (error) {
                    return { data: null, error: { message: (error as Error).message } };
                }
            },
        } as unknown as SupabaseClient<Database>;
    }
    async function graph(activate = true) {
        const ids = await newPlan();
        const proposal = mockPlanProposal({ rawText: "Build a portfolio in six months" });
        const args = {
            ...ids,
            supabase: client(),
            userId: owner,
            proposal,
            scenario: "BALANCED" as const,
            parentVersionId: null,
            versionNumber: 1,
            modelAlias: "PRIMARY",
            promptVersion: "test",
            activate,
        };
        return { ...ids, args, ...(await persistProposal(args)) };
    }

    it("applies all eight migrations with RLS, primary keys, foreign keys and indexes", async () => {
        const tables = await query(
            "SELECT tablename,rowsecurity FROM pg_tables WHERE schemaname='public'",
        );
        expect(tables).toHaveLength(16);
        expect(tables.every((table) => table.rowsecurity)).toBe(true);
        const keys = await query(
            "SELECT contype FROM pg_constraint WHERE connamespace='public'::regnamespace",
        );
        expect(keys.filter((key) => key.contype === "p")).toHaveLength(16);
        expect(keys.filter((key) => key.contype === "f").length).toBeGreaterThanOrEqual(16);
        expect(
            (await query("SELECT indexname FROM pg_indexes WHERE schemaname='public'")).length,
        ).toBeGreaterThan(16);
        const indexes = await query(
            "SELECT indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='plan_versions'",
        );
        expect(
            indexes.some((index) => /UNIQUE.*plan_id.*WHERE.*ACTIVE/i.test(String(index.indexdef))),
        ).toBe(true);
        expect(
            (await query("SELECT policyname FROM pg_policies WHERE schemaname='public'")).length,
        ).toBeGreaterThanOrEqual(16);
    });

    it("restricts transaction RPCs and internal ownership helpers", async () => {
        for (const fn of [
            "persist_plan_graph(uuid,jsonb,boolean)",
            "update_execution_node(uuid,jsonb)",
            "save_plan_check_in(uuid,text,integer,jsonb)",
            "select_plan_strategy(uuid,uuid)",
        ]) {
            const [acl] = await query(
                "SELECT has_function_privilege('anon',$1,'EXECUTE') AS anon, has_function_privilege('authenticated',$1,'EXECUTE') AS authenticated",
                [`public.${fn}`],
            );
            expect(acl).toEqual({ anon: false, authenticated: true });
        }
        expect(
            (
                await query(
                    "SELECT has_function_privilege('authenticated','public.require_same_owner(uuid,uuid,text)','EXECUTE') AS allowed",
                )
            )[0]!.allowed,
        ).toBe(false);
    });

    it("atomically persists and activates a complete graph through the application serializer", async () => {
        const result = await graph();
        expect(result.versionNumber).toBe(1);
        const [plan] = await query("SELECT active_version_id FROM public.plans WHERE id=$1", [
            result.planId,
        ]);
        expect(plan!.active_version_id).toBe(result.versionId);
        for (const table of ["plan_nodes", "plan_edges", "strategies", "assumptions", "risks"])
            expect(
                (
                    await query(`SELECT id FROM public.${table} WHERE plan_version_id=$1`, [
                        result.versionId,
                    ])
                ).length,
            ).toBeGreaterThan(0);
    });

    it("denies another user every private table and owner-scoped RPC", async () => {
        const result = await graph();
        const [node] = await query(
            "SELECT id FROM public.plan_nodes WHERE plan_version_id=$1 AND node_type='ACTION' LIMIT 1",
            [result.versionId],
        );
        await asUser(stranger);
        for (const table of [
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
        ])
            expect(
                await query(`SELECT user_id FROM public.${table} WHERE user_id=$1`, [owner]),
            ).toEqual([]);
        expect(
            await query("UPDATE public.plan_nodes SET title='Tampered' WHERE id=$1 RETURNING id", [
                node!.id,
            ]),
        ).toEqual([]);
        await expect(
            query("SELECT public.update_execution_node($1,$2)", [node!.id, { status: "DONE" }]),
        ).rejects.toThrow(/could not be found/);
        await expect(
            query("SELECT public.persist_plan_graph($1,'{}',false)", [result.planId]),
        ).rejects.toThrow(/could not be found/);
        await asUser(owner);
    });

    it("rolls back partial graphs and allocates distinct versions without replacing the active plan", async () => {
        const result = await graph();
        await expect(
            query("SELECT public.persist_plan_graph($1,$2,false)", [
                result.planId,
                {
                    version: { scenario: "BALANCED", confidence_reasons: [], generated_by: "AI" },
                    strategies: [{ name: "Must roll back" }],
                    plan_nodes: [{ node_type: "ACTION", title: null }],
                },
            ]),
        ).rejects.toThrow();
        expect(await query("SELECT id FROM public.strategies WHERE name='Must roll back'")).toEqual(
            [],
        );
        expect(
            await query("SELECT id FROM public.plan_versions WHERE plan_id=$1", [result.planId]),
        ).toHaveLength(1);
        const versions = await Promise.all([
            persistProposal({ ...result.args, activate: false }),
            persistProposal({ ...result.args, activate: false }),
        ]);
        expect(versions.map((version) => version.versionNumber).sort()).toEqual([2, 3]);
        expect(
            (
                await query("SELECT active_version_id FROM public.plans WHERE id=$1", [
                    result.planId,
                ])
            )[0]!.active_version_id,
        ).toBe(result.versionId);
        for (const version of versions)
            await query("SELECT public.activate_plan_version_for_user($1,$2)", [
                result.planId,
                version.versionId,
            ]);
        expect(
            await query("SELECT id FROM public.plan_versions WHERE plan_id=$1 AND state='ACTIVE'", [
                result.planId,
            ]),
        ).toHaveLength(1);
        expect(
            await query("SELECT id FROM public.plan_versions WHERE plan_id=$1", [result.planId]),
        ).toHaveLength(3);
    });

    it("enforces prerequisites, preserves completion timestamps and rolls back invalid edits", async () => {
        const result = await graph();
        const nodes = await query(
            "SELECT id,title FROM public.plan_nodes WHERE plan_version_id=$1 AND node_type='ACTION' ORDER BY depth,id",
            [result.versionId],
        );
        const [edge] = await query(
            "SELECT from_node_id,to_node_id FROM public.plan_edges WHERE plan_version_id=$1 AND edge_type='REQUIRES' AND hard_dependency LIMIT 1",
            [result.versionId],
        );
        expect(nodes.length).toBeGreaterThan(0);
        await expect(
            query("SELECT public.update_execution_node($1,$2)", [
                edge!.to_node_id,
                { status: "DONE" },
            ]),
        ).rejects.toThrow(/prerequisites/);
        const [first] = await query(
            "SELECT n.id FROM public.plan_nodes n WHERE n.plan_version_id=$1 AND n.node_type='ACTION' AND NOT EXISTS(SELECT 1 FROM public.plan_edges e WHERE e.plan_version_id=$1 AND e.hard_dependency AND e.edge_type IN ('REQUIRES','PRECEDES') AND e.to_node_id=n.id) LIMIT 1",
            [result.versionId],
        );
        await expect(
            query("SELECT public.update_execution_node($1,$2)", [
                first!.id,
                { status: "DONE", title: null },
            ]),
        ).rejects.toThrow();
        expect(
            (await query("SELECT status FROM public.plan_nodes WHERE id=$1", [first!.id]))[0]!
                .status,
        ).toBe("PENDING");
        await query("SELECT public.update_execution_node($1,$2)", [
            first!.id,
            { status: "DONE", note: "Verified" },
        ]);
        const before = await query(
            "SELECT completed_at,result FROM public.actions WHERE plan_node_id=$1",
            [first!.id],
        );
        await query("SELECT public.update_execution_node($1,$2)", [first!.id, { status: "DONE" }]);
        expect(
            await query("SELECT completed_at,result FROM public.actions WHERE plan_node_id=$1", [
                first!.id,
            ]),
        ).toEqual(before);
    });

    it("commits check-ins and facts together and keeps strategy selection version-scoped", async () => {
        const result = await graph();
        await expect(
            query("SELECT public.save_plan_check_in($1,'rollback',3,$2)", [
                result.planId,
                [{ category: "INVALID", key: "capacity", value: "five hours" }],
            ]),
        ).rejects.toThrow();
        expect(
            await query("SELECT id FROM public.check_ins WHERE plan_id=$1", [result.planId]),
        ).toEqual([]);
        await query("SELECT public.save_plan_check_in($1,'saved',3,$2)", [
            result.planId,
            [{ category: "RESOURCE", key: "capacity", value: "five hours" }],
        ]);
        expect(
            await query("SELECT id FROM public.check_ins WHERE plan_id=$1", [result.planId]),
        ).toHaveLength(1);
        expect(
            await query("SELECT key FROM public.case_context_facts WHERE case_id=$1", [
                result.caseId,
            ]),
        ).toEqual([{ key: "capacity" }]);
        const strategies = await query(
            "SELECT id FROM public.strategies WHERE plan_version_id=$1",
            [result.versionId],
        );
        for (const strategy of strategies)
            await query("SELECT public.select_plan_strategy($1,$2)", [
                result.versionId,
                strategy.id,
            ]);
        expect(
            await query("SELECT id FROM public.strategies WHERE plan_version_id=$1 AND selected", [
                result.versionId,
            ]),
        ).toHaveLength(1);
        await expect(
            query("SELECT public.select_plan_strategy($1,$2)", [
                result.versionId,
                crypto.randomUUID(),
            ]),
        ).rejects.toThrow(/does not belong/);
        expect(
            await query("SELECT id FROM public.strategies WHERE plan_version_id=$1 AND selected", [
                result.versionId,
            ]),
        ).toHaveLength(1);
    });

    it("refuses rejected candidates and preserves prior versions", async () => {
        const result = await graph();
        const candidate = await persistProposal({ ...result.args, activate: false });
        await query("UPDATE public.plan_versions SET state='REJECTED' WHERE id=$1", [
            candidate.versionId,
        ]);
        await expect(
            query("SELECT public.activate_plan_version_for_user($1,$2)", [
                result.planId,
                candidate.versionId,
            ]),
        ).rejects.toThrow(/rejected/);
        expect(
            (
                await query("SELECT active_version_id FROM public.plans WHERE id=$1", [
                    result.planId,
                ])
            )[0]!.active_version_id,
        ).toBe(result.versionId);
        expect(
            await query("SELECT id FROM public.plan_versions WHERE plan_id=$1", [result.planId]),
        ).toHaveLength(2);
    });
});
