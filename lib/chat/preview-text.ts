/**
 * Sidebar preview text.
 *
 * Conversation previews are stored from raw message content, and an
 * assistant reply can be an artifact fence plus a whole HTML
 * document. Showing that raw text in the sidebar leaks code where a
 * one-line summary belongs, so previews are cleaned at write time
 * (commitStreaming stores the cleaned preview) and at display time
 * (the sidebar threads mapping cleans already-stored previews).
 * Cleaning never invents text: when nothing readable remains, the
 * result is "" and the caller falls back to the user prompt.
 */
export function cleanPreviewText(text: string): string {
  let cleaned = text;
  // Artifact fences (```artifact ... ```) — drop the whole block.
  cleaned = cleaned.replace(/```artifact[\s\S]*?```/g, " ");
  // A truncated preview can cut an artifact fence off before its
  // closing marker (the sidebar only stores the first 120 chars),
  // so also drop a dangling artifact opener line on its own.
  cleaned = cleaned.replace(/```artifact[^\n]*/g, " ");
  // Any other fenced code block — drop it too.
  cleaned = cleaned.replace(/```[\s\S]*?```/g, " ");
  // Stray fence markers left over (e.g. a lone closing ```).
  cleaned = cleaned.replace(/```/g, " ");
  // The interruption note the chat appends when a reply is cut off
  // mid-stream ("[Response interrupted. Please try again.]") is a
  // system annotation, not message content — drop it so a preview of
  // an interrupted reply falls back to the user prompt instead of
  // showing the note as the summary.
  cleaned = cleaned.replace(/\[Response interrupted\. Please try again\.\]/g, " ");
  // <style>/<script>/<title> blocks: their inner text is head
  // content, not visible message text — a tag strip alone leaves the
  // CSS/JS behind ("body { display: flex; ..."). Drop the whole
  // block, including an unterminated one running to end-of-string
  // (the reply was cut off inside the block). The closed-block rule
  // runs first so a later unterminated block is the only thing the
  // to-end rule can match.
  for (const tag of ["style", "script", "title"]) {
    cleaned = cleaned.replace(
      new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?<\\/${tag}\\s*>`, "gi"),
      " "
    );
    cleaned = cleaned.replace(
      new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*$`, "gi"),
      " "
    );
  }
  // HTML tags (a pasted document included).
  cleaned = cleaned.replace(/<[^>]*>/g, " ");
  // A stream cut off mid-tag leaves an unterminated "<meta ..." with
  // no ">" anywhere after it (the tag strip above needs a closing
  // ">"), so it would survive into the preview. Drop a tag-like
  // fragment ("<" or "</" + letter/"!") that runs to the end of the
  // text with no ">" after it. A bare "<" followed by a space or a
  // digit ("a < b", "cost < $5") is ordinary text and is kept.
  cleaned = cleaned.replace(/<\/?[A-Za-z!][^>]*$/g, " ");
  // Markdown images/links keep their readable text.
  cleaned = cleaned.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1");
  cleaned = cleaned.replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  // Inline code ticks, bold/italic markers, headings, quotes, rules.
  cleaned = cleaned.replace(/`+/g, "");
  cleaned = cleaned.replace(/(\*\*|__)(.*?)\1/g, "$2");
  cleaned = cleaned.replace(/(\*|_)(.*?)\1/g, "$2");
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");
  cleaned = cleaned.replace(/^>\s?/gm, "");
  cleaned = cleaned.replace(/^[-*_]{3,}\s*$/gm, " ");
  // HTML entities that survive tag stripping.
  cleaned = cleaned.replace(/&nbsp;/g, " ");
  cleaned = cleaned.replace(/&amp;/g, "&");
  cleaned = cleaned.replace(/&lt;/g, "<");
  cleaned = cleaned.replace(/&gt;/g, ">");
  cleaned = cleaned.replace(/&quot;/g, '"');
  // Collapse whitespace (newlines included) and trim.
  return cleaned.replace(/\s+/g, " ").trim();
}
