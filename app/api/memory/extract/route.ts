import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getAuthedServerContext } from "@/lib/supabase/server-auth";
import { FIX_MODEL_ID } from "@/lib/gemini/model-config";
import {
  buildExtractionPrompt,
  isDuplicateFact,
  MAX_MEMORIES_PER_USER,
  parseExtractedFacts,
} from "@/lib/memory";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/memory/extract — memory v2 auto-extraction.
 *
 * The client calls this at most once per 6 user turns in a chat
 * (see shouldExtractNow in lib/memory.ts) — NEVER per message.
 * A cheap Flash-Lite pass pulls durable facts from the last turns
 * into the `memories` table (capped per user, deduped against stored
 * facts). Extraction is best-effort: any failure (no key, model
 * error, table missing) returns extracted: 0 instead of failing —
 * the chat already happened, and a missing memory is never an error
 * the user should see.
 *
 * Guests cannot store memories (there is no user to attach them to),
 * so this route requires a signed-in caller.
 */

type ExtractMessage = { role: string; content: string };

function parseMessages(body: unknown): ExtractMessage[] | null {
  if (typeof body !== "object" || body === null) return null;
  const raw = (body as Record<string, unknown>).messages;
  if (!Array.isArray(raw) || raw.length < 2 || raw.length > 10) return null;

  const messages: ExtractMessage[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) return null;
    const role = (item as Record<string, unknown>).role;
    const content = (item as Record<string, unknown>).content;
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content !== "string" || content.trim().length === 0) {
      return null;
    }
    messages.push({ role, content: content.slice(0, 4000) });
  }
  return messages;
}

export async function POST(request: Request) {
  const limited = await enforceRateLimit(
    request,
    "memory-extract",
    10,
    3_600_000
  );
  if (limited) return limited;

  const authed = await getAuthedServerContext(request).catch(() => null);
  if (!authed) {
    return NextResponse.json(
      { error: "Sign in to save memories." },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const messages = parseMessages(body);
  if (!messages) {
    return NextResponse.json(
      { error: "Send 2–10 recent chat messages to extract from." },
      { status: 400 }
    );
  }

  const conversationId =
    typeof (body as Record<string, unknown>).conversationId === "string"
      ? ((body as Record<string, unknown>).conversationId as string)
      : null;

  // Existing facts: dedupe + cap check. A missing table means "no
  // memories feature on this deployment" — report, don't crash.
  let existingFacts: string[] = [];
  try {
    const { data, error } = await authed.client
      .from("memories")
      .select("fact")
      .eq("user_id", authed.userId);
    if (error) throw error;
    existingFacts = ((data ?? []) as { fact: string }[]).map(
      (row) => row.fact
    );
  } catch (error) {
    console.warn("Memory extraction skipped: cannot read memories.", error);
    return NextResponse.json({ extracted: 0, skipped: "unavailable" });
  }

  if (existingFacts.length >= MAX_MEMORIES_PER_USER) {
    return NextResponse.json({ extracted: 0, skipped: "cap" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ extracted: 0, skipped: "no-key" });
  }

  let rawReply: string;
  try {
    const client = new GoogleGenerativeAI(apiKey);
    const model = client.getGenerativeModel({ model: FIX_MODEL_ID });
    const result = await model.generateContent(
      buildExtractionPrompt(messages)
    );
    rawReply = result.response.text();
  } catch (error) {
    console.warn("Memory extraction model call failed.", error);
    return NextResponse.json({ extracted: 0, skipped: "model-error" });
  }

  const candidates = parseExtractedFacts(rawReply);
  const fresh = candidates.filter(
    (fact) => !isDuplicateFact(fact, existingFacts)
  );
  const room = MAX_MEMORIES_PER_USER - existingFacts.length;
  const toStore = fresh.slice(0, room);

  if (toStore.length === 0) {
    return NextResponse.json({ extracted: 0, skipped: "no-new-facts" });
  }

  try {
    const { error } = await authed.client.from("memories").insert(
      toStore.map((fact) => ({
        user_id: authed.userId,
        fact,
        source_chat_id: conversationId,
        confidence: 0.7,
      }))
    );
    if (error) throw error;
  } catch (error) {
    console.warn("Memory extraction skipped: cannot store memories.", error);
    return NextResponse.json({ extracted: 0, skipped: "unavailable" });
  }

  return NextResponse.json({
    extracted: toStore.length,
    facts: toStore,
    capped: fresh.length > toStore.length,
  });
}
