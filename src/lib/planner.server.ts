/**
 * CMP-PLAN-001 — Plan and Version Service.
 * Deterministic code owns persistence: it validates graph integrity, rejects
 * hard cycles, maps AI tempIds onto real UUIDs and controls version state.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { PlanProposal } from "@/ai/plan-contract";
import { findHardCycle } from "@/domain/frontier";
import type { GraphEdge, GraphNode } from "@/domain/types";
import type { Database } from "@/integrations/supabase/types";

type Client = SupabaseClient<Database>;

export class DomainError extends Error {
    constructor(
        public code: string,
        message: string,
    ) {
        super(message);
    }
}

export function assertOk<T>(
    result: { data: T; error: { message: string } | null },
    what: string,
): NonNullable<T> {
    if (result.error) throw new DomainError("INTERNAL_ERROR", `${what}: ${result.error.message}`);
    if (result.data === null || result.data === undefined)
        throw new DomainError("INTERNAL_ERROR", `${what}: no data returned`);
    return result.data as NonNullable<T>;
}

/** Graph-integrity validation applied to every AI proposal before persistence. */
export function validateProposal(proposal: PlanProposal) {
    const objectives = proposal.nodes.filter((n) => n.nodeType === "OBJECTIVE");
    if (objectives.length !== 1)
        throw new DomainError(
            "PLAN_VALIDATION_FAILED",
            "The proposed plan must contain exactly one objective node.",
        );

    if (proposal.strategies.length === 0 && !proposal.blocker)
        throw new DomainError(
            "PLAN_VALIDATION_FAILED",
            "The proposed plan must include at least one strategy or an explicit blocker.",
        );

    const recommended = proposal.strategies.filter((s) => s.recommended);
    if (proposal.strategies.length > 0 && recommended.length !== 1)
        throw new DomainError(
            "PLAN_VALIDATION_FAILED",
            "The proposed plan must recommend exactly one strategy.",
        );

    const ids = new Set(proposal.nodes.map((n) => n.tempId));
    if (ids.size !== proposal.nodes.length)
        throw new DomainError(
            "PLAN_VALIDATION_FAILED",
            "The proposed plan contains duplicate node ids.",
        );

    for (const edge of proposal.edges) {
        if (!ids.has(edge.from) || !ids.has(edge.to))
            throw new DomainError(
                "PLAN_VALIDATION_FAILED",
                "The proposed plan references a dependency node that does not exist.",
            );
        if (edge.from === edge.to)
            throw new DomainError(
                "PLAN_VALIDATION_FAILED",
                "The proposed plan contains a self-referential dependency.",
            );
    }

    const edges = proposal.edges;

    const strategyKeys = new Set(proposal.strategies.map((s) => s.key));
    if (strategyKeys.size !== proposal.strategies.length)
        throw new DomainError(
            "PLAN_VALIDATION_FAILED",
            "The proposed plan contains duplicate strategy keys.",
        );
    const unknownStrategyNode = proposal.nodes.find(
        (n) => n.strategyKey && !strategyKeys.has(n.strategyKey),
    );
    if (unknownStrategyNode)
        throw new DomainError(
            "PLAN_VALIDATION_FAILED",
            "The proposed plan assigns a node to a strategy that does not exist.",
        );

    const nodes = proposal.nodes.map((n) => ({
        ...n,
        strategyKey: n.strategyKey ?? null,
    }));

    const cycle = findHardCycle(
        nodes.map((n) => ({
            id: n.tempId,
            node_type: n.nodeType,
            title: n.title,
            description: n.description,
            status: "PENDING" as const,
            priority_score: null,
            depth: n.depth,
            strategy_id: null,
            metadata: {},
        })),
        edges.map((e, i) => ({
            id: String(i),
            from_node_id: e.from,
            to_node_id: e.to,
            edge_type: e.edgeType,
            hard_dependency: e.hardDependency,
            rationale: e.rationale,
        })),
    );
    if (cycle)
        throw new DomainError(
            "PLAN_VALIDATION_FAILED",
            "The proposed plan contained a circular dependency and was rejected.",
        );

    const executable = nodes.filter((n) => n.nodeType === "ACTION" || n.nodeType === "EXPERIMENT");
    if (executable.length === 0 && !proposal.blocker)
        throw new DomainError(
            "PLAN_VALIDATION_FAILED",
            "The proposed plan produced no executable action and no explicit blocker.",
        );

    const vagueAction = executable.find(
        (n) => !n.completionCriteria?.trim() || !n.expectedResult?.trim(),
    );
    if (vagueAction)
        throw new DomainError(
            "PLAN_VALIDATION_FAILED",
            "Every action or experiment must include completion criteria and an expected result.",
        );

    if (proposal.bottleneckTempId && !ids.has(proposal.bottleneckTempId))
        throw new DomainError(
            "PLAN_VALIDATION_FAILED",
            "The proposed bottleneck references a node that does not exist.",
        );

    return { nodes, edges };
}

