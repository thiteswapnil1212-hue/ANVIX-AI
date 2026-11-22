import type {
  CalendarEvent,
  CalendarResult,
} from "./calendar.ts";

/**
 * Natural-language Calendar assistant ("What is on my calendar today?",
 * "Add a dentist appointment tomorrow at 10am").
 *
 * The model is given two tools — list events and create an event — and
 * may call them over up to `MAX_TURNS` turns. All Gemini and Google
 * access goes through injected dependencies so tests can run with no
 * network and no API key; routes pass the real implementations.
 */

export interface CalendarAskTools {
  listEvents: (fromIso: string, toIso: string) => Promise<CalendarResult<CalendarEvent[]>>;
  createEvent: (input: {
    summary: string;
    startIso: string;
    endIso: string;
    description?: string;
    location?: string;
  }) => Promise<CalendarResult<CalendarEvent>>;
}

export interface ModelTurn {
  text?: string;
  functionCall?: { name: string; args: Record<string, unknown> };
}

export type CalendarModelFn = (
  messages: { role: "user" | "model"; text: string }[]
) => Promise<ModelTurn>;

const MAX_TURNS = 4;

export const CALENDAR_FUNCTION_DECLARATIONS = [
  {
    name: "listCalendarEvents",
    description:
      "List the user's calendar events between two ISO timestamps. Use this to answer what is on the calendar.",
    parameters: {
      type: "OBJECT",
      properties: {
        fromIso: {
          type: "STRING",
          description: "Start of the range, ISO 8601 date-time.",
        },
        toIso: {
          type: "STRING",
          description: "End of the range, ISO 8601 date-time.",
        },
      },
      required: ["fromIso", "toIso"],
    },
  },
  {
    name: "createCalendarEvent",
    description:
      "Create a calendar event. Only call this when the user asked to add, schedule, or book something.",
    parameters: {
      type: "OBJECT",
      properties: {
        summary: { type: "STRING", description: "Event title." },
        startIso: {
          type: "STRING",
          description: "Start, ISO 8601 date-time with timezone offset.",
        },
        endIso: {
          type: "STRING",
          description: "End, ISO 8601 date-time with timezone offset.",
        },
        description: { type: "STRING", description: "Optional details." },
        location: { type: "STRING", description: "Optional location." },
      },
      required: ["summary", "startIso", "endIso"],
    },
  },
] as const;

function stringArg(args: Record<string, unknown>, key: string): string {
  const value = args[key];
  return typeof value === "string" ? value : "";
}

function formatEvents(events: CalendarEvent[]): string {
  if (events.length === 0) return "No events in that range.";
  return events
    .map((event) => {
      const start = event.start.dateTime ?? event.start.date ?? "?";
      const end = event.end.dateTime ?? event.end.date ?? "?";
      const where = event.location ? ` at ${event.location}` : "";
      return `- ${event.summary}: ${start} to ${end}${where}`;
    })
    .join("\n");
}

/**
 * Run one natural-language calendar question. Returns the final text
 * answer. `todayIso` is injected so tests are deterministic.
 */
export async function runCalendarAsk(
  question: string,
  tools: CalendarAskTools,
  callModel: CalendarModelFn,
  todayIso: string = new Date().toISOString()
): Promise<{ success: true; answer: string } | { success: false; error: string }> {
  const trimmed = question.trim();
  if (!trimmed) return { success: false, error: "Question is required." };

  const today = todayIso.slice(0, 10);
  const system = [
    "You are ANVIX's calendar assistant.",
    `Today is ${today}.`,
    "Unless the user says otherwise, assume the Asia/Kolkata timezone and use +05:30 offsets in ISO timestamps.",
    "When the user asks what is on their calendar, call listCalendarEvents for the requested range, then answer from the results — never invent events.",
    "When the user asks to add an event, call createCalendarEvent once, then confirm what was added.",
    "If a tool reports an error, say so plainly and do not invent a result.",
  ].join(" ");

  const messages: { role: "user" | "model"; text: string }[] = [
    { role: "user", text: `${system}\n\nUser: ${trimmed}` },
  ];

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    let result: ModelTurn;
    try {
      result = await callModel(messages);
    } catch {
      return { success: false, error: "The calendar assistant is unavailable right now." };
    }

    if (result.functionCall) {
      const { name, args } = result.functionCall;
      let toolOutput: string;

      if (name === "listCalendarEvents") {
        const listed = await tools.listEvents(
          stringArg(args, "fromIso"),
          stringArg(args, "toIso")
        );
        toolOutput = listed.success
          ? formatEvents(listed.data)
          : `Error listing events: ${listed.error}`;
      } else if (name === "createCalendarEvent") {
        const created = await tools.createEvent({
          summary: stringArg(args, "summary"),
          startIso: stringArg(args, "startIso"),
          endIso: stringArg(args, "endIso"),
          description: stringArg(args, "description") || undefined,
          location: stringArg(args, "location") || undefined,
        });
        toolOutput = created.success
          ? `Created: ${created.data.summary} (${created.data.start.dateTime ?? created.data.start.date} to ${created.data.end.dateTime ?? created.data.end.date}).`
          : `Error creating event: ${created.error}`;
      } else {
        toolOutput = `Unknown tool: ${name}.`;
      }

      messages.push({
        role: "model",
        text: `[tool ${name} returned]\n${toolOutput}`,
      });
      continue;
    }

    return { success: true, answer: result.text?.trim() || "Done." };
  }

  return {
    success: false,
    error: "The calendar assistant took too many steps. Please try a simpler question.",
  };
}
