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
