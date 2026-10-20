import { expect, it } from "vitest";
import { deploymentVariables } from "../../scripts/retraza-vercel-env.mjs";

function env() {
    return {
        SUPABASE_URL: "https://usvopldwiwzlvoqawvcu.supabase.co",
        VITE_SUPABASE_URL: "https://usvopldwiwzlvoqawvcu.supabase.co",
        SUPABASE_PUBLISHABLE_KEY: "public-fictional",
        VITE_SUPABASE_PUBLISHABLE_KEY: "public-fictional",
        SUPABASE_SERVICE_ROLE_KEY: "server-fictional",
        GEMINI_API_KEY: "gemini-fictional",
        GROQ_API_KEY: "groq-fictional",
        GEMINI_MODEL_DEFAULT: "configured-google-model",
        GROQ_MODEL_FAST: "configured-groq-model",
        PUBLIC_APP_URL: "http://localhost:5173",
        RUN_E2E_GOLDEN: "true",
        OPENROUTER_API_KEY: "excluded-optional",
        RETRAZA_SHARED_TEST_APPROVAL_FILE: "excluded-approval",
    };
}
it("deploys required secrets privately and scopes Preview/Production without local test controls", () => {
    const entries = deploymentVariables(env());
    expect(entries.find((entry) => entry.key === "GEMINI_API_KEY")?.type).toBe("sensitive");
    expect(entries.find((entry) => entry.key === "VITE_SUPABASE_PUBLISHABLE_KEY")?.type).toBe(
        "plain",
    );
    expect(entries.find((entry) => entry.key === "RUN_E2E_GOLDEN")?.value).toBe("false");
    expect(entries.find((entry) => entry.key === "AI_PROVIDER_ALLOWLIST")?.value).toBe(
        "gemini,groq",
    );
    expect(
        entries.filter((entry) =>
            ["PUBLIC_APP_URL", "OPENROUTER_API_KEY", "RETRAZA_SHARED_TEST_APPROVAL_FILE"].includes(
                entry.key,
            ),
        ),
    ).toEqual([]);
    expect(entries.filter((entry) => entry.key === "APP_ENV").map((entry) => entry.value)).toEqual([
        "preview",
        "production",
    ]);
});
it("rejects mismatched projects, public/private key reuse and unreviewed provider endpoints", () => {
    expect(() =>
        deploymentVariables({ ...env(), SUPABASE_URL: "https://other.supabase.co" }),
    ).toThrow();
    expect(() =>
        deploymentVariables({
            ...env(),
            SUPABASE_PUBLISHABLE_KEY: "server-fictional",
            VITE_SUPABASE_PUBLISHABLE_KEY: "server-fictional",
        }),
    ).toThrow();
    expect(() =>
        deploymentVariables({ ...env(), GROQ_BASE_URL: "https://unreviewed.example/v1" }),
    ).toThrow();
    expect(() => deploymentVariables({ ...env(), GEMINI_API_KEY: "" })).toThrow("GEMINI_API_KEY");
});
