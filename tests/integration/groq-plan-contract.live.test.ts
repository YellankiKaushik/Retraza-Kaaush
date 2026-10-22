import { expect, it, vi } from "vitest";
import { mkdirSync, openSync, closeSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { runPlanGeneration } from "@/ai/orchestrator.server";
import { validateProposal } from "@/lib/planner.server";
import { safeProviderErrorCode } from "@/ai/diagnostics.server";
import { loadProjectEnv } from "../helpers/test-env";

loadProjectEnv();
it.skipIf(process.env["RUN_GROQ_PLAN_CONTRACT"] !== "true")(
    "one owner-authorized Groq planning request without database access",
    async () => {
        for (const [name, value] of Object.entries({
            AI_PROVIDER_MODE: "live",
            AI_PROVIDER_ALLOWLIST: "groq",
            AI_ROUTE_PRIMARY: "groq",
            AI_PROVIDER_MAX_RETRIES: "0",
            GROQ_ENABLED: "true",
            GEMINI_ENABLED: "false",
            OPENROUTER_ENABLED: "false",
            OPENAI_ENABLED: "false",
            LOVABLE_AI_ENABLED: "false",
        }))
            vi.stubEnv(name, value);
        const network = globalThis.fetch;
        let calls = 0;
        const report: Record<string, unknown> = {
            status: "FAIL",
            databaseWrites: 0,
            usersCreated: 0,
        };
        vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
            const url = new URL(input instanceof Request ? input.url : String(input));
            if (
                url.origin !== "https://api.groq.com" ||
                url.pathname !== "/openai/v1/chat/completions" ||
                init?.method !== "POST"
            )
                throw new Error("Unapproved network destination or method");
            if (++calls > 1) throw new Error("One-request authorization consumed");
            const body = JSON.parse(String(init.body));
            expect(body.model).toBe("openai/gpt-oss-20b");
            expect(body.response_format.type).toBe("json_schema");
            expect(body.response_format.json_schema.strict).toBe(true);
            const schema = JSON.stringify(body.response_format.json_schema.schema);
            report["request"] = {
                model: body.model,
                keys: Object.keys(body),
                strict: true,
                maxTokens: body.max_tokens ?? body.max_completion_tokens,
                schemaBytes: Buffer.byteLength(schema),
                schemaSha256: createHash("sha256").update(schema).digest("hex"),
            };
            mkdirSync("logs", { recursive: true });
            closeSync(openSync("logs/groq-planning-contract-20261022.lock", "wx"));
            const response = await network(input, { ...init, redirect: "error" });
            report["httpStatus"] = response.status;
            if (!response.ok) {
                const data = await response
                    .clone()
                    .json()
                    .catch(() => null);
                report["providerErrorCode"] = safeProviderErrorCode({ data });
                const param = data?.error?.param;
                report["rejectedProperty"] =
                    typeof param === "string" &&
                    /^(?:response_format(?:\.[a-z_]+)*|max_tokens|max_completion_tokens|model|reasoning_effort)$/.test(
                        param,
                    )
                        ? param
                        : null;
                const message = String(data?.error?.message ?? "");
                report["rejectionIndicators"] = [
                    "minItems",
                    "maxItems",
                    "anyOf",
                    "additionalProperties",
                    "required",
                    "max_tokens",
                    "max_completion_tokens",
                    "reasoning_effort",
                    "schema",
                    "grammar",
                    "complexity",
                    "context_length",
                    "rate_limit",
                ].filter((key) => message.includes(key));
            }
            return response;
        });
        const logs = vi.spyOn(console, "info").mockImplementation(() => {});
        try {
            const result = await runPlanGeneration({
                rawText:
                    "Fictional test: become a junior product manager in six months, with no PM experience, a full-time job and ten study hours per week.",
                intentType: "GOAL",
                objective: {
                    title: "Fictional PM portfolio",
                    desiredOutcome: "Demonstrate entry-level product skills",
                    successCriteria: ["Publish a portfolio in six months"],
                },
                facts: [{ category: "RESOURCE", key: "capacity", value: "Ten hours weekly" }],
                scenario: "BALANCED",
                correlationId: crypto.randomUUID(),
            });
            validateProposal(result.data, true);
            expect(result.meta.provider).toBe("groq");
            expect(result.meta.attempts).toHaveLength(1);
            Object.assign(report, {
                status: "PASS",
                schemaValid: true,
                graphValid: true,
                nodes: result.data.nodes.length,
                edges: result.data.edges.length,
                strategies: result.data.strategies.length,
                assumptions: result.data.assumptions.length,
                inputTokens: result.meta.inputTokens,
                outputTokens: result.meta.outputTokens,
            });
        } catch (error) {
            const safe = error as {
                code?: string;
                meta?: { diagnostics?: { validationFailure?: string } };
            };
            Object.assign(report, {
                code: safe.code ?? "LOCAL_CONTRACT_FAILURE",
                validationRule: safe.meta?.diagnostics?.validationFailure ?? null,
            });
        } finally {
            logs.mockRestore();
            vi.unstubAllGlobals();
            vi.unstubAllEnvs();
            Object.assign(report, { checkedAt: new Date().toISOString(), requests: calls });
            mkdirSync("logs", { recursive: true });
            writeFileSync(
                "logs/groq-planning-contract-20261022.json",
                JSON.stringify(report, null, 2),
            );
        }
        console.info("GROQ_PLANNING_CONTRACT", JSON.stringify(report));
        expect(report["status"]).toBe("PASS");
        expect(calls).toBe(1);
    },
    180_000,
);
