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
        { workflow: "unreviewed-workflow" },
        { workflow: "essential" },
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
it("binds essential acceptance to a fresh owner file without increasing the existing AI budget", () => {
    const f = fixture();
    const env = {
        ...f.env,
        RUN_SUPABASE_RLS_TESTS: "false",
        RUN_E2E_GOLDEN: "true",
        AI_PROVIDER_MODE: "live",
        AI_PROVIDER_ALLOWLIST: "gemini,groq",
        AI_PROVIDER_MAX_RETRIES: "0",
    };
    const approval = {
        ...f.approval,
        scope: "golden-live",
        workflow: "essential",
        maxAiOperations: 6,
        appOrigin: "https://retraza-kaaush-reviewed.vercel.app",
    };
    writeFileSync(f.approvalPath, JSON.stringify(approval));
    expect(sharedTestApproval(env)).toMatchObject({
        workflow: "essential",
        maxUsers: 2,
        maxAiOperations: 6,
    });
    expect(() => sharedTestApproval({ ...env, AI_PROVIDER_MAX_RETRIES: "1" })).toThrow();
    expect(() => sharedTestApproval({ ...env, RETRAZA_TEST_RUN_ID: randomUUID() })).toThrow();
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

it("allows delete-denial probes only for exact rows inserted by this approved RLS run", async () => {
    const f = fixture();
    const origin = "https://usvopldwiwzlvoqawvcu.supabase.co";
    const ids = [randomUUID(), randomUUID()];
    const rowId = randomUUID();
    let created = 0;
    const request = vi.fn(async (input, init) => {
        const path = new URL(String(input)).pathname;
        if (path === "/auth/v1/admin/users")
            return Response.json({ id: ids[created++], ...JSON.parse(String(init.body)) });
        if (init.method === "POST") return Response.json([{ id: rowId }]);
        return Response.json([]);
    });
    const guarded = guardSharedTestFetch(request, f.env);
    for (const marker of ["a", "b"])
        await guarded(origin + "/auth/v1/admin/users", {
            method: "POST",
            body: JSON.stringify({ email: `${f.runId}-${marker}@example.test` }),
        });
    const headers = (id: string) => ({
        Authorization:
            "Bearer x." + Buffer.from(JSON.stringify({ sub: id })).toString("base64url") + ".x",
    });
    const probe = (path: string) =>
        guarded(origin + path, { method: "DELETE", headers: headers(ids[1]) });
    await expect(probe(`/rest/v1/plans?id=eq.${rowId}&select=id`)).rejects.toThrow(
        "DELETE_TARGET_NOT_OWNED",
    );
    await guarded(origin + "/rest/v1/plans", {
        method: "POST",
        headers: headers(ids[0]),
        body: JSON.stringify({ user_id: ids[0] }),
    });
    const allowed = `/rest/v1/plans?id=eq.${rowId}&select=id`;
    for (const path of [
        "/rest/v1/plans?select=id",
        `/rest/v1/plans?id=eq.${randomUUID()}&select=id`,
        `/rest/v1/actions?id=eq.${rowId}&select=id`,
        `/rest/v1/plans?id=neq.${rowId}&select=id`,
        allowed + "&or=(id.not.is.null)",
        allowed + `&id=eq.${randomUUID()}`,
        allowed.replace("select=id", "select=*"),
        `/rest/v1/rpc/persist_plan_graph?id=eq.${rowId}&select=id`,
    ]) {
        const before = request.mock.calls.length;
        await expect(probe(path)).rejects.toThrow("DELETE_TARGET_NOT_OWNED");
        expect(request.mock.calls).toHaveLength(before);
    }
    expect((await probe(allowed)).ok).toBe(true);

    writeFileSync(f.approvalPath, JSON.stringify({ ...f.approval, scope: "golden-mock" }));
    const golden = guardSharedTestFetch(request, {
        ...f.env,
        RUN_SUPABASE_RLS_TESTS: "false",
        RUN_E2E_GOLDEN: "true",
        AI_PROVIDER_MODE: "mock",
    });
    await expect(
        golden(origin + allowed, { method: "DELETE", headers: headers(ids[1]) }),
    ).rejects.toThrow("DELETE_TARGET_NOT_OWNED");
});
