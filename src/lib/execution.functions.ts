import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** API-006 — Update Action (FR-016: complete / defer / skip / block / edit). */
export const updateAction = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((input: unknown) =>
        z
            .object({
                nodeId: z.string().uuid(),
                status: z.enum([
                    "PENDING",
                    "IN_PROGRESS",
                    "DONE",
                    "BLOCKED",
                    "SKIPPED",
                    "DEFERRED",
                ]),
                note: z.string().max(1200).optional(),
                dueAt: z.string().datetime().nullable().optional(),
            })
            .parse(input),
    )
    .handler(async ({ data, context }) => {
        const { updateActionState } = await import("@/lib/action-execution.server");
        return updateActionState(data, context);
    });

/** FR-021 — the user can edit AI-authored actions. */
export const editAction = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((input: unknown) =>
        z
            .object({
                nodeId: z.string().uuid(),
                title: z.string().min(2).max(160),
                description: z.string().max(800),
                completionCriteria: z.string().max(400),
                estimatedMinutes: z.number().int().min(1).max(100000).nullable(),
            })
            .parse(input),
    )
    .handler(async ({ data, context }) => {
        const { supabase, userId } = context;

        const { error } = await supabase.rpc("update_execution_node", {
            target_node_id: data.nodeId,
            patch: {
                title: data.title,
                description: data.description,
                completionCriteria: data.completionCriteria,
                estimatedMinutes: data.estimatedMinutes,
            },
        });
        if (error) throw new Error(`Action details could not be saved: ${error.message}`);

        const telemetry = await import("@/lib/telemetry.server");
        await telemetry.recordAudit({
            userId,
            action: "ACTION_EDITED",
            resource: "plan_nodes",
            resourceId: data.nodeId,
            metadata: { override: true },
        });
        return { ok: true };
    });

/** API-007 — Submit Check-In (FR-017). */
export const submitCheckIn = createServerFn({ method: "POST" })
    .middleware([requireSupabaseAuth])
    .inputValidator((input: unknown) =>
        z
            .object({
                planId: z.string().uuid(),
                note: z.string().max(2000).default(""),
                progressRating: z.number().int().min(1).max(5).nullable().default(null),
                changedFacts: z
                    .array(
                        z.object({
                            category: z.enum([
                                "RESOURCE",
                                "CONSTRAINT",
                                "PREFERENCE",
                                "FACT",
                                "MEASURE",
                            ]),
                            key: z.string().min(1).max(80),
                            value: z.string().min(1).max(600),
                        }),
                    )
                    .max(10)
                    .default([]),
            })
            .parse(input),
    )
    .handler(async ({ data, context }) => {
        const { supabase } = context;

        const { error } = await supabase.rpc("save_plan_check_in", {
            target_plan_id: data.planId,
            note: data.note,
            progress_rating: data.progressRating,
            changed_facts: data.changedFacts,
        });
        if (error) throw new Error(`Check-in could not be saved: ${error.message}`);

        return {
            ok: true,
            suggestsReplan: data.changedFacts.length > 0 || (data.progressRating ?? 3) <= 2,
        };
    });
