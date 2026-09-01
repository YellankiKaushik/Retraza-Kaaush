import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const generateInput = z.object({
    caseId: z.string().uuid(),
    scenario: z.enum(["CONSERVATIVE", "BALANCED", "AGGRESSIVE"]).default("BALANCED"),
    strategyPreference: z.string().max(40).nullable().default(null),
    idempotencyKey: z.string().min(8).max(80),
});

const replanInput = z.object({
    planId: z.string().uuid(),
    reason: z.enum([
        "CIRCUMSTANCE_CHANGED",
        "PROGRESS_STALLED",
        "NEW_INFORMATION",
        "GOAL_CHANGED",
        "USER_REQUEST",
    ]),
    note: z.string().max(2000).default(""),
    changedFacts: z
        .array(
            z.object({
                category: z.enum(["RESOURCE", "CONSTRAINT", "PREFERENCE", "FACT", "MEASURE"]),
                key: z.string().min(1).max(80),
                value: z.string().min(1).max(600),
            }),
        )
        .max(10)
        .default([]),
    idempotencyKey: z.string().min(8).max(80),
});

/** API-003 — Generate Plan. AI proposes; this function validates and commits. */
export const generatePlan = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((input: unknown) => generateInput.parse(input))
    .handler(async ({ data, context }) => {
        const { supabase, userId } = context;
        const { runPlanGeneration } = await import("@/ai/orchestrator.server");
        const { PROMPT_VERSION } = await import("@/ai/plan-contract");
        const { persistProposal, nextVersionNumber, DomainError } =
            await import("@/lib/planner.server");
        const telemetry = await import("@/lib/telemetry.server");

        const claim = await telemetry.claimIdempotencyKey(userId, "GENERATE_PLAN", data.idempotencyKey);
        if (claim.replay) return claim.replay as { planId: string; versionId: string };

        try {
            await telemetry.assertWithinQuota(userId, "GENERATE_PLAN_GRAPH", 10, 24);

            const caseRow = await supabase
                .from("intake_cases")
                .select("*")
                .eq("id", data.caseId)
                .eq("user_id", userId)
                .maybeSingle();
            if (!caseRow.data) throw new DomainError("FORBIDDEN", "That intake could not be found.");
            if (caseRow.data.status === "REJECTED")
                throw new DomainError(
                    "PLAN_VALIDATION_FAILED",
                    "This request cannot be planned by ReversePath.",
                );

            const facts = await supabase
                .from("case_context_facts")
                .select("category, key, value")
                .eq("case_id", data.caseId)
                .eq("user_id", userId);

            const correlationId = crypto.randomUUID();
            const { data: proposal, meta } = await runPlanGeneration({
                rawText: caseRow.data.raw_text,
                intentType: caseRow.data.intent_type ?? "OTHER",
                objective: {
                    title: caseRow.data.normalized_title,
                    desiredOutcome: caseRow.data.desired_outcome,
                    successCriteria: (caseRow.data.success_criteria as string[] | null) ?? [],
                },
                facts: (facts.data ?? []).map((f) => ({
                    category: f.category,
                    key: f.key,
                    value:
                        typeof f.value === "object" && f.value && "answer" in f.value
                            ? String((f.value as { answer: unknown }).answer)
                            : JSON.stringify(f.value),
                })),
                scenario: data.scenario,
                strategyPreference: data.strategyPreference,
                correlationId,
            });
            await telemetry.recordAiUsage(userId, meta);

            let planId: string;
            const existing = await supabase
                .from("plans")
                .select("id")
                .eq("case_id", data.caseId)
                .eq("user_id", userId)
                .maybeSingle();

            if (existing.data) {
                planId = existing.data.id;
            } else {
                const created = await supabase
                    .from("plans")
                    .insert({ user_id: userId, case_id: data.caseId })
                    .select("id")
                    .single();
                if (created.error) throw new DomainError("INTERNAL_ERROR", created.error.message);
                planId = created.data.id;
            }

            const versionNumber = await nextVersionNumber(supabase, planId);
            if (versionNumber > 1) {
                await supabase
                    .from("plan_versions")
                    .update({ state: "SUPERSEDED" })
                    .eq("plan_id", planId)
                    .eq("state", "ACTIVE");
            }

            const { versionId } = await persistProposal({
                supabase,
                userId,
                planId,
                caseId: data.caseId,
                proposal,
                scenario: data.scenario,
                parentVersionId: null,
                versionNumber,
                modelAlias: meta.modelAlias,
                promptVersion: PROMPT_VERSION,
                activate: true,
                strategyPreference: data.strategyPreference,
            });

            await supabase
                .from("intake_cases")
                .update({ status: "PLANNED" })
                .eq("id", data.caseId)
                .eq("user_id", userId);

            const result = { planId, versionId, blocker: proposal.blocker ?? null };
            await telemetry.completeIdempotencyKey(userId, "GENERATE_PLAN", data.idempotencyKey, result);
            await telemetry.recordAudit({
                userId,
                action: "PLAN_GENERATED",
                resource: "plan_versions",
                resourceId: versionId,
                correlationId,
            });
            return result;
        } catch (error) {
            await telemetry.releaseIdempotencyKey(userId, "GENERATE_PLAN", data.idempotencyKey);
            const err = error as Error & {
                code?: string;
                meta?: Parameters<typeof telemetry.recordAiUsage>[1];
            };
            if (err.meta) await telemetry.recordAiUsage(userId, err.meta);
            throw new Error(err.message);
        }
    });

