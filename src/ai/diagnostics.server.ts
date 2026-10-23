export interface AiDiagnostics {
    providerModel: string;
    outputTokens: number | null;
    finishReason: string | null;
    schemaValid: boolean | null;
    graphValid: boolean | null;
    timedOut: boolean;
    validationFailure?: string;
    provider?: string;
    httpStatus?: number;
    retryAfterSeconds?: number;
    providerErrorCode?: string | null;
    stage?:
        | "provider-response"
        | "output-validation"
        | "semantic-compilation"
        | "graph-validation"
        | "complete";
    errorKind?: string | null;
    validationIssues?: { code: string; path: (string | number)[] | null }[];
    referenceTargetIndex?: number | null;
}

const issueCodes = [
    "invalid_type",
    "invalid_union",
    "unrecognized_keys",
    "too_small",
    "too_big",
    "custom",
    "invalid_literal",
    "invalid_enum_value",
    "invalid_value",
];
const issueFields = new Set(
    "choices message content finish_reason usage prompt_tokens completion_tokens completion_tokens_details reasoning_tokens model created id normalizedObjective strategies milestones work key source title description nodeType completionCriteria expectedResult estimatedMinutes impact urgency effortCost successLikelihood prerequisiteIndexes dependency kind workKeys workKey conditions assumptions first second third fourth fifth statement importance validator workIndex strategy risks mitigation likelihood severity feasibility confidence summary bottleneck strategyIndex bottleneckReason blocker tempId".split(
        " ",
    ),
);
export function safeValidationIssues(
    error: unknown,
): NonNullable<AiDiagnostics["validationIssues"]> {
    let current = error as { issues?: unknown; cause?: unknown } | undefined;
    for (let depth = 0; current && depth < 5; depth++) {
        if (Array.isArray(current.issues))
            return current.issues.slice(0, 5).map((issue) => ({
                code: issueCodes.includes(issue?.code) ? issue.code : "unknown",
                path:
                    Array.isArray(issue?.path) &&
                    issue.path.length <= 12 &&
                    issue.path.every(
                        (part: unknown) =>
                            (typeof part === "string" && issueFields.has(part)) ||
                            (typeof part === "number" &&
                                Number.isSafeInteger(part) &&
                                part >= 0 &&
                                part <= 1000),
                    )
                        ? issue.path
                        : null,
            }));
        current = current.cause as typeof current;
    }
    return [];
}

const errorKinds = [
    "AI_APICallError",
    "AI_TypeValidationError",
    "AI_JSONParseError",
    "AI_NoObjectGeneratedError",
    "ZodError",
    "DomainError",
    "Error",
    "TimeoutError",
    "AbortError",
];
export function safeAiErrorKind(error: unknown): string | null {
    const name = (error as { name?: unknown })?.name;
    return typeof name === "string" && errorKinds.includes(name) ? name : null;
}

const providerErrorCodes = [
    "invalid_json_schema",
    "invalid_request_error",
    "json_validate_failed",
    "context_length_exceeded",
    "model_not_found",
    "rate_limit_exceeded",
    "unsupported_value",
];

export function safeProviderErrorCode(error: unknown): string | null {
    const detail = (error as { data?: { error?: { code?: unknown; type?: unknown } } })?.data
        ?.error;
    for (const value of [detail?.code, detail?.type])
        if (typeof value === "string" && providerErrorCodes.includes(value)) return value;
    return null;
}

const operations = ["CLASSIFY_AND_CLARIFY", "GENERATE_PLAN_GRAPH", "REPLAN", "EXPLAIN_CHANGE"];
const finishReasons = [
    "stop",
    "length",
    "content-filter",
    "tool-calls",
    "error",
    "other",
    "unknown",
];
const validationFailures = [
    "output-budget",
    "graph-integrity",
    "strategy-count",
    "milestone-count",
    "executable-count",
    "graph-size",
    "strategy-branch",
    "assumptions-count",
    "risks-count",
    "assumption-validator",
    "duplicate-node",
    "dangling-edge",
    "dependency-cycle",
    "dependency-self",
    "strategy-selection",
    "orphan-node",
    "executable-frontier",
    "assumptions-content",
    "risks-content",
    "progress-preservation",
    "prerequisite-preservation",
    "version-relationship",
];

// Never serialize prompts, generated text, raw exceptions, keys, or arbitrary model strings.
export function logAiDiagnostics(operation: string, diagnostic: AiDiagnostics) {
    console.info(
        "AI_DIAGNOSTIC",
        JSON.stringify({
            operation: operations.includes(operation) ? operation : "UNKNOWN",
            provider: ["gemini", "groq", "openrouter", "openai", "lovable-ai"].includes(
                diagnostic.provider ?? "",
            )
                ? diagnostic.provider
                : null,
            httpStatus:
                Number.isInteger(diagnostic.httpStatus) &&
                diagnostic.httpStatus! >= 400 &&
                diagnostic.httpStatus! <= 599
                    ? diagnostic.httpStatus
                    : null,
            retryAfterSeconds:
                Number.isFinite(diagnostic.retryAfterSeconds) &&
                diagnostic.retryAfterSeconds! >= 0 &&
                diagnostic.retryAfterSeconds! <= 86400
                    ? diagnostic.retryAfterSeconds
                    : null,
            providerErrorCode: providerErrorCodes.includes(diagnostic.providerErrorCode ?? "")
                ? diagnostic.providerErrorCode
                : null,
            stage: [
                "provider-response",
                "output-validation",
                "semantic-compilation",
                "graph-validation",
                "complete",
            ].includes(diagnostic.stage ?? "")
                ? diagnostic.stage
                : null,
            errorKind: errorKinds.includes(diagnostic.errorKind ?? "")
                ? diagnostic.errorKind
                : null,
            validationIssues: safeValidationIssues({ issues: diagnostic.validationIssues }),
            referenceTargetIndex:
                Number.isSafeInteger(diagnostic.referenceTargetIndex) &&
                diagnostic.referenceTargetIndex! >= 0
                    ? diagnostic.referenceTargetIndex
                    : null,
            outputTokens:
                Number.isFinite(diagnostic.outputTokens) && diagnostic.outputTokens! >= 0
                    ? diagnostic.outputTokens
                    : null,
            finishReason: finishReasons.includes(diagnostic.finishReason ?? "")
                ? diagnostic.finishReason
                : null,
            schemaValid: diagnostic.schemaValid,
            graphValid: diagnostic.graphValid,
            timedOut: diagnostic.timedOut,
            validationFailure: validationFailures.includes(diagnostic.validationFailure ?? "")
                ? diagnostic.validationFailure
                : null,
        }),
    );
}
