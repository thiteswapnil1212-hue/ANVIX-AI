// AGI approvals history — tiny localStorage store.
//
// Same defensive pattern as the `anvix-guest-chats` store in
// components/chat/ChatLayout.tsx: read failures fall back to an empty
// list, writes are best-effort. The store starts EMPTY — approvals made
// in chat before this UI existed were never recorded in-app, so nothing
// is seeded here. Entries are recorded from now on whenever the future
// web-agent asks for (and gets) approval.

export type ApprovalStatus = "allowed" | "denied";

export type ApprovalEntry = {
  id: string;
  title: string;
  description: string;
  /** Icon key, e.g. "github". Unknown keys render a generic shield. */
  icon: string;
  status: ApprovalStatus;
  createdAt: string;
};

export type NewApproval = Omit<ApprovalEntry, "id" | "createdAt">;

const STORAGE_KEY = "anvix-approvals";

const isApprovalEntry = (value: unknown): value is ApprovalEntry => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const entry = value as Record<string, unknown>;

  return (
    typeof entry.id === "string" &&
    typeof entry.title === "string" &&
    typeof entry.description === "string" &&
    typeof entry.icon === "string" &&
    (entry.status === "allowed" || entry.status === "denied") &&
    typeof entry.createdAt === "string"
  );
};

export const readApprovals = (): ApprovalEntry[] => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed: unknown = JSON.parse(raw);

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(isApprovalEntry)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      );
  } catch (error) {
    console.warn("Unable to read approvals history.", error);

    return [];
  }
};

export const recordApproval = (entry: NewApproval): ApprovalEntry => {
  const fullEntry: ApprovalEntry = {
    ...entry,
    id:
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: new Date().toISOString(),
  };

  if (typeof window === "undefined") {
    return fullEntry;
  }

  try {
    const next = [fullEntry, ...readApprovals()].slice(0, 100);

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn("Unable to record approval.", error);
  }

  return fullEntry;
};

/** "just now" / "2m ago" / "3h ago" / "5d ago" — no date library. */
export const formatRelativeTime = (isoDate: string): string => {
  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const seconds = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 1000)
  );

  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.floor(seconds / 60);

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days}d ago`;
};
