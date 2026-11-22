import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getAuthenticatedCaller } from "@/lib/notify/auth";
import {
  digestEmailText,
  isEmailConfigured,
  parseEmailInput,
  sendEmail,
  welcomeEmailText,
  type EmailKind,
} from "@/lib/notify/email";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/notifications/email/send — send one transactional email to
 * the CALLER's own address (welcome or digest sample today; reset mail
 * once the auth flow passes a reset URL — see lib/notify/email.ts).
 *
 * Self-only by design: the recipient is always the signed-in user's
 * own email from their profile, never an address from the request body,
 * so this route cannot be used to spam third parties. Auth required,
 * 5/minute per caller, plus the deployment-wide 90/day guard in
 * sendEmail (Resend free tier hard-caps at 100/day).
 */
export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "email-send", 5, 60_000);
  if (limited) return limited;

  const caller = await getAuthenticatedCaller(request);
  if (!caller) {
    return NextResponse.json(
      { error: "Sign in to send email." },
      { status: 401 }
    );
  }

  if (!isEmailConfigured()) {
    return NextResponse.json(
      {
        configured: false,
        error:
          "Email is not configured on this deployment — set RESEND_API_KEY.",
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be JSON." }, { status: 400 });
  }

  const kind = (body as Record<string, unknown> | null)?.kind as
    | EmailKind
    | undefined;
  if (kind !== "welcome" && kind !== "digest") {
    return NextResponse.json(
      { error: 'Email kind must be "welcome" or "digest".' },
      { status: 400 }
    );
  }

  // Recipient: the caller's own profile email. Fall back to the auth
  // user's email when no profile row exists yet.
  let to: string | null = null;
  let displayName: string | null = null;
  const { data: profile } = await caller.client
    .from("profiles")
    .select("email, display_name")
    .eq("id", caller.userId)
    .maybeSingle();
  if (profile) {
    to = (profile as { email: string | null }).email;
    displayName = (profile as { display_name: string | null }).display_name;
  }
  if (!to) {
    const { data: userData } = await caller.client.auth.getUser();
    to = userData.user?.email ?? null;
    displayName =
      displayName ??
      (userData.user?.user_metadata?.display_name as string | undefined) ??
      null;
  }
  if (!to) {
    return NextResponse.json(
      { error: "No email address is saved for this account." },
      { status: 400 }
    );
  }

  const name = displayName ?? to.split("@")[0] ?? "there";
  const built =
    kind === "welcome"
      ? welcomeEmailText(name)
      : digestEmailText(name, [
          "Your daily question is ready in ANVIX.",
          "1 task finished since your last digest.",
        ]);

  const parsed = parseEmailInput({ to, ...built, kind });
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const result = await sendEmail(parsed.email);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ ok: true, id: result.id });
}
