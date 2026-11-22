/**
 * Interactive artifacts in chat (report §20).
 *
 * The model may return an interactive thing — a widget, chart,
 * calculator, mini-app — as a fenced code block with an artifact
 * marker:
 *
 *   ```artifact:html title="Loan calculator"
 *   <!doctype html>...
 *   ```
 *
 * or the equivalent ` ```html artifact ` form. The client extracts
 * those blocks, renders them in a sandboxed iframe (see
 * `components/chat/ArtifactViewer.tsx`), and shows the surrounding
 * reply as normal markdown with the artifact blocks removed.
 *
 * V1 scope, stated honestly:
 * - HTML artifacts only. A non-HTML artifact fence (e.g.
 *   `artifact:svg`) is left in the text as an ordinary code block.
 * - At most 3 artifacts per message; code over 64 KiB is left as a
 *   code block instead of being rendered.
 * - Rendering is read-only and offline: `buildSandboxedSrcDoc`
 *   injects a Content-Security-Policy that blocks all network
 *   (`connect-src 'none'`, `default-src 'none'`) and the iframe
 *   itself is sandboxed with `allow-scripts` only — no same-origin
 *   access, no top navigation, no forms. Prompt injection via
 *   rendered HTML is the risk this exists to contain, so neither
 *   the CSP nor the sandbox attribute may be loosened without a
 *   new review.
 */

export type ArtifactLanguage = "html";

export type ChatArtifact = {
  /** Stable within one message: `artifact-0`, `artifact-1`, ... */
  id: string;
  title: string;
  language: ArtifactLanguage;
  code: string;
  /** True when the viewer can render a live preview (HTML only). */
  previewable: boolean;
};

export const MAX_ARTIFACTS_PER_MESSAGE = 3;
export const MAX_ARTIFACT_CODE_CHARS = 65_536;
export const MAX_ARTIFACT_TITLE_CHARS = 80;

const FENCE_RE = /^```([^\n]*)\n([\s\S]*?)\n```/gm;

function cleanTitle(raw: string | undefined, index: number): string {
  const cleaned = (raw ?? "")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, MAX_ARTIFACT_TITLE_CHARS);
  return cleaned || `Interactive artifact ${index + 1}`;
}

/**
 * Parse one fence info string. Returns the artifact language + title
 * when the fence is an artifact marker, or null when it is an
 * ordinary code block. Only `html` is supported in v1; any other
 * `artifact:<lang>` is left as a plain code block.
 */
export function parseArtifactInfo(
  info: string
): { language: ArtifactLanguage; title: string | undefined } | null {
  const trimmed = info.trim();

  // Canonical: artifact | artifact:html | artifact:html title="..."
  let match = trimmed.match(
    /^artifact(?::([A-Za-z0-9+-]+))?(?:\s+title="([^"]*)")?\s*$/i
  );
  if (match) {
    const lang = (match[1] ?? "html").toLowerCase();
    if (lang !== "html") return null;
    return { language: "html", title: match[2] };
  }

  // Alias: html artifact | html artifact title="..."
  match = trimmed.match(
    /^([A-Za-z0-9+-]+)\s+artifact(?:\s+title="([^"]*)")?\s*$/i
  );
  if (match) {
    const lang = match[1].toLowerCase();
    if (lang !== "html") return null;
    return { language: "html", title: match[2] };
  }

  return null;
}

export type ParsedMessageArtifacts = {
  /** Message text with extracted artifact blocks removed. */
  text: string;
  artifacts: ChatArtifact[];
};

/**
 * Extract artifact blocks from a message. Non-artifact fences,
 * unsupported artifact languages, oversized blocks, and artifacts
 * past the per-message cap are left untouched in the text.
 */
export function parseArtifacts(content: string): ParsedMessageArtifacts {
  const artifacts: ChatArtifact[] = [];
  let extractedCount = 0;

  const text = content.replace(
    FENCE_RE,
    (whole, info: string, code: string) => {
      if (extractedCount >= MAX_ARTIFACTS_PER_MESSAGE) return whole;
      const parsed = parseArtifactInfo(info);
      if (!parsed) return whole;
      if (code.length > MAX_ARTIFACT_CODE_CHARS) return whole;

      const artifact: ChatArtifact = {
        id: `artifact-${extractedCount}`,
        title: cleanTitle(parsed.title, extractedCount),
        language: parsed.language,
        code,
        previewable: true,
      };
      artifacts.push(artifact);
      extractedCount += 1;
      return "";
    }
  );

  // Collapse the blank lines left behind by removed blocks.
  const cleaned = text.replace(/\n{3,}/g, "\n\n").trim();

  return { text: cleaned, artifacts };
}

/**
 * Does this message contain at least one renderable artifact block?
 * Cheap pre-check for the bubble before running the full parse.
 */
export function hasArtifact(content: string): boolean {
  return parseArtifacts(content).artifacts.length > 0;
}

const SANDBOX_CSP =
  "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; " +
  "img-src data: blob:; media-src data: blob:; font-src data:; " +
  "connect-src 'none'; frame-src 'none'; object-src 'none'; " +
  "base-uri 'none'; form-action 'none';";

/**
 * Wrap artifact HTML for the sandboxed iframe: inject a CSP `<meta>`
 * that blocks every network request (scripts, styles, images, fetch,
 * forms all go nowhere except inline code and data: URIs). The
 * iframe's own `sandbox="allow-scripts"` attribute is the second
 * layer — this CSP is the first, so a dropped attribute alone does
 * not open the network.
 */
export function buildSandboxedSrcDoc(code: string): string {
  const meta = `<meta http-equiv="Content-Security-Policy" content="${SANDBOX_CSP}">`;
  const headMatch = code.match(/<head[^>]*>/i);
  if (headMatch && headMatch.index !== undefined) {
    const insertAt = headMatch.index + headMatch[0].length;
    return code.slice(0, insertAt) + meta + code.slice(insertAt);
  }
  const htmlMatch = code.match(/<html[^>]*>/i);
  if (htmlMatch && htmlMatch.index !== undefined) {
    const insertAt = htmlMatch.index + htmlMatch[0].length;
    return code.slice(0, insertAt) + meta + code.slice(insertAt);
  }
  return meta + code;
}
