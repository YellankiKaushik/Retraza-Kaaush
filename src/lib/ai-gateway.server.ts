import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";

/**
 * The only trusted inference boundary. Provider credentials and model IDs are
 * server-side configuration, never browser state or UI-selected values.
 */
export const MODEL_ALIASES = ["FAST", "PRIMARY", "CRITIC", "FALLBACK"] as const;
export type ModelAlias = (typeof MODEL_ALIASES)[number];

export const PROVIDER_IDS = ["gemini", "groq", "openrouter", "openai", "lovable-ai"] as const;
export type ProviderId = (typeof PROVIDER_IDS)[number];

const DEFAULT_ROUTE_BY_ALIAS: Record<ModelAlias, ProviderId[]> = {
    FAST: ["groq", "gemini", "openrouter", "openai"],
    PRIMARY: ["gemini", "groq", "openrouter", "openai"],
    CRITIC: ["gemini", "groq", "openrouter", "openai"],
    FALLBACK: ["gemini", "groq", "openrouter", "openai"],
};

const PROVIDER_CONFIG: Record<
    ProviderId,
    {
        name: string;
        keyEnv: string;
        enabledEnv: string;
        baseUrlEnv: string;
        defaultBaseUrl: string;
        modelPrefix: string;
    }
> = {
    gemini: {
        name: "gemini",
        keyEnv: "GEMINI_API_KEY",
        enabledEnv: "GEMINI_ENABLED",
        baseUrlEnv: "GEMINI_BASE_URL",
        defaultBaseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
        modelPrefix: "GEMINI_MODEL",
    },
    groq: {
        name: "groq",
        keyEnv: "GROQ_API_KEY",
        enabledEnv: "GROQ_ENABLED",
        baseUrlEnv: "GROQ_BASE_URL",
        defaultBaseUrl: "https://api.groq.com/openai/v1",
        modelPrefix: "GROQ_MODEL",
    },
    openrouter: {
        name: "openrouter",
        keyEnv: "OPENROUTER_API_KEY",
        enabledEnv: "OPENROUTER_ENABLED",
        baseUrlEnv: "OPENROUTER_BASE_URL",
        defaultBaseUrl: "https://openrouter.ai/api/v1",
        modelPrefix: "OPENROUTER_MODEL",
    },
    openai: {
        name: "openai",
        keyEnv: "OPENAI_API_KEY",
        enabledEnv: "OPENAI_ENABLED",
        baseUrlEnv: "OPENAI_BASE_URL",
        defaultBaseUrl: "https://api.openai.com/v1",
        modelPrefix: "OPENAI_MODEL",
    },
    "lovable-ai": {
        name: "lovable",
        keyEnv: "LOVABLE_API_KEY",
        enabledEnv: "LOVABLE_AI_ENABLED",
        baseUrlEnv: "LOVABLE_AI_BASE_URL",
        defaultBaseUrl: "https://ai.gateway.lovable.dev/v1",
        modelPrefix: "LOVABLE_MODEL",
    },
};

export interface AiProviderCandidate {
    providerId: ProviderId;
    providerName: string;
    modelAlias: ModelAlias;
    modelId: string;
    model: LanguageModel;
}

export interface AiAttemptTelemetry {
    provider: string;
    modelAlias: string;
    modelId: string;
    attempt: number;
    latencyMs: number;
    outcome: string;
    retryable: boolean;
}

function truthy(value: string | undefined) {
    return value ? ["1", "true", "yes", "on"].includes(value.toLowerCase()) : false;
}

function splitList(value: string | undefined) {
    return (value ?? "")
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
}

function parseProviderList(value: string | undefined): ProviderId[] {
    const seen = new Set<ProviderId>();
    const providers: ProviderId[] = [];
    for (const raw of splitList(value)) {
        if (!PROVIDER_IDS.includes(raw as ProviderId)) continue;
        const provider = raw as ProviderId;
        if (seen.has(provider)) continue;
        seen.add(provider);
        providers.push(provider);
    }
    return providers;
}

export function isMockAiEnabled() {
    return process.env["AI_PROVIDER_MODE"]?.toLowerCase() === "mock";
}

function allowedProviders() {
    const configured = parseProviderList(process.env["AI_PROVIDER_ALLOWLIST"]);
    return configured.length ? new Set(configured) : new Set(PROVIDER_IDS);
}

export function routeForAlias(alias: ModelAlias) {
    const configured = parseProviderList(process.env[`AI_ROUTE_${alias}`]);
    return configured.length ? configured : DEFAULT_ROUTE_BY_ALIAS[alias];
}

