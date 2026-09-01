/**
 * CMP-DOMAIN-001 — Universal Reasoning Domain.
 * Pure domain types and rules. No AI provider, no UI, no infrastructure imports.
 */

export const INTENT_TYPES = [
    "GOAL",
    "DESIRE",
    "PROBLEM",
    "DECISION",
    "UNCERTAINTY",
    "PROJECT",
    "HABIT",
    "LEARNING",
    "CRISIS",
    "QUESTION",
    "OTHER",
] as const;
export type IntentType = (typeof INTENT_TYPES)[number];

export const NODE_TYPES = [
    "OBJECTIVE",
    "OUTCOME",
    "REQUIREMENT",
    "RESOURCE",
    "CONSTRAINT",
    "GAP",
    "STRATEGY",
    "MILESTONE",
    "ACTION",
    "EXPERIMENT",
    "ASSUMPTION",
    "RISK",
    "EVIDENCE",
    "BLOCKER",
    "METRIC",
] as const;
export type NodeType = (typeof NODE_TYPES)[number];

export const EDGE_TYPES = [
    "REQUIRES",
    "ENABLES",
    "BLOCKED_BY",
    "SUPPORTS",
    "CONFLICTS_WITH",
    "VALIDATES",
    "MITIGATES",
    "DERIVED_FROM",
    "PART_OF",
    "PRECEDES",
    "ALTERNATIVE_TO",
] as const;
export type EdgeType = (typeof EDGE_TYPES)[number];

export const NODE_STATUSES = [
    "PENDING",
    "READY",
    "IN_PROGRESS",
    "DONE",
    "BLOCKED",
    "SKIPPED",
    "DEFERRED",
    "CANCELLED",
] as const;
export type NodeStatus = (typeof NODE_STATUSES)[number];

export const SCENARIOS = ["CONSERVATIVE", "BALANCED", "AGGRESSIVE"] as const;
export type Scenario = (typeof SCENARIOS)[number];

export const BANDS = ["LOW", "MEDIUM", "HIGH"] as const;
export type Band = (typeof BANDS)[number];

export const FACT_CATEGORIES = ["RESOURCE", "CONSTRAINT", "PREFERENCE", "FACT", "MEASURE"] as const;
export type FactCategory = (typeof FACT_CATEGORIES)[number];

export type CaseStatus =
    "DRAFT" | "NEEDS_CLARIFICATION" | "READY_FOR_PLANNING" | "PLANNED" | "ARCHIVED" | "REJECTED";

export type VersionState = "CANDIDATE" | "ACTIVE" | "SUPERSEDED" | "REJECTED";

/** Node types that can appear on the executable frontier (BR-010, FR-015). */
export const EXECUTABLE_NODE_TYPES: NodeType[] = ["ACTION", "EXPERIMENT"];

/** Hard, ordering / gating relationships evaluated by the frontier algorithm. */
export const HARD_EDGE_TYPES: EdgeType[] = ["REQUIRES", "PRECEDES", "BLOCKED_BY"];

export const TERMINAL_STATUSES: NodeStatus[] = ["DONE", "SKIPPED", "CANCELLED"];

export const NODE_TYPE_LABEL: Record<NodeType, string> = {
    OBJECTIVE: "Objective",
    OUTCOME: "Outcome",
    REQUIREMENT: "Requirement",
    RESOURCE: "Resource",
    CONSTRAINT: "Constraint",
    GAP: "Gap",
    STRATEGY: "Strategy",
    MILESTONE: "Milestone",
    ACTION: "Action",
    EXPERIMENT: "Experiment",
    ASSUMPTION: "Assumption",
    RISK: "Risk",
    EVIDENCE: "Evidence",
    BLOCKER: "Blocker",
    METRIC: "Metric",
};

export const INTENT_TYPE_LABEL: Record<IntentType, string> = {
    GOAL: "Goal",
    DESIRE: "Desire",
    PROBLEM: "Problem",
    DECISION: "Decision",
    UNCERTAINTY: "Uncertainty",
    PROJECT: "Project",
    HABIT: "Habit",
    LEARNING: "Learning",
    CRISIS: "Crisis",
    QUESTION: "Question",
    OTHER: "Other",
};

export interface GraphNode {
    id: string;
    node_type: NodeType;
    title: string;
    description: string;
    status: NodeStatus;
    priority_score: number | null;
    depth: number;
    strategy_id: string | null;
    metadata: Record<string, unknown>;
}

export interface GraphEdge {
    id: string;
    from_node_id: string;
    to_node_id: string;
    edge_type: EdgeType;
    hard_dependency: boolean;
    rationale: string | null;
}

export interface FrontierCandidate {
    node: GraphNode;
    score: number;
    reasons: string[];
    blockedBy: GraphNode[];
}
