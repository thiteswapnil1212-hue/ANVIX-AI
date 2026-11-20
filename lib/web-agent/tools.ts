// ANVIX web agent — browser step execution.
//
// Runs one validated plan step against a Playwright page. Every step is
// wrapped so a failure returns an honest { success: false } result
// instead of crashing the run. Steps never touch the shell or the
// filesystem — only the page in front of them.

import type { Page } from "playwright";

import type { WebStep, WebToolName } from "./types";

export interface WebStepOutcome {
  success: boolean;
  detail: string;
  data?: unknown;
}

const STEP_TIMEOUT_MS = 30_000;
const MAX_TEXT_CHARS = 2000;
const MAX_HEADINGS = 20;

function truncate(text: string, max: number): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  return cleaned.length > max ? `${cleaned.slice(0, max)}…` : cleaned;
}

async function runNavigate(
  page: Page,
  input: Record<string, unknown>
): Promise<WebStepOutcome> {
  const url = input.url as string;
  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: STEP_TIMEOUT_MS,
  });
  const title = await page.title().catch(() => "");
  return {
    success: true,
    detail: title
      ? `Opened ${url} — "${truncate(title, 80)}"`
      : `Opened ${url}`,
  };
}

async function runReadPage(page: Page): Promise<WebStepOutcome> {
  const data = await page.evaluate(() => {
    const headings = Array.from(
      document.querySelectorAll("h1, h2, h3")
    )
      .map((el) => (el.textContent ?? "").trim())
      .filter(Boolean)
      .slice(0, 20);
    const links = document.querySelectorAll("a[href]").length;
    const text = (document.body?.innerText ?? "").trim();
    return {
      title: document.title,
      url: window.location.href,
      headings,
      linkCount: links,
      text: text.slice(0, 2000),
    };
  });

  const headingLines = data.headings
    .slice(0, MAX_HEADINGS)
    .map((heading) => `- ${truncate(heading, 120)}`)
    .join("\n");

  return {
    success: true,
    detail:
      `Read ${data.url} — "${truncate(data.title, 80)}" ` +
      `(${data.headings.length} headings, ${data.linkCount} links)`,
    data: {
      ...data,
      text: truncate(data.text, MAX_TEXT_CHARS),
      summary: headingLines || "(no headings on this page)",
    },
  };
}

async function runClick(
  page: Page,
  input: Record<string, unknown>
): Promise<WebStepOutcome> {
  const selector = input.selector as string;
  await page
    .locator(selector)
    .first()
    .click({ timeout: 15_000 });
  const title = await page.title().catch(() => "");
  return {
    success: true,
    detail: title
      ? `Clicked ${selector} — now on "${truncate(title, 80)}"`
      : `Clicked ${selector}`,
  };
}

async function runType(
  page: Page,
  input: Record<string, unknown>
): Promise<WebStepOutcome> {
  const selector = input.selector as string;
  const text = input.text as string;
  await page
    .locator(selector)
    .first()
    .fill(text, { timeout: 15_000 });
  return {
    success: true,
    detail: `Typed into ${selector} (${text.length} characters)`,
  };
}

async function runWait(
  page: Page,
  input: Record<string, unknown>
): Promise<WebStepOutcome> {
  const ms = input.ms as number;
  await page.waitForTimeout(ms);
  return { success: true, detail: `Waited ${ms} ms` };
}

async function runScreenshot(page: Page): Promise<WebStepOutcome> {
  const shot = await page.screenshot({ type: "png" });
  return {
    success: true,
    detail: `Screenshot captured (${shot.length} bytes)`,
  };
}

function runReport(input: Record<string, unknown>): WebStepOutcome {
  const note =
    typeof input.note === "string"
      ? input.note
      : typeof input.text === "string"
        ? input.text
        : "Done.";
  return { success: true, detail: truncate(note, 500) };
}

/** Execute one validated step. Never throws — failures come back as data. */
export async function runWebStep(
  page: Page,
  step: WebStep
): Promise<WebStepOutcome> {
  try {
    switch (step.tool as WebToolName) {
      case "navigate":
        return await runNavigate(page, step.input);
      case "read_page":
        return await runReadPage(page);
      case "click":
        return await runClick(page, step.input);
      case "type":
        return await runType(page, step.input);
      case "wait":
        return await runWait(page, step.input);
      case "screenshot":
        return await runScreenshot(page);
      case "report":
        return runReport(step.input);
      default:
        return {
          success: false,
          detail: `Unsupported tool: ${String(step.tool)}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      detail:
        error instanceof Error
          ? truncate(error.message, 300)
          : "Step failed for an unknown reason",
    };
  }
}
