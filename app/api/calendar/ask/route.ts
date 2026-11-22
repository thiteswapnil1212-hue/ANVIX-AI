import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getAuthedCaller } from "@/lib/supabase/server-user";
import { getGoogleOAuthConfig } from "@/lib/google/oauth";
import { getValidAccessToken } from "@/lib/google/connections";
import {
  CALENDAR_FUNCTION_DECLARATIONS,
  runCalendarAsk,
  type CalendarModelFn,
  type ModelTurn,
} from "@/lib/google/calendar-agent";
import {
  createCalendarEvent,
  listCalendarEvents,
} from "@/lib/google/calendar";
import { CHAT_MODEL_ID } from "@/lib/gemini/model-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** The real Gemini model call behind `runCalendarAsk` (legacy SDK). */
function createGeminiCalendarModel(): CalendarModelFn {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return async () => {
      throw new Error("GEMINI_API_KEY is not configured.");
    };
  }
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: CHAT_MODEL_ID,
    tools: [
      {
        // The legacy SDK's FunctionDeclaration type is loose enough for
        // these declarations; cast once here, not at every call site.
        functionDeclarations: CALENDAR_FUNCTION_DECLARATIONS as unknown as never,
      },
    ],
  });

  return async (messages) => {
    const contents = messages.map((message) => ({
      role: message.role,
      parts: [{ text: message.text }],
    }));
    const result = await model.generateContent({ contents });
    const response = result.response;
    const calls = response.functionCalls() ?? [];
    const first = calls[0];
    if (first) {
      return {
        functionCall: {
          name: first.name,
          args: (first.args ?? {}) as Record<string, unknown>,
        },
      } satisfies ModelTurn;
    }
    return { text: response.text() } satisfies ModelTurn;
  };
}

/**
 * POST /api/calendar/ask — natural-language calendar questions.
 * Body: `{ question: string }`. Signed-in + Google-connected only.
 * The model may list or create events through tools; it never sees the
 * user's tokens — the tools run server-side with the stored access token.
 */
export async function POST(request: Request) {
  const limited = await enforceRateLimit(request, "calendar-ask", 20, 60_000);
  if (limited) return limited;

  const caller = await getAuthedCaller(request);
  if (!caller) {
    return NextResponse.json(
      { error: "Sign in and connect Google Calendar to ask about it." },
      { status: 401 }
    );
  }

  const config = getGoogleOAuthConfig();
  if (!config) {
    return NextResponse.json(
      { error: "Google Calendar is not configured on this deployment." },
      { status: 503 }
    );
  }

  let body: { question?: unknown };
  try {
    body = (await request.json()) as { question?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const question =
    typeof body.question === "string" ? body.question.trim() : "";
  if (!question) {
    return NextResponse.json({ error: "Question is required." }, { status: 400 });
  }

  const accessToken = await getValidAccessToken(
    caller.client,
    caller.userId,
    config
  );
  if (!accessToken) {
    return NextResponse.json(
      {
        error:
          "Google Calendar is not connected. Connect it from the Calendar page first.",
      },
      { status: 409 }
    );
  }

  const result = await runCalendarAsk(
    question,
    {
      listEvents: (fromIso, toIso) =>
        listCalendarEvents(accessToken, {
          timeMinIso: fromIso,
          timeMaxIso: toIso,
        }),
      createEvent: (input) => createCalendarEvent(accessToken, input),
    },
    createGeminiCalendarModel()
  );

  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 502 });
  }
  return NextResponse.json({ answer: result.answer });
}
