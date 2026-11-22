"use client";

/**
 * Chat error shell (perf §4): a render crash in chat shows a retry
 * UI, not a blank page. Must be a Client Component (it uses reset()).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#090909] px-4">
      <h2 className="text-xl font-semibold text-white">
        The chat could not be loaded
      </h2>
      <p className="mt-2 max-w-md text-center text-sm text-white/60">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="mt-6 inline-flex cursor-pointer items-center rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Try again
      </button>
    </div>
  );
}
