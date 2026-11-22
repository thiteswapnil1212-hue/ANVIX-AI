import type { ChatModeId } from "./chat-modes.ts";

/**
 * Custom assistants — the "skills" pattern (report §8).
 *
 * A named assistant is saved instructions + a tool set (+ reserved
 * reference-file ids), reusable across chats. This is what Custom GPTs
 * were and what Gems were — both are being deleted in Dec 2026
 * (Custom GPTs 11 Dec, Gems 17 Dec), so ANVIX builds the pattern the
 * leaders converged on (Claude Projects / Gemini skills), not a clone
 * of a dead feature.
 *
 * This module is pure logic: validation, starter templates, and the
 * system-prompt assembly the chat route injects. All Supabase access
 * lives in lib/supabase/assistants-memory.ts and tolerates the
 * `assistants` table being absent (SQL not applied yet) — nothing here
 * touches the network.
 */

export type AssistantMode = ChatModeId;

/** Tool ids an assistant may enable. Only "web" is honoured today. */
export const KNOWN_ASSISTANT_TOOLS = ["web"] as const;
export type AssistantTool = (typeof KNOWN_ASSISTANT_TOOLS)[number];

export const MAX_ASSISTANT_NAME_CHARS = 80;
export const MAX_ASSISTANT_INSTRUCTIONS_CHARS = 8000;
export const MAX_CUSTOM_INSTRUCTIONS_CHARS = 4000;
/** Hard cap on the assembled system prompt sent to Gemini. */
export const MAX_SYSTEM_PROMPT_CHARS = 12000;

export interface AssistantInput {
  name: string;
  description?: string;
  instructions?: string;
  /** Reference file ids — reserved; no stored-file plumbing exists yet. */
  fileIds?: string[];
  toolsEnabled?: string[];
  /** Preferred chat mode, or null = the chat's own mode picker decides. */
  mode?: AssistantMode | null;
  isPublic?: boolean;
}

export interface AssistantRecord extends AssistantInput {
  id: string;
  ownerId: string;
  name: string;
  description: string;
  instructions: string;
  fileIds: string[];
  toolsEnabled: AssistantTool[];
  mode: AssistantMode | null;
  isPublic: boolean;
  shareToken: string;
  createdAt: string;
  updatedAt: string;
}

const ASSISTANT_MODES: AssistantMode[] = ["fast", "smart", "deep"];

/** Unknown / missing mode values mean "no preference" — never throw. */
export function parseAssistantMode(value: unknown): AssistantMode | null {
  if (typeof value === "string" && (ASSISTANT_MODES as string[]).includes(value)) {
    return value as AssistantMode;
  }
  return null;
}

/** Keep only tool ids the chat route actually honours. */
export function filterAssistantTools(tools: unknown): AssistantTool[] {
  if (!Array.isArray(tools)) return ["web"];
  const kept = tools.filter((tool): tool is AssistantTool =>
    KNOWN_ASSISTANT_TOOLS.includes(tool as AssistantTool)
  );
  return kept.length > 0 ? kept : ["web"];
}

export interface ValidatedAssistant {
  ok: boolean;
  errors: string[];
  value: {
    name: string;
    description: string;
    instructions: string;
    fileIds: string[];
    toolsEnabled: AssistantTool[];
    mode: AssistantMode | null;
    isPublic: boolean;
  } | null;
}

/**
 * Validate + normalise an assistant create/edit payload. Returns
 * plain-words errors; the caller decides the HTTP status / UI text.
 * Instructions are capped — an unbounded system prompt is a quota
 * and abuse hole, not a feature.
 */
export function validateAssistantInput(input: unknown): ValidatedAssistant {
  const errors: string[] = [];
  const raw =
    typeof input === "object" && input !== null
      ? (input as Record<string, unknown>)
      : {};

  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  if (!name) errors.push("Give the assistant a name.");
  if (name.length > MAX_ASSISTANT_NAME_CHARS) {
    errors.push(
      `Keep the name under ${MAX_ASSISTANT_NAME_CHARS} characters.`
    );
  }

  const description =
    typeof raw.description === "string" ? raw.description.trim() : "";
  if (description.length > 500) {
    errors.push("Keep the description under 500 characters.");
  }

  const instructions =
    typeof raw.instructions === "string" ? raw.instructions.trim() : "";
  if (instructions.length > MAX_ASSISTANT_INSTRUCTIONS_CHARS) {
    errors.push(
      `Keep the instructions under ${MAX_ASSISTANT_INSTRUCTIONS_CHARS} characters — long instructions burn quota on every chat.`
    );
  }

  const mode = parseAssistantMode(raw.mode);
  if (raw.mode !== undefined && raw.mode !== null && mode === null) {
    errors.push("Mode must be fast, smart or deep.");
  }

  const fileIds = Array.isArray(raw.fileIds)
    ? raw.fileIds.filter((id): id is string => typeof id === "string")
    : [];

  if (errors.length > 0) return { ok: false, errors, value: null };

  return {
    ok: true,
    errors: [],
    value: {
      name,
      description,
      instructions,
      fileIds,
      toolsEnabled: filterAssistantTools(raw.toolsEnabled),
      mode,
      isPublic: raw.isPublic === true,
    },
  };
}

