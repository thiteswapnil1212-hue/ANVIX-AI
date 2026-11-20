// ANVIX web agent — browser manager.
//
// Owns the real Chromium window the agent drives. Local-first: the
// browser runs on the machine serving ANVIX (your laptop, or a VPS).
// It cannot run on Vercel's serverless functions — the routes check
// isWebAgentAvailable() first and say so honestly instead of crashing.
//
// Login sessions: the browser uses a persistent profile folder, so
// cookies survive between tasks. Log in once (run a task with
// ANVIX_WEB_AGENT_HEADED=1 and sign in in the visible window); later
// headless runs reuse that session. Passwords are never stored in code
// or in ANVIX — they live only in the browser profile on your machine.

// Playwright is imported dynamically inside launch() only (see below):
// a top-level value import made the whole route module fail to load on
// Vercel — the deployed function cannot require playwright-core
// (missing browsers.json) — and the availability guard in
// ./availability could never fire. Type-only import is erased at
// compile time, so it is safe here.
import type { BrowserContext, Page } from "playwright";

import { getWebAgentProfileDir } from "./availability";

export class WebBrowser {
  private readonly context: BrowserContext;
  private page: Page | null = null;

  private constructor(context: BrowserContext) {
    this.context = context;
  }

  /**
   * Launch Chromium with the persistent profile. Headless unless
   * ANVIX_WEB_AGENT_HEADED=1 (use headed once to sign in somewhere).
   */
  static async launch(): Promise<WebBrowser> {
    const headed = process.env.ANVIX_WEB_AGENT_HEADED === "1";
    // Only for Linux running as root (containers): Chromium refuses to
    // start as root without this. Never set it on a shared machine.
    const noSandbox = process.env.ANVIX_WEB_AGENT_NO_SANDBOX === "1";
    // Chromium does not read proxy env vars on its own, but curl, npm,
    // and Node do — on a proxied network (office, VPN, sandbox) every
    // navigation would fail without this. Credentials in the proxy URL
    // are split into username/password (Chromium/Playwright do not
    // accept them embedded in the server URL) and are never logged.
    const proxyRaw =
      process.env.HTTPS_PROXY ?? process.env.https_proxy ?? undefined;
    const proxyBypass =
      process.env.NO_PROXY ?? process.env.no_proxy ?? undefined;
    let proxy: { server: string; username?: string; password?: string; bypass?: string } | undefined;
    if (proxyRaw) {
      try {
        const proxyUrl = new URL(proxyRaw);
        proxy = {
          server: `${proxyUrl.protocol}//${proxyUrl.hostname}${
            proxyUrl.port ? `:${proxyUrl.port}` : ""
          }`,
          ...(proxyUrl.username
            ? { username: decodeURIComponent(proxyUrl.username) }
            : {}),
          ...(proxyUrl.password
            ? { password: decodeURIComponent(proxyUrl.password) }
            : {}),
          ...(proxyBypass ? { bypass: proxyBypass } : {}),
        };
      } catch {
        // Unparsable proxy URL — fall back to no proxy and let the
        // navigation error say so honestly.
        proxy = undefined;
      }
    }

    let context: BrowserContext;
    try {
      // Dynamic import: playwright is loaded only when a browser is
      // actually launched (local runs). The routes check availability
      // first and never reach this on Vercel, where requiring
      // playwright-core throws at module load.
      const { chromium } = await import("playwright");
      context = await chromium.launchPersistentContext(
        getWebAgentProfileDir(),
        {
          headless: !headed,
          viewport: { width: 1280, height: 800 },
          ...(noSandbox ? { args: ["--no-sandbox"] } : {}),
          ...(proxy ? { proxy } : {}),
        }
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Browser failed to start";
      throw new Error(
        `Browser could not start (${message}). If Chromium is missing, run: npx playwright install chromium. ` +
          `On Linux running as root, also set ANVIX_WEB_AGENT_NO_SANDBOX=1.`
      );
    }

    context.setDefaultTimeout(30_000);
    context.setDefaultNavigationTimeout(30_000);

    return new WebBrowser(context);
  }

  async newPage(): Promise<Page> {
    if (!this.page || this.page.isClosed()) {
      this.page = await this.context.newPage();
    }

    return this.page;
  }

  async close(): Promise<void> {
    try {
      await this.context.close();
    } catch {
      // Already closed — nothing to do.
    }
  }
}
