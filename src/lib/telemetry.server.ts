import { supabaseAdmin } from "@/integrations/supabase/client.server";

import type { AiCallMeta } from "@/ai/orchestrator.server";

/** NFR-OBS-001 — record model, prompt version, latency, tokens, outcome, schema validity. */
export async function recordAiUsage(userId: string, meta: AiCallMeta) {
    await supabaseAdmin.from("ai_usage_events").insert({
        user_id: userId,
        operation: meta.operation,
        provider: meta.provider,
        model_alias: meta.providerModel
            ? `${meta.modelAlias}:${meta.providerModel}`
            : meta.modelAlias,
        prompt_version: meta.promptVersion,
        input_tokens: meta.inputTokens,
        output_tokens: meta.outputTokens,
        latency_ms: meta.latencyMs,
        outcome: meta.outcome,
        schema_valid: meta.schemaValid,
        correlation_id: meta.correlationId,
    });
}

export async function recordAudit(input: {
    userId: string;
    action: string;
    resource?: string;
    resourceId?: string | null;
    result?: string;
    correlationId?: string;
    metadata?: Record<string, unknown>;
}) {
    await supabaseAdmin.from("audit_events").insert({
        user_id: input.userId,
        action: input.action,
        resource: input.resource ?? null,
        resource_id: input.resourceId ?? null,
        result: input.result ?? "OK",
        correlation_id: input.correlationId ?? null,
        metadata: (input.metadata ?? {}) as never,
    });
}

export function configuredDailyAiLimit(operation: string, fallback: number) {
    const candidates = [
        process.env[`AI_LIMIT_${operation}_PER_DAY`],
        process.env["AI_DAILY_REQUEST_LIMIT"],
    ];
    for (const candidate of candidates) {
        const parsed = Number(candidate);
        if (Number.isFinite(parsed) && parsed > 0) return Math.floor(parsed);
    }
    return fallback;
}

/** FR-024 — server-side quota enforcement. */
export async function assertWithinQuota(
    userId: string,
    operation: string,
    max: number,
    windowHours: number,
) {
    const since = new Date(Date.now() - windowHours * 3600_000).toISOString();
    const { count, error } = await supabaseAdmin
        .from("ai_usage_events")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("operation", operation)
        .gte("created_at", since);

    if (error) throw new Error("AI usage could not be checked. Please try again later.");

    if ((count ?? 0) >= max) {
        const error = new Error(
            `You've reached the limit of ${max} of these AI requests per ${windowHours === 1 ? "hour" : `${windowHours} hours`}. Saved plans still work.`,
        ) as Error & { code: string };
        error.code = "RATE_LIMITED";
        throw error;
    }
}

/** Idempotency for AI and other expensive writes. */
export async function claimIdempotencyKey(userId: string, operation: string, key: string) {
    // The unique constraint is the lock: only the successful insert owns work.
    const inserted = await supabaseAdmin
        .from("idempotency_keys")
        .insert({ user_id: userId, operation, key });
    if (!inserted.error) return { replay: null };
    if (inserted.error.code !== "23505")
        throw new Error("This request could not be reserved. Please try again later.");

    const existing = await supabaseAdmin
        .from("idempotency_keys")
        .select("result_reference")
        .eq("user_id", userId)
        .eq("operation", operation)
        .eq("key", key)
        .maybeSingle();

    if (existing.error)
        throw new Error("This request could not be checked. Please try again later.");
    if (existing.data?.result_reference)
        return { replay: existing.data.result_reference as Record<string, unknown> };
    throw new Error("This request is already processing. Wait for it to finish before retrying.");
}

export async function completeIdempotencyKey(
    userId: string,
    operation: string,
    key: string,
    result: Record<string, unknown>,
) {
    const { error } = await supabaseAdmin
        .from("idempotency_keys")
        .update({ result_reference: result as never })
        .eq("user_id", userId)
        .eq("operation", operation)
        .eq("key", key);
    if (error) {
        const failure = new Error(
            "The result was saved, but its request receipt could not be recorded. Refresh before retrying.",
        ) as Error & { preserveClaim: boolean };
        failure.preserveClaim = true;
        throw failure;
    }
}

export async function releaseIdempotencyKey(userId: string, operation: string, key: string) {
    await supabaseAdmin
        .from("idempotency_keys")
        .delete()
        .eq("user_id", userId)
        .eq("operation", operation)
        .eq("key", key)
        .is("result_reference", null);
}
