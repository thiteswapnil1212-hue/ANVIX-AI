import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { prompt } = await req.json();

  if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
    return NextResponse.json(
      { error: "Prompt is required" },
      { status: 400 }
    );
  }

  const normalizedPrompt = prompt.trim();
  const stack = ["Next.js", "TypeScript", "Tailwind CSS"];
  const modules = ["Dashboard", "Auth", "Billing"];

  return NextResponse.json({
    success: true,
    result: {
      summary: `Blueprint for ${normalizedPrompt}`,
      response: `The platform architecture for "${normalizedPrompt}" is ready. The proposal includes a polished product experience, resilient API flow, and a premium UI foundation aligned with your AI startup vision.`,
      confidence: "94%",
      stack,
      estimatedTime: "3-5 days",
      model: "GPT-5",
      modules,
    },
  });
}