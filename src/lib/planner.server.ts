/**
 * CMP-PLAN-001 — Plan and Version Service.
 * Deterministic code owns persistence: it validates graph integrity, rejects
 * hard cycles, maps AI tempIds onto real UUIDs and controls version state.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { PlanProposal } from "@/ai/plan-contract";
import { computeFrontier, executionNodesForStrategy, findHardCycle } from "@/domain/frontier";
import type { GraphEdge, GraphNode } from "@/domain/types";
import type { Database } from "@/integrations/supabase/types";

type Client = SupabaseClient<Database>;
type Row<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];

export interface ReplanContext {
    versionId: string;
    planId: string;
    selectedStrategy: { key: string; name: string };
    strategies: Array<{ key: string; name: string; summary: string; selected: boolean }>;
    nodes: Array<{
        tempId: string;
        nodeType: GraphNode["node_type"];
        title: string;
        description: string;
        status: GraphNode["status"];
        strategyKey: string | null;
        completionCriteria: string | null;
        expectedResult: string | null;
        completedAt: string | null;
        result: Row<"actions">["result"];
    }>;
    edges: PlanProposal["edges"];
}

/** Only owner-scoped ACTIVE graph rows may supply continuity or completion evidence. */
export function buildReplanContext(input: {
    planId: string;
    userId: string;
    versionId: string;
    version: Pick<
        Row<"plan_versions">,
        "id" | "plan_id" | "user_id" | "state" | "parent_version_id"
    >;
    nodes: Row<"plan_nodes">[];
    edges: Row<"plan_edges">[];
    strategies: Row<"strategies">[];
    actions: Row<"actions">[];
}): ReplanContext {
    const invalid = () =>
        new DomainError(
            "PLAN_VALIDATION_FAILED",
            "The accepted plan context is inconsistent. Refresh before replanning.",
            "version-relationship",
        );
    if (
        input.version.id !== input.versionId ||
        input.version.plan_id !== input.planId ||
        input.version.user_id !== input.userId ||
        input.version.state !== "ACTIVE" ||
        input.version.parent_version_id === input.versionId
    )
        throw invalid();
    for (const rows of [input.nodes, input.edges, input.strategies])
        if (
            rows.some(
                (row) => row.user_id !== input.userId || row.plan_version_id !== input.versionId,
            )
        )
            throw invalid();
    if (input.actions.some((action) => action.user_id !== input.userId)) throw invalid();
    const selected = input.strategies.filter((strategy) => strategy.selected);
    if (selected.length !== 1 || !input.nodes.length) throw invalid();
    const strategyKeys = new Map(
        input.strategies.map((strategy) => {
            const member = input.nodes.find((node) => node.strategy_id === strategy.id);
            const metadata = member?.metadata as Record<string, unknown> | null;
            return [
                strategy.id,
                typeof metadata?.["strategyKey"] === "string"
                    ? metadata["strategyKey"]
                    : strategy.id,
            ];
        }),
    );
    const ids = new Map(
        input.nodes.map((node) => {
            const metadata = node.metadata as Record<string, unknown> | null;
            return [
                node.id,
                typeof metadata?.["tempId"] === "string" ? metadata["tempId"] : node.id,
            ];
        }),
    );
    if (
        new Set(ids.values()).size !== input.nodes.length ||
        input.actions.some((action) => !ids.has(action.plan_node_id))
    )
        throw invalid();
    const actions = new Map(input.actions.map((action) => [action.plan_node_id, action]));
    return {
        versionId: input.versionId,
        planId: input.planId,
        selectedStrategy: { key: strategyKeys.get(selected[0]!.id)!, name: selected[0]!.name },
        strategies: input.strategies.map((strategy) => ({
            key: strategyKeys.get(strategy.id)!,
            name: strategy.name,
            summary: strategy.summary,
            selected: strategy.selected,
        })),
        nodes: input.nodes.map((node) => {
            const action = actions.get(node.id);
            if ((node.node_type === "ACTION" || node.node_type === "EXPERIMENT") && !action)
                throw invalid();
            if (node.strategy_id && !strategyKeys.has(node.strategy_id)) throw invalid();
            return {
                tempId: ids.get(node.id)!,
                nodeType: node.node_type,
                title: node.title,
                description: node.description,
                status: node.status,
                strategyKey: node.strategy_id ? strategyKeys.get(node.strategy_id)! : null,
                completionCriteria: action?.completion_criteria ?? null,
                expectedResult: action?.expected_result ?? null,
                completedAt: action?.completed_at ?? null,
                result: action?.result ?? null,
            };
        }),
        edges: input.edges.map((edge) => {
            if (!ids.has(edge.from_node_id) || !ids.has(edge.to_node_id)) throw invalid();
            return {
                from: ids.get(edge.from_node_id)!,
                to: ids.get(edge.to_node_id)!,
                edgeType: edge.edge_type,
                hardDependency: edge.hard_dependency,
                rationale: edge.rationale,
            };
        }),
    };
}

