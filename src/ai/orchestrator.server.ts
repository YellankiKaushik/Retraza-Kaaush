/**
 * CMP-AI-001 — AI Orchestrator.
 * Builds minimised context, applies versioned prompts, validates every proposal
 * against the schema before anything is persisted, and records telemetry.
 */
import { generateObject, NoObjectGeneratedError } from "ai";
import type { z } from "zod";
import { validateProposal } from "@/lib/planner.server";
import { logAiDiagnostics, type AiDiagnostics } from "./diagnostics.server";

import {
    candidatesForAlias,
    classifyAiError,
    isMockAiEnabled,
    maxProviderRetries,
    maxOutputTokens,
    retryDelayMs,
    timeoutMs,
    type AiAttemptTelemetry,
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
import {
    mockChangeExplanation,
    mockIntakeAnalysis,
    mockPlanProposal,
} from "./mock-provider.server";

export const MAX_INTAKE_CHARS = 10_000;

export interface AiCallMeta {
    operation: string;
    provider: string;
    modelAlias: string;
    providerModel: string | null;
    promptVersion: string;
    latencyMs: number;
    inputTokens: number | null;
    outputTokens: number | null;
    outcome: string;
    schemaValid: boolean;
    correlationId: string;
    attempts: AiAttemptTelemetry[];
    diagnostics?: AiDiagnostics;
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
    mock: () => z.infer<S>;
    validateGraph?: (data: z.infer<S>) => unknown;
}): Promise<AiCallResult<z.infer<S>>> {
    const started = Date.now();

    if (isMockAiEnabled()) {
        const data = args.schema.parse(args.mock());
        args.validateGraph?.(data);
        return {
            data,
            meta: {
                operation: args.operation,
                provider: "mock",
                modelAlias: args.alias,
                providerModel: "deterministic",
                promptVersion: PROMPT_VERSION,
                latencyMs: Date.now() - started,
                inputTokens: null,
                outputTokens: null,
                outcome: "SUCCESS",
                schemaValid: true,
                correlationId: args.correlationId,
                attempts: [],
            },
        };
    }

    const candidates = candidatesForAlias(args.alias);
    if (candidates.length === 0) {
        const enriched = new Error(
            "AI is temporarily unavailable because no enabled provider has both a server-side key and configured model.",
        ) as Error & {
            code: string;
            retryable: boolean;
            meta: AiCallMeta;
        };
        enriched.code = "AI_UNAVAILABLE";
        enriched.retryable = false;
        enriched.meta = {
            operation: args.operation,
            provider: "none",
            modelAlias: args.alias,
            providerModel: null,
            promptVersion: PROMPT_VERSION,
            latencyMs: Date.now() - started,
            inputTokens: null,
            outputTokens: null,
            outcome: "AI_UNAVAILABLE",
            schemaValid: false,
            correlationId: args.correlationId,
            attempts: [],
        };
        throw enriched;
    }

    const attempts: AiAttemptTelemetry[] = [];
    let lastFailure = classifyAiError(new Error("AI is temporarily unavailable."));
    let diagnostic: AiDiagnostics | undefined;
    let inputTokens: number | null = null;

    for (const candidate of candidates) {
        for (let attempt = 0; attempt <= maxProviderRetries(); attempt += 1) {
            const attemptStarted = Date.now();
            diagnostic = {
                providerModel: candidate.modelId,
                outputTokens: null,
                finishReason: null,
                schemaValid: null,
                graphValid: null,
                timedOut: false,
            };
            inputTokens = null;
            try {
                const result = await generateObject({
                    model: candidate.model,
                    schema: args.schema,
                    system: args.system,
                    prompt: args.prompt,
                    ...(candidate.providerId === "gemini"
                        ? {
                              providerOptions: {
                                  google: {
                                      structuredOutputs: true,
                                      thinkingConfig: {
                                          thinkingLevel: "low" as const,
                                          includeThoughts: false,
                                      },
                                  },
                              },
                          }
                        : {}),
                    maxRetries: 0,
                    maxOutputTokens: maxOutputTokens(),
                    abortSignal: AbortSignal.timeout(timeoutMs()),
                });

                inputTokens = result.usage?.inputTokens ?? null;
                diagnostic.outputTokens = result.usage?.outputTokens ?? null;
                diagnostic.finishReason = result.finishReason;
                const data = args.schema.parse(result.object);
                diagnostic.schemaValid = true;
                if (args.validateGraph) {
                    diagnostic.graphValid = false;
                    args.validateGraph(data);
                    diagnostic.graphValid = true;
                }
                logAiDiagnostics(args.operation, diagnostic);

                attempts.push({
                    provider: candidate.providerName,
                    modelAlias: candidate.modelAlias,
                    modelId: candidate.modelId,
                    attempt,
                    latencyMs: Date.now() - attemptStarted,
                    outcome: "SUCCESS",
                    retryable: false,
                });

                return {
                    data,
                    meta: {
                        operation: args.operation,
                        provider: candidate.providerName,
                        modelAlias: args.alias,
                        providerModel: candidate.modelId,
                        promptVersion: PROMPT_VERSION,
                        latencyMs: Date.now() - started,
                        inputTokens: result.usage?.inputTokens ?? null,
                        outputTokens: result.usage?.outputTokens ?? null,
                        outcome: "SUCCESS",
                        schemaValid: true,
                        correlationId: args.correlationId,
                        attempts,
                        diagnostics: diagnostic,
                    },
                };
            } catch (error) {
                if (NoObjectGeneratedError.isInstance(error)) {
                    inputTokens = error.usage?.inputTokens ?? null;
                    diagnostic.outputTokens = error.usage?.outputTokens ?? null;
                    diagnostic.finishReason = error.finishReason ?? null;
                    diagnostic.schemaValid = false;
                }
                lastFailure = classifyAiError(error);
                diagnostic.timedOut =
                    error instanceof Error &&
                    (["AbortError", "TimeoutError"].includes(error.name) ||
                        /timeout|timed out|aborted/i.test(error.message));
                if ([408, 504].includes((error as { statusCode?: number })?.statusCode ?? 0))
                    diagnostic.timedOut = true;
                logAiDiagnostics(args.operation, diagnostic);
                attempts.push({
                    provider: candidate.providerName,
                    modelAlias: candidate.modelAlias,
                    modelId: candidate.modelId,
                    attempt,
                    latencyMs: Date.now() - attemptStarted,
                    outcome: lastFailure.code,
                    retryable: lastFailure.retryable,
                });
                if (!lastFailure.retryable) break;
                if (attempt < maxProviderRetries()) {
                    const delay = retryDelayMs(error, attempt);
                    if (delay === undefined) break;
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
            }
        }
    }

    const enriched = new Error(
        lastFailure.retryable
            ? "AI is temporarily unavailable after trying every configured provider. Saved plans still work."
            : lastFailure.message,
    ) as Error & {
        code: string;
        retryable: boolean;
        meta: AiCallMeta;
    };
    enriched.code = lastFailure.code;
    enriched.retryable = lastFailure.retryable;
    enriched.meta = {
        operation: args.operation,
        provider: attempts.at(-1)?.provider ?? "none",
        modelAlias: args.alias,
        providerModel: attempts.at(-1)?.modelId ?? null,
        promptVersion: PROMPT_VERSION,
        latencyMs: Date.now() - started,
        inputTokens,
        outputTokens: diagnostic?.outputTokens ?? null,
        outcome: lastFailure.code,
        schemaValid: diagnostic?.schemaValid === true,
        correlationId: args.correlationId,
        attempts,
        ...(diagnostic ? { diagnostics: diagnostic } : {}),
    };
    throw enriched;
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
        mock: () => mockIntakeAnalysis(input),
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
        mock: () => mockPlanProposal(input),
        validateGraph: validateProposal,
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
        mock: () => mockPlanProposal({ ...input, replan: true }),
        validateGraph: validateProposal,
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
        mock: () => mockChangeExplanation(),
    });
}
