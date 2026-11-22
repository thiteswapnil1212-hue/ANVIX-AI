import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { CHAT_MODEL_ID } from "../gemini/model-config.ts";
import {
  createCalendarEvent,
  dayRangeIso,
  listCalendarEvents,
} from "../google/calendar.ts";

/**
 * ANVIX as an MCP server (stateless, spec 2026-07-28, SDK v1.x).
 *
 * One server instance is created per request and connected to a fresh
 * `WebStandardStreamableHTTPServerTransport` with
 * `sessionIdGenerator: undefined` (stateless — no handshake, no session
 * store), which is what fits a Vercel serverless function.
 *
 * Auth is the route's job (`app/api/mcp/route.ts`): every caller is a
 * verified ANVIX user (Supabase Bearer token, or an ANVIX API key once
 * the public API lands). The tools below only ever act as that user.
 *
 * Tools:
 * - `anvix_chat` — ask ANVIX anything (one Gemini call, shared quota).
 * - `anvix_calendar_today` — today's events from the caller's connected
 *   Google Calendar (errors honestly when not connected).
 * - `anvix_calendar_create` — add an event to the caller's calendar.
 *
 * The chat tool is deliberately non-streaming: MCP tool calls return one
 * result, and the chat route's NDJSON stream has no meaning here.
 */

export interface McpContext {
  /** The verified ANVIX user id calling the server. */
  userId: string;
  /**
   * A function returning a fresh Google access token for this user, or
   * null when the user never connected Calendar. Injected so the tools
   * never touch Supabase directly.
   */
  getCalendarAccessToken: () => Promise<string | null>;
  /** Test seam: replaces the real Gemini call. */
  chatImpl?: (prompt: string) => Promise<string>;
}

async function defaultChat(prompt: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured on this deployment.");
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: CHAT_MODEL_ID });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function errorResult(text: string) {
  return { content: [{ type: "text" as const, text }], isError: true };
}

export function createAnvixMcpServer(context: McpContext): McpServer {
  const server = new McpServer({
    name: "anvix-ai",
    version: "0.1.0",
  });

  server.registerTool(
    "anvix_chat",
    {
      title: "Ask ANVIX",
      description:
        "Ask the ANVIX AI assistant a question. Returns a plain-text answer.",
      inputSchema: {
        prompt: z.string().min(1).describe("The question or prompt."),
      },
    },
    async ({ prompt }) => {
      try {
        const answer = await (context.chatImpl ?? defaultChat)(prompt);
        return textResult(answer);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Chat failed.";
        return errorResult(`ANVIX chat failed: ${message}`);
      }
    }
  );

  server.registerTool(
    "anvix_calendar_today",
    {
      title: "Today's calendar",
      description:
        "List the caller's Google Calendar events for today. Fails honestly when Calendar is not connected.",
      inputSchema: {},
    },
    async () => {
      const accessToken = await context.getCalendarAccessToken();
      if (!accessToken) {
        return errorResult(
          "Google Calendar is not connected for this user. Connect it from the ANVIX Calendar page first."
        );
      }
      const { timeMinIso, timeMaxIso } = dayRangeIso(new Date());
      const result = await listCalendarEvents(accessToken, {
        timeMinIso,
        timeMaxIso,
      });
      if (!result.success) {
        return errorResult(`Could not read the calendar: ${result.error}`);
      }
      if (result.data.length === 0) {
        return textResult("Nothing on your calendar today.");
      }
      const lines = result.data.map((event) => {
        const start = event.start.dateTime ?? event.start.date ?? "?";
        const end = event.end.dateTime ?? event.end.date ?? "?";
        return `- ${event.summary}: ${start} to ${end}${
          event.location ? ` at ${event.location}` : ""
        }`;
      });
      return textResult(`Today's events:\n${lines.join("\n")}`);
    }
  );

  server.registerTool(
    "anvix_calendar_create",
    {
      title: "Create calendar event",
      description: "Add an event to the caller's Google Calendar.",
      inputSchema: {
        summary: z.string().min(1).describe("Event title."),
        startIso: z
          .string()
          .describe("Start, ISO 8601 date-time with timezone offset."),
        endIso: z
          .string()
          .describe("End, ISO 8601 date-time with timezone offset."),
        description: z.string().optional().describe("Optional details."),
        location: z.string().optional().describe("Optional location."),
      },
    },
    async ({ summary, startIso, endIso, description, location }) => {
      const accessToken = await context.getCalendarAccessToken();
      if (!accessToken) {
        return errorResult(
          "Google Calendar is not connected for this user. Connect it from the ANVIX Calendar page first."
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
        return errorResult(`Could not create the event: ${result.error}`);
      }
      return textResult(
        `Created: ${result.data.summary} (${result.data.start.dateTime ?? result.data.start.date} to ${result.data.end.dateTime ?? result.data.end.date}).`
      );
    }
  );

  return server;
}