export interface PersistArgs {
    supabase: Client;
    userId: string;
    planId: string;
    caseId: string;
    proposal: PlanProposal;
    scenario: "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE";
    parentVersionId: string | null;
    versionNumber: number;
    modelAlias: string;
    generationSource?: { provider: string; model: string | null };
    promptVersion: string;
    activate: boolean;
    strategyPreference?: string | null;
}

/** Validate in application code, then commit the entire graph in one transaction. */
export async function persistProposal(args: PersistArgs) {
    const { proposal } = args;
    const { nodes, edges } = validateProposal(proposal);
    const recommendedKey =
        (args.strategyPreference &&
            proposal.strategies.find((s) => s.key === args.strategyPreference)?.key) ??
        proposal.strategies.find((s) => s.recommended)?.key ??
        proposal.strategies[0]?.key ??
        null;
    const strategyIds = new Map(proposal.strategies.map((s) => [s.key, crypto.randomUUID()]));
    const nodeIds = new Map(nodes.map((n) => [n.tempId, crypto.randomUUID()]));
    const uniqueEdges = [
        ...new Map(edges.map((e) => [`${e.from}|${e.to}|${e.edgeType}`, e])).values(),
    ];
    const payload = {
        version: {
            parent_version_id: args.parentVersionId,
            scenario: args.scenario,
            feasibility_score: Math.round(proposal.feasibility.score),
            confidence_score: Math.round(proposal.confidence.score),
            confidence_reasons: [...proposal.confidence.reasons, ...proposal.feasibility.reasons],
            generated_by: "AI",
            prompt_version: args.promptVersion,
            model_alias: args.modelAlias,
            summary: proposal.summary,
        },
        strategies: proposal.strategies.map((s) => ({
            id: strategyIds.get(s.key),
            name: s.name,
            summary: s.summary,
            risk_level: s.riskLevel,
            effort_score: Math.round(s.effortScore),
            time_score: Math.round(s.timeScore),
            selected: s.key === recommendedKey,
            rationale: s.rationale,
            tradeoffs: s.tradeoffs,
        })),
        plan_nodes: nodes.map((n) => ({
            id: nodeIds.get(n.tempId),
            strategy_id: n.strategyKey ? strategyIds.get(n.strategyKey) : null,
            node_type: n.nodeType,
            title: n.title,
            description: n.description,
            status: "PENDING",
            depth: Math.round(n.depth),
            metadata: {
                impact: n.impact,
                urgency: n.urgency,
                effortCost: n.effortCost,
                successLikelihood: n.successLikelihood,
                tempId: n.tempId,
                expectedResult: n.expectedResult,
                ...(args.generationSource ? { aiGeneration: args.generationSource } : {}),
            },
        })),
        plan_edges: uniqueEdges.map((e) => ({
            from_node_id: nodeIds.get(e.from),
            to_node_id: nodeIds.get(e.to),
            edge_type: e.edgeType,
            hard_dependency: e.hardDependency,
            rationale: e.rationale,
        })),
        actions: nodes
            .filter((n) => n.nodeType === "ACTION" || n.nodeType === "EXPERIMENT")
            .map((n) => ({
                plan_node_id: nodeIds.get(n.tempId),
                completion_criteria: n.completionCriteria ?? "",
                expected_result: n.expectedResult,
                estimated_minutes: n.estimatedMinutes ? Math.round(n.estimatedMinutes) : null,
            })),
        assumptions: proposal.assumptions.map((a) => ({
            statement: a.statement,
            importance: a.importance,
            validation_action_node_id: a.validationNodeTempId
                ? (nodeIds.get(a.validationNodeTempId) ?? null)
                : null,
        })),
        risks: proposal.risks.map((r) => ({
            statement: r.statement,
            probability_band: r.probability,
            impact_band: r.impact,
            mitigation: r.mitigation,
        })),
        bottleneckId: proposal.bottleneckTempId ? nodeIds.get(proposal.bottleneckTempId) : null,
        bottleneckReason: proposal.bottleneckReason,
    };
    const result = assertOk(
        await args.supabase.rpc("persist_plan_graph", {
            target_plan_id: args.planId,
            payload: payload as never,
            activate: args.activate,
        }),
        "save plan graph",
    );
    return result as { versionId: string; versionNumber: number };
}

