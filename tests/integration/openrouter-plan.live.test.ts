import { expect, it, vi } from "vitest";
import { mkdirSync, writeFileSync, openSync, closeSync, existsSync, copyFileSync } from "node:fs";
import { runPlanGeneration } from "@/ai/orchestrator.server";
import { validateProposal } from "@/lib/planner.server";
import { loadProjectEnv } from "../helpers/test-env";

loadProjectEnv();
it.skipIf(process.env["RUN_OPENROUTER_PLAN_SMOKE"] !== "true")(
    "one bounded OpenRouter request satisfies the actual compact planning contract",
    async () => {
        const runId = process.env["OPENROUTER_SMOKE_RUN_ID"];
        if (
            !runId ||
            !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(runId)
        )
            throw new Error(
                "A fresh explicitly authorized isolated-smoke UUID is required; consumed guards cannot be reused.",
            );
        const model =
            process.env["OPENROUTER_MODEL_PRIMARY"] || process.env["OPENROUTER_MODEL_DEFAULT"];
        if (
            existsSync(`logs/owner-openrouter-plan-${runId}.lock`) ||
            existsSync(`logs/openrouter-plan-${runId}.json`)
        )
            throw new Error("This isolated request UUID is already consumed");
        if (model !== "dots-studio/dots-3-note-preview:free")
            throw new Error("Only the approved zero-price free model is permitted");
        const originalFetch = globalThis.fetch;
        const metadataHeaders = { Authorization: "Bearer " + process.env["OPENROUTER_API_KEY"] };
        const getMetadata = async (path: string) => {
            const r = await originalFetch("https://openrouter.ai/api/v1" + path, {
                headers: metadataHeaders,
                redirect: "error",
                signal: AbortSignal.timeout(15000),
            });
            if (!r.ok)
                throw new Error("Read-only model/authorization metadata could not be verified");
            return r.json();
        };
        const key = await getMetadata("/key");
        const account = await getMetadata("/models/user");
        const endpoint = await getMetadata("/models/" + model + "/endpoints");
        const metadata = {
            key: { httpStatus: 200 },
            checkedAt: new Date().toISOString(),
            accountModels: { models: account.data },
        };
        const endpoints = [{ id: model, endpoints: endpoint.data?.endpoints ?? [] }];
        if (
            key.data?.free_model_daily_requests?.remaining !== undefined &&
            key.data.free_model_daily_requests.remaining <= 0
        )
            throw new Error("No free request quota remains; purchases/upgrades are not authorized");
        expect(metadata.key.httpStatus).toBe(200);
        expect(Date.now() - Date.parse(metadata.checkedAt)).toBeLessThan(3_600_000);
        expect(
            metadata.accountModels.models.some(
                (m: { id: string; reasoning?: { mandatory?: boolean } }) =>
                    m.id === model && m.reasoning?.mandatory === false,
            ),
        ).toBe(true);
        expect(
            endpoints.some(
                (m: {
                    id: string;
                    endpoints: {
                        tag: string;
                        provider_name: string;
                        status: number;
                        pricing: { prompt: string; completion: string };
                        supported_parameters: string[];
                    }[];
                }) =>
                    m.id === model &&
                    m.endpoints.some(
                        (e) =>
                            e.tag === "atlas-cloud/fp8" &&
                            e.provider_name === "AtlasCloud" &&
                            e.status === 0 &&
                            Number(e.pricing.prompt) === 0 &&
                            Number(e.pricing.completion) === 0 &&
                            [
                                "structured_outputs",
                                "response_format",
                                "max_tokens",
                                "reasoning",
                            ].every((parameter) => e.supported_parameters.includes(parameter)),
                    ),
            ),
        ).toBe(true);
        const observed = vi.spyOn(console, "info");
        let observations: unknown[][] = [];
        let requests = 0;
        let httpStatus: number | null = null;
        vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
            const url = new URL(input instanceof Request ? input.url : String(input));
            if (
                url.origin !== "https://openrouter.ai" ||
                url.pathname !== "/api/v1/chat/completions" ||
                init?.method !== "POST"
            )
                throw new Error("Only the approved isolated OpenRouter request is allowed");
            if (++requests > 1) throw new Error("Single request authorization consumed");
            const body = JSON.parse(String(init.body));
            expect(body.model).toBe(model);
            expect(body.provider.only).toEqual(["atlas-cloud/fp8"]);
            expect(body.provider.max_price).toEqual({ prompt: 0, completion: 0 });
            expect(body.provider.allow_fallbacks).toBe(false);
            expect(body.provider.require_parameters).toBe(true);
            expect(body.max_tokens).toBe(8000);
            expect(body.reasoning).toEqual({ enabled: false });
            const requestedParameters = Object.keys(body).filter(
                (name) => !["model", "messages", "provider", "stream"].includes(name),
            );
            expect(
                endpoint.data.endpoints.some(
                    (e: {
                        tag: string;
                        provider_name: string;
                        status: number;
                        pricing: { prompt: string; completion: string };
                        supported_parameters: string[];
                    }) =>
                        e.tag === "atlas-cloud/fp8" &&
                        e.provider_name === "AtlasCloud" &&
                        e.status === 0 &&
                        Number(e.pricing.prompt) === 0 &&
                        Number(e.pricing.completion) === 0 &&
                        requestedParameters.every((name) => e.supported_parameters.includes(name)),
                ),
            ).toBe(true);
            expect(body.response_format.json_schema.strict).toBe(true);
            mkdirSync("logs", { recursive: true });
            closeSync(openSync(`logs/owner-openrouter-plan-${runId}.lock`, "wx"));
            const response = await originalFetch(input, { ...init, redirect: "error" });
            httpStatus = response.status;
            return response;
        });
        vi.stubEnv("AI_PROVIDER_MODE", "live");
        vi.stubEnv("AI_PROVIDER_ALLOWLIST", "openrouter");
        vi.stubEnv("AI_ROUTE_PRIMARY", "openrouter");
        vi.stubEnv("OPENROUTER_ENABLED", "true");
        vi.stubEnv("OPENROUTER_PROVIDER_ONLY", "atlas-cloud/fp8");
        vi.stubEnv("GROQ_ENABLED", "false");
        vi.stubEnv("GEMINI_ENABLED", "false");
        vi.stubEnv("AI_PROVIDER_MAX_RETRIES", "0");
        vi.stubEnv("AI_MAX_OUTPUT_TOKENS", "8000");
        vi.stubEnv("AI_PROVIDER_TIMEOUT_MS", "90000");
        let report: Record<string, unknown>;
        try {
            const result = await runPlanGeneration({
                rawText:
                    "I want to become a product manager in six months. I have no PM experience, work full-time and can dedicate ten hours per week.",
                intentType: "GOAL",
                objective: {
                    title: "Become a product manager",
                    desiredOutcome: "Demonstrate PM skills for an entry-level role",
                    successCriteria: [
                        "Publish a PM portfolio and apply for entry-level PM roles within six months",
                    ],
                },
                facts: [
                    { category: "RESOURCE", key: "capacity", value: "Ten hours per week" },
                    {
                        category: "FACT",
                        key: "experience",
                        value: "No PM experience; currently working full-time",
                    },
                ],
                scenario: "BALANCED",
                correlationId: crypto.randomUUID(),
            });
            validateProposal(result.data, true);
            // A missing token count is not proof that the upstream disabled thinking.
            const shapeCall = observed.mock.calls.find(
                (row) => row[0] === "OPENROUTER_RESPONSE_SHAPE",
            );
            const shape = shapeCall ? JSON.parse(String(shapeCall[1])) : null;
            expect(shape?.reasoningTokens).toBe(0);
            expect(result.meta.provider).toBe("openrouter");
            expect(result.meta.attempts).toHaveLength(1);
            report = {
                status: "PASS",
                checkedAt: new Date().toISOString(),
                provider: result.meta.provider,
                model: result.meta.providerModel,
                attempts: result.meta.attempts.length,
                inputTokens: result.meta.inputTokens,
                outputTokens: result.meta.outputTokens,
                nodes: result.data.nodes.length,
                edges: result.data.edges.length,
                strategies: result.data.strategies.length,
                schemaValid: true,
                graphValid: true,
                databaseWrites: 0,
            };
        } catch (error) {
            const safe = error as {
                code?: string;
                meta?: { diagnostics?: { validationFailure?: string }; attempts?: unknown[] };
            };
            report = {
                status: "FAIL",
                checkedAt: new Date().toISOString(),
                code: safe.code ?? "AI_UNAVAILABLE",
                validationRule: safe.meta?.diagnostics?.validationFailure ?? null,
                attempts: safe.meta?.attempts?.length ?? 0,
                databaseWrites: 0,
            };
        } finally {
            observations = observed.mock.calls.map((row) => [...row]);
            observed.mockRestore();
            vi.unstubAllGlobals();
            vi.unstubAllEnvs();
        }
        const observation = (label: string) => {
            const call = observations.find((row) => row[0] === label);
            return call ? JSON.parse(String(call[1])) : null;
        };
        Object.assign(report, {
            runId,
            model,
            httpStatus,
            requests,
            usersCreated: 0,
            responseShape: observation("OPENROUTER_RESPONSE_SHAPE"),
            diagnostics: observation("AI_DIAGNOSTIC"),
        });
        mkdirSync("logs", { recursive: true });
        writeFileSync(`logs/openrouter-plan-${runId}.json`, JSON.stringify(report, null, 2), {
            flag: "wx",
        });
        if (report["status"] === "PASS") {
            if (existsSync("logs/release-openrouter-smoke.json"))
                copyFileSync(
                    "logs/release-openrouter-smoke.json",
                    `logs/release-openrouter-before-${runId}.json`,
                );
            writeFileSync("logs/release-openrouter-smoke.json", JSON.stringify(report, null, 2));
        }
        console.info("OPENROUTER_PLAN_SMOKE", JSON.stringify(report));
        expect(report["status"]).toBe("PASS");
    },
    150_000,
);
