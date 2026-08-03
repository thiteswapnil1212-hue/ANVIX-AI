export interface GenerationResult {
  summary: string;
  response: string;
  confidence: string;
  stack: string[];
  estimatedTime: string;
  model: string;
  modules: string[];
}

export interface GenerateProjectResponse {
  success: boolean;
  result: GenerationResult;
}

export async function generateProject(prompt: string): Promise<GenerateProjectResponse> {
  const response = await fetch("/api/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    throw new Error("Failed to generate project");
  }

  return response.json();
}