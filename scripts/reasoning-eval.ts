/**
 * Live reasoning-eval harness (reasoning-deep lane, 2026-11-27).
 *
 * Runs the 12-question eval set against a LIVE /api/chat endpoint
 * as a guest — no account, no API key, no secret of any kind.
 *
 *   node --experimental-strip-types scripts/reasoning-eval.ts [--list] [--base-url URL] [--mode deep] [--only <id>]
 *
 * Flags / env:
 *   --list              Print the questions and exit (no network).
 *   --base-url URL      Base URL (default ANVIX_EVAL_BASE_URL or https://anvix-ai.vercel.app).
 *   --mode MODE         Chat mode to test (default ANVIX_EVAL_MODE or "deep").
 *   --only <id>         Run a single question by id.
 *
 * Each request posts { prompt, mode, web: false, events: false } and
 * reads the plain-text stream to completion (150 s per-question
 * timeout — Deep thinking is slow). Exit code is 0 only when every
 * run question passes, so this doubles as the before/after check for
 * the reasoning-deep lane: baseline Deep was 0/3 on the seed
 * questions because every Deep request errored.
 */
import { scoreAnswer } from "../lib/chat/reasoning-eval.ts";
import { REASONING_EVAL_QUESTIONS } from "../lib/chat/reasoning-eval-questions.ts";

const DEFAULT_BASE_URL = "https://anvix-ai.vercel.app";
const PER_QUESTION_TIMEOUT_MS = 150_000;

function parseArgs(argv: string[]): {
  list: boolean;
  baseUrl: string;
  mode: string;
  only: string | null;
} {
  let list = false;
  let baseUrl =
    process.env.ANVIX_EVAL_BASE_URL ?? DEFAULT_BASE_URL;
  let mode = process.env.ANVIX_EVAL_MODE ?? "deep";
  let only: string | null = null;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--list") list = true;
    else if (arg === "--base-url") baseUrl = argv[++i] ?? baseUrl;
    else if (arg === "--mode") mode = argv[++i] ?? mode;
    else if (arg === "--only") only = argv[++i] ?? null;
  }

  return { list, baseUrl, mode, only };
}

async function askOnce(
  baseUrl: string,
  mode: string,
  prompt: string
): Promise<string> {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, mode, web: false, events: false }),
    signal: AbortSignal.timeout(PER_QUESTION_TIMEOUT_MS),
  });
  if (!response.ok) {
    return `[An error occurred while generating the response.] (HTTP ${response.status})`;
  }
  return await response.text();
}

async function main(): Promise<number> {
  const { list, baseUrl, mode, only } = parseArgs(
    process.argv.slice(2)
  );

  const questions = only
    ? REASONING_EVAL_QUESTIONS.filter((q) => q.id === only)
    : REASONING_EVAL_QUESTIONS;

  if (only && questions.length === 0) {
    console.error(
      `Unknown question id: ${only}. Known ids: ${REASONING_EVAL_QUESTIONS.map((q) => q.id).join(", ")}`
    );
    return 2;
  }

  if (list) {
    for (const q of questions) {
      console.log(`- ${q.id}: ${q.prompt} (expected: ${q.expected})`);
    }
    return 0;
  }

  console.log(
    `Reasoning eval: ${questions.length} question(s), mode=${mode}, base=${baseUrl}`
  );

  let passed = 0;
  for (const question of questions) {
    const startedAt = Date.now();
    let reply: string;
    try {
      reply = await askOnce(baseUrl, mode, question.prompt);
    } catch (error) {
      reply = `[An error occurred while generating the response.] (${error instanceof Error ? error.message : "request failed"})`;
    }
    const score = scoreAnswer(question, reply);
    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    if (score.pass) passed += 1;
    console.log(
      `${score.pass ? "PASS" : "FAIL"} ${question.id} (${seconds}s) — ${score.detail}`
    );
  }

  console.log(`Score: ${passed}/${questions.length} (mode=${mode})`);
  return passed === questions.length ? 0 : 1;
}

process.exitCode = await main();
