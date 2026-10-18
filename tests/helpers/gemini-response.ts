export function geminiResponse(
    content: string,
    finishReason = "STOP",
    tokens = 200,
    model = "gemini-3.8-flash",
) {
    return new Response(
        JSON.stringify({
            responseId: "fictional-response",
            modelVersion: model,
            candidates: [
                { index: 0, content: { role: "model", parts: [{ text: content }] }, finishReason },
            ],
            usageMetadata: {
                promptTokenCount: 50,
                candidatesTokenCount: tokens,
                totalTokenCount: tokens + 50,
            },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
    );
}
