import { APICallError } from "ai";

const finishReasons = ["stop", "length", "content_filter", "tool_calls", "function_call", "error"];
const count = (value: unknown) =>
    typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
const record = (value: unknown): Record<string, unknown> =>
    value !== null && typeof value === "object" && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : {};

// Only shape, counts and allowlisted labels leave this boundary, never content.
export function openRouterResponseShape(status: number, payload: unknown) {
    const root = record(payload);
    const choices = Array.isArray(root["choices"]) ? root["choices"] : null;
    const first = record(choices?.[0]);
    const message = record(first["message"]);
    const content = message["content"];
    const text =
        typeof content === "string"
            ? content
            : Array.isArray(content)
              ? content
                    .filter(
                        (part) =>
                            record(part)["type"] === "text" &&
                            typeof record(part)["text"] === "string",
                    )
                    .map((part) => record(part)["text"] as string)
                    .join("")
              : null;
    const reasoning = message["reasoning_content"] ?? message["reasoning"];
    const usage = record(root["usage"]);
    const details = record(usage["completion_tokens_details"]);
    let contentJsonValid: boolean | null = null;
    if (text !== null) {
        try {
            JSON.parse(text);
            contentJsonValid = true;
        } catch {
            contentJsonValid = false;
        }
    }
    return {
        httpStatus: count(status),
        envelopePresent: Object.keys(root).length > 0,
        reportedProvider:
            typeof root["provider"] === "string" &&
            ["Phala", "AtlasCloud", "Nvidia"].includes(root["provider"])
                ? root["provider"]
                : null,
        modelFieldPresent: typeof root["model"] === "string",
        errorPresent: root["error"] !== undefined && root["error"] !== null,
        errorStatus: count(record(root["error"])["code"]),
        choices: choices?.length ?? null,
        contentType:
            typeof content === "string"
                ? "string"
                : content === null
                  ? "null"
                  : Array.isArray(content)
                    ? "array"
                    : "missing-or-other",
        contentCharacters: text?.length ?? null,
        assistantTextPresent: text !== null && text.length > 0,
        contentJsonValid,
        reasoningCharacters: typeof reasoning === "string" ? reasoning.length : null,
        finishReason:
            typeof first["finish_reason"] === "string" &&
            finishReasons.includes(first["finish_reason"])
                ? first["finish_reason"]
                : null,
        inputTokens: count(usage["prompt_tokens"]),
        outputTokens: count(usage["completion_tokens"]),
        reasoningTokens: count(details["reasoning_tokens"]),
    };
}

export function withOpenRouterResponseDiagnostics(request: typeof fetch): typeof fetch {
    return async (input, init) => {
        const response = await request(input, { ...init, redirect: "error" });
        let payload: unknown = null;
        let responseJsonValid = false;
        try {
            payload = await response.clone().json();
            responseJsonValid = true;
        } catch {
            /* The SDK still receives the original unmodified response. */
        }
        const shape = openRouterResponseShape(response.status, payload);
        console.info(
            "OPENROUTER_RESPONSE_SHAPE",
            JSON.stringify({
                ...shape,
                responseJsonValid,
            }),
        );
        // Some upstream failures arrive inside an HTTP-success envelope, not a completion.
        if (
            response.ok &&
            shape.errorPresent &&
            !shape.assistantTextPresent &&
            shape.errorStatus !== null &&
            shape.errorStatus >= 400 &&
            shape.errorStatus <= 599
        )
            throw new APICallError({
                message: "OpenRouter returned a provider error envelope without a completion.",
                url: "https://openrouter.ai/api/v1/chat/completions",
                requestBodyValues: undefined,
                statusCode: shape.errorStatus,
                isRetryable: false,
            });
        return response;
    };
}
