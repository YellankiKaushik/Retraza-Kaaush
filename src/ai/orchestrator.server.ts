/**
 * CMP-AI-001 — AI Orchestrator.
 * Builds minimised context, applies versioned prompts, validates every proposal
 * against the schema before anything is persisted, and records telemetry.
 */
import { generateObject } from "ai";
import type { z } from "zod";

import {
    MODEL_ALIASES,
    classifyAiError,
    requireGateway,
    type ModelAlias,
} from "@/lib/ai-gateway.server";

import {
    PROMPT_VERSION,
    changeExplanationSchema,
    intakeAnalysisSchema,
    planProposalSchema,
    type ChangeExplanation,
    type IntakeAnalysis,
    type PlanProposal,
} from "./plan-contract";
import {
    changeExplanationPrompt,
    intakePrompt,
    planningPrompt,
    replanPrompt,
} from "./prompts.server";

export const MAX_INTAKE_CHARS = 10_000;
const AI_TIMEOUT_MS = 90_000;

export interface AiCallMeta {
    operation: string;
    modelAlias: string;
    promptVersion: string;
    latencyMs: number;
    inputTokens: number | null;
    outputTokens: number | null;
    outcome: string;
    schemaValid: boolean;
    correlationId: string;
}

export interface AiCallResult<T> {
    data: T;
    meta: AiCallMeta;
}

async function callModel<S extends z.ZodType>(args: {
    operation: string;
    alias: ModelAlias;
    schema: S;
    system: string;
    prompt: string;
    correlationId: string;
}): Promise<AiCallResult<z.infer<S>>> {
    const gateway = requireGateway();
    const model = MODEL_ALIASES[args.alias];
    const started = Date.now();

    try {
        const result = await generateObject({
            model: gateway(model),
            schema: args.schema,
            system: args.system,
            prompt: args.prompt,
            maxRetries: 1,
            abortSignal: AbortSignal.timeout(AI_TIMEOUT_MS),
        });

        return {
            data: result.object as z.infer<S>,
            meta: {
                operation: args.operation,
                modelAlias: model,
                promptVersion: PROMPT_VERSION,
                latencyMs: Date.now() - started,
                inputTokens: result.usage?.inputTokens ?? null,
                outputTokens: result.usage?.outputTokens ?? null,
                outcome: "SUCCESS",
                schemaValid: true,
                correlationId: args.correlationId,
            },
        };
    } catch (error) {
        const failure = classifyAiError(error);
        const enriched = new Error(failure.message) as Error & {
            code: string;
            retryable: boolean;
            meta: AiCallMeta;
        };
        enriched.code = failure.code;
        enriched.retryable = failure.retryable;
        enriched.meta = {
            operation: args.operation,
            modelAlias: model,
            promptVersion: PROMPT_VERSION,
            latencyMs: Date.now() - started,
            inputTokens: null,
            outputTokens: null,
            outcome: failure.code,
            schemaValid: failure.code !== "AI_SCHEMA_INVALID",
            correlationId: args.correlationId,
        };
        throw enriched;
    }
}

export function runIntakeAnalysis(input: {
    rawText: string;
    timezone?: string;
    locale?: string;
    correlationId: string;
}): Promise<AiCallResult<IntakeAnalysis>> {
    const { system, prompt } = intakePrompt(input);
    return callModel({
        operation: "CLASSIFY_AND_CLARIFY",
        alias: "FAST",
        schema: intakeAnalysisSchema,
        system,
        prompt,
        correlationId: input.correlationId,
    });
}

export function runPlanGeneration(
    input: Parameters<typeof planningPrompt>[0] & { correlationId: string },
): Promise<AiCallResult<PlanProposal>> {
    const { system, prompt } = planningPrompt(input);
    return callModel({
        operation: "GENERATE_PLAN_GRAPH",
        alias: "PRIMARY",
        schema: planProposalSchema,
        system,
        prompt,
        correlationId: input.correlationId,
    });
}

export function runReplan(
    input: Parameters<typeof replanPrompt>[0] & { correlationId: string },
): Promise<AiCallResult<PlanProposal>> {
    const { system, prompt } = replanPrompt(input);
    return callModel({
        operation: "REPLAN",
        alias: "PRIMARY",
        schema: planProposalSchema,
        system,
        prompt,
        correlationId: input.correlationId,
    });
}

export function runChangeExplanation(
    input: Parameters<typeof changeExplanationPrompt>[0] & { correlationId: string },
): Promise<AiCallResult<ChangeExplanation>> {
    const { system, prompt } = changeExplanationPrompt(input);
    return callModel({
        operation: "EXPLAIN_CHANGE",
        alias: "FAST",
        schema: changeExplanationSchema,
        system,
        prompt,
        correlationId: input.correlationId,
    });
}
