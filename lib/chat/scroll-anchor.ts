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
