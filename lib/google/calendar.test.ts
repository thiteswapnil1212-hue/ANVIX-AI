import test from "node:test";
import assert from "node:assert/strict";
import {
  createCalendarEvent,
  dayRangeIso,
  listCalendarEvents,
} from "./calendar.ts";

function fakeFetch(handler: (url: string, init?: RequestInit) => Response) {
  return (async (url: string, init?: RequestInit) => handler(url, init)) as unknown as typeof fetch;
}

const EVENT_JSON = {
  id: "evt-1",
  summary: "Team standup",
  description: "Daily sync",
  location: "Room 4",
  start: { dateTime: "2026-11-23T10:00:00+05:30" },
  end: { dateTime: "2026-11-23T10:30:00+05:30" },
  htmlLink: "https://calendar.google.com/event?eid=evt-1",
};

test("listCalendarEvents returns parsed events and sends the right query", async () => {
  let seenUrl = "";
  let seenAuth = "";
  const result = await listCalendarEvents(
    "ya29.token",
    { timeMinIso: "2026-11-23T00:00:00.000Z", timeMaxIso: "2026-11-24T00:00:00.000Z" },
    fakeFetch((url, init) => {
      seenUrl = url;
      seenAuth = (init?.headers as Record<string, string>).Authorization;
      return new Response(JSON.stringify({ items: [EVENT_JSON] }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    })
  );
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.length, 1);
    assert.equal(result.data[0]?.summary, "Team standup");
    assert.equal(result.data[0]?.start.dateTime, "2026-11-23T10:00:00+05:30");
  }
  assert.ok(seenUrl.includes("/calendars/primary/events"));
  assert.ok(seenUrl.includes("singleEvents=true"));
  assert.ok(seenUrl.includes("orderBy=startTime"));
  assert.equal(seenAuth, "Bearer ya29.token");
});

test("listCalendarEvents maps Google errors to a message + status", async () => {
  const result = await listCalendarEvents(
    "bad-token",
    { timeMinIso: "2026-11-23T00:00:00.000Z", timeMaxIso: "2026-11-24T00:00:00.000Z" },
    fakeFetch(
      () =>
        new Response(JSON.stringify({ error: { message: "Invalid Credentials" } }), {
          status: 401,
          headers: { "Content-Type": "application/json" },
        })
    )
  );
  assert.equal(result.success, false);
  if (!result.success) {
    assert.equal(result.error, "Invalid Credentials");
    assert.equal(result.status, 401);
  }
});

test("listCalendarEvents handles a network failure", async () => {
  const result = await listCalendarEvents(
    "ya29.token",
    { timeMinIso: "2026-11-23T00:00:00.000Z", timeMaxIso: "2026-11-24T00:00:00.000Z" },
    (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch
  );
  assert.equal(result.success, false);
});

test("createCalendarEvent validates input before calling Google", async () => {
  let called = false;
  const counting = fakeFetch(() => {
    called = true;
    return new Response(JSON.stringify(EVENT_JSON), { status: 200 });
  });
  const empty = await createCalendarEvent(
    "t",
    { summary: "   ", startIso: "2026-11-23T10:00:00+05:30", endIso: "2026-11-23T11:00:00+05:30" },
    counting
  );
  assert.equal(empty.success, false);
  const backwards = await createCalendarEvent(
    "t",
    { summary: "X", startIso: "2026-11-23T11:00:00+05:30", endIso: "2026-11-23T10:00:00+05:30" },
    counting
  );
  assert.equal(backwards.success, false);
  assert.equal(called, false);
});

test("createCalendarEvent posts the event and returns it", async () => {
  let seenBody = "";
  const result = await createCalendarEvent(
    "ya29.token",
    {
      summary: "Demo",
      startIso: "2026-11-23T10:00:00+05:30",
      endIso: "2026-11-23T11:00:00+05:30",
      timeZone: "Asia/Kolkata",
    },
    fakeFetch((_url, init) => {
      seenBody = String(init?.body ?? "");
      return new Response(JSON.stringify(EVENT_JSON), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    })
  );
  assert.equal(result.success, true);
  const body = JSON.parse(seenBody) as Record<string, unknown>;
  assert.equal(body.summary, "Demo");
  assert.equal(
    (body.start as Record<string, string>).timeZone,
    "Asia/Kolkata"
  );
});

test("dayRangeIso spans exactly one local day", () => {
  const { timeMinIso, timeMaxIso } = dayRangeIso(new Date("2026-11-23T15:00:00"));
  assert.equal(
    new Date(timeMaxIso).getTime() - new Date(timeMinIso).getTime(),
    24 * 60 * 60 * 1000
  );
  assert.equal(new Date(timeMinIso).getHours(), 0);
});