/** Compact text snapshot used as continuity context for replans and diffs. */
export function snapshotText(input: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    summary: string | null;
}) {
    const lines = [input.summary ? `Summary: ${input.summary}` : ""];
    const titleById = new Map(input.nodes.map((n) => [n.id, n.title]));
    for (const n of input.nodes) {
        const deps = input.edges
            .filter((e) => e.to_node_id === n.id && e.hard_dependency)
            .map((e) => titleById.get(e.from_node_id))
            .filter(Boolean);
        lines.push(
            `- [${n.node_type}/${n.status}] ${n.title}${deps.length ? ` (after: ${deps.join(", ")})` : ""}`,
        );
    }
    return lines.filter(Boolean).join("\n").slice(0, 12000);
}

export function diffPlanNodes(input: {
    userId: string;
    planId: string;
    fromVersionId: string;
    toVersionId: string;
    beforeNodes: GraphNode[];
    afterNodes: GraphNode[];
    reasonCode: string;
}) {
    const keyFor = (node: GraphNode) => `${node.node_type}:${node.title.trim().toLowerCase()}`;
    const before = new Map(input.beforeNodes.map((node) => [keyFor(node), node]));
    const after = new Map(input.afterNodes.map((node) => [keyFor(node), node]));
    const rows: Array<{
        user_id: string;
        plan_id: string;
        from_version_id: string;
        to_version_id: string;
        entity_type: string;
        entity_id: string | null;
        change_type: string;
        before_summary: string | null;
        after_summary: string | null;
        reason_code: string;
    }> = [];

    for (const [key, node] of after) {
        const previous = before.get(key);
        if (!previous) {
            rows.push({
                user_id: input.userId,
                plan_id: input.planId,
                from_version_id: input.fromVersionId,
                to_version_id: input.toVersionId,
                entity_type: node.node_type,
                entity_id: node.id,
                change_type: "ADDED",
                before_summary: null,
                after_summary: node.title,
                reason_code: input.reasonCode,
            });
            continue;
        }

        if (
            previous.description !== node.description ||
            previous.status !== node.status ||
            previous.priority_score !== node.priority_score
        ) {
            rows.push({
                user_id: input.userId,
                plan_id: input.planId,
                from_version_id: input.fromVersionId,
                to_version_id: input.toVersionId,
                entity_type: node.node_type,
                entity_id: node.id,
                change_type: "MODIFIED",
                before_summary: previous.title,
                after_summary: node.title,
                reason_code: input.reasonCode,
            });
        }
    }

    for (const [key, node] of before) {
        if (after.has(key)) continue;
        rows.push({
            user_id: input.userId,
            plan_id: input.planId,
            from_version_id: input.fromVersionId,
            to_version_id: input.toVersionId,
            entity_type: node.node_type,
            entity_id: node.id,
            change_type: "REMOVED",
            before_summary: node.title,
            after_summary: null,
            reason_code: input.reasonCode,
        });
    }

    return rows.slice(0, 50);
}

export async function nextVersionNumber(supabase: Client, planId: string) {
    const { data } = await supabase
        .from("plan_versions")
        .select("version_number")
        .eq("plan_id", planId)
        .order("version_number", { ascending: false })
        .limit(1);
    return (data?.[0]?.version_number ?? 0) + 1;
}
