/**
 * Structured AI output contracts (single source of truth for AI proposals).
 * AI output is UNTRUSTED until it passes these schemas plus graph-integrity,
 * ownership and policy validation.
 *
 * Constraint style matters: provider structured-output engines (Gemini) reject
 * JSON Schemas that carry many numeric bounds / string length limits / array
 * length limits ("too many states for serving"). So every bound is expressed as
 * a post-parse clamp instead of a JSON Schema keyword. The emitted schema stays
 * simple for the model, while the parsed value is still normalised and safe to
 * persist.
 */
import { z } from "zod";

import { BANDS, EDGE_TYPES, INTENT_TYPES, NODE_TYPES } from "@/domain/types";

export const PROMPT_VERSION = "v1";

/** String, truncated to a hard maximum after generation. */
const text = (max: number) => z.string().transform((value) => value.trim().slice(0, max));
/** Number, clamped into range after generation. */
const num = (min: number, max: number) =>
    z.number().transform((value) => {
        if (!Number.isFinite(value)) return min;
        return Math.min(max, Math.max(min, value));
    });
/** 0-100 score. Providers sometimes answer with a 0-1 fraction, so rescale it. */
const pct = () =>
    z
        .number()
        .describe("integer between 0 and 100")
        .transform((value) => {
            if (!Number.isFinite(value)) return 0;
            const scaled = value > 0 && value <= 1 ? value * 100 : value;
            return Math.round(Math.min(100, Math.max(0, scaled)));
        });

/** Array, truncated to a hard maximum after generation. */
const list = <S extends z.ZodTypeAny>(schema: S, max: number) =>
    z.array(schema).transform((value) => value.slice(0, max));

export const intakeAnalysisSchema = z.object({
    intentType: z.enum(INTENT_TYPES),
    intentConfidence: num(0, 1).describe("confidence between 0 and 1"),
    normalizedObjective: z.object({
        title: text(160),
        desiredOutcome: text(600),
        successCriteria: list(text(240), 8),
        timeHorizon: text(120).nullable(),
    }),
    clarity: z.object({
        score: pct(),
        missingCriticalInformation: list(text(240), 8),
    }),
    policy: z.object({
        supported: z.boolean(),
        flags: list(text(80), 6),
        reason: text(400),
    }),
    questions: list(
        z.object({
            key: text(60),
            question: text(240),
            why: text(240),
            category: z.enum(["RESOURCE", "CONSTRAINT", "PREFERENCE", "FACT", "MEASURE"]),
        }),
        6,
    ),
});
export type IntakeAnalysis = z.infer<typeof intakeAnalysisSchema>;

export const planProposalSchema = z.object({
    normalizedObjective: z.object({
        title: text(160),
        desiredOutcome: text(600),
        successCriteria: list(text(240), 8),
        timeHorizon: text(120).nullable(),
    }),
    strategies: list(
        z.object({
            key: text(40),
            name: text(80),
            summary: text(400),
            riskLevel: z.enum(BANDS),
            effortScore: num(1, 10).describe("1-10"),
            timeScore: num(1, 10).describe("1-10"),
            rationale: text(600),
            tradeoffs: list(text(200), 6),
            recommended: z.boolean(),
        }),
        4,
    ),
    nodes: list(
        z.object({
            tempId: text(40),
            nodeType: z.enum(NODE_TYPES),
            title: text(160),
            description: text(800),
            strategyKey: text(40).nullable(),
            depth: num(0, 8).describe("graph depth, 0-8"),
            impact: num(1, 5).describe("1-5, 5 = highest impact"),
            urgency: num(1, 5).describe("1-5, 5 = most urgent"),
            effortCost: num(0.5, 5).describe("0.5-5, 5 = most effort"),
            successLikelihood: num(0.05, 1).describe("probability between 0.05 and 1"),
            completionCriteria: text(400).nullable(),
            expectedResult: text(400).nullable(),
            estimatedMinutes: num(1, 100000).describe("minutes of work").nullable(),
        }),
        60,
    ),
    edges: list(
        z.object({
            from: text(40),
            to: text(40),
            edgeType: z.enum(EDGE_TYPES),
            hardDependency: z.boolean(),
            rationale: text(240).nullable(),
        }),
        160,
    ),
    assumptions: list(
        z.object({
            statement: text(400),
            importance: z.enum(BANDS),
            validationNodeTempId: text(40).nullable(),
        }),
        12,
    ),
    risks: list(
        z.object({
            statement: text(400),
            probability: z.enum(BANDS),
            impact: z.enum(BANDS),
            mitigation: text(400),
        }),
        12,
    ),
    bottleneckTempId: text(40).nullable(),
    bottleneckReason: text(400),
    feasibility: z.object({
        score: pct(),
        level: z.enum(BANDS),
        reasons: list(text(240), 8),
    }),
    confidence: z.object({
        score: pct(),
        reasons: list(text(240), 8),
    }),
    summary: text(800),
    blocker: text(400).nullable(),
});
export type PlanProposal = z.infer<typeof planProposalSchema>;

export const changeExplanationSchema = z.object({
    headline: text(200),
    changes: list(
        z.object({
            entityType: text(40),
            changeType: z.enum(["ADDED", "REMOVED", "MODIFIED", "REPRIORITISED"]),
            beforeSummary: text(240).nullable(),
            afterSummary: text(240).nullable(),
            reason: text(240),
        }),
        20,
    ),
});
export type ChangeExplanation = z.infer<typeof changeExplanationSchema>;
