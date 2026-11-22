/**
 * Guest sign-in nudge (auth UX): guests can chat freely, but after a
 * few messages they get a dismissible, non-blocking reminder to sign
 * in so their chats are saved to their account. Pure functions over a
 * minimal Storage interface so the trigger is unit-testable without a
 * browser (see guest-nudge.test.ts). The component passes
 * window.localStorage.
 */

/** Show the nudge once the guest has sent this many messages. */
export const GUEST_NUDGE_MESSAGE_THRESHOLD = 3;

/** localStorage flag set when the guest dismisses the nudge. */
export const NUDGE_DISMISSED_KEY = "anvix-signin-nudge-dismissed";

export interface SignInNudgeInput {
  /** True while no account is signed in. */
  isGuest: boolean;
  /** User (guest) messages sent in the active conversation. */
  userMessageCount: number;
  /** True once the guest dismissed the nudge. */
  dismissed: boolean;
}

/**
 * The nudge shows only to guests, only after the threshold, and never
 * after a dismiss. It never blocks chatting: a guest who ignores it
 * keeps chatting as a guest.
 */
export function shouldShowSignInNudge(input: SignInNudgeInput): boolean {
  return (
    input.isGuest &&
    input.userMessageCount >= GUEST_NUDGE_MESSAGE_THRESHOLD &&
    !input.dismissed
  );
}

type MinimalStorage = Pick<Storage, "getItem" | "setItem">;

export function readNudgeDismissed(storage: MinimalStorage): boolean {
  try {
    return storage.getItem(NUDGE_DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
}

export function writeNudgeDismissed(storage: MinimalStorage): void {
  try {
    storage.setItem(NUDGE_DISMISSED_KEY, "1");
  } catch {
    // Dismissal persistence is best-effort; the nudge still hides for
    // this session via component state.
  }
}
