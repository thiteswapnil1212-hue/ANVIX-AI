/**
 * Accessible label for the MessageList "jump to latest" pill.
 * The count is part of the label, so the singular/plural has to be
 * right ("1 new message", not "1 new messages").
 */
export function newMessagesLabel(unreadCount: number): string {
  if (unreadCount <= 0) {
    return "Jump to latest message";
  }
  return `Jump to latest message, ${unreadCount} new message${
    unreadCount === 1 ? "" : "s"
  }`;
}
