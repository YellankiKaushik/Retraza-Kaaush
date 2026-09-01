import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { EdgeType, NodeStatus, NodeType } from "@/domain/types";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

/** Serializable mirror of GraphNode for the RPC boundary. */
export interface NodeDTO {
    id: string;
    node_type: NodeType;
    title: string;
    description: string | null;
    status: NodeStatus;
    priority_score: number | null;
    depth: number;
    strategy_id: string | null;
    metadata: Record<string, JsonValue>;
}

export interface EdgeDTO {
    id: string;
    from_node_id: string;
    to_node_id: string;
    edge_type: EdgeType;
    hard_dependency: boolean;
    rationale: string | null;
}

export interface CaseSummary {
    id: string;
    title: string | null;
    rawText: string;
    intentType: string | null;
    status: string;
    clarityScore: number | null;
    createdAt: string;
    planId: string | null;
    activeVersionId: string | null;
}

/** Dashboard list of every case the signed-in user owns. */
export const listCases = createServerFn({ method: "GET" })
    .middleware([requireSupabaseAuth])
    .handler(async ({ context }): Promise<CaseSummary[]> => {
        const { supabase, userId } = context;
        const [cases, plans] = await Promise.all([
            supabase
                .from("intake_cases")
                .select("id, normalized_title, raw_text, intent_type, status, clarity_score, created_at")
                .eq("user_id", userId)
                .order("created_at", { ascending: false })
                .limit(100),
            supabase.from("plans").select("id, case_id, active_version_id").eq("user_id", userId),
        ]);

        const planByCase = new Map((plans.data ?? []).map((p) => [p.case_id, p]));
        return (cases.data ?? []).map((c) => ({
            id: c.id,
            title: c.normalized_title,
            rawText: c.raw_text,
            intentType: c.intent_type,
            status: c.status,
            clarityScore: c.clarity_score,
            createdAt: c.created_at,
            planId: planByCase.get(c.id)?.id ?? null,
            activeVersionId: planByCase.get(c.id)?.active_version_id ?? null,
        }));
    });