export function timeoutMs() {
    const parsed = Number(process.env["AI_PROVIDER_TIMEOUT_MS"]);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 90_000;
}

export function maxProviderRetries() {
    const parsed = Number(process.env["AI_PROVIDER_MAX_RETRIES"]);
    if (!Number.isFinite(parsed) || parsed < 0) return 1;
    return Math.min(3, Math.floor(parsed));
}

export function modelEnvName(providerId: ProviderId, alias: ModelAlias) {
    return `${PROVIDER_CONFIG[providerId].modelPrefix}_${alias}`;
}

export function modelForProviderAlias(providerId: ProviderId, alias: ModelAlias) {
    return (
        process.env[modelEnvName(providerId, alias)] ??
        process.env[`${PROVIDER_CONFIG[providerId].modelPrefix}_DEFAULT`]
    );
}

function isProviderEnabled(providerId: ProviderId) {
    const config = PROVIDER_CONFIG[providerId];
    const enabledFlag = process.env[config.enabledEnv];
    if (enabledFlag !== undefined) return truthy(enabledFlag);

    // A provider is implicitly enabled only when both a key and a model are configured.
    return Boolean(process.env[config.keyEnv]);
}

function createHeaders(providerId: ProviderId, apiKey: string) {
    if (providerId === "lovable-ai") return { "Lovable-API-Key": apiKey };
    if (providerId === "openrouter") {
        return {
            ...(process.env["OPENROUTER_HTTP_REFERER"]
                ? { "HTTP-Referer": process.env["OPENROUTER_HTTP_REFERER"]! }
                : {}),
            ...(process.env["OPENROUTER_APP_TITLE"]
                ? { "X-OpenRouter-Title": process.env["OPENROUTER_APP_TITLE"]! }
                : {}),
        };
    }
    return { Authorization: `Bearer ${apiKey}` };
}

function createProvider(providerId: ProviderId, apiKey: string) {
    const config = PROVIDER_CONFIG[providerId];
    return createOpenAICompatible({
        name: config.name,
        baseURL: process.env[config.baseUrlEnv] ?? config.defaultBaseUrl,
        ...(providerId !== "lovable-ai" ? { apiKey } : {}),
        headers: createHeaders(providerId, apiKey),
        supportsStructuredOutputs: true,
    });
}

export function candidatesForAlias(alias: ModelAlias): AiProviderCandidate[] {
    if (isMockAiEnabled()) return [];

    const allowlist = allowedProviders();
    const candidates: AiProviderCandidate[] = [];
    for (const providerId of routeForAlias(alias)) {
        if (!allowlist.has(providerId)) continue;
        if (!isProviderEnabled(providerId)) continue;

        const config = PROVIDER_CONFIG[providerId];
        const apiKey = process.env[config.keyEnv];
        const modelId = modelForProviderAlias(providerId, alias);
        if (!apiKey || !modelId) continue;

        const provider = createProvider(providerId, apiKey);
        candidates.push({
            providerId,
            providerName: providerId === "lovable-ai" ? "lovable-ai" : config.name,
            modelAlias: alias,
            modelId,
            model: provider(modelId),
        });
    }
    return candidates;
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
    const anyErr = error as
        { statusCode?: number; status?: number; name?: string; message?: string } | undefined;
    const status = anyErr?.statusCode ?? anyErr?.status;
    const message = anyErr?.message ?? "The planning engine could not complete this request.";

    if (status === 429)
        return {
            code: "AI_RATE_LIMITED",
            message:
                "The planning engine is rate limited right now. Trying another configured provider.",
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
            code: "AI_POLICY_REJECTED",
            message:
                "AI access is blocked by workspace or provider policy. Saved plans still work.",
            retryable: false,
        };
    if (status === 401)
        return {
            code: "AI_UNAVAILABLE",
            message: "AI is not configured for this app.",
            retryable: false,
        };
    if (status === 400 || /schema|zod|json|parse|object generated|malformed/i.test(message))
        return {
            code: "AI_SCHEMA_INVALID",
            message:
                "The planning engine returned malformed structured output. Trying another configured provider.",
            retryable: true,
        };
    if (status && status >= 500)
        return {
            code: "AI_PROVIDER_TIMEOUT",
            message: "The planning engine is temporarily unavailable. Saved plans still work.",
            retryable: true,
        };
    if (anyErr?.name === "AbortError" || /timeout|aborted/i.test(message))
        return {
            code: "AI_PROVIDER_TIMEOUT",
            message: "The planning engine timed out.",
            retryable: true,
        };

    return { code: "AI_UNAVAILABLE", message, retryable: true };
}
