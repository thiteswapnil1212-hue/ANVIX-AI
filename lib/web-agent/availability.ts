// ANVIX web agent — availability leaf.
//
// The guard that decides whether browser tasks can run here, plus the
// persistent-profile location. This module imports ONLY node:os and
// node:path — no playwright, no Gemini, no other lib/ module — so the
// API routes can import it at module-load time on Vercel, where the
// playwright package fails to load (see lib/web-agent/browser.ts).
// It must stay importable with playwright uninstalled.

import os from "node:os";
import path from "node:path";

export interface WebAgentAvailability {
  available: boolean;
  /** Plain-words reason when unavailable — shown to the user. */
  reason?: string;
}

export function isWebAgentAvailable(): WebAgentAvailability {
  if (process.env.VERCEL === "1") {
    return {
      available: false,
      reason:
        "Web agent runs on your own computer — it is not available on the hosted deployment. Run ANVIX locally (npm run dev) to use browser tasks.",
    };
  }

  if (process.env.ANVIX_WEB_AGENT_DISABLED === "1") {
    return {
      available: false,
      reason: "Web agent is disabled on this server (ANVIX_WEB_AGENT_DISABLED=1).",
    };
  }

  return { available: true };
}

/** Where the persistent browser profile (cookies, logins) lives. */
export function getWebAgentProfileDir(): string {
  const override = process.env.ANVIX_WEB_AGENT_PROFILE_DIR?.trim();

  if (override) {
    return override;
  }

  return path.join(os.homedir(), ".anvix", "web-agent-profile");
}
