import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * The only trusted inference boundary. Provider credentials and model IDs are
 * server-side configuration, never browser state or UI-selected values.
 */
const MODEL_ALIAS_ENV = {
    FAST: "OPENAI_MODEL_FAST",
    PRIMARY: "OPENAI_MODEL_PRIMARY",
    CRITIC: "OPENAI_MODEL_CRITIC",
    FALLBACK: "OPENAI_MODEL_FALLBACK",
} as const;

export type ModelAlias = keyof typeof MODEL_ALIAS_ENV;

function createLovableAiGatewayProvider(apiKey: string) {
    return createOpenAICompatible({
        name: "lovable",
        baseURL: "https://ai.gateway.lovable.dev/v1",
        headers: { "Lovable-API-Key": apiKey },
        supportsStructuredOutputs: true,
    });
}

function createOpenAiProvider(apiKey: string, baseURL = "https://api.openai.com/v1") {
    return createOpenAICompatible({
        name: "openai",
        baseURL,
        headers: { Authorization: `Bearer ${apiKey}` },
        supportsStructuredOutputs: true,
    });
}

export function modelForAlias(alias: ModelAlias) {
    const envName = MODEL_ALIAS_ENV[alias];
    const model = process.env[envName];
    if (!model) {
        const error = new Error(`Missing AI model configuration: ${envName}.`);
        (error as Error & { code?: string }).code = "AI_UNAVAILABLE";
        throw error;
    }
    return model;
}

export function requireGateway() {
    const openAiKey = process.env["OPENAI_API_KEY"];
    if (openAiKey) {
        return {
            providerName: "openai",
            model: createOpenAiProvider(openAiKey, process.env["OPENAI_BASE_URL"]),
        };
    }

    const lovableKey = process.env["LOVABLE_API_KEY"];
    if (lovableKey) {
        return {
            providerName: "lovable-ai",
            model: createLovableAiGatewayProvider(lovableKey),
        };
    }

    const error = new Error("AI is not configured for this app.");
    (error as Error & { code?: string }).code = "AI_UNAVAILABLE";
    throw error;
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
