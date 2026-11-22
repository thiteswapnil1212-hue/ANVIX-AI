import test from "node:test";
import assert from "node:assert/strict";
import { runCalendarAsk, type CalendarAskTools } from "./calendar-agent.ts";
import type { CalendarEvent } from "./calendar.ts";

const EVENT: CalendarEvent = {
  id: "evt-1",
  summary: "Team standup",
  description: null,
  location: "Room 4",
  start: { dateTime: "2026-11-23T10:00:00+05:30", date: null },
  end: { dateTime: "2026-11-23T10:30:00+05:30", date: null },
  htmlLink: null,
};

test("runCalendarAsk answers a 'what is on today' question via the list tool", async () => {
  let listed: [string, string] | null = null;
  const tools: CalendarAskTools = {
    listEvents: async (from, to) => {
      listed = [from, to];
      return { success: true, data: [EVENT] };
    },
    createEvent: async () => ({ success: false, error: "unused" }),
  };

  let calls = 0;
  const result = await runCalendarAsk(
    "What is on my calendar today?",
    tools,
    async (messages) => {
      calls++;
      if (calls === 1) {
        return {
          functionCall: {
            name: "listCalendarEvents",
            args: {
              fromIso: "2026-11-23T00:00:00+05:30",
              toIso: "2026-11-24T00:00:00+05:30",
            },
          },
        };
      }
      // The model should have received the tool output in the history.
      const last = messages[messages.length - 1];
      assert.ok(last?.text.includes("Team standup"));
      return { text: "You have Team standup at 10:00 AM in Room 4." };
    },
    "2026-11-23T08:00:00.000Z"
  );

  assert.equal(result.success, true);
  if (result.success) {
    assert.match(result.answer, /Team standup/);
  }
  assert.ok(listed);
});

test("runCalendarAsk creates an event when asked, then confirms", async () => {
  let created: unknown = null;
  const tools: CalendarAskTools = {
    listEvents: async () => ({ success: true, data: [] }),
    createEvent: async (input) => {
      created = input;
      return { success: true, data: { ...EVENT, summary: input.summary } };
    },
  };

  let calls = 0;
  const result = await runCalendarAsk(
    "Add a dentist appointment tomorrow at 10am for 30 minutes",
    tools,
    async () => {
      calls++;
      if (calls === 1) {
        return {
          functionCall: {
            name: "createCalendarEvent",
            args: {
              summary: "Dentist appointment",
              startIso: "2026-11-24T10:00:00+05:30",
              endIso: "2026-11-24T10:30:00+05:30",
            },
          },
        };
      }
      return { text: "Added dentist appointment for tomorrow at 10am." };
    },
    "2026-11-23T08:00:00.000Z"
  );

  assert.equal(result.success, true);
  assert.equal(
    (created as Record<string, string>).summary,
    "Dentist appointment"
  );
});

test("runCalendarAsk reports a tool error instead of inventing events", async () => {
  const tools: CalendarAskTools = {
    listEvents: async () => ({
      success: false,
      error: "Invalid Credentials",
    }),
    createEvent: async () => ({ success: false, error: "unused" }),
  };
  const result = await runCalendarAsk(
    "What is on my calendar today?",
    tools,
    async (messages) => {
      if (messages.length === 1) {
        return {
          functionCall: {
            name: "listCalendarEvents",
            args: { fromIso: "2026-11-23T00:00:00+05:30", toIso: "2026-11-24T00:00:00+05:30" },
          },
        };
      }
      const last = messages[messages.length - 1];
      assert.ok(last?.text.includes("Invalid Credentials"));
      return { text: "I could not read your calendar: Invalid Credentials." };
    },
    "2026-11-23T08:00:00.000Z"
  );
  assert.equal(result.success, true);
  if (result.success) assert.match(result.answer, /Invalid Credentials/);
});

test("runCalendarAsk rejects an empty question", async () => {
  const result = await runCalendarAsk("   ", {
    listEvents: async () => ({ success: true, data: [] }),
    createEvent: async () => ({ success: false, error: "unused" }),
  }, async () => ({ text: "hi" }));
  assert.equal(result.success, false);
});
