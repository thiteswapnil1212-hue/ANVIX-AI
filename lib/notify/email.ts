import { Resend } from "resend";

/**
 * Transactional email via Resend — server side.
 *
 * Why this exists: Supabase's own auth email is capped at 2/hour by
 * default, so welcome / password-reset / digest mail sent through it
 * silently stops arriving. Resend's free tier (3,000/month, hard-capped
 * 100/day, no card, no overage — send 101 fails) fills exactly that gap.
 *
 * Setup (env only, never in code):
 * - `RESEND_API_KEY` — from resend.com. Without it the feature reports
 *   itself as not configured.
 * - `RESEND_FROM` — optional sender, e.g. `ANVIX <hello@anvix.example>`.
 *   Default is Resend's onboarding sender, which only delivers to the
 *   Resend account owner's own address until a domain is verified —
 *   see docs/notifications.md. Do not expect it to reach other users.
 *
 * Daily guard: an in-memory per-instance counter refuses sends past 90
 * in a UTC day (under Resend's 100/day hard cap), so a bug or a spam
 * run cannot burn the whole day's allowance in one burst and then fail
 * every later send with a confusing 429.
 */

export const RESEND_DAILY_LIMIT = 100;
const DAILY_GUARD = 90;
const MAX_SUBJECT_LENGTH = 200;
const MAX_TEXT_LENGTH = 20_000;

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function getEmailFrom(): string {
  return process.env.RESEND_FROM ?? "ANVIX <onboarding@resend.dev>";
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export type EmailKind = "welcome" | "reset" | "digest";

export interface EmailInput {
  to: string;
  subject: string;
  text: string;
  kind: EmailKind;
}

export function parseEmailInput(
  input: unknown
): { ok: true; email: EmailInput } | { ok: false; error: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, error: "Email input must be a JSON object." };
  }
  const { to, subject, text, kind } = input as Record<string, unknown>;
  if (typeof to !== "string" || !isValidEmail(to)) {
    return { ok: false, error: "A valid recipient email address is required." };
  }
  if (typeof subject !== "string" || !subject.trim()) {
    return { ok: false, error: "Email needs a non-empty subject." };
  }
  if (subject.length > MAX_SUBJECT_LENGTH) {
    return { ok: false, error: `Subject must be ${MAX_SUBJECT_LENGTH} characters or fewer.` };
  }
  if (typeof text !== "string" || !text.trim()) {
    return { ok: false, error: "Email needs a non-empty body." };
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return { ok: false, error: `Body must be ${MAX_TEXT_LENGTH} characters or fewer.` };
  }
  if (kind !== "welcome" && kind !== "reset" && kind !== "digest") {
    return { ok: false, error: "Email kind must be welcome, reset, or digest." };
  }
  return {
    ok: true,
    email: { to, subject: subject.trim(), text, kind },
  };
}

/** Plain-text welcome mail. `name` is the display name or email prefix. */
export function welcomeEmailText(name: string): { subject: string; text: string } {
  return {
    subject: "Welcome to ANVIX AI",
    text: [
      `Hi ${name},`,
      "",
      "Welcome to ANVIX AI — your AI-powered workspace for exploring ideas, writing code, and building software.",
      "",
      "Get started by opening a chat or generating your first project.",
      "",
      "— The ANVIX team",
    ].join("\n"),
  };
}

/** Plain-text password-reset mail. The caller supplies the reset URL. */
export function resetEmailText(resetUrl: string): { subject: string; text: string } {
  return {
    subject: "Reset your ANVIX password",
    text: [
      "You asked to reset your ANVIX password. Use the link below:",
      "",
      resetUrl,
      "",
      "If you did not ask for this, ignore this email — your password stays as it is.",
      "",
      "— The ANVIX team",
    ].join("\n"),
  };
}

/** Plain-text digest mail. At most 50 lines are listed; the rest count. */
export function digestEmailText(
  name: string,
  items: string[]
): { subject: string; text: string } {
  const shown = items.slice(0, 50);
  const extra = items.length - shown.length;
  const lines = [
    `Hi ${name},`,
    "",
    "Your ANVIX digest:",
    "",
    ...shown.map((item) => `• ${item}`),
  ];
  if (extra > 0) lines.push(`• …and ${extra} more`);
  if (items.length === 0) lines.push("Nothing new since your last digest.");
  lines.push("", "— The ANVIX team");
  return {
    subject: "Your ANVIX digest",
    text: lines.join("\n"),
  };
}

// ------------------------------------------------------------ daily guard

const sentByDay = new Map<string, number>();

function todayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

/** Test seam: reset the in-memory counter. */
export function resetDailyEmailCounter(): void {
  sentByDay.clear();
}

export function dailyEmailCount(now: Date = new Date()): number {
  return sentByDay.get(todayKey(now)) ?? 0;
}

export type EmailSendResult =
  | { ok: true; id: string | null }
  | { ok: false; error: string; retryAfterSeconds?: number };

export async function sendEmail(
  input: EmailInput,
  now: Date = new Date()
): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Email is not configured." };
  }

  const key = todayKey(now);
  const used = sentByDay.get(key) ?? 0;
  if (used >= DAILY_GUARD) {
    return {
      ok: false,
      error: `Daily email budget reached (${DAILY_GUARD}/day guard, Resend free tier caps at ${RESEND_DAILY_LIMIT}/day). Try again tomorrow.`,
    };
  }

  const resend = new Resend(apiKey);
  try {
    const { data, error } = await resend.emails.send({
      from: getEmailFrom(),
      to: input.to,
      subject: input.subject,
      text: input.text,
    });
    if (error) {
      return { ok: false, error: error.message || "Resend could not send the email." };
    }
    sentByDay.set(key, used + 1);
    return { ok: true, id: data?.id ?? null };
  } catch {
    return { ok: false, error: "Could not reach Resend." };
  }
}
