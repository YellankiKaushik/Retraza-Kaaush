import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const createIntakeInput = z.object({
    text: z.string().min(8).max(10_000),
    timezone: z.string().max(80).optional(),
    locale: z.string().max(20).optional(),
    idempotencyKey: z.string().min(8).max(80),
});

const clarificationInput = z.object({
    caseId: z.string().uuid(),
    answers: z
        .array(
            z.object({
                key: z.string().min(1).max(60),
                question: z.string().max(240),
                category: z.enum(["RESOURCE", "CONSTRAINT", "PREFERENCE", "FACT", "MEASURE"]),
                answer: z.string().max(1200),
            }),
        )
        .max(8),
});

const factInput = z.object({
    caseId: z.string().uuid(),
    category: z.enum(["RESOURCE", "CONSTRAINT", "PREFERENCE", "FACT", "MEASURE"]),
    key: z.string().min(1).max(80),
    answer: z.string().min(1).max(1200),
});

/** API-001 — Create Intake: classify, normalise and ask only material questions. */
export const createIntake = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((input: unknown) => createIntakeInput.parse(input))
    .handler(async ({ data, context }) => {
        const { supabase, userId } = context;
        const { runIntakeAnalysis } = await import("@/ai/orchestrator.server");
        const telemetry = await import("@/lib/telemetry.server");

        const claim = await telemetry.claimIdempotencyKey(
            userId,
            "CREATE_INTAKE",
            data.idempotencyKey,
        );
        if (claim.replay) return claim.replay as { caseId: string };

        try {
            await telemetry.assertWithinQuota(
                userId,
                "CLASSIFY_AND_CLARIFY",
                telemetry.configuredDailyAiLimit("CLASSIFY_AND_CLARIFY", 20),
                24,
            );

            const correlationId = crypto.randomUUID();
            const { data: analysis, meta } = await runIntakeAnalysis({
                rawText: data.text,
                ...(data.timezone ? { timezone: data.timezone } : {}),
                ...(data.locale ? { locale: data.locale } : {}),
                correlationId,
            });
            await telemetry.recordAiUsage(userId, meta);

            const status = !analysis.policy.supported
                ? "REJECTED"
                : analysis.questions.length > 0 || analysis.clarity.score < 70
                  ? "NEEDS_CLARIFICATION"
                  : "READY_FOR_PLANNING";

            const { data: created, error } = await supabase
                .from("intake_cases")
                .insert({
                    user_id: userId,
                    raw_text: data.text,
                    intent_type: analysis.intentType,
                    intent_confidence: analysis.intentConfidence,
                    normalized_title: analysis.normalizedObjective.title,
                    desired_outcome: analysis.normalizedObjective.desiredOutcome,
                    success_criteria: analysis.normalizedObjective.successCriteria,
                    time_horizon: analysis.normalizedObjective.timeHorizon
                        ? { text: analysis.normalizedObjective.timeHorizon }
                        : null,
                    clarity_score: Math.round(analysis.clarity.score),
                    clarification_questions: analysis.questions,
                    policy_flags: analysis.policy.supported
                        ? analysis.policy.flags
                        : [...analysis.policy.flags, analysis.policy.reason],
                    status,
                })
                .select("id")
                .single();

            if (error) throw new Error(error.message);

            const result = {
                caseId: created.id,
                intentType: analysis.intentType,
                status,
                questions: analysis.questions,
                clarityScore: Math.round(analysis.clarity.score),
                missing: analysis.clarity.missingCriticalInformation,
                policy: analysis.policy,
            };

            await telemetry.completeIdempotencyKey(
                userId,
                "CREATE_INTAKE",
                data.idempotencyKey,
                result,
            );
            await telemetry.recordAudit({
                userId,
                action: "INTAKE_CREATED",
                resource: "intake_cases",
                resourceId: created.id,
                correlationId,
            });
            return result;
        } catch (error) {
            await telemetry.releaseIdempotencyKey(userId, "CREATE_INTAKE", data.idempotencyKey);
            const err = error as Error & { code?: string; meta?: never };
            if (err.code && err.code.startsWith("AI_")) {
                const withMeta = error as Error & {
                    meta?: Parameters<typeof telemetry.recordAiUsage>[1];
                };
                if (withMeta.meta) await telemetry.recordAiUsage(userId, withMeta.meta);
            }
            throw new Error(err.message);
        }
    });

/** API-002 — Submit Clarification: answers become durable context facts. */
export const submitClarification = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((input: unknown) => clarificationInput.parse(input))
    .handler(async ({ data, context }) => {
        const { supabase, userId } = context;

        const answered = data.answers.filter((a) => a.answer.trim().length > 0);
        if (answered.length > 0) {
            const { error } = await supabase.from("case_context_facts").insert(
                answered.map((a) => ({
                    user_id: userId,
                    case_id: data.caseId,
                    category: a.category,
                    key: a.question || a.key,
                    value: { answer: a.answer.trim() },
                    source: "USER_CLARIFICATION",
                    confidence: 1,
                })),
            );
            if (error) throw new Error(error.message);
        }

        const { error: updateError } = await supabase
            .from("intake_cases")
            .update({ status: "READY_FOR_PLANNING" })
            .eq("id", data.caseId)
            .eq("user_id", userId);
        if (updateError) throw new Error(updateError.message);

        return { ok: true, factsSaved: answered.length };
    });

/** FR-021 — the user can add or correct context at any time. */
export const addContextFact = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((input: unknown) => factInput.parse(input))
    .handler(async ({ data, context }) => {
        const { error } = await context.supabase.from("case_context_facts").insert({
            user_id: context.userId,
            case_id: data.caseId,
            category: data.category,
            key: data.key,
            value: { answer: data.answer },
            source: "USER",
            confidence: 1,
        });
        if (error) throw new Error(error.message);
        return { ok: true };
    });

export const deleteContextFact = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((input: unknown) => z.object({ factId: z.string().uuid() }).parse(input))
    .handler(async ({ data, context }) => {
        const { error } = await context.supabase
            .from("case_context_facts")
            .delete()
            .eq("id", data.factId)
            .eq("user_id", context.userId);
        if (error) throw new Error(error.message);
        return { ok: true };
    });

/** FR-021 — edit the normalised objective the AI derived. */
export const updateObjective = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((input: unknown) =>
        z
            .object({
                caseId: z.string().uuid(),
                title: z.string().min(3).max(160),
                desiredOutcome: z.string().min(3).max(600),
                successCriteria: z.array(z.string().max(240)).max(8),
                timeHorizon: z.string().max(120).nullable(),
            })
            .parse(input),
    )
    .handler(async ({ data, context }) => {
        const { error } = await context.supabase
            .from("intake_cases")
            .update({
                normalized_title: data.title,
                desired_outcome: data.desiredOutcome,
                success_criteria: data.successCriteria,
                time_horizon: data.timeHorizon ? { text: data.timeHorizon } : null,
            })
            .eq("id", data.caseId)
            .eq("user_id", context.userId);
        if (error) throw new Error(error.message);
        return { ok: true };
    });
