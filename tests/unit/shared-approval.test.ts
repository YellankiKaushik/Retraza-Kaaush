import { afterEach, expect, it, vi } from "vitest";
import { mkdtempSync, writeFileSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import {
    sharedTestApproval,
    assertRequestedDatabaseTestsAreSafe,
} from "../../scripts/test-environment.mjs";
import { migrationManifestHash } from "../../scripts/shared-preflight.mjs";
import { guardSharedTestFetch } from "../../scripts/shared-test-fetch.mjs";

const dirs: string[] = [];
const runIds: string[] = [];
afterEach(() => {
    for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
    for (const id of runIds.splice(0)) {
        const lock = join("logs/shared-test-runs", id + ".lock");
        if (existsSync(lock)) rmSync(lock);
    }
});
function fixture() {
    const dir = mkdtempSync(join(tmpdir(), "retraza-approval-"));
    dirs.push(dir);
    const runId = randomUUID();
    runIds.push(runId);
    const projectRef = "usvopldwiwzlvoqawvcu";
    const schemaEvidenceFile = join(dir, "synthetic-proof.json");
    const proof = JSON.stringify({
        projectRef,
        checkedAt: new Date().toISOString(),
        catalogVerified: true,
        compatible: true,
        migrationManifestHash: migrationManifestHash(),
        catalogSha256: "a".repeat(64),
    });
    writeFileSync(schemaEvidenceFile, proof);
    const approvalPath = join(dir, "synthetic-approval.local");
    const approval = {
        projectRef,
        schemaEvidenceFile,
        schemaEvidenceSha256: createHash("sha256").update(proof).digest("hex"),
        acknowledgement: `I approve temporary test records in shared project ${projectRef}.`,
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        scope: "rls",
        maxUsers: 2,
        maxAiOperations: 0,
        runId,
    };
    writeFileSync(approvalPath, JSON.stringify(approval));
    const env = {
        RETRAZA_TEST_BACKEND_MODE: "controlled-shared",
        RETRAZA_SHARED_TEST_APPROVAL_FILE: approvalPath,
        RETRAZA_TEST_RUN_ID: runId,
        RUN_SUPABASE_RLS_TESTS: "true",
        SUPABASE_URL: `https://${projectRef}.supabase.co`,
    };
    return { env, approval, approvalPath, schemaEvidenceFile, runId };
}
it("requires exact project, scope, run, user budget and expiring owner acknowledgement", () => {
    const f = fixture();
    expect(sharedTestApproval(f.env)).toMatchObject({ scope: "rls", maxUsers: 2 });
    for (const patch of [
        { projectRef: "another" },
        { acknowledgement: "yes" },
        { maxUsers: 3 },
        { expiresAt: "2000-01-01" },
        { runId: randomUUID() },
        { scope: "golden-live" },
    ]) {
        writeFileSync(f.approvalPath, JSON.stringify({ ...f.approval, ...patch }));
        expect(() => sharedTestApproval(f.env)).toThrow("SHARED_TEST_APPROVAL_INVALID");
    }
});
it("cannot authorize shared writes with an isolation flag or an incomplete schema proof", () => {
    const f = fixture();
    expect(() =>
        assertRequestedDatabaseTestsAreSafe({
            ...f.env,
            RETRAZA_TEST_BACKEND_MODE: "read-only",
            RETRAZA_TEST_BACKEND_ISOLATED: "true",
        }),
    ).toThrow("TEST_ENVIRONMENT_NOT_ISOLATED");
    writeFileSync(f.schemaEvidenceFile, JSON.stringify({ catalogVerified: false }));
    expect(() => sharedTestApproval(f.env)).toThrow("SHARED_TEST_APPROVAL_INVALID");
});
it("blocks default shared admin mutations before any network request", async () => {
    const request = vi.fn();
    await expect(
        guardSharedTestFetch(request, {})(
            "https://usvopldwiwzlvoqawvcu.supabase.co/auth/v1/admin/users",
            { method: "POST", body: "{}" },
        ),
    ).rejects.toThrow("SHARED_BACKEND_READ_ONLY");
    expect(request).not.toHaveBeenCalled();
});
it("limits creation to two tagged users and verifies ownership again before deleting", async () => {
    const f = fixture();
    const users = new Map<string, Record<string, unknown>>();
    const request = vi.fn(async (input: string | URL, init?: RequestInit) => {
        const id = new URL(String(input)).pathname.split("/").at(-1)!;
        if (init?.method === "POST") {
            const user = { ...JSON.parse(String(init.body)), id: randomUUID() };
            users.set(user.id, user);
            return Response.json(user);
        }
        if (init?.method === "DELETE") {
            users.delete(id);
            return Response.json({});
        }
        return Response.json(users.get(id));
    });
    const guarded = guardSharedTestFetch(request, f.env);
    const endpoint = "https://usvopldwiwzlvoqawvcu.supabase.co/auth/v1/admin/users";
    const create = (suffix: string) =>
        guarded(endpoint, {
            method: "POST",
            body: JSON.stringify({ email: `test-${f.runId}-${suffix}@example.test` }),
        });
    const first = await (await create("a")).json();
    expect(first.app_metadata.retraza_test_run_id).toBe(f.runId);
    await create("b");
    await expect(create("c")).rejects.toThrow("USER_BUDGET_EXCEEDED");
    await expect(guarded(endpoint + "/" + randomUUID(), { method: "DELETE" })).rejects.toThrow(
        "TARGET_NOT_OWNED",
    );
    await guarded(endpoint + "/" + first.id, { method: "DELETE" });
    expect(users.has(first.id)).toBe(false);
    expect(request.mock.calls.at(-2)?.[1]?.method).toBe("GET");
    expect(request.mock.calls.at(-1)?.[1]?.method).toBe("DELETE");
});
it("leaves accounts untouched if remote cleanup ownership cannot be confirmed", async () => {
    const f = fixture();
    let user: Record<string, unknown>;
    const request = vi.fn(async (_input, init) => {
        if (init?.method === "POST") {
            user = { id: randomUUID(), ...JSON.parse(init.body) };
            return Response.json(user);
        }
        return Response.json({ ...user, app_metadata: {} });
    });
    const guarded = guardSharedTestFetch(request, f.env);
    const endpoint = "https://usvopldwiwzlvoqawvcu.supabase.co/auth/v1/admin/users";
    const created = await guarded(endpoint, {
        method: "POST",
        body: JSON.stringify({ email: `test-${f.runId}@example.test` }),
    });
    await expect(
        guarded(endpoint + "/" + (await created.json()).id, { method: "DELETE" }),
    ).rejects.toThrow("TARGET_NOT_VERIFIED");
    expect(request.mock.calls.some(([, init]) => init?.method === "DELETE")).toBe(false);
});
