import type { EvalQuestion } from "./reasoning-eval.ts";

/**
 * Deep-reasoning eval set (reasoning-deep lane, 2026-11-27).
 *
 * 12 questions: maths word problems, logic puzzles, multi-step
 * reasoning. The first three are the live baseline seeds
 * (reasoning-baseline/BASELINE.md): Deep scored 0/3 on them before
 * this lane because every Deep request errored. Scoring is numeric
 * (the LAST number in the reply is the verdict — see
 * `extractFinalNumber` in reasoning-eval.ts), so answers must end
 * with the final number, not with working.
 */
export const REASONING_EVAL_QUESTIONS: EvalQuestion[] = [
  {
    id: "train-avg-speed",
    prompt:
      "A train travels 60 km in 45 minutes, then 90 km in 1 hour 15 minutes. What is the average speed for the whole journey? Give the final answer in km/h.",
    expected: "150 km / 2 h = 75 km/h",
    match: { kind: "number", value: 75 },
  },
  {
    id: "sheep-left",
    prompt:
      "A farmer has 17 sheep. All but 9 die. How many sheep are left?",
    expected: "9",
    match: { kind: "number", value: 9 },
  },
  {
    id: "shirt-discount",
    prompt:
      "A shirt costs Rs 1000. The shop gives 20% off, then a further 10% off the reduced price. What is the final price in rupees?",
    expected: "1000 x 0.8 = 800, x 0.9 = Rs 720",
    match: { kind: "number", value: 720 },
  },
  {
    id: "bat-ball",
    prompt:
      "A bat and a ball cost Rs 110 together. The bat costs Rs 100 more than the ball. How much does the ball cost in rupees?",
    expected: "Rs 5",
    match: { kind: "number", value: 5 },
  },
  {
    id: "machines-widgets",
    prompt:
      "If 5 machines make 5 widgets in 5 minutes, how many minutes do 100 machines take to make 100 widgets?",
    expected: "5 minutes",
    match: { kind: "number", value: 5 },
  },
  {
    id: "daughters-brother",
    prompt:
      "A man has 3 daughters. Each daughter has 1 brother. How many children does the man have in total?",
    expected: "4 (3 daughters + 1 son)",
    match: { kind: "number", value: 4 },
  },
  {
    id: "sequence-next",
    prompt:
      "What is the next number in this sequence: 2, 6, 12, 20, 30, ?",
    expected: "42",
    match: { kind: "number", value: 42 },
  },
  {
    id: "shopkeeper-weight",
    prompt:
      "A shopkeeper sells goods at cost price, but uses a weight of 800 grams instead of 1 kilogram. What is his profit percentage?",
    expected: "25%",
    match: { kind: "number", value: 25 },
  },
  {
    id: "algebra-reciprocal",
    prompt:
      "If x + 1/x = 3, what is the value of x squared + 1/x squared?",
    expected: "7",
    match: { kind: "number", value: 7 },
  },
  {
    id: "car-avg-speed",
    prompt:
      "A car travels 120 km at 40 km/h, then returns the same 120 km at 60 km/h. What is the average speed for the whole journey in km/h?",
    expected: "48 km/h",
    match: { kind: "number", value: 48 },
  },
  {
    id: "months-28-days",
    prompt: "How many months in a year have 28 days?",
    expected: "12 — every month has at least 28 days",
    match: { kind: "number", value: 12 },
  },
  {
    id: "cats-mice",
    prompt:
      "If 3 cats catch 3 mice in 3 minutes, how many minutes do 100 cats take to catch 100 mice?",
    expected: "3 minutes",
    match: { kind: "number", value: 3 },
  },
];
