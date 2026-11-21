/**
 * Plain-words versions of Supabase auth errors.
 *
 * Supabase returns terse API messages ("Invalid login credentials",
 * "Email not confirmed") that are correct but unhelpful on screen.
 * This maps the errors users actually hit to something they can act
 * on. Unknown errors pass through unchanged so nothing real is hidden,
 * and a missing/empty error still yields a usable message.
 */
export function friendlyAuthError(error: unknown): string {
  const raw =
    typeof error === "string"
      ? error
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message ?? "")
        : "";

  const lower = raw.toLowerCase();

  if (lower.includes("invalid login credentials")) {
    return "That email and password don't match. Check them and try again.";
  }

  if (lower.includes("email not confirmed")) {
    return "This email isn't confirmed yet — check your inbox for the confirmation link, then try again.";
  }

  if (
    lower.includes("user already registered") ||
    lower.includes("already registered")
  ) {
    return "An account with this email already exists. Try signing in instead.";
  }

  if (
    lower.includes("too many requests") ||
    lower.includes("rate limit") ||
    lower.includes("email rate limit exceeded")
  ) {
    return "Too many attempts — please wait a minute and try again.";
  }

  if (
    lower.includes("email link is invalid or has expired") ||
    lower.includes("link has expired") ||
    lower.includes("token has expired")
  ) {
    return "That link has expired. Request a fresh one and try again.";
  }

  if (
    lower.includes("password should be at least") ||
    lower.includes("weak password") ||
    lower.includes("password is too short")
  ) {
    return "Choose a stronger password (at least 8 characters).";
  }

  if (
    lower.includes("new password should be different") ||
    lower.includes("same password")
  ) {
    return "Choose a password that's different from your current one.";
  }

  if (
    lower.includes("failed to fetch") ||
    lower.includes("network") ||
    lower.includes("network request failed")
  ) {
    return "Couldn't reach the auth service. Check your connection and try again.";
  }

  if (raw.trim()) return raw;

  return "Something went wrong. Please try again.";
}
