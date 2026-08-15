import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.GEMINI_API_KEY || ""
);

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is not configured" },
        { status: 500 }
      );
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const result = await model.generateContent(prompt.trim());

    const response = result.response.text();

    return NextResponse.json({
      success: true,
      response,
      model: "Gemini 2.5 Flash",
    });
  } catch (error) {
    console.error("Gemini API Error:", error);

    return NextResponse.json(
      {
        error: "Failed to generate AI response",
      },
      { status: 500 }
    );
  }
}
