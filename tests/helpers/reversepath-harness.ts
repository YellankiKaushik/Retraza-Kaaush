import { mockIntakeAnalysis, mockPlanProposal } from "@/ai/mock-provider.server";
import type { IntakeAnalysis, PlanProposal } from "@/ai/plan-contract";
import { computeFrontier } from "@/domain/frontier";
import type { GraphEdge, GraphNode, NodeStatus } from "@/domain/types";
import { diffPlanNodes, validateProposal } from "@/lib/planner.server";

type CaseStatus = "NEEDS_CLARIFICATION" | "READY_FOR_PLANNING" | "PLANNED" | "REJECTED";

interface IntakeCase {
    id: string;
    userId: string;
    rawText: string;
    analysis: IntakeAnalysis;
    status: CaseStatus;
    facts: Array<{ key: string; value: string }>;
}

interface PlanVersion {
    id: string;
    planId: string;
    userId: string;
    versionNumber: number;
    state: "ACTIVE" | "CANDIDATE" | "SUPERSEDED" | "REJECTED";
    proposal: PlanProposal;
    nodes: GraphNode[];
    edges: GraphEdge[];
    changes: ReturnType<typeof diffPlanNodes>;
}

interface Plan {
    id: string;
    caseId: string;
    userId: string;
    activeVersionId: string | null;
    versions: PlanVersion[];
    checkIns: Array<{ note: string; changedFacts: Array<{ key: string; value: string }> }>;
}

let seq = 0;
function id(prefix: string) {
    seq += 1;
    return `${prefix}-${seq}`;
}

function persistGraph(versionId: string, proposal: PlanProposal) {
    const validated = validateProposal(proposal);
    const nodeIdByTemp = new Map<string, string>();
    const nodes = validated.nodes.map((node) => {
        const nodeId = `${versionId}-${node.tempId}`;
        nodeIdByTemp.set(node.tempId, nodeId);
        return {
            id: nodeId,
            node_type: node.nodeType,
            title: node.title,
            description: node.description,
            status: "PENDING" as NodeStatus,
            priority_score: null,
            depth: Math.round(node.depth),
            strategy_id: node.strategyKey,
            metadata: {
                impact: node.impact,
                urgency: node.urgency,
                effortCost: node.effortCost,
                successLikelihood: node.successLikelihood,
                expectedResult: node.expectedResult,
            },
        };
    });
    const edges = validated.edges.map((edge, index) => ({
        id: `${versionId}-edge-${index}`,
        from_node_id: nodeIdByTemp.get(edge.from)!,
        to_node_id: nodeIdByTemp.get(edge.to)!,
        edge_type: edge.edgeType,
        hard_dependency: edge.hardDependency,
        rationale: edge.rationale,
    }));
    return { nodes, edges };
}

export class ReversePathHarness {
    private readonly cases = new Map<string, IntakeCase>();
    private readonly plans = new Map<string, Plan>();

    createIntake(userId: string, rawText: string) {
        const analysis = mockIntakeAnalysis({ rawText });
        const status = analysis.questions.length > 0 ? "NEEDS_CLARIFICATION" : "READY_FOR_PLANNING";
        const created: IntakeCase = {
            id: id("case"),
            userId,
            rawText,
            analysis,
            status,
            facts: [],
        };
        this.cases.set(created.id, created);
        return created;
    }

    submitClarification(
        userId: string,
        caseId: string,
        answers: Array<{ key: string; value: string }>,
    ) {
        const intake = this.requireCase(userId, caseId);
        intake.facts.push(...answers);
        intake.status = "READY_FOR_PLANNING";
        return intake;
    }

    generatePlan(userId: string, caseId: string) {
        const intake = this.requireCase(userId, caseId);
        const proposal = mockPlanProposal({
            rawText: intake.rawText,
            objective: {
                title: intake.analysis.normalizedObjective.title,
                desiredOutcome: intake.analysis.normalizedObjective.desiredOutcome,
                successCriteria: intake.analysis.normalizedObjective.successCriteria,
            },
        });
        const plan: Plan = {
            id: id("plan"),
            caseId,
            userId,
            activeVersionId: null,
            versions: [],
            checkIns: [],
        };
        const version = this.createVersion(plan, proposal, null, "ACTIVE");
        plan.activeVersionId = version.id;
        plan.versions.push(version);
        this.plans.set(plan.id, plan);
        intake.status = "PLANNED";
        return plan;
    }