/** Global custom instructions (v1 base layer) — same cap, same rule. */
export function validateCustomInstructions(value: unknown): {
  ok: boolean;
  error: string | null;
  value: string;
} {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length > MAX_CUSTOM_INSTRUCTIONS_CHARS) {
    return {
      ok: false,
      error: `Keep custom instructions under ${MAX_CUSTOM_INSTRUCTIONS_CHARS} characters.`,
      value: "",
    };
  }
  return { ok: true, error: null, value: text };
}

export interface SystemPromptInput {
  /** Minimal global custom instructions (per-user, from Settings). */
  customInstructions?: string;
  /** Selected assistant's instructions, if any. */
  assistantInstructions?: string;
  assistantName?: string;
  /** Relevant memories, most relevant first. */
  memories?: string[];
}

/**
 * Assemble the system prompt, in priority order: global custom
 * instructions (the v1 base layer), then the assistant's instructions,
 * then relevant memories. Empty sections are omitted; the whole prompt
 * is hard-capped so a long assistant + long memories cannot blow the
 * quota on every turn.
 */
export function buildSystemPrompt(input: SystemPromptInput): string {
  const sections: string[] = [];

  const custom = (input.customInstructions ?? "").trim();
  if (custom) {
    sections.push(
      `User's global instructions (apply to every chat unless the assistant below overrides them):\n${custom}`
    );
  }

  const assistant = (input.assistantInstructions ?? "").trim();
  if (assistant) {
    const name = (input.assistantName ?? "").trim();
    sections.push(
      name
        ? `You are acting as the assistant "${name}". Follow these instructions:\n${assistant}`
        : `Assistant instructions:\n${assistant}`
    );
  }

  const memories = (input.memories ?? [])
    .map((fact) => fact.trim())
    .filter(Boolean);
  if (memories.length > 0) {
    sections.push(
      `Things to remember about the user (durable facts from earlier chats — use them when relevant, never quote this list back unprompted):\n${memories
        .map((fact) => `- ${fact}`)
        .join("\n")}`
    );
  }

  const prompt = sections.join("\n\n");
  return prompt.length > MAX_SYSTEM_PROMPT_CHARS
    ? prompt.slice(0, MAX_SYSTEM_PROMPT_CHARS)
    : prompt;
}

// ------------------------------------------------------------ starters

export interface StarterAssistant {
  name: string;
  description: string;
  instructions: string;
  toolsEnabled: AssistantTool[];
  mode: AssistantMode | null;
}

/**
 * Example starters, shipped in-app so a new user can try assistants
 * without writing instructions from scratch. Guests use them inline
 * (no account needed); signed-in users can save a copy to edit.
 */
export const STARTER_ASSISTANTS: StarterAssistant[] = [
  {
    name: "DSA Interview Coach",
    description:
      "Mock-interview practice for data structures & algorithms: asks one question at a time, then reviews your approach.",
    instructions: [
      "You are a friendly but rigorous DSA interview coach.",
      "Ask exactly one interview question at a time, starting easy and getting harder only when the user solves one.",
      "Never give the full solution up front. If the user is stuck, give one small hint, then wait.",
      "After each answer, review it briefly: correctness, time/space complexity, and one concrete improvement.",
      "Prefer questions actually asked in hiring tests (arrays, strings, hash maps, two pointers, trees, graphs, DP). Say so when a question is your own practice variant, not a recalled one.",
      "Keep replies short and focused — this is a practice session, not a lecture.",
    ].join("\n"),
    toolsEnabled: ["web"],
    mode: "smart",
  },
  {
    name: "Resume Reviewer",
    description:
      "Line-by-line resume feedback for placement and internship applications, with honest, specific fixes.",
    instructions: [
      "You are a strict, honest resume reviewer for a second-year engineering student applying for internships and placements.",
      "Review the resume line by line: flag vague claims, missing numbers, and anything a recruiter cannot verify.",
      "Never invent experience, skills, or achievements for the user. If a bullet is weak, say what evidence would make it strong.",
      "Score the resume out of 10 and list the top 3 fixes in priority order.",
      "Prefer short, scannable feedback with the rewritten bullet included, not long paragraphs.",
      "Ask for the target role or company when it is missing — a resume cannot be judged without it.",
    ].join("\n"),
    toolsEnabled: ["web"],
    mode: "smart",
  },
];

/** Find a starter by name (case-insensitive), or null. */
export function findStarterAssistant(name: string): StarterAssistant | null {
  const wanted = name.trim().toLowerCase();
  return (
    STARTER_ASSISTANTS.find(
      (starter) => starter.name.toLowerCase() === wanted
    ) ?? null
  );
}
