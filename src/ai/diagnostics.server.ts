export interface AiDiagnostics {
    providerModel: string;
    outputTokens: number | null;
    finishReason: string | null;
    schemaValid: boolean | null;
    graphValid: boolean | null;
    timedOut: boolean;
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

// Never serialize prompts, generated text, raw exceptions, keys, or arbitrary model strings.
export function logAiDiagnostics(operation: string, diagnostic: AiDiagnostics) {
    console.info(
        "AI_DIAGNOSTIC",
        JSON.stringify({
            operation: operations.includes(operation) ? operation : "UNKNOWN",
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
        }),
    );
}
