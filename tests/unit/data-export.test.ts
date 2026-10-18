import { expect, it, vi } from "vitest";
import { readUserExport } from "@/lib/data-export.server";

it("exports every planning table under the requested owner", async () => {
    const eq = vi.fn(async () => ({ data: [{ id: "owned-record" }], error: null }));
    const from = vi.fn(() => ({ select: () => ({ eq }) }));
    const result = await readUserExport(
        { from } as unknown as Parameters<typeof readUserExport>[0],
        "owner",
    );
    expect(Object.keys(result)).toHaveLength(12);
    expect(result["intake_cases"]).toEqual([{ id: "owned-record" }]);
    expect(eq.mock.calls.every(([field, owner]) => field === "user_id" && owner === "owner")).toBe(
        true,
    );
});

it("rejects an incomplete export rather than returning partial data or private diagnostics", async () => {
    const eq = vi
        .fn()
        .mockResolvedValueOnce({ data: [{ id: "first-table" }], error: null })
        .mockResolvedValueOnce({ data: null, error: { message: "private database diagnostic" } });
    const from = vi.fn(() => ({ select: () => ({ eq }) }));
    await expect(
        readUserExport({ from } as unknown as Parameters<typeof readUserExport>[0], "owner"),
    ).rejects.toThrow("Your data export could not be completed. Please try again.");
    expect(from).toHaveBeenCalledTimes(2);
});
