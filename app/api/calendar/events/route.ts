import { NextResponse } from "next/server";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getAuthedCaller } from "@/lib/supabase/server-user";
import { getGoogleOAuthConfig } from "@/lib/google/oauth";
import { getValidAccessToken } from "@/lib/google/connections";
import {
  createCalendarEvent,
  dayRangeIso,
  listCalendarEvents,
} from "@/lib/google/calendar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

/**
 * GET /api/calendar/events?date=YYYY-MM-DD (default: today)
 * or ?from=ISO&to=ISO. Signed-in + Google-connected only.
 */
export async function GET(request: Request) {
  const limited = await enforceRateLimit(request, "calendar", 30, 60_000);
  if (limited) return limited;

  const caller = await getAuthedCaller(request);
  if (!caller) {
    return jsonError("Sign in and connect Google Calendar first.", 401);
  }
  const config = getGoogleOAuthConfig();
  if (!config) {
    return jsonError("Google Calendar is not configured on this deployment.", 503);
  }

  const url = new URL(request.url);
  const dateParam = url.searchParams.get("date");
  const fromParam = url.searchParams.get("from");
  const toParam = url.searchParams.get("to");

  let timeMinIso: string;
  let timeMaxIso: string;
  if (fromParam && toParam) {
    timeMinIso = fromParam;
    timeMaxIso = toParam;
  } else {
    const day = dateParam ? new Date(`${dateParam}T00:00:00`) : new Date();
    if (Number.isNaN(day.getTime())) {
      return jsonError("date must be YYYY-MM-DD.", 400);
    }
    ({ timeMinIso, timeMaxIso } = dayRangeIso(day));
  }

  const accessToken = await getValidAccessToken(
    caller.client,
    caller.userId,
    config
  );
  if (!accessToken) {
    return jsonError(
      "Google Calendar is not connected. Connect it from the Calendar page first.",
      409
    );
  }

  const result = await listCalendarEvents(accessToken, {
    timeMinIso,
    timeMaxIso,
  });
  if (!result.success) {
    return jsonError(result.error, result.status ?? 502);
  }
  return NextResponse.json({ events: result.data });
}

/**
 * POST /api/calendar/events
 * Body: `{ summary, startIso, endIso, description?, location? }`.
 * Signed-in + Google-connected only.
 */
export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "calendar", 30, 60_000);
  if (limited) return limited;

  const caller = await getAuthedCaller(request);
  if (!caller) {
    return jsonError("Sign in and connect Google Calendar first.", 401);
  }
  const config = getGoogleOAuthConfig();
  if (!config) {
    return jsonError("Google Calendar is not configured on this deployment.", 503);
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return jsonError("Invalid JSON body.", 400);
  }

  const summary = typeof body.summary === "string" ? body.summary : "";
  const startIso = typeof body.startIso === "string" ? body.startIso : "";
  const endIso = typeof body.endIso === "string" ? body.endIso : "";
  const description =
    typeof body.description === "string" ? body.description : undefined;
  const location =
    typeof body.location === "string" ? body.location : undefined;

  const accessToken = await getValidAccessToken(
    caller.client,
    caller.userId,
    config
  );
  if (!accessToken) {
    return jsonError(
      "Google Calendar is not connected. Connect it from the Calendar page first.",
      409
    );
  }

  const result = await createCalendarEvent(accessToken, {
    summary,
    startIso,
    endIso,
    description,
    location,
    timeZone: "Asia/Kolkata",
  });
  if (!result.success) {
    return jsonError(result.error, result.status ?? 400);
  }
  return NextResponse.json({ event: result.data }, { status: 201 });
}