/** Everything a case detail screen needs: intake, facts, plan and versions. */
export const getCaseBundle = createServerFn({ method: "GET" })
    .middleware([requireSupabaseAuth])
    .inputValidator((input: unknown) =>
        z.object({ caseId: z.string().uuid(), versionId: z.string().uuid().optional() }).parse(input),
    )
    .handler(async ({ data, context }) => {
        const { supabase, userId } = context;

        const caseRow = await supabase
            .from("intake_cases")
            .select("*")
            .eq("id", data.caseId)
            .eq("user_id", userId)
            .maybeSingle();
        if (!caseRow.data) throw new Error("That plan could not be found.");

        const [facts, plan] = await Promise.all([
            supabase
                .from("case_context_facts")
                .select("id, category, key, value, source, created_at")
                .eq("case_id", data.caseId)
                .eq("user_id", userId)
                .order("created_at", { ascending: true }),
            supabase
                .from("plans")
                .select("id, active_version_id, status")
                .eq("case_id", data.caseId)
                .eq("user_id", userId)
                .maybeSingle(),
        ]);

        const base = {
            case: {
                id: caseRow.data.id,
                rawText: caseRow.data.raw_text,
                intentType: caseRow.data.intent_type,
                intentConfidence: caseRow.data.intent_confidence,
                title: caseRow.data.normalized_title,
                desiredOutcome: caseRow.data.desired_outcome,
                successCriteria: (caseRow.data.success_criteria as string[] | null) ?? [],
                timeHorizon: (caseRow.data.time_horizon as { text?: string } | null)?.text ?? null,
                clarityScore: caseRow.data.clarity_score,
                questions:
                    (caseRow.data.clarification_questions as Array<{
                        key: string;
                        question: string;
                        why: string;
                        category: "RESOURCE" | "CONSTRAINT" | "PREFERENCE" | "FACT" | "MEASURE";
                    }> | null) ?? [],
                policyFlags: (caseRow.data.policy_flags as string[] | null) ?? [],
                status: caseRow.data.status,
                createdAt: caseRow.data.created_at,
            },
            facts: (facts.data ?? []).map((f) => ({
                id: f.id,
                category: f.category,
                key: f.key,
                answer:
                    typeof f.value === "object" && f.value && "answer" in f.value
                        ? String((f.value as { answer: unknown }).answer)
                        : JSON.stringify(f.value),
                source: f.source,
            })),
        };

        if (!plan.data) return { ...base, plan: null };

        const versionId = data.versionId ?? plan.data.active_version_id;
        if (!versionId) return { ...base, plan: null };

        const [version, versions, nodes, edges, strategies, assumptions, risks, changes, checkIns] =
            await Promise.all([
                supabase.from("plan_versions").select("*").eq("id", versionId).maybeSingle(),
                supabase
                    .from("plan_versions")
                    .select(
                        "id, version_number, state, scenario, feasibility_score, confidence_score, created_at",
                    )
                    .eq("plan_id", plan.data.id)
                    .order("version_number", { ascending: false }),
                supabase.from("plan_nodes").select("*").eq("plan_version_id", versionId),
                supabase.from("plan_edges").select("*").eq("plan_version_id", versionId),
                supabase
                    .from("strategies")
                    .select("*")
                    .eq("plan_version_id", versionId)
                    .order("created_at", { ascending: true }),
                supabase.from("assumptions").select("*").eq("plan_version_id", versionId),
                supabase.from("risks").select("*").eq("plan_version_id", versionId),
                supabase
                    .from("plan_changes")
                    .select("*")
                    .eq("to_version_id", versionId)
                    .order("created_at", { ascending: true }),
                supabase
                    .from("check_ins")
                    .select("*")
                    .eq("plan_id", plan.data.id)
                    .order("created_at", { ascending: false })
                    .limit(10),
            ]);

        const nodeIds = (nodes.data ?? []).map((n) => n.id);
        const actions =
            nodeIds.length > 0
                ? await supabase.from("actions").select("*").in("plan_node_id", nodeIds)
                : { data: [] as never[] };

        return {
            ...base,
            plan: {
                id: plan.data.id,
                status: plan.data.status,
                activeVersionId: plan.data.active_version_id,
                version: version.data,
                versions: versions.data ?? [],
                nodes: (nodes.data ?? []) as unknown as NodeDTO[],
                edges: (edges.data ?? []) as unknown as EdgeDTO[],
                actions: actions.data ?? [],
                strategies: strategies.data ?? [],
                assumptions: assumptions.data ?? [],
                risks: risks.data ?? [],
                changes: changes.data ?? [],
                checkIns: checkIns.data ?? [],
            },
        };
    });

export type CaseBundle = Awaited<ReturnType<typeof getCaseBundle>>;

/** FR-026 — the user can export everything they own. */
export const exportUserData = createServerFn({ method: "GET" })
    .middleware([requireSupabaseAuth])
    .handler(async ({ context }) => {
        const { supabase, userId } = context;
        const tables = [
            "intake_cases",
            "case_context_facts",
            "plans",
            "plan_versions",
            "plan_nodes",
            "plan_edges",
            "actions",
            "strategies",
            "assumptions",
            "risks",
            "plan_changes",
            "check_ins",
        ] as const;

        const out: Record<string, JsonValue[]> = {};
        for (const table of tables) {
            const { data } = await supabase.from(table).select("*").eq("user_id", userId);
            out[table] = (data ?? []) as unknown as JsonValue[];
        }

        const telemetry = await import("@/lib/telemetry.server");
        await telemetry.recordAudit({ userId, action: "DATA_EXPORTED" });
        return { exportedAt: new Date().toISOString(), data: out };
    });

/** FR-027 — delete a case and everything derived from it. */
export const deleteCase = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((input: unknown) => z.object({ caseId: z.string().uuid() }).parse(input))
    .handler(async ({ data, context }) => {
        const { error } = await context.supabase
            .from("intake_cases")
            .delete()
            .eq("id", data.caseId)
            .eq("user_id", context.userId);
        if (error) throw new Error(error.message);

        const telemetry = await import("@/lib/telemetry.server");
        await telemetry.recordAudit({
            userId: context.userId,
            action: "CASE_DELETED",
            resource: "intake_cases",
            resourceId: data.caseId,
        });
        return { ok: true };
    });
