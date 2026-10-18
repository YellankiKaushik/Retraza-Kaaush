/** Turn signup delivery failures into guidance without exposing provider diagnostics. */
export function authErrorMessage(error: unknown, mode: "signin" | "signup"): string {
    const failure = error as { code?: string; status?: number; message?: string } | null;
    if (mode === "signup") {
        if (failure?.code === "over_email_send_rate_limit") {
            return "Confirmation emails are temporarily rate limited. Please wait before trying again. If this continues, contact support.";
        }
        if (
            failure?.code === "email_address_not_authorized" ||
            /error sending confirmation email/i.test(failure?.message ?? "")
        ) {
            return "Confirmation email delivery is currently unavailable. Please try again later or contact support. You must confirm your email before signing in.";
        }
        if (failure?.status === 429) {
            return "Too many signup attempts. Please wait a few minutes before trying again.";
        }
        if (failure?.status && failure.status >= 500) {
            return "Account creation is temporarily unavailable. Please try again later or contact support.";
        }
    }
    return failure?.message || "Authentication could not be completed. Please try again.";
}
