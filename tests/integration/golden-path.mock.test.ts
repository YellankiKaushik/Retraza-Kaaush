import { describe, expect, it } from "vitest";

import { ReversePathHarness } from "../helpers/reversepath-harness";

describe("ReversePath deterministic golden path integration", () => {
    it("classifies, clarifies, plans, tracks, replans, accepts, and preserves prior versions", () => {
        const app = new ReversePathHarness();
        const userId = "user-a";

        const intake = app.createIntake(
            userId,
            "I want to switch into product design within a year, but I have a full-time job and no portfolio.",
        );
        expect(intake.analysis.intentType).toBe("GOAL");
        expect(intake.status).toBe("READY_FOR_PLANNING");

        const plan = app.generatePlan(userId, intake.id);
        expect(plan.activeVersionId).toBeTruthy();
        expect(app.bundle(userId, intake.id).intake.status).toBe("PLANNED");

        const firstFrontier = app.frontier(userId, plan.id);
        expect(firstFrontier.ready.map((item) => item.node.title)).toContain(
            "Write the current-state snapshot",
        );
        expect(firstFrontier.blocked.map((item) => item.node.title)).toContain(
            "Run the blocker-removal step",
        );
        expect(firstFrontier.blocked[0]?.blockedBy.map((node) => node.title)).toContain(
            "Write the current-state snapshot",
        );

        app.completeAction(userId, plan.id, "current-state snapshot");
        const secondFrontier = app.frontier(userId, plan.id);
        expect(secondFrontier.ready.map((item) => item.node.title)).toContain(
            "Run the blocker-removal step",
        );

        const checkIn = app.checkIn(userId, plan.id, "I found I only have three hours per week.", [
            { key: "weekly_capacity", value: "3 hours" },
        ]);
        expect(checkIn.suggestsReplan).toBe(true);

        const candidate = app.proposeReplan(userId, plan.id);
        expect(candidate.state).toBe("CANDIDATE");
        expect(candidate.versionNumber).toBe(2);
        expect(candidate.changes.length).toBeGreaterThan(0);
        expect(app.activeVersion(userId, plan.id).versionNumber).toBe(1);

        app.acceptVersion(userId, plan.id, candidate.id);
        expect(app.activeVersion(userId, plan.id).versionNumber).toBe(2);
        expect(plan.versions.find((version) => version.versionNumber === 1)?.state).toBe(
            "SUPERSEDED",
        );
    });

    it("rejects candidate versions without replacing the active version", () => {
        const app = new ReversePathHarness();
        const intake = app.createIntake("user-a", "I want to build a portfolio project.");
        const plan = app.generatePlan("user-a", intake.id);
        const activeBefore = app.activeVersion("user-a", plan.id).id;
        const candidate = app.proposeReplan("user-a", plan.id);

        app.rejectVersion("user-a", plan.id, candidate.id);

        expect(app.activeVersion("user-a", plan.id).id).toBe(activeBefore);
        expect(plan.versions.find((version) => version.id === candidate.id)?.state).toBe(
            "REJECTED",
        );
    });

    it("enforces cross-user isolation in the integration harness", () => {
        const app = new ReversePathHarness();
        const intake = app.createIntake("user-a", "I want to learn TypeScript.");
        const plan = app.generatePlan("user-a", intake.id);

        expect(() => app.bundle("user-b", intake.id)).toThrow("FORBIDDEN");
        expect(() => app.frontier("user-b", plan.id)).toThrow("FORBIDDEN");
        expect(() => app.completeAction("user-b", plan.id, "snapshot")).toThrow("FORBIDDEN");
    });
});
