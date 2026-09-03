/**
 * Executable frontier + deterministic ranking (CMP-DOMAIN-001).
 *
 * Scores are heuristics, not probabilities. The UI must label them as such and
 * always expose the reasons that produced them.
 */
import {
    EXECUTABLE_NODE_TYPES,
    HARD_EDGE_TYPES,
    TERMINAL_STATUSES,
    type FrontierCandidate,
    type GraphEdge,
    type GraphNode,
} from "./types";

const EPSILON = 0.25;

interface Weights {
    impact: number;
    successLikelihood: number;
    urgency: number;
    effortCost: number;
}

function readWeights(node: GraphNode): Weights {
    const m = node.metadata ?? {};
    const num = (key: string, fallback: number) => {
        const raw = (m as Record<string, unknown>)[key];
        const n = typeof raw === "number" ? raw : Number(raw);
        return Number.isFinite(n) && n > 0 ? n : fallback;
    };
    return {
        impact: num("impact", 3),
        successLikelihood: num("successLikelihood", 0.7),
        urgency: num("urgency", 3),
        effortCost: num("effortCost", 2),
    };
}

/** How many other nodes become unblocked once this node completes. */
export function dependencyLeverage(nodeId: string, edges: GraphEdge[]): number {
    const direct = edges.filter(
        (e) => e.from_node_id === nodeId && HARD_EDGE_TYPES.includes(e.edge_type),
    ).length;
    const enabling = edges.filter(
        (e) => e.from_node_id === nodeId && (e.edge_type === "ENABLES" || e.edge_type === "PART_OF"),
    ).length;
    return 1 + direct + enabling * 0.5;
}

/** BR-004 — reject hard dependency cycles. Returns the first cycle found. */
export function findHardCycle(nodes: GraphNode[], edges: GraphEdge[]): string[] | null {
    const adjacency = new Map<string, string[]>();
    for (const node of nodes) adjacency.set(node.id, []);
    for (const edge of edges) {
        if (!edge.hard_dependency || !HARD_EDGE_TYPES.includes(edge.edge_type)) continue;
        adjacency.get(edge.from_node_id)?.push(edge.to_node_id);
    }

    const state = new Map<string, 0 | 1 | 2>();
    const stack: string[] = [];

    const visit = (id: string): string[] | null => {
        state.set(id, 1);
        stack.push(id);
        for (const next of adjacency.get(id) ?? []) {
            const s = state.get(next) ?? 0;
            if (s === 1) return [...stack.slice(stack.indexOf(next)), next];
            if (s === 0) {
                const cycle = visit(next);
                if (cycle) return cycle;
            }
        }
        stack.pop();
        state.set(id, 2);
        return null;
    };

    for (const node of nodes) {
        if ((state.get(node.id) ?? 0) === 0) {
            const cycle = visit(node.id);
            if (cycle) return cycle;
        }
    }
    return null;
}

/**
 * Executable Frontier Algorithm.
 * 1. select incomplete ACTION/EXPERIMENT nodes
 * 2. evaluate incoming hard REQUIRES / PRECEDES / BLOCKED_BY relationships
 * 3. exclude blocked candidates
 * 4. rank by impact x likelihood x urgency x leverage / effort
 */
export function computeFrontier(
    nodes: GraphNode[],
    edges: GraphEdge[],
): { ready: FrontierCandidate[]; blocked: FrontierCandidate[] } {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const candidates = nodes.filter(
        (n) =>
            EXECUTABLE_NODE_TYPES.includes(n.node_type) &&
            !TERMINAL_STATUSES.includes(n.status) &&
            n.status !== "DEFERRED",
    );

    const ready: FrontierCandidate[] = [];
    const blocked: FrontierCandidate[] = [];

    for (const node of candidates) {
        const prerequisiteEdges = edges.filter(
            (e) =>
                e.hard_dependency &&
                HARD_EDGE_TYPES.includes(e.edge_type) &&
                (e.edge_type === "BLOCKED_BY" ? e.from_node_id === node.id : e.to_node_id === node.id),
        );

        const unmet = prerequisiteEdges
            .map((e) => byId.get(e.edge_type === "BLOCKED_BY" ? e.to_node_id : e.from_node_id))
            .filter((n): n is GraphNode => !!n && n.status !== "DONE");

        const w = readWeights(node);
        const leverage = dependencyLeverage(node.id, edges);
        const score =
            (w.impact * w.successLikelihood * w.urgency * leverage) / Math.max(w.effortCost, EPSILON);

        const reasons: string[] = [];
        if (node.status === "IN_PROGRESS") reasons.push("Already in progress");
        if (leverage > 1.5) reasons.push(`Unblocks ${Math.round(leverage - 1)} downstream item(s)`);
        if (w.urgency >= 4) reasons.push("Time-sensitive");
        if (w.impact >= 4) reasons.push("High impact on the objective");
        if (w.effortCost <= 1.5) reasons.push("Low effort");
        if (node.node_type === "EXPERIMENT") reasons.push("Reversible test that reduces uncertainty");
        if (reasons.length === 0) reasons.push("All hard prerequisites are satisfied");

        const candidate: FrontierCandidate = {
            node,
            score: Math.round(score * 100) / 100,
            reasons,
            blockedBy: unmet,
        };

        if (unmet.length > 0 || node.status === "BLOCKED") blocked.push(candidate);
        else ready.push(candidate);
    }

    ready.sort((a, b) => b.score - a.score);
    blocked.sort((a, b) => b.score - a.score);
    return { ready, blocked };
}

export function progressOf(nodes: GraphNode[]): { done: number; total: number; percent: number } {
    const trackable = nodes.filter(
        (n) => EXECUTABLE_NODE_TYPES.includes(n.node_type) || n.node_type === "MILESTONE",
    );
    const done = trackable.filter((n) => n.status === "DONE").length;
    const total = trackable.length;
    return { done, total, percent: total === 0 ? 0 : Math.round((done / total) * 100) };
}
