"use client";

import { useState } from "react";
import { generateProject } from "@/lib/api/generate";

export function useGenerate() {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState("");

  async function generate(prompt: string) {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt) {
      return;
    }

    setLoading(true);

    try {
      const data = await generateProject(trimmedPrompt);

      setResponse(data.result.response);
    } catch (error) {
      console.error("Project generation failed:", error);
      setResponse("Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    response,
    generate,
  };
}