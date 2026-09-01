import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * The only trusted inference boundary. Model aliases are configuration, never
 * hardcoded at call sites (NFR-MNT-001 / model routing).
 */
export const MODEL_ALIASES = {
    FAST: "google/gemini-3.1-flash-lite",
    PRIMARY: "google/gemini-3.7-flash",
    CRITIC: "google/gemini-3.1-pro-preview",
    FALLBACK: "google/gemini-2.5-flash",
} as const;

export type ModelAlias = keyof typeof MODEL_ALIASES;

export function createLovableAiGatewayProvider(apiKey: string) {
    return createOpenAICompatible({
        name: "lovable",
        baseURL: "https://ai.gateway.lovable.dev/v1",
        headers: { "Lovable-API-Key": apiKey },
        supportsStructuredOutputs: true,
    });
}

export function requireGateway() {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) {
        const error = new Error("AI is not configured for this app.");
        (error as Error & { code?: string }).code = "AI_UNAVAILABLE";
        throw error;
    }
    return createLovableAiGatewayProvider(key);
}

export interface AiFailure {
    code:
    | "AI_PROVIDER_TIMEOUT"
    | "AI_RATE_LIMITED"
    | "AI_SCHEMA_INVALID"
    | "AI_POLICY_REJECTED"
    | "AI_BUDGET_EXCEEDED"
    | "AI_UNAVAILABLE";
    message: string;
    retryable: boolean;
}

/** Maps gateway/provider failures onto the documented error model. */
export function classifyAiError(error: unknown): AiFailure {
    const anyErr = error as { statusCode?: number; status?: number; message?: string } | undefined;
    const status = anyErr?.statusCode ?? anyErr?.status;
    const message = anyErr?.message ?? "The planning engine could not complete this request.";

    if (status === 429)
        return {
            code: "AI_RATE_LIMITED",
            message: "The planning engine is rate limited right now. Try again in a moment.",
            retryable: true,
        };
    if (status === 402)
        return {
            code: "AI_BUDGET_EXCEEDED",
            message:
                "This workspace is out of AI credits, so new plans cannot be generated. Saved plans still work.",
            retryable: false,
        };
    if (status === 403)
        return {
            code: "AI_BUDGET_EXCEEDED",
            message: "AI access is blocked by workspace policy. Saved plans still work.",
            retryable: false,
        };
    if (status === 401)
        return {
            code: "AI_UNAVAILABLE",
            message: "AI is not configured for this app.",
            retryable: false,
        };
    if (status === 400)
        return {
            code: "AI_SCHEMA_INVALID",
            message: "The planning request was rejected. Try shortening your description.",
            retryable: false,
        };
    if (status && status >= 500)
        return {
            code: "AI_PROVIDER_TIMEOUT",
            message: "The planning engine is temporarily unavailable. Saved plans still work.",
            retryable: true,
        };
    if (/timeout|aborted/i.test(message))
        return {
            code: "AI_PROVIDER_TIMEOUT",
            message: "The planning engine timed out.",
            retryable: true,
        };

    return { code: "AI_UNAVAILABLE", message, retryable: true };
}
