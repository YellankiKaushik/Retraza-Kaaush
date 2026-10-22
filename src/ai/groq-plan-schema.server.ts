import { jsonSchema, zodSchema } from "ai";
import { semanticPlanSchema, type SemanticPlan } from "./semantic-plan.server";

type WireSchema = Awaited<ReturnType<typeof zodSchema>["jsonSchema"]>;
const runtimeOnly = new Set([
    "$schema",
    "minLength",
    "maxLength",
    "minItems",
    "maxItems",
    "minimum",
    "maximum",
    "exclusiveMinimum",
    "exclusiveMaximum",
    "multipleOf",
    "pattern",
    "format",
]);

// Keep the provider grammar small; the original Zod contract still validates output.
export function groqPlanningWireSchema(schema: WireSchema): WireSchema {
    const output: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(schema)) {
        if (runtimeOnly.has(key)) continue;
        if (key === "const") output["enum"] = [value];
        else if (["properties", "$defs", "definitions"].includes(key))
            output[key] = Object.fromEntries(
                Object.entries(value as Record<string, WireSchema>).map(([name, child]) => [
                    name,
                    groqPlanningWireSchema(child),
                ]),
            );
        else if (key === "anyOf")
            output[key] = (value as WireSchema[]).flatMap((child) => {
                const branch = groqPlanningWireSchema(child);
                // Zod wraps nullable unions in another anonymous anyOf. Flatten
                // associative unions so every provider branch has a concrete type.
                if (
                    branch.anyOf &&
                    Object.keys(branch).every((name) =>
                        ["anyOf", "description", "title"].includes(name),
                    )
                )
                    return branch.anyOf.map((member) => {
                        if (typeof member !== "object") throw new Error("Untyped planning union");
                        return {
                            ...member,
                            ...(branch.description ? { description: branch.description } : {}),
                            ...(branch.title ? { title: branch.title } : {}),
                        };
                    });
                return [branch];
            });
        else if (key === "items") output[key] = groqPlanningWireSchema(value as WireSchema);
        else if (
            [
                "type",
                "required",
                "additionalProperties",
                "enum",
                "$ref",
                "description",
                "title",
            ].includes(key)
        )
            output[key] = value;
        else throw new Error("Unsupported planning schema keyword: " + key);
    }
    return output as WireSchema;
}

export const groqPlanningOutputSchema = jsonSchema<SemanticPlan>(
    async () => groqPlanningWireSchema(await zodSchema(semanticPlanSchema).jsonSchema),
    {
        validate(value) {
            const parsed = semanticPlanSchema.safeParse(value);
            return parsed.success
                ? { success: true, value: parsed.data }
                : { success: false, error: parsed.error };
        },
    },
);
