import { describe, expect, it } from "vitest";

import type { PlanProposal } from "@/ai/plan-contract";
import { DomainError, validateProposal } from "@/lib/planner.server";

function validProposal(overrides: Partial<PlanProposal> = {}): PlanProposal {
    return {
        normalizedObjective: {
            title: "Build a portfolio",
            desiredOutcome: "Publish enough proof of work to apply for junior roles.",
            successCriteria: ["Two public case studies are complete"],
            timeHorizon: "10 weeks",
        },
        strategies: [
            {
                key: "focused",
                name: "Focused portfolio",
                summary: "Build two narrow projects.",
                riskLevel: "LOW",
                effortScore: 4,
                timeScore: 4,
                rationale: "Best path under limited time.",
                tradeoffs: ["Less breadth"],
                recommended: true,
            },
            {
                key: "broad",
                name: "Broad sampling",
                summary: "Try several project types first.",
                riskLevel: "MEDIUM",
                effortScore: 7,
                timeScore: 8,
                rationale: "Better if the user is unsure about specialization.",
                tradeoffs: ["More time"],
                recommended: false,
            },
        ],
        nodes: [
            {
                tempId: "objective",
                nodeType: "OBJECTIVE",
                title: "Publish portfolio",
                description: "The desired outcome.",
                strategyKey: null,
                depth: 0,
                impact: 5,
                urgency: 3,
                effortCost: 2,
                successLikelihood: 0.75,
                completionCriteria: null,
                expectedResult: null,
                estimatedMinutes: null,
            },
            {
                tempId: "action",
                nodeType: "ACTION",
                title: "Draft the first case study outline",
                description: "Write the sections and evidence needed for the first project.",
                strategyKey: "focused",
                depth: 2,
                impact: 4,
                urgency: 4,
                effortCost: 1,
                successLikelihood: 0.9,
                completionCriteria: "A section-by-section outline exists.",
                expectedResult: "A clear writing plan for the case study.",
                estimatedMinutes: 60,
            },
        ],
        edges: [
            {
                from: "action",
                to: "objective",
                edgeType: "REQUIRES",
                hardDependency: true,
                rationale: "The portfolio requires at least one written case study.",
            },
        ],
        assumptions: [
            {
                statement: "The user can spend at least three hours per week.",
                importance: "MEDIUM",
                validationNodeTempId: null,
            },
        ],
        risks: [
            {
                statement: "The project scope may expand.",
                probability: "MEDIUM",
                impact: "MEDIUM",
                mitigation: "Keep the first case study narrow.",
            },
        ],
        bottleneckTempId: "action",
        bottleneckReason: "No published proof exists yet.",
        feasibility: { score: 72, level: "MEDIUM", reasons: ["The first step is concrete."] },
        confidence: { score: 78, reasons: ["Enough context to begin."] },
        summary: "A focused portfolio plan.",
        blocker: null,
        ...overrides,
    };
}

function expectDomainFailure(fn: () => unknown, message: RegExp) {
    expect(fn).toThrow(DomainError);
    expect(fn).toThrow(message);
}

describe("validateProposal", () => {
    it("accepts a graph with one objective, strategies, dependencies and an executable action", () => {
        const validated = validateProposal(validProposal());

        expect(validated.nodes).toHaveLength(2);
        expect(validated.edges).toHaveLength(1);
    });

    it("rejects missing objective nodes", () => {
        const proposal = validProposal({
            nodes: validProposal().nodes.filter((node) => node.nodeType !== "OBJECTIVE"),
        });

        expectDomainFailure(() => validateProposal(proposal), /exactly one objective/i);
    });

    it("rejects unknown dependency references instead of dropping them", () => {
        const proposal = validProposal({
            edges: [
                {
                    from: "missing",
                    to: "objective",
                    edgeType: "REQUIRES",
                    hardDependency: true,
                    rationale: null,
                },
            ],
        });

        expectDomainFailure(() => validateProposal(proposal), /does not exist/i);
    });

    it("rejects hard dependency cycles", () => {
        const base = validProposal();
        const proposal = validProposal({
            edges: [
                ...base.edges,
                {
                    from: "objective",
                    to: "action",
                    edgeType: "REQUIRES",
                    hardDependency: true,
                    rationale: "Creates a cycle.",
                },
            ],
        });

        expectDomainFailure(() => validateProposal(proposal), /circular dependency/i);
    });

    it("rejects vague executable nodes", () => {
        const base = validProposal();
        const proposal = validProposal({
            nodes: base.nodes.map((node) =>
                node.tempId === "action" ? { ...node, completionCriteria: null } : node,
            ),
        });

        expectDomainFailure(() => validateProposal(proposal), /completion criteria/i);
    });
});
