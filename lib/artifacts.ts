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
 * A plain ```html fence is also an artifact — but only when it holds
 * a complete standalone document (starts with `<!doctype html>` and
 * contains `<html>…</html>`). That is the form the model uses when it
 * answers a "build me X" prompt with a whole page and no artifact
 * marker; a fragment, a snippet, or a teaching example stays an
 * ordinary code block. The card's Code tab still shows the source,
 * so nothing is hidden by the promotion.
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
  /** True when the fence was cut off mid-stream (no closing fence). */
  partial?: boolean;
};

/** The note the chat appends when a reply is cut off mid-stream. Kept in sync with ChatLayout — it belongs to the message text, not to artifact code. */
const INTERRUPTED_MARKER = "[Response interrupted. Please try again.]";

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

/** Title from a document's `<title>`, if it has one. */
function documentTitle(code: string): string | undefined {
  const match = code.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = match?.[1]?.replace(/<[^>]*>/g, "").trim();
  return title || undefined;
}

/**
 * A plain ```html fence holding a complete standalone document
 * (starts with `<!doctype html>`, contains `<html>…</html>`).
 * The strict shape is the discriminator: fragments, snippets, and
 * teaching examples never look like this, so they stay code blocks.
 */
function parseFullDocumentHtml(
  info: string,
  code: string
): { language: ArtifactLanguage; title: string | undefined } | null {
  if (info.trim().toLowerCase() !== "html") return null;
  const trimmed = code.trim();
  if (!/^<!doctype html>/i.test(trimmed)) return null;
  if (!/<html[\s>]/i.test(trimmed)) return null;
  if (!/<\/html\s*>/i.test(trimmed)) return null;
  return { language: "html", title: documentTitle(code) };
}

/**
 * Same discriminator for a fence cut off mid-stream (no closing
 * fence): the document is unfinished, so `</html>` cannot be
 * required — the doctype + `<html>` opening is what marks it as a
 * document rather than a fragment.
 */
function parseInterruptedDocumentHtml(
  info: string,
  code: string
): { language: ArtifactLanguage; title: string | undefined } | null {
  if (info.trim().toLowerCase() !== "html") return null;
  const trimmed = code.trim();
  if (!/^<!doctype html>/i.test(trimmed)) return null;
  if (!/<html[\s>]/i.test(trimmed)) return null;
  return { language: "html", title: documentTitle(code) };
}

export type ParsedMessageArtifacts = {
  /** Message text with extracted artifact blocks removed. */
  text: string;
  artifacts: ChatArtifact[];
  /**
   * True while streaming when an artifact fence has opened but not
   * closed yet. The unfinished block is stripped from `text` (so raw
   * HTML never shows as plain text mid-stream) without creating an
   * artifact entry — no card flashes, and nothing is labelled
   * "Interrupted" while the stream is still going.
   */
  buildingArtifact?: boolean;
  /** Title of the artifact being built, when the fence carries one. */
  buildingArtifactTitle?: string;
};

/**
 * Extract artifact blocks from a message. Non-artifact fences,
 * unsupported artifact languages, oversized blocks, and artifacts
 * past the per-message cap are left untouched in the text. An
 * artifact fence cut off mid-stream (no closing fence — the reply
 * was interrupted) is also extracted, marked `partial: true`, so the
 * raw HTML never renders as a code block; the interruption note is
 * kept in the message text.
 *
 * While the message is still streaming (`options.streaming`), an
 * unterminated fence is NOT extracted as an artifact: mid-stream it
 * is usually just unfinished, not interrupted, and extracting it
 * would flash an "Interrupted — partial preview" card that collapses
 * into the clean card once the closing fence arrives. Instead the
 * unfinished block is stripped from the visible text and flagged
 * (`buildingArtifact`), so the bubble can show a neutral "Building…"
 * placeholder instead of the raw fence and HTML as plain text. The
 * card appears only after the stream ends — as a full artifact, or
 * as a partial one when the reply really was interrupted.
 */
export function parseArtifacts(
  content: string,
  options?: { streaming?: boolean }
): ParsedMessageArtifacts {
  const artifacts: ChatArtifact[] = [];
  let extractedCount = 0;
  let buildingArtifact: boolean | undefined;
  let buildingArtifactTitle: string | undefined;

  let text = content.replace(
    FENCE_RE,
    (whole, info: string, code: string) => {
      if (extractedCount >= MAX_ARTIFACTS_PER_MESSAGE) return whole;
      const parsed =
        parseArtifactInfo(info) ?? parseFullDocumentHtml(info, code);
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

  // Unterminated artifact fence: the last ``` line has no closing
  // fence after it (complete fences were removed above, so any
  // remaining ``` line is either a stray marker or this opener).
  if (extractedCount < MAX_ARTIFACTS_PER_MESSAGE) {
    const openers = [...text.matchAll(/^```([^\n]*)$/gm)];
    const last = openers[openers.length - 1];
    if (last && last.index !== undefined) {
      const rawCode = text
        .slice(last.index + last[0].length)
        .replace(/^\n/, "");
      const parsed =
        parseArtifactInfo(last[1]) ??
        parseInterruptedDocumentHtml(last[1], rawCode);
      if (parsed) {
        if (options?.streaming) {
          // Mid-stream the fence is just unfinished — strip the
          // unfinished block from the visible text and flag it, so
          // the bubble shows a "Building…" placeholder. No artifact
          // entry is created here.
          buildingArtifact = true;
          buildingArtifactTitle = cleanTitle(parsed.title, extractedCount);
          text = text.slice(0, last.index);
        } else {
          let code = rawCode;
          // The interruption note is appended after the cut-off code;
          // keep it in the message text, not in the artifact. The exact
          // form (blank line + note) leaves the code byte-for-byte.
          let marker = "";
          const markerSuffix = `\n\n${INTERRUPTED_MARKER}`;
          if (code.endsWith(markerSuffix)) {
            code = code.slice(0, -markerSuffix.length);
            marker = markerSuffix;
          } else {
            const trimmedCode = code.trimEnd();
            if (trimmedCode.endsWith(INTERRUPTED_MARKER)) {
              code = trimmedCode
                .slice(0, -INTERRUPTED_MARKER.length)
                .trimEnd();
              marker = markerSuffix;
            }
          }
          if (code.length <= MAX_ARTIFACT_CODE_CHARS) {
            artifacts.push({
              id: `artifact-${extractedCount}`,
              title: cleanTitle(parsed.title, extractedCount),
              language: parsed.language,
              code,
              previewable: true,
              partial: true,
            });
            extractedCount += 1;
            text = text.slice(0, last.index) + marker;
          }
        }
      }
    }
  }

  // Collapse the blank lines left behind by removed blocks.
  const cleaned = text.replace(/\n{3,}/g, "\n\n").trim();

  return { text: cleaned, artifacts, buildingArtifact, buildingArtifactTitle };
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
