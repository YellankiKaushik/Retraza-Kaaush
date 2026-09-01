import { describe, expect, it } from "vitest";

import { intakeAnalysisSchema, planProposalSchema } from "@/ai/plan-contract";

describe("intakeAnalysisSchema", () => {
    it("normalises bounded AI classification output", () => {
        const result = intakeAnalysisSchema.parse({
            intentType: "DECISION",
            intentConfidence: 1.4,
            normalizedObjective: {
                title: "Pick between two offers",
                desiredOutcome: "Decide which role has the better long-term fit.",
                successCriteria: ["Decision criteria are explicit"],
                timeHorizon: null,
            },
            clarity: {
                score: 0.82,
                missingCriticalInformation: ["Compensation details", "Preferred work style"],
            },
            policy: { supported: true, flags: [], reason: "" },
            questions: [
                {
                    key: "criteria",
                    question: "Which criteria matter most?",
                    why: "The recommendation depends on weighted criteria.",
                    category: "PREFERENCE",
                },
            ],
        });

        expect(result.intentConfidence).toBe(1);
        expect(result.clarity.score).toBe(82);
        expect(result.questions).toHaveLength(1);
    });
});

describe("planProposalSchema", () => {
    it("clamps scores and preserves structured planning entities", () => {
        const parsed = planProposalSchema.parse({
            normalizedObjective: {
                title: "Learn data analysis",
                desiredOutcome: "Build enough skill to complete a portfolio analysis.",
                successCriteria: ["Finish one portfolio project"],
                timeHorizon: "12 weeks",
            },
            strategies: [
                {
                    key: "course-first",
                    name: "Course first",
                    summary: "Use a structured course before project work.",
                    riskLevel: "LOW",
                    effortScore: 14,
                    timeScore: 6,
                    rationale: "Best fit for a beginner.",
                    tradeoffs: ["Slower first week"],
                    recommended: true,
                },
            ],
            nodes: [
                {
                    tempId: "objective",
                    nodeType: "OBJECTIVE",
                    title: "Learn data analysis",
                    description: "Target skill outcome",
                    strategyKey: null,
                    depth: 0,
                    impact: 5,
                    urgency: 3,
                    effortCost: 2,
                    successLikelihood: 0.8,
                    completionCriteria: null,
                    expectedResult: null,
                    estimatedMinutes: null,
                },
                {
                    tempId: "action-1",
                    nodeType: "ACTION",
                    title: "Install the tools",
                    description: "Install Python and the notebook environment.",
                    strategyKey: "course-first",
                    depth: 2,
                    impact: 3,
                    urgency: 5,
                    effortCost: 0.1,
                    successLikelihood: 1.2,
                    completionCriteria: "Python and notebooks open successfully.",
                    expectedResult: "A working local analysis environment.",
                    estimatedMinutes: 45,
                },
            ],
            edges: [
                {
                    from: "action-1",
                    to: "objective",
                    edgeType: "REQUIRES",
                    hardDependency: true,
                    rationale: "The skill path needs tools.",
                },
            ],
            assumptions: [],
            risks: [],
            bottleneckTempId: "action-1",
            bottleneckReason: "Tools are required before practice.",
            feasibility: { score: 0.7, level: "MEDIUM", reasons: ["Time is plausible."] },
            confidence: { score: 105, reasons: ["Enough starting context."] },
            summary: "A structured learning plan.",
            blocker: null,
        });

        expect(parsed.strategies[0]?.effortScore).toBe(10);
        expect(parsed.nodes[1]?.effortCost).toBe(0.5);
        expect(parsed.nodes[1]?.successLikelihood).toBe(1);
        expect(parsed.feasibility.score).toBe(70);
        expect(parsed.confidence.score).toBe(100);
    });
});
