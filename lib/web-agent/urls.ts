// ANVIX web agent — URL allowlist leaf.
//
// Pure URL validation: zero imports (only the global URL + regexes).
// Moved verbatim out of planner.ts so the API routes can validate
// startUrl before importing the planner (which pulls Gemini).
//
// SSRF hardening (Phase P0):
// - WHATWG URL already normalises hex/octal/integer/short IPv4 forms
//   (0x7f000001, 2130706433, 0177.0.0.1, 127.1) to dotted decimal, and
//   percent-encoded hosts (%31%32%37.0.0.1) to 127.0.0.1 — but the
//   checks below ALSO run numerically on the parsed address, so a
//   parser difference can never silently re-open a range.
// - Trailing-dot hostnames (localhost., example.com.) are stripped
//   before every check: "localhost." used to slip through.
// - IPv6 literals are parsed to bytes: loopback/unspecified,
//   link-local, unique-local and multicast are blocked, and any
//   IPv4 embedded in a mapped / compatible / NAT64 / 6to4 address is
//   run through the same IPv4 range checks ([::ffff:127.0.0.1] used
//   to be entirely unblocked).
// - Dotless hostnames (intranet) and non-public suffixes (.localhost,
//   .local, .internal, ...) are blocked: they can only resolve via a
//   local search domain or mDNS, never to a public page.

/** Numeric IPv4 ranges that must never be reached, as [base, mask]. */
const BLOCKED_IPV4_RANGES: ReadonlyArray<readonly [number, number]> = [
  [0x00000000, 0xff000000], // 0.0.0.0/8 — "this network"
  [0x0a000000, 0xff000000], // 10.0.0.0/8 — private
  [0x64400000, 0xffc00000], // 100.64.0.0/10 — CGNAT / shared address space
  [0x7f000000, 0xff000000], // 127.0.0.0/8 — loopback
  [0xa9fe0000, 0xffff0000], // 169.254.0.0/16 — link-local
  [0xac100000, 0xfff00000], // 172.16.0.0/12 — private
  [0xc0000000, 0xffffff00], // 192.0.0.0/24 — IETF protocol assignments
  [0xc0000200, 0xffffff00], // 192.0.2.0/24 — TEST-NET-1 (documentation)
  [0xc0a80000, 0xffff0000], // 192.168.0.0/16 — private
  [0xc6120000, 0xfffe0000], // 198.18.0.0/15 — benchmarking (not routable)
  [0xc6336400, 0xffffff00], // 198.51.100.0/24 — TEST-NET-2 (documentation)
  [0xcb007100, 0xffffff00], // 203.0.113.0/24 — TEST-NET-3 (documentation)
  [0xe0000000, 0xf0000000], // 224.0.0.0/4 — multicast
  [0xf0000000, 0xf0000000], // 240.0.0.0/4 — reserved (incl. 255.255.255.255)
];

function ipv4ToNumber(octets: readonly [number, number, number, number]): number {
  return (
    (((octets[0] * 256 + octets[1]) * 256 + octets[2]) * 256 + octets[3]) >>>
    0
  );
}

function isBlockedIPv4Number(value: number): boolean {
  // Bitwise ops return *signed* 32-bit ints, but the range bases above
  // are unsigned literals (> 2^31 for 128.0.0.0+): compare unsigned on
  // both sides, or every range above 127.0.0.0 silently never matches.
  const unsigned = value >>> 0;
  for (const [base, mask] of BLOCKED_IPV4_RANGES) {
    if (((unsigned & mask) >>> 0) === base) {
      return true;
    }
  }
  return false;
}

/** "127.0.0.1" -> [127, 0, 0, 1]; anything else -> null. */
function parseDottedQuad(host: string): [number, number, number, number] | null {
  const parts = host.split(".");
  if (parts.length !== 4) {
    return null;
  }
  const octets: number[] = [];
  for (const part of parts) {
    if (!/^\d+$/.test(part)) {
      return null;
    }
    const value = Number(part);
    if (!Number.isInteger(value) || value < 0 || value > 255) {
      return null;
    }
    octets.push(value);
  }
  return octets as [number, number, number, number];
}

/**
 * Parse an IPv6 literal (no brackets, no zone id) into its 16 bytes.
 * Handles "::" compression and an embedded dotted-quad IPv4 tail.
 * Returns null for anything unparseable — callers fail closed on null.
 */