export function selectedReplanStrategy(proposal: PlanProposal, context: ReplanContext) {
    const selected = proposal.strategies.find(
        (strategy) =>
            strategy.key === context.selectedStrategy.key &&
            strategy.name === context.selectedStrategy.name,
    );
    if (!selected)
        throw new DomainError(
            "PLAN_VALIDATION_FAILED",
            "A revised plan must preserve the selected strategy for your review.",
            "strategy-selection",
        );
    return selected.key;
}

/** AI cannot erase verified completion, or silently remove still-retained hard prerequisites. */
export function validateReplanContinuity(proposal: PlanProposal, context: ReplanContext) {
    selectedReplanStrategy(proposal, context);
    const byId = new Map(proposal.nodes.map((node) => [node.tempId, node]));
    for (const previous of context.nodes) {
        if (previous.status !== "DONE" && previous.status !== "IN_PROGRESS") continue;
        const next = byId.get(previous.tempId);
        if (
            !next ||
            next.nodeType !== previous.nodeType ||
            next.title !== previous.title ||
            next.completionCriteria !== previous.completionCriteria ||
            next.expectedResult !== previous.expectedResult ||
            next.strategyKey !== previous.strategyKey
        )
            throw new DomainError(
                "PLAN_VALIDATION_FAILED",
                "A revised plan must preserve completed and in-progress work unchanged.",
                "progress-preservation",
            );
    }
    for (const edge of context.edges) {
        if (!edge.hardDependency || !byId.has(edge.from) || !byId.has(edge.to)) continue;
        if (
            !proposal.edges.some(
                (next) =>
                    next.from === edge.from &&
                    next.to === edge.to &&
                    next.edgeType === edge.edgeType &&
                    next.hardDependency,
            )
        )
            throw new DomainError(
                "PLAN_VALIDATION_FAILED",
                "A revised plan lost an existing hard prerequisite between retained steps.",
                "prerequisite-preservation",
            );
    }
}

