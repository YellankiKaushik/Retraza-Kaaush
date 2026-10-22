import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { migrationManifestHash } from "./shared-preflight.mjs";

// Shared writes are forbidden unless the owner approves one exact reviewed run.
const referenceHost = "usvopldwiwzlvoqawvcu.supabase.co";

export function sharedTestApproval(env = process.env) {
    if (env.RETRAZA_TEST_BACKEND_MODE !== "controlled-shared") return null;
    let approval, proof, rawProof;
    try {
        approval = JSON.parse(readFileSync(env.RETRAZA_SHARED_TEST_APPROVAL_FILE, "utf8"));
        rawProof = readFileSync(approval.schemaEvidenceFile, "utf8");
        proof = JSON.parse(rawProof);
    } catch {
        throw new Error(
            "SHARED_TEST_APPROVAL_REQUIRED: owner approval and verified catalog files are required.",
        );
    }
    const target = new URL(env.SUPABASE_TEST_URL || env.SUPABASE_URL || env.VITE_SUPABASE_URL);
    const projectRef = target.hostname.toLowerCase().replace(/\.$/, "").split(".")[0];
    const gates = ["RUN_SUPABASE_RLS_TESTS", "RUN_E2E_GOLDEN", "RUN_E2E_SIGNUP"].filter(
        (key) => env[key] === "true",
    );
    const liveAi = ["live", "free-first"].includes(env.AI_PROVIDER_MODE);
    const scope =
        gates[0] === "RUN_SUPABASE_RLS_TESTS" ? "rls" : liveAi ? "golden-live" : "golden-mock";
    const now = Date.now();
    const expiry = Date.parse(approval.expiresAt);
    const proofAge = now - Date.parse(proof.checkedAt);
    const valid =
        target.origin === "https://" + referenceHost &&
        target.protocol === "https:" &&
        approval.projectRef === projectRef &&
        proof.projectRef === projectRef &&
        approval.acknowledgement ===
            `I approve temporary test records in shared project ${projectRef}.` &&
        proof.catalogVerified === true &&
        proof.compatible === true &&
        /^[a-f0-9]{64}$/.test(proof.catalogSha256 || "") &&
        proof.migrationManifestHash === migrationManifestHash() &&
        approval.schemaEvidenceSha256 === createHash("sha256").update(rawProof).digest("hex") &&
        proofAge >= 0 &&
        proofAge < 24 * 3600_000 &&
        Number.isFinite(expiry) &&
        expiry > now &&
        expiry <= now + 24 * 3600_000 &&
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            approval.runId,
        ) &&
        env.RETRAZA_TEST_RUN_ID === approval.runId &&
        approval.maxUsers === 2 &&
        approval.scope === scope &&
        (approval.workflow === undefined ||
            (scope === "golden-live" && ["essential", "extended"].includes(approval.workflow))) &&
        approval.maxAiOperations === (scope === "golden-live" ? 6 : 0) &&
        gates.length === 1 &&
        gates[0] !== "RUN_E2E_SIGNUP";
    if (!valid)
        throw new Error(
            "SHARED_TEST_APPROVAL_INVALID: exact project, scope, run, user budget, fresh schema evidence and owner acknowledgement must match.",
        );
    if (scope === "golden-live") {
        const allowed = (env.AI_PROVIDER_ALLOWLIST || "gemini,groq")
            .split(",")
            .map((name) => name.trim());
        if (
            allowed.some((name) => !["gemini", "groq"].includes(name)) ||
            Number(env.AI_PROVIDER_MAX_RETRIES || 0) !== 0
        )
            throw new Error(
                "Shared live approval permits only Gemini/Groq and zero per-provider retries.",
            );
    }
    return { ...approval, scope, projectRef };
}

export function assertIsolatedTestBackend(env = process.env) {
    const target = env.SUPABASE_TEST_URL || env.SUPABASE_URL || env.VITE_SUPABASE_URL;
    let hostname;
    try {
        hostname = new URL(target).hostname.toLowerCase().replace(/\.$/, "");
    } catch {
        /* Fail closed below. */
    }
    if (env.RETRAZA_TEST_BACKEND_ISOLATED !== "true" || !hostname || hostname === referenceHost)
        throw new Error(
            "TEST_ENVIRONMENT_NOT_ISOLATED: live database tests are blocked. The shared backend requires verified schema and explicit project-specific controlled-shared approval. An optional isolated/local backend may use RETRAZA_TEST_BACKEND_ISOLATED=true; that flag never authorizes the shared host.",
        );
    if (
        env.SUPABASE_TEST_URL &&
        env.SUPABASE_TEST_URL !== env.SUPABASE_URL &&
        (!(env.SUPABASE_TEST_PUBLISHABLE_KEY || env.SUPABASE_TEST_ANON_KEY) ||
            !(env.SUPABASE_TEST_SECRET_KEY || env.SUPABASE_TEST_SERVICE_ROLE_KEY))
    )
        throw new Error(
            "A separate test URL requires its own publishable and secret keys; application credentials will not be reused.",
        );
}

export function assertRequestedDatabaseTestsAreSafe(env = process.env) {
    if (
        ["RUN_SUPABASE_RLS_TESTS", "RUN_E2E_GOLDEN", "RUN_E2E_SIGNUP"].some(
            (name) => env[name] === "true",
        )
    )
        return sharedTestApproval(env) || assertIsolatedTestBackend(env);
}
