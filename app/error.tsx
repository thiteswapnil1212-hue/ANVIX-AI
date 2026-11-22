"use client";

/**
 * Global error shell (perf §4): a render crash shows a retry UI,
 * not a blank page. Must be a Client Component (it uses reset()).
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#090909] px-4">
      <div className="max-w-md text-center">
        <h2 className="text-xl font-semibold text-white">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-white/60">
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
    </div>
  );
}
