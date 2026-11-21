// ANVIX web agent — async DNS / rebinding check.
//
// The sync check in urls.ts can only judge the hostname as written.
// A DNS name (attacker.example.com) can resolve to a private address,
// and can change its answer between the check and the connection
// (DNS rebinding). This module resolves the hostname and checks EVERY
// returned address against the same private/reserved ranges — one
// private answer blocks the whole navigation.
//
// Fail-closed throughout: an unresolvable name, an empty answer, or a
// lookup error blocks the URL (the navigation would fail anyway).
//
// The resolver is injectable: the sandbox's DNS answers public names
// with 198.18.x (benchmarking range) addresses, so tests use a canned
// resolver instead of live DNS. Production passes no resolver and uses
// dns.lookup (getaddrinfo: DNS + /etc/hosts, both address families).
//
// Residual TOCTOU: the browser re-resolves at connect time, so a
// hostile name could still flip its answer between this check and the
// connection. This check narrows the window to names whose DNS is
// private *at check time*; full pinning (connect to the checked IP)
// is not possible through Playwright/Chromium, so a rebinding name
// that answers public-then-private is not fully closed by this step.

import { lookup } from "node:dns/promises";

import { isAllowedWebUrl, isPrivateOrReservedIp } from "./urls.ts";

/** Resolves a hostname to its IP addresses (v4 and v6). */
export type DnsResolver = (hostname: string) => Promise<string[]>;

async function defaultResolver(hostname: string): Promise<string[]> {
  const answers = await lookup(hostname, { all: true, verbatim: true });
  return [...new Set(answers.map((answer) => answer.address))];
}

export interface DnsCheckResult {
  allowed: boolean;
  /** Human-readable reason when blocked (safe to surface in a step). */
  reason?: string;
  /** Every resolved address, when the name resolved cleanly. */
  addresses?: string[];
  /** The first resolved address that fell in a blocked range. */
  blockedIp?: string;
}

function hostnameOf(raw: string): string | null {
  let host: string;
  try {
    host = new URL(raw.trim()).hostname.toLowerCase();
  } catch {
    return null;
  }
  if (host.startsWith("[") && host.endsWith("]")) {
    host = host.slice(1, -1);
  }
  while (host.endsWith(".")) {
    host = host.slice(0, -1);
  }
  return host || null;
}

function isIpLiteral(host: string): boolean {
  if (host.includes(":")) {
    return true;
  }
  return host.split(".").length === 4 && host.split(".").every((part) => /^\d+$/.test(part));
}

/**
 * Sync checks first, then resolve the hostname and check EVERY
 * resolved IP. Returns { allowed: false } when the name cannot be
 * resolved or any address is private/reserved.
 */
export async function checkWebUrlDns(
  raw: unknown,
  resolver: DnsResolver = defaultResolver
): Promise<DnsCheckResult> {
  if (typeof raw !== "string" || !isAllowedWebUrl(raw)) {
    return { allowed: false, reason: "Blocked or invalid URL." };
  }

  const host = hostnameOf(raw);
  if (!host) {
    return { allowed: false, reason: "Blocked or invalid URL." };
  }

  // An IP literal has nothing to resolve — the sync check already
  // judged the address itself.
  if (isIpLiteral(host)) {
    return { allowed: true, addresses: [host] };
  }

  let addresses: string[];
  try {
    addresses = await resolver(host);
  } catch {
    return {
      allowed: false,
      reason: `Could not resolve ${host}, so the page was not opened.`,
    };
  }

  if (!addresses || addresses.length === 0) {
    return {
      allowed: false,
      reason: `${host} did not resolve to any address, so the page was not opened.`,
    };
  }

  for (const address of addresses) {
    if (isPrivateOrReservedIp(address)) {
      return {
        allowed: false,
        reason: `${host} resolves to ${address}, which is not a public address.`,
        addresses,
        blockedIp: address,
      };
    }
  }

  return { allowed: true, addresses };
}

/** Boolean wrapper over checkWebUrlDns for callers that need no reason. */
export async function isAllowedWebUrlAsync(
  raw: unknown,
  resolver?: DnsResolver
): Promise<boolean> {
  const result = await checkWebUrlDns(raw, resolver);
  return result.allowed;
}
