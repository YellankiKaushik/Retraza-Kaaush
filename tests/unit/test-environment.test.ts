import { expect, it } from "vitest";
import {
    assertIsolatedTestBackend,
    assertRequestedDatabaseTestsAreSafe,
} from "../../scripts/test-environment.mjs";

it("blocks the shared reference backend even with an opt-in", () => {
    expect(() =>
        assertIsolatedTestBackend({
            RETRAZA_TEST_BACKEND_ISOLATED: "true",
            SUPABASE_URL: "https://usvopldwiwzlvoqawvcu.supabase.co",
        }),
    ).toThrow("TEST_ENVIRONMENT_NOT_ISOLATED");
});
it("requires explicit isolation confirmation for every live database gate", () => {
    for (const gate of ["RUN_SUPABASE_RLS_TESTS", "RUN_E2E_GOLDEN", "RUN_E2E_SIGNUP"])
        expect(() =>
            assertRequestedDatabaseTestsAreSafe({
                [gate]: "true",
                SUPABASE_URL: "http://127.0.0.1:54321",
            }),
        ).toThrow("TEST_ENVIRONMENT_NOT_ISOLATED");
});
it("allows deterministic tests and deliberately configured isolated backends", () => {
    expect(() => assertRequestedDatabaseTestsAreSafe({})).not.toThrow();
    expect(() =>
        assertIsolatedTestBackend({
            RETRAZA_TEST_BACKEND_ISOLATED: "true",
            SUPABASE_URL: "http://127.0.0.1:54321",
        }),
    ).not.toThrow();
});
