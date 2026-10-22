import { expect, it } from "vitest";
import { zodSchema } from "ai";
import { semanticPlanSchema } from "@/ai/semantic-plan.server";
import { groqPlanningOutputSchema, groqPlanningWireSchema } from "@/ai/groq-plan-schema.server";

function unionBranches(value: unknown): unknown[] {
    if (!value || typeof value !== "object") return [];
    const object = value as Record<string, unknown>;
    return [
        ...(Array.isArray(object["anyOf"]) ? object["anyOf"] : []),
        ...Object.values(object).flatMap(unionBranches),
    ];
}

it("flattens nullable union branches while preserving strict runtime validation", async () => {
    const original = await zodSchema(semanticPlanSchema).jsonSchema;
    const nested = unionBranches(original).filter(
        (branch) => !!(branch as Record<string, unknown>)["anyOf"],
    );
    expect(nested.length).toBeGreaterThan(0);
    const wire = await groqPlanningOutputSchema.jsonSchema;
    expect(JSON.stringify(wire)).not.toMatch(/prerequisiteIndexes|workIndex|strategyIndex/);
    for (const branch of unionBranches(wire)) {
        expect(branch).not.toHaveProperty("anyOf");
        expect(branch).toHaveProperty("type");
    }
    expect(JSON.stringify(wire)).not.toMatch(
        /"(?:minItems|maxItems|minLength|maxLength|minimum|maximum|const)":/,
    );
});

it("retains enum discrimination, required properties and closed objects", () => {
    expect(
        groqPlanningWireSchema({
            type: "object",
            properties: {
                role: { type: "string", const: "HIGH" },
            },
            required: ["role"],
            additionalProperties: false,
        }),
    ).toEqual({
        type: "object",
        properties: { role: { type: "string", enum: ["HIGH"] } },
        required: ["role"],
        additionalProperties: false,
    });
});

it("fails closed on unknown provider grammar keywords rather than discarding them", () => {
    expect(() => groqPlanningWireSchema({ not: { type: "null" } })).toThrow(
        "Unsupported planning schema keyword",
    );
});
