import type { SemanticPlan } from "@/ai/semantic-plan.server";

/** Meaningful offline SDK fixture; never used by the application or a live test. */
export function semanticPlan(): SemanticPlan {
    const task = (key: string, title: string, criterion: string) => ({
        key,
        content: {
            source: "new" as const,
            nodeType: "ACTION" as const,
            title,
            description: title,
            impact: 4,
            urgency: 3,
            effortCost: 2,
            successLikelihood: 0.8,
            completionCriteria: criterion,
            expectedResult: criterion,
            estimatedMinutes: 60,
        },
        prerequisiteIndexes: [] as number[],
    });
    const strategy = (name: string, recommended: boolean) => ({
        name,
        summary: name,
        riskLevel: "MEDIUM" as const,
        effortScore: 4,
        timeScore: 4,
        rationale: recommended
            ? "Build demonstrable skills within available hours."
            : "Test an internal transition with existing colleagues.",
        tradeoffs: ["Limited weekly capacity"],
        recommended,
    });
    const baseline = task(
        "capacity",
        "Measure weekly study capacity",
        "Seven-day log contains ten feasible study hours",
    );
    return {
        normalizedObjective: {
            title: "Become a product manager",
            desiredOutcome: "Publish a PM portfolio and apply for roles",
            successCriteria: ["Publish one reviewed case study"],
            timeHorizon: "Six months",
        },
        strategies: [
            {
                ...strategy("Portfolio and feedback", true),
                milestones: [
                    {
                        key: "baseline",
                        title: "Assess capacity and target",
                        description: "Establish a feasible weekly schedule.",
                        work: [
                            baseline,
                            task(
                                "roles",
                                "Compare three PM role descriptions",
                                "Three roles compared against current skills",
                            ),
                        ],
                    },
                    {
                        key: "portfolio",
                        title: "Build portfolio evidence",
                        description: "Practice a real product analysis.",
                        work: [
                            {
                                ...task(
                                    "case-study",
                                    "Write one product case study",
                                    "Case study covers users metrics and tradeoffs",
                                ),
                                prerequisiteIndexes: [0, 1],
                            },
                        ],
                    },
                    {
                        key: "feedback",
                        title: "Validate and apply",
                        description: "Improve the portfolio using feedback.",
                        work: [
                            {
                                ...task(
                                    "review",
                                    "Ask two PMs to review the study",
                                    "Two review notes recorded",
                                ),
                                prerequisiteIndexes: [2],
                            },
                        ],
                    },
                ],
            },
            {
                ...strategy("Internal transition", false),
                milestones: [
                    {
                        key: "internal",
                        title: "Test internal opportunities",
                        description: "Find concrete PM-adjacent work.",
                        work: [
                            task(
                                "interview",
                                "Interview an internal product manager",
                                "One interview records transition requirements",
                            ),
                            {
                                ...task(
                                    "shadow",
                                    "Propose one product shadowing session",
                                    "Manager response and next step recorded",
                                ),
                                prerequisiteIndexes: [0],
                            },
                        ],
                    },
                ],
            },
        ],
        conditions: [
            {
                key: "capacity",
                nodeType: "CONSTRAINT",
                title: "Ten hours per week",
                description: "Full-time work limits available study time.",
            },
        ],
        assumptions: {
            first: {
                statement: "Ten weekly study hours are available.",
                strategy: "FIRST",
                importance: "HIGH",
                validator: { workIndex: 0 },
            },
            second: {
                statement: "A reviewer will be available.",
                strategy: "FIRST",
                importance: "MEDIUM",
                validator: null,
            },
            third: {
                statement: "An internal product team exists.",
                strategy: "SECOND",
                importance: "LOW",
                validator: null,
            },
            fourth: null,
            fifth: null,
        },
        risks: [
            {
                statement: "Weekly capacity falls",
                probability: "MEDIUM",
                impact: "HIGH",
                mitigation: "Reduce project scope, retain weekly review.",
            },
            {
                statement: "Feedback is delayed",
                probability: "MEDIUM",
                impact: "MEDIUM",
                mitigation: "Ask multiple reviewers.",
            },
            {
                statement: "No internal opportunity",
                probability: "MEDIUM",
                impact: "MEDIUM",
                mitigation: "Use portfolio strategy.",
            },
        ],
        feasibility: {
            score: 70,
            level: "MEDIUM",
            reasons: ["Ten hours weekly requires a bounded scope."],
        },
        confidence: { score: 70, reasons: ["Capacity and reviewer availability need testing."] },
        summary: "Build concrete PM evidence while testing internal opportunities.",
        bottleneck: { strategyIndex: 0, workIndex: 0 },
        bottleneckReason: "Verify weekly capacity before committing to the portfolio scope.",
        blocker: null,
    };
}