    activeVersion(userId: string, planId: string) {
        const plan = this.requirePlan(userId, planId);
        const version = plan.versions.find((item) => item.id === plan.activeVersionId);
        if (!version) throw new Error("No active version");
        return version;
    }

    frontier(userId: string, planId: string) {
        const version = this.activeVersion(userId, planId);
        return computeFrontier(version.nodes, version.edges);
    }

    completeAction(userId: string, planId: string, titleIncludes: string) {
        const version = this.activeVersion(userId, planId);
        const node = version.nodes.find(
            (item) => item.node_type === "ACTION" && item.title.includes(titleIncludes),
        );
        if (!node) throw new Error("Action not found");
        node.status = "DONE";
        return node;
    }

    checkIn(
        userId: string,
        planId: string,
        note: string,
        changedFacts: Array<{ key: string; value: string }>,
    ) {
        const plan = this.requirePlan(userId, planId);
        plan.checkIns.push({ note, changedFacts });
        return { suggestsReplan: changedFacts.length > 0 };
    }

    proposeReplan(userId: string, planId: string) {
        const plan = this.requirePlan(userId, planId);
        const before = this.activeVersion(userId, planId);
        const intake = this.requireCase(userId, plan.caseId);
        const proposal = mockPlanProposal({
            rawText: intake.rawText,
            objective: {
                title: intake.analysis.normalizedObjective.title,
                desiredOutcome: intake.analysis.normalizedObjective.desiredOutcome,
                successCriteria: intake.analysis.normalizedObjective.successCriteria,
            },
            replan: true,
        });
        const candidate = this.createVersion(plan, proposal, before.id, "CANDIDATE");
        candidate.changes = diffPlanNodes({
            userId,
            planId,
            fromVersionId: before.id,
            toVersionId: candidate.id,
            beforeNodes: before.nodes,
            afterNodes: candidate.nodes,
            reasonCode: "CIRCUMSTANCE_CHANGED",
        });
        plan.versions.push(candidate);
        return candidate;
    }

    acceptVersion(userId: string, planId: string, versionId: string) {
        const plan = this.requirePlan(userId, planId);
        const target = plan.versions.find(
            (version) => version.id === versionId && version.state === "CANDIDATE",
        );
        if (!target) throw new Error("Candidate not found");
        for (const version of plan.versions) {
            if (version.state === "ACTIVE") version.state = "SUPERSEDED";
        }
        target.state = "ACTIVE";
        plan.activeVersionId = target.id;
    }

    rejectVersion(userId: string, planId: string, versionId: string) {
        const plan = this.requirePlan(userId, planId);
        const target = plan.versions.find(
            (version) => version.id === versionId && version.state === "CANDIDATE",
        );
        if (!target) throw new Error("Candidate not found");
        target.state = "REJECTED";
    }

    bundle(userId: string, caseId: string) {
        const intake = this.requireCase(userId, caseId);
        const plan = [...this.plans.values()].find(
            (item) => item.caseId === caseId && item.userId === userId,
        );
        return { intake, plan: plan ?? null };
    }

    private createVersion(
        plan: Plan,
        proposal: PlanProposal,
        _parentVersionId: string | null,
        state: PlanVersion["state"],
    ): PlanVersion {
        const versionId = id("version");
        const graph = persistGraph(versionId, proposal);
        return {
            id: versionId,
            planId: plan.id,
            userId: plan.userId,
            versionNumber: plan.versions.length + 1,
            state,
            proposal,
            nodes: graph.nodes,
            edges: graph.edges,
            changes: [],
        };
    }

    private requireCase(userId: string, caseId: string) {
        const intake = this.cases.get(caseId);
        if (!intake || intake.userId !== userId) throw new Error("FORBIDDEN");
        return intake;
    }

    private requirePlan(userId: string, planId: string) {
        const plan = this.plans.get(planId);
        if (!plan || plan.userId !== userId) throw new Error("FORBIDDEN");
        return plan;
    }
}
