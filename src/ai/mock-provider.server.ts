import {
    changeExplanationSchema,
    intakeAnalysisSchema,
    planProposalSchema,
    type ChangeExplanation,
    type IntakeAnalysis,
    type PlanProposal,
} from "./plan-contract";

function titleFrom(rawText: string) {
    const trimmed = rawText.trim().replace(/\s+/g, " ");
    if (!trimmed) return "Clarify the objective";
    return trimmed.length > 90 ? `${trimmed.slice(0, 87)}...` : trimmed;
}

function inferIntent(rawText: string): IntakeAnalysis["intentType"] {
    const text = rawText.toLowerCase();
    if (/\bshould\b|\bdecide\b|\bchoose\b/.test(text)) return "DECISION";
    if (/\bwhy\b|\bproblem\b|\bstuck\b|\bfailing\b|\bmiss/.test(text)) return "PROBLEM";
    if (/\blearn\b|\bstudy\b|\bskill\b/.test(text)) return "LEARNING";
    if (/\bhabit\b|\bevery day\b|\bdaily\b/.test(text)) return "HABIT";
    if (/\bproject\b|\blaunch\b|\bbuild\b/.test(text)) return "PROJECT";
    if (/\bwant\b|\bgoal\b|\bachieve\b|\breach\b/.test(text)) return "GOAL";
    return "OTHER";
}

export function mockIntakeAnalysis(input: { rawText: string }): IntakeAnalysis {
    const title = titleFrom(input.rawText);
    const ambiguous =
        input.rawText.length < 80 || /\bmaybe\b|\bnot sure\b|\bdon't know\b/i.test(input.rawText);

    return intakeAnalysisSchema.parse({
        intentType: inferIntent(input.rawText),
        intentConfidence: 0.82,
        normalizedObjective: {
            title,
            desiredOutcome: `Make measurable progress on: ${title}`,
            successCriteria: [
                "Define the desired outcome in observable terms",
                "Complete the first prerequisite action",
                "Review progress and adjust the plan with new information",
            ],
            timeHorizon: null,
        },
        clarity: {
            score: ambiguous ? 62 : 82,
            missingCriticalInformation: ambiguous
                ? ["Current baseline", "Available time or budget", "Primary constraint"]
                : ["Primary constraint"],
        },
        policy: { supported: true, flags: [], reason: "" },
        questions: ambiguous
            ? [
                  {
                      key: "current_baseline",
                      question: "What is your current baseline or starting point?",
                      why: "The first executable action depends on what is already true.",
                      category: "FACT",
                  },
                  {
                      key: "available_capacity",
                      question:
                          "What time, money, or energy can you realistically spend each week?",
                      why: "Capacity changes the feasible strategy and task size.",
                      category: "RESOURCE",
                  },
                  {
                      key: "main_constraint",
                      question: "What constraint is most likely to block this?",
                      why: "ReversePath needs the bottleneck before ranking next actions.",
                      category: "CONSTRAINT",
                  },
              ]
            : [],
    });
}