function parseIPv6(host: string): Uint8Array | null {
  if (host.includes("%")) {
    return null; // Zone ids never belong in a public URL.
  }
  const doubleColon = host.indexOf("::");
  if (doubleColon !== -1 && host.indexOf("::", doubleColon + 2) !== -1) {
    return null; // "::" may appear at most once.
  }

  const parsePart = (part: string): number[] | null => {
    if (part.includes(".")) {
      const quad = parseDottedQuad(part);
      if (!quad) {
        return null;
      }
      return [quad[0] * 256 + quad[1], quad[2] * 256 + quad[3]];
    }
    if (!/^[0-9a-fA-F]{1,4}$/.test(part)) {
      return null;
    }
    return [Number.parseInt(part, 16)];
  };

  const expand = (side: string): number[] | null => {
    if (side === "") {
      return [];
    }
    const groups: number[] = [];
    for (const part of side.split(":")) {
      const parsed = parsePart(part);
      if (!parsed) {
        return null;
      }
      groups.push(...parsed);
    }
    return groups;
  };

  let groups: number[];
  if (doubleColon === -1) {
    const expanded = expand(host);
    if (!expanded || expanded.length !== 8) {
      return null;
    }
    groups = expanded;
  } else {
    const head = expand(host.slice(0, doubleColon));
    const tail = expand(host.slice(doubleColon + 2));
    if (!head || !tail || head.length + tail.length > 7) {
      return null;
    }
    groups = [
      ...head,
      ...Array.from({ length: 8 - head.length - tail.length }, () => 0),
      ...tail,
    ];
  }

  const bytes = new Uint8Array(16);
  groups.forEach((group, index) => {
    bytes[index * 2] = group >> 8;
    bytes[index * 2 + 1] = group & 0xff;
  });
  return bytes;
}

function isZero(bytes: Uint8Array, from: number, to: number): boolean {
  for (let i = from; i < to; i += 1) {
    if (bytes[i] !== 0) {
      return false;
    }
  }
  return true;
}

/** The IPv4 embedded in the last 4 bytes of an IPv6 address. */
function embeddedIPv4(bytes: Uint8Array): number {
  return ipv4ToNumber([
    bytes[12]!,
    bytes[13]!,
    bytes[14]!,
    bytes[15]!,
  ]);
}

function isBlockedIPv6(bytes: Uint8Array): boolean {
  // :: (unspecified) and ::1 (loopback).
  if (isZero(bytes, 0, 15) && bytes[15]! <= 1) {
    return true;
  }
  // fe80::/10 — link-local.
  if (bytes[0] === 0xfe && (bytes[1]! & 0xc0) === 0x80) {
    return true;
  }
  // fc00::/7 — unique-local.
  if ((bytes[0]! & 0xfe) === 0xfc) {
    return true;
  }
  // ff00::/8 — multicast.
  if (bytes[0] === 0xff) {
    return true;
  }
  // 2001:db8::/32 — documentation.
  if (
    bytes[0] === 0x20 &&
    bytes[1] === 0x01 &&
    bytes[2] === 0x0d &&
    bytes[3] === 0xb8
  ) {
    return true;
  }
  // 2001:2::/48 — benchmarking.
  if (
    bytes[0] === 0x20 &&
    bytes[1] === 0x01 &&
    bytes[2] === 0x00 &&
    bytes[3] === 0x02 &&
    bytes[4] === 0x00 &&
    bytes[5] === 0x00
  ) {
    return true;
  }
  // 2001::/32 — Teredo (IPv4 embedded, XOR-obfuscated, in the tail).
  if (
    bytes[0] === 0x20 &&
    bytes[1] === 0x01 &&
    bytes[2] === 0x00 &&
    bytes[3] === 0x00
  ) {
    return true;
  }

  // IPv4-embedded forms: judge the embedded address, not the wrapper.
  // ::ffff:a.b.c.d — IPv4-mapped (incl. ::ffff:127.0.0.1).
  // ::a.b.c.d — IPv4-compatible (deprecated, incl. ::127.0.0.1).
  // ::ffff:0:a.b.c.d — IPv4-translated / SIIT (incl. ::ffff:0:127.0.0.1).
  // 64:ff9b::/96 — NAT64 well-known prefix.
  // 64:ff9b:1::/48 — NAT64 local-use prefix.
  const isMapped = isZero(bytes, 0, 10) && bytes[10] === 0xff && bytes[11] === 0xff;
  const isCompatible = isZero(bytes, 0, 12);
  // ::ffff:0:0/96 — IPv4-translated (SIIT): ffff sits one group
  // earlier than in the mapped form, IPv4 still in the last 32 bits.
  const isTranslated =
    isZero(bytes, 0, 8) &&
    bytes[8] === 0xff &&
    bytes[9] === 0xff &&
    bytes[10] === 0x00 &&
    bytes[11] === 0x00;
  const isNat64Wkp =
    bytes[0] === 0x00 &&
    bytes[1] === 0x64 &&
    bytes[2] === 0xff &&
    bytes[3] === 0x9b &&
    isZero(bytes, 4, 12);
  const isNat64Local =
    bytes[0] === 0x00 &&
    bytes[1] === 0x64 &&
    bytes[2] === 0xff &&
    bytes[3] === 0x9b &&
    bytes[4] === 0x00 &&
    bytes[5] === 0x01 &&
    isZero(bytes, 6, 12);
  if (isMapped || isCompatible || isTranslated || isNat64Wkp || isNat64Local) {
    return isBlockedIPv4Number(embeddedIPv4(bytes));
  }

  // 2002::/16 — 6to4, IPv4 embedded in bytes 2..5.
  if (bytes[0] === 0x20 && bytes[1] === 0x02) {
    return isBlockedIPv4Number(
      ipv4ToNumber([bytes[2]!, bytes[3]!, bytes[4]!, bytes[5]!])
    );
  }

  return false;
}

