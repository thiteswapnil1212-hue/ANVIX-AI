/**
 * The OAuth redirect URI. Env override wins (the URI registered in
 * Google Cloud Console must match exactly); otherwise it is derived from
 * the request origin, which is correct for a same-origin deployment.
 */
export function getGoogleRedirectUri(request: Request): string {
  const env = process.env.GOOGLE_OAUTH_REDIRECT_URI?.trim();
  if (env) return env;
  return `${new URL(request.url).origin}/api/integrations/google/callback`;
}
