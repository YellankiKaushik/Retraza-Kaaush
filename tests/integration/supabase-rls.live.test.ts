import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { Database } from "@/integrations/supabase/types";

const enabled = process.env["RUN_SUPABASE_RLS_TESTS"] === "true";
const url = process.env["SUPABASE_TEST_URL"];
const anonKey = process.env["SUPABASE_TEST_ANON_KEY"];
const serviceRoleKey = process.env["SUPABASE_TEST_SERVICE_ROLE_KEY"];

const describeIfConfigured = enabled && url && anonKey && serviceRoleKey ? describe : describe.skip;

async function signIn(email: string, password: string): Promise<SupabaseClient<Database>> {
    const client = createClient<Database>(url!, anonKey!, {
        auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error } = await client.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return client;
}

describeIfConfigured("live Supabase RLS two-user isolation", () => {
    const password = "ReversePath-test-password-12345";
    const users: string[] = [];
    let admin: SupabaseClient<Database>;
    let userA: SupabaseClient<Database>;
    let userB: SupabaseClient<Database>;
    let userAId = "";
    let userBId = "";

    beforeAll(async () => {
        admin = createClient<Database>(url!, serviceRoleKey!, {
            auth: { persistSession: false, autoRefreshToken: false },
        });

        for (const marker of ["a", "b"]) {
            const email = `reversepath-rls-${marker}-${crypto.randomUUID()}@example.test`;
            const { data, error } = await admin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
            });
            if (error) throw error;
            users.push(data.user.id);
            if (marker === "a") userAId = data.user.id;
            else userBId = data.user.id;
            if (marker === "a") userA = await signIn(email, password);
            else userB = await signIn(email, password);
        }
    });

    afterAll(async () => {
        if (!admin) return;
        await Promise.all(users.map((userId) => admin.auth.admin.deleteUser(userId)));
    });

    it("prevents another authenticated user from reading or mutating private case data", async () => {
        const created = await userA
            .from("intake_cases")
            .insert({
                user_id: userAId,
                raw_text: "I want to test cross-user isolation.",
                normalized_title: "Cross-user isolation",
                status: "READY_FOR_PLANNING",
            })
            .select("id")
            .single();
        expect(created.error).toBeNull();
        const caseId = created.data!.id;

        const readByB = await userB.from("intake_cases").select("id").eq("id", caseId);
        expect(readByB.error).toBeNull();
        expect(readByB.data).toEqual([]);

        const updateByB = await userB
            .from("intake_cases")
            .update({ normalized_title: "tampered" })
            .eq("id", caseId)
            .select("id");
        expect(updateByB.error).toBeNull();
        expect(updateByB.data).toEqual([]);

        const unchanged = await userA
            .from("intake_cases")
            .select("normalized_title")
            .eq("id", caseId)
            .single();
        expect(unchanged.data?.normalized_title).toBe("Cross-user isolation");
    });

    it("rejects child rows that point at another user's parent record", async () => {
        const created = await userA
            .from("intake_cases")
            .insert({
                user_id: userAId,
                raw_text: "I want to test ownership triggers.",
                normalized_title: "Ownership trigger",
                status: "READY_FOR_PLANNING",
            })
            .select("id")
            .single();
        expect(created.error).toBeNull();

        const crossInsert = await userB.from("case_context_facts").insert({
            user_id: userBId,
            case_id: created.data!.id,
            category: "FACT",
            key: "malicious",
            value: { answer: "cross-user insert" },
            source: "TEST",
        });

        expect(crossInsert.error?.message).toMatch(/ownership violation|row-level security/i);
    });
});
