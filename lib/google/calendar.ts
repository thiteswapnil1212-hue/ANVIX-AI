/**
 * Google Calendar REST client — plain `fetch`, no `googleapis` dependency.
 *
 * Every function takes an access token and an injectable `fetch` so tests
 * can stub Google without a network call. Token refresh is the caller's
 * job (see `lib/google/connections.ts`, which refreshes before calling
 * these). All Google calls are free; Calendar quota is 1M queries/day
 * per project, 600 req/min/user (per the research report §10).
 */

export const GOOGLE_CALENDAR_API =
  "https://www.googleapis.com/calendar/v3";

export interface CalendarEvent {
  id: string;
  summary: string;
  description: string | null;
  location: string | null;
  /** ISO date-time, or an all-day `YYYY-MM-DD` date in `date`. */
  start: { dateTime: string | null; date: string | null };
  end: { dateTime: string | null; date: string | null };
  htmlLink: string | null;
}

export interface CreateCalendarEventInput {
  summary: string;
  /** ISO date-time, e.g. `2026-11-23T10:00:00+05:30`. */
  startIso: string;
  /** ISO date-time; must be after `startIso`. */
  endIso: string;
  description?: string;
  location?: string;
  /** IANA zone, e.g. `Asia/Kolkata`. Defaults to the event's own offset. */
  timeZone?: string;
}

export type CalendarResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; status?: number };

type FetchFn = typeof fetch;

function authHeaders(accessToken: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
}

interface GoogleEventJson {
  id?: unknown;
  summary?: unknown;
  description?: unknown;
  location?: unknown;
  start?: { dateTime?: unknown; date?: unknown };
  end?: { dateTime?: unknown; date?: unknown };
  htmlLink?: unknown;
}

function toCalendarEvent(json: GoogleEventJson): CalendarEvent {
  const text = (value: unknown): string | null =>
    typeof value === "string" ? value : null;
  return {
    id: typeof json.id === "string" ? json.id : "",
    summary: typeof json.summary === "string" ? json.summary : "(No title)",
    description: text(json.description),
    location: text(json.location),
    start: {
      dateTime: text(json.start?.dateTime),
      date: text(json.start?.date),
    },
    end: {
      dateTime: text(json.end?.dateTime),
      date: text(json.end?.date),
    },
    htmlLink: text(json.htmlLink),
  };
}

async function readError(response: Response): Promise<string> {
  try {
    const json = (await response.json()) as {
      error?: { message?: unknown };
    };
    if (typeof json.error?.message === "string") return json.error.message;
  } catch {
    // fall through to the generic message
  }
  return `Google Calendar returned HTTP ${response.status}.`;
}

/**
 * List events on the primary calendar between two ISO timestamps.
 * Results are ordered by start time; cancelled events are excluded.
 */
export async function listCalendarEvents(
  accessToken: string,
  options: {
    timeMinIso: string;
    timeMaxIso: string;
    maxResults?: number;
  },
  fetchFn: FetchFn = fetch
): Promise<CalendarResult<CalendarEvent[]>> {
  const url = new URL(`${GOOGLE_CALENDAR_API}/calendars/primary/events`);
  url.searchParams.set("timeMin", options.timeMinIso);
  url.searchParams.set("timeMax", options.timeMaxIso);
  url.searchParams.set("singleEvents", "true");
  url.searchParams.set("orderBy", "startTime");
  url.searchParams.set("maxResults", String(options.maxResults ?? 50));

  let response: Response;
  try {
    response = await fetchFn(url.toString(), { headers: authHeaders(accessToken) });
  } catch {
    return { success: false, error: "Could not reach Google Calendar." };
  }
  if (!response.ok) {
    return {
      success: false,
      error: await readError(response),
      status: response.status,
    };
  }
  let json: { items?: unknown };
  try {
    json = (await response.json()) as { items?: unknown };
  } catch {
    return { success: false, error: "Google Calendar returned invalid JSON." };
  }
  const items = Array.isArray(json.items) ? json.items : [];
  return {
    success: true,
    data: items
      .filter((item): item is GoogleEventJson => !!item && typeof item === "object")
      .map(toCalendarEvent),
  };
}

/** Create an event on the primary calendar. */
export async function createCalendarEvent(
  accessToken: string,
  input: CreateCalendarEventInput,
  fetchFn: FetchFn = fetch
): Promise<CalendarResult<CalendarEvent>> {
  const summary = input.summary.trim();
  if (!summary) {
    return { success: false, error: "Event title is required." };
  }
  const start = new Date(input.startIso);
  const end = new Date(input.endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return { success: false, error: "Start and end must be valid dates." };
  }
  if (end <= start) {
    return { success: false, error: "End time must be after start time." };
  }

  const body: Record<string, unknown> = {
    summary,
    start: { dateTime: input.startIso, timeZone: input.timeZone },
    end: { dateTime: input.endIso, timeZone: input.timeZone },
  };
  if (input.description?.trim()) body.description = input.description.trim();
  if (input.location?.trim()) body.location = input.location.trim();

  let response: Response;
  try {
    response = await fetchFn(`${GOOGLE_CALENDAR_API}/calendars/primary/events`, {
      method: "POST",
      headers: authHeaders(accessToken),
      body: JSON.stringify(body),
    });
  } catch {
    return { success: false, error: "Could not reach Google Calendar." };
  }
  if (!response.ok) {
    return {
      success: false,
      error: await readError(response),
      status: response.status,
    };
  }
  let json: GoogleEventJson;
  try {
    json = (await response.json()) as GoogleEventJson;
  } catch {
    return { success: false, error: "Google Calendar returned invalid JSON." };
  }
  return { success: true, data: toCalendarEvent(json) };
}

/**
 * ISO bounds for a local calendar day. `date` is the day in the caller's
 * local timezone; the bounds use that timezone's offset so "today" means
 * the user's today, not a UTC day.
 */
export function dayRangeIso(date: Date): { timeMinIso: string; timeMaxIso: string } {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(24, 0, 0, 0);
  return { timeMinIso: start.toISOString(), timeMaxIso: end.toISOString() };
}
