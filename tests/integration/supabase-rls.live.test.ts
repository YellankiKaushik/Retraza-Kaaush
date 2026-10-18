import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/integrations/supabase/types";
import { persistProposal } from "@/lib/planner.server";
import { readUserExport } from "@/lib/data-export.server";
import { mockPlanProposal } from "@/ai/mock-provider.server";
import {
    createSupabaseTestFetch,
    hasSupabaseLiveTestCredentials,
    loadProjectEnv,
    supabaseTestUrl,
    testPublishableKey,
    testSecretKey,
} from "../helpers/test-env";

loadProjectEnv();
const enabled = process.env["RUN_SUPABASE_RLS_TESTS"] === "true";
const url = supabaseTestUrl();
const publishableKey = testPublishableKey();
const secretKey = testSecretKey();

const describeIfConfigured = enabled && hasSupabaseLiveTestCredentials() ? describe : describe.skip;

async function signIn(email: string, password: string): Promise<SupabaseClient<Database>> {
    const client = createClient<Database>(url!, publishableKey!, {
        global: { fetch: createSupabaseTestFetch(publishableKey!) },
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return client;
}

describeIfConfigured("live Supabase RLS two-user isolation", () => {
    const runId = `reversepath-rls-${process.env["RETRAZA_TEST_RUN_ID"] || crypto.randomUUID()}`;
    const password = "ReversePath-test-password-12345";
    const users: string[] = [];
    let admin: SupabaseClient<Database>;
    let userA: SupabaseClient<Database>;
    let userB: SupabaseClient<Database>;
    let userAId = "";
    let userBId = "";

    beforeAll(async () => {
        admin = createClient<Database>(url!, secretKey!, {
            global: { fetch: createSupabaseTestFetch(secretKey!) },
            auth: { persistSession: false, autoRefreshToken: false },
        });

        for (const marker of ["a", "b"]) {
            const email = `${runId}-${marker}@example.test`;
            const { data, error } = await admin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
            });
            if (error) throw error;
            users.push(data.user.id);
            if (marker === "a") userAId = data.user.id;
            else userBId = data.user.id;
            if (marker === "a") userA = await signIn(email, password);
            else userB = await signIn(email, password);
        }
    });

    afterAll(async () => {
        if (!admin) return;
        await Promise.all([userA?.auth.signOut(), userB?.auth.signOut()]);
        const cleanup = await Promise.all(
            users.map((userId) => admin.auth.admin.deleteUser(userId)),
        );
        expect(
            cleanup.every((result) => !result.error),
            "Only current-run test users were cleaned up",
        ).toBe(true);
    });

    async function createUserAPlanGraph() {
        const created = await userA
            .from("intake_cases")
            .insert({
                user_id: userAId,
                raw_text: `${runId}: I want to test cross-user isolation.`,
                normalized_title: `${runId}: Cross-user isolation`,
                status: "READY_FOR_PLANNING",
            })
            .select("id")
            .single();
        expect(created.error).toBeNull();
        const caseId = created.data!.id;

        const plan = await userA
            .from("plans")
            .insert({ user_id: userAId, case_id: caseId })
            .select("id")
            .single();
        expect(plan.error).toBeNull();
        const planId = plan.data!.id;

        const version = await userA
            .from("plan_versions")
            .insert({
                user_id: userAId,
                plan_id: planId,
                version_number: 1,
                state: "ACTIVE",
                summary: `${runId}: active test version`,
            })
            .select("id")
            .single();
        expect(version.error).toBeNull();
        const versionId = version.data!.id;

        const strategy = await userA
            .from("strategies")
            .insert({
                user_id: userAId,
                plan_version_id: versionId,
                name: `${runId}: test strategy`,
                summary: "temporary test strategy",
                selected: true,
            })
            .select("id")
            .single();
        expect(strategy.error).toBeNull();
        const strategyId = strategy.data!.id;

        const node = await userA
            .from("plan_nodes")
            .insert({
                user_id: userAId,
                plan_version_id: versionId,
                strategy_id: strategyId,
                node_type: "ACTION",
                title: `${runId}: test action`,
                description: "temporary test action",
            })
            .select("id")
            .single();
        expect(node.error).toBeNull();
        const nodeId = node.data!.id;

        const action = await userA
            .from("actions")
            .insert({
                user_id: userAId,
                plan_node_id: nodeId,
                completion_criteria: `${runId}: done`,
            })
            .select("id")
            .single();
        expect(action.error).toBeNull();

        const assumption = await userA
            .from("assumptions")
            .insert({
                user_id: userAId,
                plan_version_id: versionId,
                statement: `${runId}: temporary assumption`,
            })
            .select("id")
            .single();
        expect(assumption.error).toBeNull();

        const risk = await userA
            .from("risks")
            .insert({
                user_id: userAId,
                plan_version_id: versionId,
                statement: `${runId}: temporary risk`,
            })
            .select("id")
            .single();
        expect(risk.error).toBeNull();

        const checkIn = await userA
            .from("check_ins")
            .insert({
                user_id: userAId,
                plan_id: planId,
                note: `${runId}: temporary check-in`,
            })
            .select("id")
            .single();
        expect(checkIn.error).toBeNull();

        const change = await userA
            .from("plan_changes")
            .insert({
                user_id: userAId,
                plan_id: planId,
                to_version_id: versionId,
                entity_type: "plan_node",
                change_type: "ADDED",
                after_summary: `${runId}: temporary diff`,
            })
            .select("id")
            .single();
        expect(change.error).toBeNull();

        return {
            caseId,
            planId,
            versionId,
            strategyId,
            nodeId,
            actionId: action.data!.id,
            assumptionId: assumption.data!.id,
            riskId: risk.data!.id,
            checkInId: checkIn.data!.id,
            changeId: change.data!.id,
        };
    }

    it("atomically completes, rolls back failed edits, and denies cross-user RPCs", async () => {
        const ids = await createUserAPlanGraph();
        const denied = await userB.rpc("update_execution_node", {
            target_node_id: ids.nodeId,
            patch: { status: "DONE" },
        });
        expect(denied.error).not.toBeNull();
        const invalid = await userA.rpc("update_execution_node", {
            target_node_id: ids.nodeId,
            patch: { status: "DONE", note: "must roll back", title: null },
        });
        expect(invalid.error).not.toBeNull();
        const unchanged = await userA
            .from("actions")
            .select("completed_at, result")
            .eq("id", ids.actionId)
            .single();
        expect(unchanged.data).toEqual({ completed_at: null, result: null });
        expect(
            (await userA.from("plan_nodes").select("status").eq("id", ids.nodeId).single()).data
                ?.status,
        ).toBe("PENDING");
        const done = await userA.rpc("update_execution_node", {
            target_node_id: ids.nodeId,
            patch: { status: "DONE", note: "verified" },
        });
        expect(done.error).toBeNull();
        const saved = await userA
            .from("actions")
            .select("completed_at, result")
            .eq("id", ids.actionId)
            .single();
        expect(saved.data?.completed_at).toBeTruthy();
        expect(saved.data?.result).toEqual({ note: "verified" });
        expect(
            (await userA.from("plan_nodes").select("status").eq("id", ids.nodeId).single()).data
                ?.status,
        ).toBe("DONE");
        await userA.rpc("update_execution_node", {
            target_node_id: ids.nodeId,
            patch: { status: "DONE" },
        });
        expect(
            (await userA.from("actions").select("completed_at").eq("id", ids.actionId).single())
                .data?.completed_at,
        ).toBe(saved.data?.completed_at);
    }, 30_000);

    it("serializes concurrent edits and enforces milestone prerequisites", async () => {
        const ids = await createUserAPlanGraph();
        const milestone = await userA
            .from("plan_nodes")
            .insert({
                user_id: userAId,
                plan_version_id: ids.versionId,
                node_type: "MILESTONE",
                title: "Finish milestone",
            })
            .select("id")
            .single();
        expect(milestone.error).toBeNull();
        expect(
            (
                await userA.from("plan_edges").insert({
                    user_id: userAId,
                    plan_version_id: ids.versionId,
                    from_node_id: ids.nodeId,
                    to_node_id: milestone.data!.id,
                    edge_type: "REQUIRES",
                    hard_dependency: true,
                })
            ).error,
        ).toBeNull();
        expect(
            (
                await userA.rpc("update_execution_node", {
                    target_node_id: milestone.data!.id,
                    patch: { status: "DONE" },
                })
            ).error?.message,
        ).toMatch(/prerequisites/);
        const edits = await Promise.all(
            ["First edit", "Second edit"].map((title) =>
                userA.rpc("update_execution_node", {
                    target_node_id: ids.nodeId,
                    patch: {
                        title,
                        description: title,
                        completionCriteria: title,
                        estimatedMinutes: 30,
                    },
                }),
            ),
        );
        expect(edits.every((r) => !r.error)).toBe(true);
        expect(
            (await userA.from("actions").select("revision").eq("id", ids.actionId).single()).data
                ?.revision,
        ).toBe(3);
        expect(
            (
                await userA.rpc("update_execution_node", {
                    target_node_id: ids.nodeId,
                    patch: { status: "DEFERRED" },
                })
            ).error,
        ).toBeNull();
        expect(
            (
                await userA.rpc("update_execution_node", {
                    target_node_id: milestone.data!.id,
                    patch: { status: "DONE" },
                })
            ).error,
        ).not.toBeNull();
        expect(
            (
                await userA.rpc("update_execution_node", {
                    target_node_id: ids.nodeId,
                    patch: { status: "DONE" },
                })
            ).error,
        ).toBeNull();
        expect(
            (
                await userA.rpc("update_execution_node", {
                    target_node_id: milestone.data!.id,
                    patch: { status: "DONE" },
                })
            ).error,
        ).toBeNull();
    }, 30_000);

    it("rolls back partial graph persistence and allocates concurrent version numbers", async () => {
        const ids = await createUserAPlanGraph();
        const proposal = mockPlanProposal({ rawText: "Build a portfolio in six months" });
        const args = {
            supabase: userA,
            userId: userAId,
            planId: ids.planId,
            caseId: ids.caseId,
            proposal,
            scenario: "BALANCED" as const,
            parentVersionId: ids.versionId,
            versionNumber: 2,
            modelAlias: "PRIMARY",
            promptVersion: "v1",
            activate: false,
        };
        // Failure after earlier graph rows were inserted must roll back everything.
        const failed = await userA.rpc("persist_plan_graph", {
            target_plan_id: ids.planId,
            activate: false,
            payload: {
                version: { scenario: "BALANCED", confidence_reasons: [], generated_by: "AI" },
                strategies: [{ name: "Temporary strategy" }],
                plan_nodes: [{ node_type: "ACTION", title: null }],
            },
        });
        expect(failed.error).not.toBeNull();
        expect(
            (await userA.from("plan_versions").select("id").eq("plan_id", ids.planId)).data,
        ).toHaveLength(1);
        expect(
            (
                await userA
                    .from("strategies")
                    .select("id")
                    .eq("user_id", userAId)
                    .eq("name", "Temporary strategy")
            ).data,
        ).toHaveLength(0);
        const versions = await Promise.all([persistProposal(args), persistProposal(args)]);
        expect(versions.map((v) => v.versionNumber).sort()).toEqual([2, 3]);
        const activations = await Promise.all(
            versions.map((v) =>
                userA.rpc("activate_plan_version_for_user", {
                    target_plan_id: ids.planId,
                    target_version_id: v.versionId,
                }),
            ),
        );
        expect(activations.every((r) => !r.error)).toBe(true);
        expect(
            (
                await userA
                    .from("plan_versions")
                    .select("id")
                    .eq("plan_id", ids.planId)
                    .eq("state", "ACTIVE")
            ).data,
        ).toHaveLength(1);
        const denied = await userB.rpc("persist_plan_graph", {
            target_plan_id: ids.planId,
            payload: {},
            activate: false,
        });
        expect(denied.error).not.toBeNull();
    }, 30_000);

    it("rolls back failed check-ins and makes strategy selection atomic and version-scoped", async () => {
        const ids = await createUserAPlanGraph();
        const failed = await userA.rpc("save_plan_check_in", {
            target_plan_id: ids.planId,
            note: "must roll back",
            progress_rating: 3,
            changed_facts: [{ category: "INVALID", key: "capacity", value: "five hours" }],
        });
        expect(failed.error).not.toBeNull();
        expect(
            (await userA.from("check_ins").select("id").eq("plan_id", ids.planId)).data,
        ).toHaveLength(1);
        const saved = await userA.rpc("save_plan_check_in", {
            target_plan_id: ids.planId,
            note: "capacity changed",
            progress_rating: 3,
            changed_facts: [{ category: "RESOURCE", key: "capacity", value: "five hours" }],
        });
        expect(saved.error).toBeNull();
        expect(
            (await userA.from("case_context_facts").select("key").eq("case_id", ids.caseId)).data,
        ).toEqual([{ key: "capacity" }]);
        expect(
            (
                await userB.rpc("save_plan_check_in", {
                    target_plan_id: ids.planId,
                    note: "denied",
                    progress_rating: null,
                    changed_facts: [],
                })
            ).error,
        ).not.toBeNull();
        const other = await createUserAPlanGraph();
        const wrongVersion = await userA.rpc("select_plan_strategy", {
            target_version_id: ids.versionId,
            target_strategy_id: other.strategyId,
        });
        expect(wrongVersion.error).not.toBeNull();
        expect(
            (await userA.from("strategies").select("selected").eq("id", ids.strategyId).single())
                .data?.selected,
        ).toBe(true);
        const second = await userA
            .from("strategies")
            .insert({ user_id: userAId, plan_version_id: ids.versionId, name: "Alternative" })
            .select("id")
            .single();
        expect(second.error).toBeNull();
        const choices = await Promise.all(
            [ids.strategyId, second.data!.id].map((target_strategy_id) =>
                userA.rpc("select_plan_strategy", {
                    target_version_id: ids.versionId,
                    target_strategy_id,
                }),
            ),
        );
        expect(choices.every((r) => !r.error)).toBe(true);
        expect(
            (
                await userA
                    .from("strategies")
                    .select("id")
                    .eq("plan_version_id", ids.versionId)
                    .eq("selected", true)
            ).data,
        ).toHaveLength(1);
    }, 30_000);

    async function expectUserBDenied(
        table:
            | "intake_cases"
            | "plans"
            | "plan_versions"
            | "strategies"
            | "plan_nodes"
            | "actions"
            | "assumptions"
            | "risks"
            | "check_ins"
            | "plan_changes",
        id: string,
        update: Record<string, unknown>,
    ) {
        const readByB = await userB.from(table).select("id").eq("id", id);
        expect(readByB.error, `${table} read`).toBeNull();
        expect(readByB.data, `${table} read`).toEqual([]);

        const updateByB = await userB.from(table).update(update).eq("id", id).select("id");
        expect(updateByB.error, `${table} update`).toBeNull();
        expect(updateByB.data, `${table} update`).toEqual([]);
    }

    it("prevents another authenticated user from reading or mutating private case and plan data", async () => {
        const ids = await createUserAPlanGraph();

        await expectUserBDenied("intake_cases", ids.caseId, { normalized_title: "tampered" });
        await expectUserBDenied("plans", ids.planId, { status: "TAMPERED" });
        await expectUserBDenied("plan_versions", ids.versionId, { summary: "tampered" });
        await expectUserBDenied("strategies", ids.strategyId, { summary: "tampered" });
        await expectUserBDenied("plan_nodes", ids.nodeId, { title: "tampered" });
        await expectUserBDenied("actions", ids.actionId, { completion_criteria: "tampered" });
        await expectUserBDenied("assumptions", ids.assumptionId, { statement: "tampered" });
        await expectUserBDenied("risks", ids.riskId, { statement: "tampered" });
        await expectUserBDenied("check_ins", ids.checkInId, { note: "tampered" });
        await expectUserBDenied("plan_changes", ids.changeId, { after_summary: "tampered" });

        const readableByA = await userA
            .from("plan_nodes")
            .select("id")
            .eq("id", ids.nodeId)
            .single();
        expect(readableByA.error).toBeNull();
        expect(readableByA.data?.id).toBe(ids.nodeId);
        const deniedExport = await readUserExport(userB, userAId);
        expect(Object.values(deniedExport).every((rows) => rows.length === 0)).toBe(true);
        const ownExport = await readUserExport(userA, userAId);
        expect(ownExport["plans"].some((row) => (row as { id: string }).id === ids.planId)).toBe(
            true,
        );
    }, 30_000);

    it("rejects child rows that point at another user's parent record", async () => {
        const created = await userA
            .from("intake_cases")
            .insert({
                user_id: userAId,
                raw_text: `${runId}: I want to test ownership triggers.`,
                normalized_title: `${runId}: Ownership trigger`,
                status: "READY_FOR_PLANNING",
            })
            .select("id")
            .single();
        expect(created.error).toBeNull();

        const crossInsert = await userB.from("case_context_facts").insert({
            user_id: userBId,
            case_id: created.data!.id,
            category: "FACT",
            key: "malicious",
            value: { answer: "cross-user insert" },
            source: "TEST",
        });

        expect(crossInsert.error?.message).toMatch(/ownership violation|row-level security/i);
    }, 30_000);
});
