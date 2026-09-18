"use client";

import { useCallback, useRef, useState } from "react";
import { generateProject } from "@/lib/api/generate";

export function useGenerate() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");

  // Prevent duplicate requests while generation is running.
  const requestInProgress = useRef(false);

  const generate = useCallback(async (prompt: string) => {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt || requestInProgress.current) {
      return;
    }

    requestInProgress.current = true;
    setLoading(true);
    setError("");
    setResponse("");

    try {
      const data = await generateProject(trimmedPrompt);
      const result = data?.result?.response;

      if (typeof result !== "string" || !result.trim()) {
        throw new Error("The AI returned an empty response.");
      }

      setResponse(result);
    } catch (err: unknown) {
      console.error("Project generation failed:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";

      setError(message);
    } finally {
      requestInProgress.current = false;
      setLoading(false);
    }
  }, []);

  const clearResponse = useCallback(() => {
    setResponse("");
    setError("");
  }, []);

  return {
    loading,
    response,
    error,
    generate,
    clearResponse,
  };
}