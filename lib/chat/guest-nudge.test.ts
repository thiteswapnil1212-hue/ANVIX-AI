import test from "node:test";
import assert from "node:assert/strict";

import {
  GUEST_NUDGE_MESSAGE_THRESHOLD,
  NUDGE_DISMISSED_KEY,
  readNudgeDismissed,
  shouldShowSignInNudge,
  writeNudgeDismissed,
} from "./guest-nudge.ts";

/** Minimal in-memory Storage stand-in. */
const createMemoryStorage = (): {
  store: Map<string, string>;
  storage: {
    getItem: (key: string) => string | null;
    setItem: (key: string, value: string) => void;
  };
} => {
  const store = new Map<string, string>();
  return {
    store,
    storage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    },
  };
};

test("nudge stays hidden below the message threshold", () => {
  assert.equal(
    shouldShowSignInNudge({
      isGuest: true,
      userMessageCount: GUEST_NUDGE_MESSAGE_THRESHOLD - 1,
      dismissed: false,
    }),
    false
  );
});

test("nudge shows at the threshold for a guest", () => {
  assert.equal(
    shouldShowSignInNudge({
      isGuest: true,
      userMessageCount: GUEST_NUDGE_MESSAGE_THRESHOLD,
      dismissed: false,
    }),
    true
  );
});

test("nudge stays shown above the threshold until dismissed", () => {
  assert.equal(
    shouldShowSignInNudge({
      isGuest: true,
      userMessageCount: GUEST_NUDGE_MESSAGE_THRESHOLD + 5,
      dismissed: false,
    }),
    true
  );
});

test("nudge never shows for a signed-in user", () => {
  assert.equal(
    shouldShowSignInNudge({
      isGuest: false,
      userMessageCount: 50,
      dismissed: false,
    }),
    false
  );
});

test("nudge never shows again after a dismiss", () => {
  assert.equal(
    shouldShowSignInNudge({
      isGuest: true,
      userMessageCount: 50,
      dismissed: true,
    }),
    false
  );
});

test("dismissal flag round-trips through storage", () => {
  const { store, storage } = createMemoryStorage();
  assert.equal(readNudgeDismissed(storage), false);
  writeNudgeDismissed(storage);
  assert.equal(store.get(NUDGE_DISMISSED_KEY), "1");
  assert.equal(readNudgeDismissed(storage), true);
});