/** API-008 — Replan. Creates a CANDIDATE version plus a reviewable diff. */
export const replan = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((input: unknown) => replanInput.parse(input))
    .handler(async ({ data, context }) => {
        const { supabase, userId } = context;
        const { runReplan, runChangeExplanation } = await import("@/ai/orchestrator.server");
        const { PROMPT_VERSION } = await import("@/ai/plan-contract");
        const { persistProposal, nextVersionNumber, snapshotText, diffPlanNodes, DomainError } =
            await import("@/lib/planner.server");
        const telemetry = await import("@/lib/telemetry.server");

        const claim = await telemetry.claimIdempotencyKey(userId, "REPLAN", data.idempotencyKey);
        if (claim.replay) return claim.replay as { versionId: string };

        try {
            await telemetry.assertWithinQuota(userId, "REPLAN", 10, 24);

            const plan = await supabase
                .from("plans")
                .select("id, case_id, active_version_id")
                .eq("id", data.planId)
                .eq("user_id", userId)
                .maybeSingle();
            if (!plan.data?.active_version_id)
                throw new DomainError("INVALID_REQUEST", "This plan has no active version to revise.");
            const planRow = plan.data;
            const activeVersionId = planRow.active_version_id as string;

            const [caseRow, activeVersion, nodes, edges] = await Promise.all([
                supabase.from("intake_cases").select("*").eq("id", planRow.case_id).single(),
                supabase.from("plan_versions").select("*").eq("id", activeVersionId).single(),
                supabase.from("plan_nodes").select("*").eq("plan_version_id", activeVersionId),
                supabase.from("plan_edges").select("*").eq("plan_version_id", activeVersionId),
            ]);

            if (data.changedFacts.length > 0) {
                await supabase.from("case_context_facts").insert(
                    data.changedFacts.map((f) => ({
                        user_id: userId,
                        case_id: planRow.case_id,
                        category: f.category,
                        key: f.key,
                        value: { answer: f.value },
                        source: "CHECK_IN",
                        confidence: 1,
                    })),
                );
            }

            const facts = await supabase
                .from("case_context_facts")
                .select("category, key, value")
                .eq("case_id", planRow.case_id)
                .eq("user_id", userId);

            const before = snapshotText({
                nodes: (nodes.data ?? []) as never,
                edges: (edges.data ?? []) as never,
                summary: activeVersion.data?.summary ?? null,
            });

            const correlationId = crypto.randomUUID();
            const { data: proposal, meta } = await runReplan({
                rawText: caseRow.data?.raw_text ?? "",
                intentType: caseRow.data?.intent_type ?? "OTHER",
                objective: {
                    title: caseRow.data?.normalized_title ?? null,
                    desiredOutcome: caseRow.data?.desired_outcome ?? null,
                    successCriteria: (caseRow.data?.success_criteria as string[] | null) ?? [],
                },
                facts: (facts.data ?? []).map((f) => ({
                    category: f.category,
                    key: f.key,
                    value:
                        typeof f.value === "object" && f.value && "answer" in f.value
                            ? String((f.value as { answer: unknown }).answer)
                            : JSON.stringify(f.value),
                })),
                scenario: activeVersion.data?.scenario ?? "BALANCED",
                previous: before,
                reason: data.reason,
                note: data.note,
                correlationId,
            });
            await telemetry.recordAiUsage(userId, meta);

            const versionNumber = await nextVersionNumber(supabase, data.planId);
            const { versionId } = await persistProposal({
                supabase,
                userId,
                planId: data.planId,
                caseId: planRow.case_id,
                proposal,
                scenario: activeVersion.data?.scenario ?? "BALANCED",
                parentVersionId: activeVersionId,
                versionNumber,
                modelAlias: meta.modelAlias,
                promptVersion: PROMPT_VERSION,
                activate: false,
            });

            // FR-019 — "what changed" before activation.
            const afterNodes = await supabase
                .from("plan_nodes")
                .select("*")
                .eq("plan_version_id", versionId);
            const afterEdges = await supabase
                .from("plan_edges")
                .select("*")
                .eq("plan_version_id", versionId);
            const after = snapshotText({
                nodes: (afterNodes.data ?? []) as never,
                edges: (afterEdges.data ?? []) as never,
                summary: proposal.summary,
            });

            let changeRows = diffPlanNodes({
                userId,
                planId: data.planId,
                fromVersionId: activeVersionId,
                toVersionId: versionId,
                beforeNodes: (nodes.data ?? []) as never,
                afterNodes: (afterNodes.data ?? []) as never,
                reasonCode: data.reason,
            });

            try {
                const explanation = await runChangeExplanation({
                    before,
                    after,
                    reason: data.reason,
                    correlationId,
                });
                await telemetry.recordAiUsage(userId, explanation.meta);
                if (explanation.data.changes.length > 0) {
                    changeRows = explanation.data.changes.map((c) => ({
                            user_id: userId,
                            plan_id: data.planId,
                            from_version_id: activeVersionId,
                            to_version_id: versionId,
                            entity_type: c.entityType,
                            entity_id: null,
                            change_type: c.changeType,
                            before_summary: c.beforeSummary,
                            after_summary: c.afterSummary,
                            reason_code: data.reason,
                    }));
                }
            } catch {
                // The deterministic diff above keeps the candidate reviewable.
            }

            if (changeRows.length > 0) {
                await supabase.from("plan_changes").insert(changeRows);
            }

            const result = { versionId, versionNumber, requiresAcceptance: true };
            await telemetry.completeIdempotencyKey(userId, "REPLAN", data.idempotencyKey, result);
            await telemetry.recordAudit({
                userId,
                action: "REPLAN_PROPOSED",
                resource: "plan_versions",
                resourceId: versionId,
                correlationId,
            });
            return result;
        } catch (error) {
            await telemetry.releaseIdempotencyKey(userId, "REPLAN", data.idempotencyKey);
            const err = error as Error & { meta?: Parameters<typeof telemetry.recordAiUsage>[1] };
            if (err.meta) await telemetry.recordAiUsage(userId, err.meta);
            throw new Error(err.message);
        }
    });

