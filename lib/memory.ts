/**
 * Memory v2 — auto-extraction + retrieval (report §7).
 *
 * After a chat turn, a cheap Flash-Lite extraction pass pulls durable
 * facts ("user prefers TypeScript", "interviewing for SDE roles") into
 * the `memories` table. Every memory is user-visible, editable and
 * deletable in Settings, and stored per user.
 *
 * Quota rules (the report's cost warning, enforced here):
 * - Batch it: extract once per chat, or once per N turns — NEVER per
 *   message. N = 6 user turns (see shouldExtractNow).
 * - Cap stored memories per user (MAX_MEMORIES_PER_USER); at the cap,
 *   new facts are skipped, never silently dropped into a second store.
 *
 * Retrieval: recency + keyword match. There is NO pgvector store in
 * this base, so there is no embedding-similarity retrieval yet.
 * Upgrade path (schema.sql documents it too): enable pgvector, add
 * `memories.embedding vector(768)`, backfill embeddings, and replace
 * selectRelevantMemories() with a similarity query with recency as the
 * tiebreak. The table shape does not need to change.
 *
 * This module is pure logic so it is unit-testable without Gemini or
 * Supabase. The live extraction call lives in /api/memory/extract.
 */

export const MAX_MEMORIES_PER_USER = 100;
/** Extract once per this many user turns in a chat (not per message). */
export const MEMORY_EXTRACTION_EVERY_N_USER_TURNS = 6;
/** Longest single fact worth storing. */
export const MAX_FACT_CHARS = 280;

export interface MemoryRecord {
  id: string;
  fact: string;
  sourceChatId: string | null;
  confidence: number;
  createdAt: string;
}

/** Normalise a fact for dedupe comparison. */
export function normalizeFact(fact: string): string {
  return fact.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * True when `fact` already exists in `existingFacts` — exact match, or
 * one contains the other (a reworded repeat of a stored fact). The
 * substring check needs a minimum length so short facts like "likes
 * tea" do not collide with every longer sentence containing them.
 */
export function isDuplicateFact(
  fact: string,
  existingFacts: string[]
): boolean {
  const normalized = normalizeFact(fact);
  if (!normalized) return true;
  for (const existing of existingFacts) {
    const other = normalizeFact(existing);
    if (!other) continue;
    if (normalized === other) return true;
    if (
      normalized.length >= 20 &&
      other.length >= 20 &&
      (normalized.includes(other) || other.includes(normalized))
    ) {
      return true;
    }
  }
  return false;
}

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "for", "with", "from", "that",
  "this", "what", "when", "where", "which", "how", "why", "who", "are",
  "was", "were", "been", "have", "has", "had", "will", "would", "can",
  "could", "should", "about", "into", "your", "you", "they", "them",
  "their", "its", "our", "not", "all", "also", "than", "then", "there",
  "here", "just", "like", "more", "most", "some", "such", "only", "over",
  "under", "between", "after", "before", "does", "did", "doesn",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length >= 3 && !STOPWORDS.has(word));
}

export interface ScoredMemory {
  memory: MemoryRecord;
  score: number;
  keywordHits: number;
}

/**
 * Retrieve memories for a prompt: keyword overlap first, recency as
 * the tiebreak. When nothing matches any keyword, fall back to the
 * 2 most recent memories — recency-based retrieval first, per the
 * report — so a fresh fact ("just started a portfolio site") still
 * reaches the model even before its words recur.
 */
export function selectRelevantMemories(
  memories: MemoryRecord[],
  prompt: string,
  limit = 5
): MemoryRecord[] {
  if (memories.length === 0 || limit <= 0) return [];

  const promptWords = new Set(tokenize(prompt));
  const sortedByRecency = [...memories].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  const scored: ScoredMemory[] = sortedByRecency.map((memory, index) => {
    const factWords = tokenize(memory.fact);
    let hits = 0;
    for (const word of new Set(factWords)) {
      if (promptWords.has(word)) hits += 1;
    }
    // Recency bonus: newest memory in the list gets up to +0.9, so a
    // 1-hit recent fact outranks a 1-hit old one, but never outranks
    // a 2-hit fact.
    const recencyBonus =
      sortedByRecency.length > 1
        ? (1 - index / sortedByRecency.length) * 0.9
        : 0;
    return { memory, score: hits * 2 + recencyBonus, keywordHits: hits };
  });

  const withHits = scored.filter((entry) => entry.keywordHits > 0);

  if (withHits.length > 0) {
    return withHits
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map((entry) => entry.memory);
  }

  return sortedByRecency.slice(0, Math.min(2, limit));
}

/**
 * Batching gate for extraction: true only on every Nth user turn, and
 * only once per turn count (so a retried send cannot double-extract).
 */
export function shouldExtractNow(
  userTurnCount: number,
  lastExtractedTurnCount: number | null
): boolean {
  if (userTurnCount <= 0) return false;
  if (userTurnCount % MEMORY_EXTRACTION_EVERY_N_USER_TURNS !== 0) {
    return false;
  }
  return lastExtractedTurnCount !== userTurnCount;
}

/**
 * Parse the extraction model's reply into candidate facts. Accepts a
 * JSON array of strings, `{ "facts": [...] }`, or an array of
 * `{ fact, confidence }` objects — the model is instructed to reply
 * with the first shape, the others are tolerance for its drift. Any
 * unparseable reply yields [] (no facts is a safe failure, never a
 * crash, and the route reports extracted: 0).
 */
export function parseExtractedFacts(raw: unknown): string[] {
  let parsed: unknown = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return [];
    }
  }

  const candidates: unknown[] = Array.isArray(parsed)
    ? parsed
    : typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>).facts ?? []
      : [];

  if (!Array.isArray(candidates)) return [];

  const facts: string[] = [];
  for (const candidate of candidates) {
    const text =
      typeof candidate === "string"
        ? candidate
        : typeof candidate === "object" && candidate !== null
          ? (candidate as Record<string, unknown>).fact
          : null;
    if (typeof text !== "string") continue;
    const cleaned = text.trim().replace(/\s+/g, " ");
    if (cleaned.length >= 4 && cleaned.length <= MAX_FACT_CHARS) {
      facts.push(cleaned);
    }
  }
  return [...new Set(facts)];
}

/** The extraction prompt: durable facts only, JSON array only. */
export function buildExtractionPrompt(
  messages: { role: string; content: string }[]
): string {
  const transcript = messages
    .slice(-10)
    .map((message) => `${message.role}: ${message.content.slice(0, 2000)}`)
    .join("\n");
  return [
    "Extract durable facts about the user from this chat transcript —",
    "stable preferences, goals, projects, skills, constraints (e.g. prefers TypeScript, building a portfolio site, interviewing for SDE roles).",
    "Ignore one-off questions, greetings, and anything already obvious from the current message alone.",
    "Reply with ONLY a JSON array of short fact strings, e.g. [\"Prefers TypeScript over JavaScript\"].",
    "No more than 5 facts. Reply [] when there is nothing durable to remember.",
    "",
    transcript,
  ].join("\n");
}
