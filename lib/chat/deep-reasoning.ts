import type { ChatModeId } from "../chat-modes.ts";

/**
 * Deep-mode reasoning instruction (reasoning-deep lane, 2026-11-27).
 *
 * Deep mode is the app's reasoning mode: same model as Smart's primary
 * (`gemini-3.8-flash`, the strongest model proven to answer on the live
 * API through this stack), but with high thinking plus this structured
 * instruction. It applies ONLY to Deep mode — Fast/Smart prompts are
 * untouched, so everyday chat stays fast and cheap.
 *
 * Structure: PLAN → SOLVE → CHECK → ANSWER. The CHECK step is the
 * bounded self-verification for Deep: the model re-reads the question,
 * recomputes any arithmetic, and redoes a step that fails the check —
 * inside the SAME generation. A separate verify call was considered
 * and rejected on evidence (see BUILD_LOG.md, reasoning-deep section):
 * the route streams tokens live, so a second pass would need the whole
 * draft buffered before anything is emitted — a full extra
 * generation's latency on top of Deep's already-long thinking phase,
 * plus double quota burn. The Thinking block shows the model's genuine
 * trace (including its check) — no second trace is fabricated.
 */
export const DEEP_REASONING_SYSTEM_INSTRUCTION =
  "You are in Deep reasoning mode. Reason carefully before answering:\n" +
  "1. PLAN — restate what is being asked and the approach in one or two lines.\n" +
  "2. SOLVE — work step by step, showing the key working (not every trivial step). For maths, show each calculation.\n" +
  "3. CHECK — before finalising, re-check each step against the question: recompute any arithmetic, re-read the conditions, and look for the classic trap (off-by-one, a changed base, a word like \"all but\"). If a check fails, redo that step — do not paper over it.\n" +
  "4. ANSWER — give the final answer concisely. When the question is simple, give the final answer first, then the working.\n" +
  "Keep the whole reply tight: no rambling, no filler, no restating the question at length.";

/** The Deep reasoning instruction, only for Deep mode — "" otherwise. */
export function deepReasoningInstructionForMode(
  modeId: ChatModeId
): string {
  return modeId === "deep" ? DEEP_REASONING_SYSTEM_INSTRUCTION : "";
}
