import type { Tool } from "@google/generative-ai";

import { classifyGeminiFailure } from "./fallback.ts";

/**
 * Web grounding for chat (Wave 2, §3a).
 *
 * The installed `@google/generative-ai` 0.24.1 types only declare the
 * 2.5-era `googleSearchRetrieval`, but `tools` is passed verbatim into
 * the v1beta request body (verified in the installed `dist/index.mjs`),
 * so `{ googleSearch: {} }` / `{ urlContext: {} }` reach the API
 * through this cast shim — the same pattern Wave 1 used for
 * `thinkingConfig`. If a live deploy ever 400s on `/api/chat`, the
 * `tools` field is the second suspect after `thinkingConfig`
 * (see SDK_DECISION_WAVE2.md); dropping it leaves plain chat intact.
 *
 * Quotas (free tier): Google Search 5,000 searches/month shared, then
 * $14/1K, 1,500/day cap. URL Context is free; fetched page content is
 * billed as input tokens.
 */

export type GroundingSource = {
  title: string;
  uri: string;
};

/**
 * Grounding tools for one chat request. Web ON (the default) enables
 * Google Search + URL Context; Web OFF returns no tools, so the model
 * answers from its own knowledge only.
 */
export function groundingTools(webEnabled: boolean): Tool[] {
  if (!webEnabled) return [];
  return [
    { googleSearch: {} },
    { urlContext: {} },
  ] as unknown as Tool[];
}

/**
 * True when a failed grounded attempt is worth retrying without
 * grounding tools: any failure before output while tools were
 * attached — except auth/config errors (401/403/404), which can
 * never succeed without tools either.
 *
 * Evidence (live, 2026-11-22): a grounded call fails with 429
 * quota errors while the SAME model answers fine without tools,
 * deterministically — web:true 0/8, web:false 8/8 across both
 * modes, minutes apart, on the live deployment. No 400 was ever
 * observed in the runtime logs, so the earlier 400-only rule
 * never fired. The retry must therefore not depend on the
 * failure's status: the plain call succeeds where the grounded
 * one fails. The SDK attaches the numeric status to fetch errors
 * (`GoogleGenerativeAIFetchError.status`), so the auth/config
 * exclusion is exact.
 */
export function shouldDegradeGrounding(error: unknown): boolean {
  const status = classifyGeminiFailure(error).status;
  return status !== 401 && status !== 403 && status !== 404;
}

type RawGroundingChunk = {
  web?: unknown;
};

function readGroundingChunks(chunk: unknown): RawGroundingChunk[] {
  if (!chunk || typeof chunk !== "object") return [];
  const candidates = (chunk as Record<string, unknown>).candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) return [];
  const first = candidates[0];
  if (!first || typeof first !== "object") return [];
  const metadata = (first as Record<string, unknown>).groundingMetadata;
  if (!metadata || typeof metadata !== "object") return [];
  const chunks = (metadata as Record<string, unknown>).groundingChunks;
  if (!Array.isArray(chunks)) return [];
  return chunks as RawGroundingChunk[];
}

/**
 * Pull `{title, uri}` web sources out of one raw stream chunk's
 * `groundingMetadata`. Chunks without a usable uri are skipped; the
 * title falls back to the uri's hostname so the UI always has a label.
 */
export function extractGroundingSources(chunk: unknown): GroundingSource[] {
  const sources: GroundingSource[] = [];

  for (const entry of readGroundingChunks(chunk)) {
    if (!entry.web || typeof entry.web !== "object") continue;
    const web = entry.web as Record<string, unknown>;
    if (typeof web.uri !== "string" || !web.uri.trim()) continue;
    const uri = web.uri.trim();
    const title =
      typeof web.title === "string" && web.title.trim()
        ? web.title.trim()
        : hostLabel(uri);
    sources.push({ title, uri });
  }

  return sources;
}

function hostLabel(uri: string): string {
  try {
    return new URL(uri).hostname.replace(/^www\./, "");
  } catch {
    return uri;
  }
}

/**
 * Merge newly extracted sources into the running list, deduped by uri
 * (first title wins), in arrival order.
 */
export function mergeGroundingSources(
  existing: GroundingSource[],
  next: GroundingSource[]
): GroundingSource[] {
  const seen = new Set(existing.map((source) => source.uri));
  const merged = [...existing];

  for (const source of next) {
    if (seen.has(source.uri)) continue;
    seen.add(source.uri);
    merged.push(source);
  }

  return merged;
}
