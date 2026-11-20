// ANVIX web agent — URL allowlist leaf.
//
// Pure URL validation: zero imports (only the global URL + regexes).
// Moved verbatim out of planner.ts so the API routes can validate
// startUrl before importing the planner (which pulls Gemini). The
// SSRF hardening noted in the plan (redirect targets, non-decimal IP
// forms) is a separate later change — this file moves the function
// unchanged.

/** Only public http(s) pages. No localhost, private networks, or files. */
export function isAllowedWebUrl(raw: unknown): boolean {
  if (typeof raw !== "string" || !raw.trim()) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return false;
  }

  // No credentials embedded in the URL.
  if (url.username || url.password) {
    return false;
  }

  const host = url.hostname.toLowerCase();

  if (
    host === "localhost" ||
    host === "0.0.0.0" ||
    host === "::1" ||
    host === "[::1]"
  ) {
    return false;
  }

  // Loopback + private ranges — the agent must never reach internal services.
  if (
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host)
  ) {
    return false;
  }

  return true;
}