/** Suffixes that can only resolve locally (mDNS / search domains). */
const BLOCKED_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".intranet",
  ".lan",
  ".home",
  ".corp",
] as const;

/**
 * True when `ip` is an IP literal (v4 or v6, brackets optional) in a
 * private / loopback / link-local / reserved range. Non-IP strings
 * return false. Unparseable colon-containing strings fail closed
 * (true) — a malformed IPv6 literal must never be treated as public.
 * Also understands the raw integer / hex forms (2130706433,
 * 0x7f000001) in case a caller passes a pre-normalisation host.
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  if (typeof ip !== "string") {
    return true;
  }
  let host = ip.trim().toLowerCase();
  if (host.startsWith("[") && host.endsWith("]")) {
    host = host.slice(1, -1);
  }
  while (host.endsWith(".")) {
    host = host.slice(0, -1);
  }
  if (!host) {
    return true;
  }

  if (host.includes(":")) {
    const bytes = parseIPv6(host);
    return bytes === null ? true : isBlockedIPv6(bytes);
  }

  const quad = parseDottedQuad(host);
  if (quad) {
    return isBlockedIPv4Number(ipv4ToNumber(quad));
  }

  // Bare 32-bit integer or hex form (WHATWG URL normally normalises
  // these to dotted decimal first, so this is defence in depth).
  if (/^(0x[0-9a-f]+|\d+)$/.test(host)) {
    const value = host.startsWith("0x")
      ? Number.parseInt(host, 16)
      : Number(host);
    if (Number.isInteger(value) && value >= 0 && value <= 0xffffffff) {
      return isBlockedIPv4Number(value >>> 0);
    }
    return true;
  }

  return false;
}

/** Only public http(s) pages. No localhost, private networks, or files. */
export function isAllowedWebUrl(raw: unknown): boolean {
  if (typeof raw !== "string" || !raw.trim()) {
    return false;
  }

  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return false;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    return false;
  }

  // No credentials embedded in the URL.
  if (url.username || url.password) {
    return false;
  }

  // WHATWG URL keeps a trailing dot on domain names ("localhost.")
  // and brackets on IPv6 literals ("[::1]") — normalise both away
  // before any check, or the checks below compare the wrong string.
  let host = url.hostname.toLowerCase();
  if (host.startsWith("[") && host.endsWith("]")) {
    host = host.slice(1, -1);
  }
  while (host.endsWith(".")) {
    host = host.slice(0, -1);
  }
  if (!host) {
    return false;
  }

  if (host === "localhost") {
    return false;
  }
  for (const suffix of BLOCKED_SUFFIXES) {
    if (host.endsWith(suffix)) {
      return false;
    }
  }

  // IP literal (v4 or v6): judge the parsed address numerically.
  if (host.includes(":") || parseDottedQuad(host) !== null) {
    return !isPrivateOrReservedIp(host);
  }

  // A dotless hostname (intranet, fileserver) can only resolve via a
  // local search domain — never a public page.
  if (!host.includes(".")) {
    return false;
  }

  return true;
}
