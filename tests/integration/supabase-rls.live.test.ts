import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/integrations/supabase/types";
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
    const runId = `reversepath-rls-${crypto.randomUUID()}`;
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
        await Promise.all(users.map((userId) => admin.auth.admin.deleteUser(userId)));
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

    it(
        "prevents another authenticated user from reading or mutating private case and plan data",
        async () => {
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
        },
        30_000,
    );

    it(
        "rejects child rows that point at another user's parent record",
        async () => {
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
        },
        30_000,
    );
});
