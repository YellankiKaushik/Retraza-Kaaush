import { describe, expect, it } from "vitest";
import { restoreDemoProgress } from "@/domain/demo-plan";

describe("offline demo progress recovery", () => {
    it("recovers malformed storage without crashing", () => {
        expect(restoreDemoProgress("{broken")).toEqual({ loaded: false, completed: [] });
    });
    it("rejects completed dependents without completed prerequisites", () => {
        expect(
            restoreDemoProgress(
                JSON.stringify({
                    loaded: true,
                    completed: ["baseline", "applications", "unknown"],
                }),
            ),
        ).toEqual({ loaded: true, completed: ["baseline"] });
    });
});