export class DomainError extends Error {
    constructor(
        public code: string,
        message: string,
        public validationRule?: string,
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
export function validateProposal(
    proposal: PlanProposal,
    requireCompactProfile = false,
    continuity?: ReplanContext,
) {
    if (
        proposal.nodes.some((node) => !node.tempId.trim()) ||
        proposal.strategies.some((strategy) => !strategy.key.trim())
    )
        throw new DomainError(
            "PLAN_VALIDATION_FAILED",
            "Node and strategy identifiers cannot be empty.",
        );
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
            "duplicate-node",
        );

    for (const edge of proposal.edges) {
        if (!ids.has(edge.from) || !ids.has(edge.to))
            throw new DomainError(
                "PLAN_VALIDATION_FAILED",
                "The proposed plan references a dependency node that does not exist.",
                "dangling-edge",
            );
        if (edge.from === edge.to)
            throw new DomainError(
                "PLAN_VALIDATION_FAILED",
                "The proposed plan contains a self-referential dependency.",
                "dependency-self",
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
            "strategy-selection",
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
            "dependency-cycle",
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

    for (const assumption of proposal.assumptions) {
        if (!assumption.validationNodeTempId) continue;
        const validator = nodes.find((node) => node.tempId === assumption.validationNodeTempId);
        if (!validator)
            throw new DomainError(
                "PLAN_VALIDATION_FAILED",
                "An assumption validation link must reference an existing plan node.",
                "assumption-validator",
            );
    }

    if (requireCompactProfile && !proposal.blocker) {
        const recommendedKey = recommended[0]?.key;
        const milestones = nodes.filter(
            (node) => node.nodeType === "MILESTONE" && node.strategyKey === recommendedKey,
        );
        const checks: Array<[boolean, string, string]> = [
            [proposal.strategies.length === 2, "exactly two strategies", "strategy-count"],
            [
                milestones.length >= 3 && milestones.length <= 5,
                "three to five recommended milestones",
                "milestone-count",
            ],
            [
                executable.length >= 6 && executable.length <= 12,
                "six to twelve executable nodes",
                "executable-count",
            ],
            [
                nodes.length <= 24 && edges.length <= 48,
                "at most 24 nodes and 48 edges",
                "graph-size",
            ],
            [
                proposal.strategies.every((strategy) =>
                    executable.some((node) => node.strategyKey === strategy.key),
                ),
                "an executable branch for each strategy",
                "strategy-branch",
            ],
            [
                proposal.assumptions.length >= 3 && proposal.assumptions.length <= 5,
                "three to five assumptions",
                "assumptions-count",
            ],
            [
                proposal.risks.length >= 3 && proposal.risks.length <= 5,
                "three to five risks",
                "risks-count",
            ],
            [
                proposal.assumptions.every(
                    (assumption) =>
                        assumption.importance !== "HIGH" ||
                        executable.some((node) => node.tempId === assumption.validationNodeTempId),
                ),
                "an action or experiment validating every high-importance assumption",
                "assumption-validator",
            ],
        ];
        for (const [valid, requirement, rule] of checks)
            if (!valid)
                throw new DomainError(
                    "PLAN_VALIDATION_FAILED",
                    "The live plan must include " + requirement + ".",
                    rule,
                );

        const connected = new Set([objectives[0]!.tempId]);
        for (let index = 0; index < nodes.length; index++)
            for (const edge of edges)
                if (connected.has(edge.from) || connected.has(edge.to)) {
                    connected.add(edge.from);
                    connected.add(edge.to);
                }
        if (connected.size !== nodes.length)
            throw new DomainError(
                "PLAN_VALIDATION_FAILED",
                "Every live plan node must connect to the objective graph.",
                "orphan-node",
            );
        if (proposal.assumptions.some((assumption) => !assumption.statement.trim()))
            throw new DomainError(
                "PLAN_VALIDATION_FAILED",
                "Assumptions must state a verifiable condition.",
                "assumptions-content",
            );
        if (proposal.risks.some((risk) => !risk.statement.trim() || !risk.mitigation.trim()))
            throw new DomainError(
                "PLAN_VALIDATION_FAILED",
                "Risks require a statement and mitigation.",
                "risks-content",
            );
    }

    if (continuity) validateReplanContinuity(proposal, continuity);
    if (requireCompactProfile && !proposal.blocker)
        validateExecutableProposal(proposal, continuity);
    return { nodes, edges };
}

function previousUnchanged(node: PlanProposal["nodes"][number], context?: ReplanContext) {
    const previous = context?.nodes.find((item) => item.tempId === node.tempId);
    return previous?.nodeType === node.nodeType &&
        previous.title === node.title &&
        previous.completionCriteria === node.completionCriteria &&
        previous.expectedResult === node.expectedResult &&
        previous.strategyKey === node.strategyKey
        ? previous
        : undefined;
}

function validateExecutableProposal(proposal: PlanProposal, context?: ReplanContext) {
    const selected = context
        ? selectedReplanStrategy(proposal, context)
        : (proposal.strategies.find((strategy) => strategy.recommended)?.key ?? null);
    const graphNodes: GraphNode[] = proposal.nodes.map((node) => ({
        id: node.tempId,
        node_type: node.nodeType,
        title: node.title,
        description: node.description,
        status: previousUnchanged(node, context)?.status ?? "PENDING",
        priority_score: null,
        depth: node.depth,
        strategy_id: node.strategyKey,
        metadata: {},
    }));
    const graphEdges: GraphEdge[] = proposal.edges.map((edge, index) => ({
        id: String(index),
        from_node_id: edge.from,
        to_node_id: edge.to,
        edge_type: edge.edgeType,
        hard_dependency: edge.hardDependency,
        rationale: edge.rationale,
    }));
    const execution = executionNodesForStrategy(graphNodes, graphEdges, selected);
    const incomplete = execution.some(
        (node) =>
            ["ACTION", "EXPERIMENT"].includes(node.node_type) &&
            !["DONE", "SKIPPED", "CANCELLED"].includes(node.status),
    );
    if (incomplete && !computeFrontier(execution, graphEdges).ready.length)
        throw new DomainError(
            "PLAN_VALIDATION_FAILED",
            "The selected strategy has no executable next step. Identify an explicit blocker instead.",
            "executable-frontier",
        );
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
    continuity?: ReplanContext;
}

/** Validate in application code, then commit the entire graph in one transaction. */
export async function persistProposal(args: PersistArgs) {
    const { proposal } = args;
    const { nodes, edges } = validateProposal(
        proposal,
        Boolean(args.generationSource && args.generationSource.provider !== "mock"),
        args.continuity,
    );
    if (
        args.strategyPreference &&
        !proposal.strategies.some((strategy) => strategy.key === args.strategyPreference)
    )
        throw new DomainError(
            "PLAN_VALIDATION_FAILED",
            "The selected strategy does not exist in this proposal.",
            "strategy-selection",
        );
    if (args.continuity) {
        if (
            args.activate ||
            args.parentVersionId !== args.continuity.versionId ||
            args.planId !== args.continuity.planId
        )
            throw new DomainError(
                "PLAN_VALIDATION_FAILED",
                "A replan must be a candidate of the accepted version in this plan.",
                "version-relationship",
            );
        validateReplanContinuity(proposal, args.continuity);
    }
    const recommendedKey =
        (args.continuity ? selectedReplanStrategy(proposal, args.continuity) : null) ??
        (args.strategyPreference &&
            proposal.strategies.find((s) => s.key === args.strategyPreference)?.key) ??
        proposal.strategies.find((s) => s.recommended)?.key ??
        proposal.strategies[0]?.key ??
        null;
    const unchanged = (node: PlanProposal["nodes"][number]) =>
        previousUnchanged(node, args.continuity);
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
            status: unchanged(n)?.status ?? "PENDING",
            depth: Math.round(n.depth),
            metadata: {
                impact: n.impact,
                urgency: n.urgency,
                effortCost: n.effortCost,
                successLikelihood: n.successLikelihood,
                tempId: n.tempId,
                strategyKey: n.strategyKey,
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
                completed_at: unchanged(n)?.completedAt ?? null,
                result: unchanged(n)?.result ?? null,
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
