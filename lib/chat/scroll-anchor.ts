/**
 * Where the message list should scroll when messages are appended.
 *
 * ChatGPT-style: when the reader sends a prompt, the prompt jumps to
 * the top of the viewport and the reply streams below it — the view
 * does not stay pinned to the bottom while the reply is short. When
 * the reply grows past the viewport the streaming pin (last row to
 * the bottom) takes over, exactly as before.
 *
 * The caller passes the roles of the messages appended since the
 * last render, in order, starting at `addedStartIndex`. A send
 * appends the user message AND the empty assistant placeholder in
 * one batch, so the first added role — not the last message — is
 * what decides the anchor.
 *
 * Returns null when nothing should scroll: the reader scrolled away
 * (autoScroll off — the caller counts it as unread instead), or
 * nothing was added.
 */
export type AddedMessageScrollTarget = {
  align: "start" | "end";
  index: number;
};

export function addedMessageScrollTarget(args: {
  addedRoles: Array<"assistant" | "user">;
  addedStartIndex: number;
  autoScroll: boolean;
}): AddedMessageScrollTarget | null {
  if (!args.autoScroll || args.addedRoles.length === 0) {
    return null;
  }

  if (args.addedRoles[0] === "user") {
    return { align: "start", index: args.addedStartIndex };
  }

  return {
    align: "end",
    index: args.addedStartIndex + args.addedRoles.length - 1,
  };
}

/**
 * Room the list needs below its last row so a just-sent prompt can
 * actually reach the top — the round-5 anchor failed live for
 * purely geometric reasons, and this is the fix.
 *
 * TanStack Virtual's scrollToIndex(align: "start") clamps to
 * maxScrollOffset = scrollHeight - clientHeight. At send time the
 * tail below the prompt (empty assistant placeholder + typing
 * indicator + bottom padding, ~260px) is far shorter than the
 * viewport (~790px on desktop), so the wanted offset exceeded the
 * maximum by ~480px and the view just sat at the bottom — the live
 * check saw the prompt at y≈580–640 instead of at the top. The
 * only way to raise the maximum is scrollable room below the last
 * row, so the virtualizer gets `paddingEnd` of this size: it grows
 * the scrollable area without adding rows, and its own last-row
 * "end" alignment subtracts paddingEnd again, so scroll-to-bottom
 * still lands the last row at the viewport bottom.
 *
 * The reserve is what the tail is assumed NOT to cover: the spacer
 * is clientHeight - reserve, so the anchor is reachable whenever
 * the real tail below the prompt is at least reserve - bottomPad
 * (~192px). A one-line prompt's tail is ~260px, so 240 leaves
 * margin; a much longer prompt only makes the tail bigger.
 */
export const BOTTOM_SPACER_RESERVE_PX = 240;

export function bottomSpacerPx(clientHeightPx: number): number {
  return Math.max(0, clientHeightPx - BOTTOM_SPACER_RESERVE_PX);
}

/**
 * Whether the streaming pin should fire: the last row is actually
 * cut off below the viewport.
 *
 * Round-6 live failure (why the anchor still did not hold): the pin
 * effect re-runs on every 100 ms streaming-snapshot flush — the
 * flush timer fires from send until commit and calls
 * setStreamingSnapshot with a fresh object every time, even while
 * the reply is still thinking and nothing changed. That recomputes
 * ChatLayout's `messages` memo, so the pin effect's `messages` dep
 * changes and it scrolls the last row to the bottom ~100 ms after
 * the anchor lands, and keeps it pinned through the whole thinking
 * phase. The round-5 skip-once flag only guards the single send
 * commit, so it never sees the flushes coming.
 *
 * The pin's real job is keeping the newest text visible, which only
 * needs a scroll when the last row's end sits below the viewport
 * bottom. While thinking — or while a short reply streams below its
 * top-anchored prompt — the last row is fully visible and the pin
 * stays out of the way; the moment the reply grows past the
 * viewport bottom, the pin takes over exactly as before.
 *
 * The last row's end in scroll-container coordinates is the list's
 * top padding plus the virtualizer's total size minus the bottom
 * spacer (getTotalSize includes paddingEnd; the spacer is invisible
 * room, not a row). scrollMargin is 0 (default, never set).
 */
export function isLastRowCutOff(args: {
  /** rowVirtualizer.getTotalSize() — rows + bottom spacer. */
  totalSizePx: number;
  /** The bottom spacer fed to the virtualizer as paddingEnd. */
  paddingEndPx: number;
  /** The list's top padding (48px from sm, 40px below). */
  topPadPx: number;
  scrollTopPx: number;
  clientHeightPx: number;
}): boolean {
  const lastRowEndPx =
    args.topPadPx + args.totalSizePx - args.paddingEndPx;
  return lastRowEndPx > args.scrollTopPx + args.clientHeightPx;
}
/**
 * Whether a row can be top-anchored: the maximum scroll offset must
 * reach the row's top. maxScrollOffset = scrollHeight - viewport,
 * and the row's top sits tailBelowRow below the end of the rows, so
 * the condition is spacer + bottomPad + tail >= viewport. The top
 * padding cancels out of both sides and is not needed here.
 */
export function isTopAnchorReachable(args: {
  clientHeightPx: number;
  spacerPx: number;
  tailBelowRowPx: number;
  bottomPadPx: number;
}): boolean {
  return (
    args.spacerPx + args.tailBelowRowPx + args.bottomPadPx >=
    args.clientHeightPx
  );
}
