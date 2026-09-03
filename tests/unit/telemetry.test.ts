import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { configuredDailyAiLimit } from "@/lib/telemetry.server";

const originalEnv = { ...process.env };

function resetEnv() {
    process.env = { ...originalEnv };
    vi.unstubAllEnvs();
}

describe("AI quota configuration", () => {
    beforeEach(resetEnv);
    afterEach(resetEnv);

    it("uses operation-specific daily limits before the global limit", () => {
        vi.stubEnv("AI_DAILY_REQUEST_LIMIT", "10");
        vi.stubEnv("AI_LIMIT_GENERATE_PLAN_GRAPH_PER_DAY", "3");

        expect(configuredDailyAiLimit("GENERATE_PLAN_GRAPH", 20)).toBe(3);
    });

    it("falls back to the global daily limit, then the code default", () => {
        vi.stubEnv("AI_DAILY_REQUEST_LIMIT", "12");
        expect(configuredDailyAiLimit("REPLAN", 20)).toBe(12);

        vi.stubEnv("AI_DAILY_REQUEST_LIMIT", "not-a-number");
        expect(configuredDailyAiLimit("REPLAN", 20)).toBe(20);
    });
});