export function mockPlanProposal(input: {
    rawText: string;
    objective?: {
        title?: string | null;
        desiredOutcome?: string | null;
        successCriteria?: string[];
    };
    replan?: boolean;
}): PlanProposal {
    const title = input.objective?.title || titleFrom(input.rawText);
    const desiredOutcome =
        input.objective?.desiredOutcome || `Make measurable progress on: ${title}`;
    const suffix = input.replan ? " revised" : "";

    return planProposalSchema.parse({
        normalizedObjective: {
            title,
            desiredOutcome,
            successCriteria: input.objective?.successCriteria?.length
                ? input.objective.successCriteria
                : [
                      "Outcome is clear enough to measure",
                      "Critical dependency has been completed",
                      "Next review incorporates real progress",
                  ],
            timeHorizon: null,
        },
        strategies: [
            {
                key: "balanced",
                name: `Balanced${suffix} path`,
                summary: "Build clarity first, remove the nearest blocker, then scale effort.",
                riskLevel: "MEDIUM",
                effortScore: 5,
                timeScore: 5,
                rationale:
                    "This keeps momentum while exposing assumptions before heavy investment.",
                tradeoffs: [
                    "Moderate pace",
                    "Requires honest check-ins",
                    "May revise after first evidence",
                ],
                recommended: true,
            },
            {
                key: "conservative",
                name: "Conservative proof path",
                summary: "Run a small experiment before committing significant time or money.",
                riskLevel: "LOW",
                effortScore: 3,
                timeScore: 6,
                rationale: "Useful when the objective is still uncertain or resources are tight.",
                tradeoffs: ["Lower risk", "Slower payoff", "May feel less ambitious"],
                recommended: false,
            },
        ],
        nodes: [
            {
                tempId: "objective",
                nodeType: "OBJECTIVE",
                title,
                description: desiredOutcome,
                strategyKey: null,
                depth: 0,
                impact: 5,
                urgency: 3,
                effortCost: 1,
                successLikelihood: 0.9,
                completionCriteria: null,
                expectedResult: null,
                estimatedMinutes: null,
            },
            {
                tempId: "requirement-clarity",
                nodeType: "REQUIREMENT",
                title: "Clarified success target",
                description: "The outcome, constraints, and available resources are explicit.",
                strategyKey: "balanced",
                depth: 1,
                impact: 5,
                urgency: 4,
                effortCost: 1,
                successLikelihood: 0.9,
                completionCriteria: null,
                expectedResult: null,
                estimatedMinutes: null,
            },
            {
                tempId: "gap-baseline",
                nodeType: "GAP",
                title: "Baseline evidence gap",
                description:
                    "The plan needs one current-state measurement before deeper execution.",
                strategyKey: "balanced",
                depth: 2,
                impact: 4,
                urgency: 4,
                effortCost: 1,
                successLikelihood: 0.85,
                completionCriteria: null,
                expectedResult: null,
                estimatedMinutes: null,
            },
            {
                tempId: "action-baseline",
                nodeType: "ACTION",
                title: input.replan
                    ? "Update the current-state snapshot"
                    : "Write the current-state snapshot",
                description: "Create a short factual snapshot of where things stand today.",
                strategyKey: "balanced",
                depth: 3,
                impact: 4,
                urgency: 4,
                effortCost: 1,
                successLikelihood: 0.9,
                completionCriteria:
                    "A concrete baseline note exists with current facts, capacity, and constraint.",
                expectedResult: "The next task can be sized against reality instead of guesses.",
                estimatedMinutes: 25,
            },
            {
                tempId: "action-remove-blocker",
                nodeType: "ACTION",
                title: input.replan
                    ? "Run the revised blocker-removal step"
                    : "Run the blocker-removal step",
                description: "Act on the most important constraint identified in the baseline.",
                strategyKey: "balanced",
                depth: 4,
                impact: 5,
                urgency: 3,
                effortCost: 2,
                successLikelihood: 0.72,
                completionCriteria:
                    "One blocker has a concrete mitigation, owner, and next measurement.",
                expectedResult: "A dependent downstream milestone is no longer blocked.",
                estimatedMinutes: 45,
            },
            {
                tempId: "milestone-review",
                nodeType: "MILESTONE",
                title: "First reality review",
                description:
                    "Use the first action result to decide whether the plan remains feasible.",
                strategyKey: "balanced",
                depth: 5,
                impact: 4,
                urgency: 3,
                effortCost: 1,
                successLikelihood: 0.8,
                completionCriteria: null,
                expectedResult: null,
                estimatedMinutes: null,
            },
        ],
        edges: [
            {
                from: "requirement-clarity",
                to: "objective",
                edgeType: "SUPPORTS",
                hardDependency: false,
                rationale: "The objective needs a clarified target.",
            },
            {
                from: "gap-baseline",
                to: "requirement-clarity",
                edgeType: "SUPPORTS",
                hardDependency: false,
                rationale: "Baseline evidence fills the clarity gap.",
            },
            {
                from: "action-baseline",
                to: "action-remove-blocker",
                edgeType: "REQUIRES",
                hardDependency: true,
                rationale: "The blocker step depends on the baseline action being complete.",
            },
            {
                from: "action-remove-blocker",
                to: "milestone-review",
                edgeType: "PRECEDES",
                hardDependency: true,
                rationale: "Review after a meaningful blocker step.",
            },
        ],
        assumptions: [
            {
                statement: "The user can reserve at least one focused work block this week.",
                importance: "MEDIUM",
                validationNodeTempId: "action-baseline",
            },
            {
                statement:
                    "The stated objective remains desirable after the baseline facts are visible.",
                importance: "HIGH",
                validationNodeTempId: "milestone-review",
            },
        ],
        risks: [
            {
                statement: "The main constraint may be outside the user's direct control.",
                probability: "MEDIUM",
                impact: "HIGH",
                mitigation:
                    "Use the blocker-removal step to separate controllable and uncontrollable factors.",
            },
            {
                statement: "The plan may be too broad if the baseline remains vague.",
                probability: "LOW",
                impact: "MEDIUM",
                mitigation: "Keep the first action narrow and evidence-producing.",
            },
        ],
        bottleneckTempId: "action-baseline",
        bottleneckReason: "The first bottleneck is missing current-state evidence.",
        feasibility: {
            score: input.replan ? 76 : 72,
            level: "MEDIUM",
            reasons: [
                "The first action is small",
                "The dependent action is blocked until baseline evidence exists",
            ],
        },
        confidence: {
            score: input.replan ? 79 : 74,
            reasons: [
                "The plan uses explicit dependencies",
                "The first check-in can revise the strategy",
            ],
        },
        summary: input.replan
            ? "A revised structured plan that preserves history while shifting the next blocker-removal action."
            : "A structured first plan with one ready baseline action and one dependent blocked action.",
        blocker: null,
    });
}

export function mockChangeExplanation(): ChangeExplanation {
    return changeExplanationSchema.parse({
        headline: "The revised plan updates the executable path from new check-in information.",
        changes: [
            {
                entityType: "ACTION",
                changeType: "MODIFIED",
                beforeSummary: "Run the blocker-removal step",
                afterSummary: "Run the revised blocker-removal step",
                reason: "The check-in changed the current-state constraint.",
            },
        ],
    });
}
