import type { GeneratedProject } from "@/lib/project/project-schema";

/**
 * Undo/redo history for workspace agent edits.
 *
 * The agent rewrites whole projects in one shot, so a single mistake
 * can wipe out good work with no way back. Every agent run snapshots
 * the project BEFORE it starts; Undo restores the previous snapshot
 * and Redo re-applies the undone one. A new snapshot clears the redo
 * stack, and the past is capped so a long session cannot grow the
 * stored history without bound.
 *
 * Snapshots are deep copies — the caller must never mutate a project
 * that is also stored in history. The functions clone on the way in
 * and on the way out, so sharing is safe either way.
 */

export const MAX_HISTORY_ENTRIES = 50;

export interface ProjectHistory {
  past: GeneratedProject[];
  future: GeneratedProject[];
}

function cloneProject(project: GeneratedProject): GeneratedProject {
  return JSON.parse(JSON.stringify(project)) as GeneratedProject;
}

export function createHistory(): ProjectHistory {
  return { past: [], future: [] };
}

/** Snapshot the current project before a change. Clears the redo stack. */
export function pushHistory(
  history: ProjectHistory,
  snapshot: GeneratedProject
): ProjectHistory {
  const past = [...history.past, cloneProject(snapshot)];
  if (past.length > MAX_HISTORY_ENTRIES) {
    past.splice(0, past.length - MAX_HISTORY_ENTRIES);
  }
  return { past, future: [] };
}

/** Undo one step. Returns null when there is nothing to undo. */
export function undoHistory(
  history: ProjectHistory,
  current: GeneratedProject
): { history: ProjectHistory; project: GeneratedProject } | null {
  if (history.past.length === 0) {
    return null;
  }

  const previous = history.past[history.past.length - 1];
  return {
    history: {
      past: history.past.slice(0, -1),
      future: [cloneProject(current), ...history.future],
    },
    project: cloneProject(previous),
  };
}

/** Redo one undone step. Returns null when there is nothing to redo. */
export function redoHistory(
  history: ProjectHistory,
  current: GeneratedProject
): { history: ProjectHistory; project: GeneratedProject } | null {
  if (history.future.length === 0) {
    return null;
  }

  const [next, ...restFuture] = history.future;
  return {
    history: {
      past: [...history.past, cloneProject(current)],
      future: restFuture,
    },
    project: cloneProject(next),
  };
}

export function canUndo(history: ProjectHistory): boolean {
  return history.past.length > 0;
}

export function canRedo(history: ProjectHistory): boolean {
  return history.future.length > 0;
}