/** API-005 — Activate Plan Version. BR-002: exactly one ACTIVE version. */
export const activatePlanVersion = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((input: unknown) =>
        z.object({ planId: z.string().uuid(), versionId: z.string().uuid() }).parse(input),
    )
    .handler(async ({ data, context }) => {
        const { supabase, userId } = context;
        const telemetry = await import("@/lib/telemetry.server");

        const target = await supabase
            .from("plan_versions")
            .select("id, state")
            .eq("id", data.versionId)
            .eq("plan_id", data.planId)
            .eq("user_id", userId)
            .maybeSingle();
        if (!target.data) throw new Error("That plan version could not be found.");

        await supabase
            .from("plan_versions")
            .update({ state: "SUPERSEDED" })
            .eq("plan_id", data.planId)
            .eq("state", "ACTIVE");

        const { error } = await supabase
            .from("plan_versions")
            .update({ state: "ACTIVE" })
            .eq("id", data.versionId);
        if (error) throw new Error(error.message);

        await supabase
            .from("plans")
            .update({ active_version_id: data.versionId })
            .eq("id", data.planId);
        await telemetry.recordAudit({
            userId,
            action: "VERSION_ACTIVATED",
            resource: "plan_versions",
            resourceId: data.versionId,
        });
        return { ok: true };
    });

export const rejectPlanVersion = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((input: unknown) => z.object({ versionId: z.string().uuid() }).parse(input))
    .handler(async ({ data, context }) => {
        const { error } = await context.supabase
            .from("plan_versions")
            .update({ state: "REJECTED" })
            .eq("id", data.versionId)
            .eq("user_id", context.userId)
            .eq("state", "CANDIDATE");
        if (error) throw new Error(error.message);
        return { ok: true };
    });

/** FR-021 / BR-011 — the user is the final decision maker on strategy. */
export const selectStrategy = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((input: unknown) =>
        z.object({ versionId: z.string().uuid(), strategyId: z.string().uuid() }).parse(input),
    )
    .handler(async ({ data, context }) => {
        const { supabase, userId } = context;
        await supabase
            .from("strategies")
            .update({ selected: false })
            .eq("plan_version_id", data.versionId)
            .eq("user_id", userId);
        const { error } = await supabase
            .from("strategies")
            .update({ selected: true })
            .eq("id", data.strategyId)
            .eq("user_id", userId);
        if (error) throw new Error(error.message);

        const telemetry = await import("@/lib/telemetry.server");
        await telemetry.recordAudit({
            userId,
            action: "STRATEGY_SELECTED",
            resource: "strategies",
            resourceId: data.strategyId,
            metadata: { override: true },
        });
        return { ok: true };
    });

export const updateAssumption = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((input: unknown) =>
        z
            .object({
                assumptionId: z.string().uuid(),
                status: z.enum(["UNVALIDATED", "VALIDATED", "INVALIDATED", "ACCEPTED"]),
            })
            .parse(input),
    )
    .handler(async ({ data, context }) => {
        const { error } = await context.supabase
            .from("assumptions")
            .update({ status: data.status })
            .eq("id", data.assumptionId)
            .eq("user_id", context.userId);
        if (error) throw new Error(error.message);
        return { ok: true };
    });

export const updateRisk = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((input: unknown) =>
        z
            .object({
                riskId: z.string().uuid(),
                status: z.enum(["OPEN", "MITIGATED", "ACCEPTED", "OCCURRED", "CLOSED"]),
            })
            .parse(input),
    )
    .handler(async ({ data, context }) => {
        const { error } = await context.supabase
            .from("risks")
            .update({ status: data.status })
            .eq("id", data.riskId)
            .eq("user_id", context.userId);
        if (error) throw new Error(error.message);
        return { ok: true };
    });
