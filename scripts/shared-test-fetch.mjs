import { mkdirSync, openSync, closeSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { sharedTestApproval } from "./test-environment.mjs";

const runs = new Map();
const sharedHost = "usvopldwiwzlvoqawvcu.supabase.co";

function subject(token) {
    try {
        return JSON.parse(Buffer.from(token.split(".")[1], "base64url")).sub;
    } catch {
        return null;
    }
}

// Every shared mutation is checked again at the network boundary.
export function guardSharedTestFetch(request, env = process.env) {
    return async (input, init) => {
        const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
        if (url.hostname.toLowerCase().replace(/\.$/, "") !== sharedHost)
            return request(input, init);
        const method = (
            init?.method || (input instanceof Request ? input.method : "GET")
        ).toUpperCase();
        const adminPath = "/auth/v1/admin/users";
        if (["GET", "HEAD"].includes(method) && !url.pathname.startsWith(adminPath))
            return request(input, init);
        const approval = sharedTestApproval(env);
        if (!approval)
            throw new Error(
                "SHARED_BACKEND_READ_ONLY: remote test writes and admin user access require explicit project-specific approval.",
            );
        let state = runs.get(approval.runId);
        if (!state) {
            state = { users: new Map(), attempts: 0, token: randomUUID(), claimed: false };
            runs.set(approval.runId, state);
        }
        const headers = new Headers(
            init?.headers || (input instanceof Request ? input.headers : undefined),
        );
        const body = init?.body ? JSON.parse(String(init.body)) : {};
        if (url.pathname === adminPath && method === "POST") {
            if (!state.claimed) {
                mkdirSync("logs/shared-test-runs", { recursive: true });
                const fd = openSync("logs/shared-test-runs/" + approval.runId + ".lock", "wx");
                closeSync(fd);
                state.claimed = true;
            }
            if (++state.attempts > approval.maxUsers)
                throw new Error(
                    "SHARED_TEST_USER_BUDGET_EXCEEDED: create a new reviewed approval for another run.",
                );
            if (typeof body.email !== "string" || !body.email.includes(approval.runId))
                throw new Error(
                    "Test account email must contain the approved unique run identifier.",
                );
            const tagged = {
                ...body,
                app_metadata: {
                    ...body.app_metadata,
                    retraza_test_run_id: approval.runId,
                    retraza_test_scope: approval.scope,
                    retraza_cleanup_token: state.token,
                },
            };
            const response = await request(input, { ...init, body: JSON.stringify(tagged) });
            const result = await response
                .clone()
                .json()
                .catch(() => null);
            const user = result?.user || result;
            if (user?.id && response.ok) state.users.set(user.id, { email: body.email });
            return response;
        }
        const userId = url.pathname.startsWith(adminPath + "/")
            ? url.pathname.slice(adminPath.length + 1)
            : null;
        if (userId) {
            const owned = state.users.get(userId);
            if (!owned)
                throw new Error(
                    "CLEANUP_TARGET_NOT_OWNED: account is not confirmed as created by this run.",
                );
            if (method === "GET") return request(input, init);
            if (method !== "DELETE")
                throw new Error("Only verified current-run account cleanup is approved.");
            const checked = await request(new URL(adminPath + "/" + userId, url.origin), {
                method: "GET",
                headers,
            });
            const result = await checked.json();
            const user = result?.user || result;
            if (
                !checked.ok ||
                user?.id !== userId ||
                user.email !== owned.email ||
                user.app_metadata?.retraza_test_run_id !== approval.runId ||
                user.app_metadata?.retraza_test_scope !== approval.scope ||
                user.app_metadata?.retraza_cleanup_token !== state.token
            )
                throw new Error(
                    "CLEANUP_TARGET_NOT_VERIFIED: account retained; owner review required.",
                );
            const response = await request(input, init);
            if (response.ok) state.users.delete(userId);
            return response;
        }
        if (url.pathname.startsWith(adminPath))
            throw new Error("Global account listing and cleanup are not approved.");
        if (url.pathname === "/auth/v1/token" && method === "POST") {
            if (![...state.users.values()].some((user) => user.email === body.email))
                throw new Error(
                    "Only newly created current-run accounts may sign in through the test client.",
                );
            return request(input, init);
        }
        const token = headers.get("Authorization")?.replace(/^Bearer /, "") || "";
        if (!state.users.has(subject(token)))
            throw new Error(
                "Shared test mutations require a session belonging to a verified current-run account.",
            );
        if (url.pathname.startsWith("/rest/v1/") && method === "DELETE")
            throw new Error("Direct REST deletions are outside the reviewed shared test scope.");
        if (url.pathname.startsWith("/rest/v1/") || url.pathname === "/auth/v1/logout")
            return request(input, init);
        throw new Error("Unreviewed shared test operation blocked.");
    };
}
