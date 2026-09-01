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
                status: z.enum(["PENDING", "IN_PROGRESS", "DONE", "BLOCKED", "SKIPPED", "DEFERRED"]),
                note: z.string().max(1200).optional(),
                dueAt: z.string().datetime().nullable().optional(),
            })
            .parse(input),
    )
    .handler(async ({ data, context }) => {
        const { supabase, userId } = context;

        const node = await supabase
            .from("plan_nodes")
            .select("id, title")
            .eq("id", data.nodeId)
            .eq("user_id", userId)
            .maybeSingle();
        if (!node.data) throw new Error("That action could not be found.");

        const { error } = await supabase
            .from("plan_nodes")
            .update({ status: data.status })
            .eq("id", data.nodeId)
            .eq("user_id", userId);
        if (error) throw new Error(error.message);

        const actionPatch: {
            completed_at: string | null;
            result?: { note: string } | null;
            due_at?: string | null;
        } = {
            completed_at: data.status === "DONE" ? new Date().toISOString() : null,
        };
        if (data.note !== undefined) actionPatch.result = data.note ? { note: data.note } : null;
        if (data.dueAt !== undefined) actionPatch.due_at = data.dueAt;

        await supabase
            .from("actions")
            .update(actionPatch as never)
            .eq("plan_node_id", data.nodeId)
            .eq("user_id", userId);

        const telemetry = await import("@/lib/telemetry.server");
        await telemetry.recordAudit({
            userId,
            action: `ACTION_${data.status}`,
            resource: "plan_nodes",
            resourceId: data.nodeId,
        });

        return { ok: true };
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

        const { error } = await supabase
            .from("plan_nodes")
            .update({ title: data.title, description: data.description })
            .eq("id", data.nodeId)
            .eq("user_id", userId);
        if (error) throw new Error(error.message);

        const existing = await supabase
            .from("actions")
            .select("revision")
            .eq("plan_node_id", data.nodeId)
            .eq("user_id", userId)
            .maybeSingle();

        await supabase
            .from("actions")
            .update({
                completion_criteria: data.completionCriteria,
                estimated_minutes: data.estimatedMinutes,
                revision: (existing.data?.revision ?? 1) + 1,
            })
            .eq("plan_node_id", data.nodeId)
            .eq("user_id", userId);

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
                            category: z.enum(["RESOURCE", "CONSTRAINT", "PREFERENCE", "FACT", "MEASURE"]),
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
        const { supabase, userId } = context;

        const plan = await supabase
            .from("plans")
            .select("id, case_id")
            .eq("id", data.planId)
            .eq("user_id", userId)
            .maybeSingle();
        if (!plan.data) throw new Error("That plan could not be found.");
        const planRow = plan.data;

        const { error } = await supabase.from("check_ins").insert({
            user_id: userId,
            plan_id: data.planId,
            note: data.note || null,
            progress_rating: data.progressRating,
            changed_facts: data.changedFacts,
        });
        if (error) throw new Error(error.message);

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

        return {
            ok: true,
            suggestsReplan: data.changedFacts.length > 0 || (data.progressRating ?? 3) <= 2,
        };
    });
