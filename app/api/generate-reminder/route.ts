import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamText } from "ai";

export const runtime = "edge";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

const model = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    const result = streamText({
      model: model("gemini-2.0-flash-001"),
      prompt,
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Error generating reminder:", error);
    // Ensure GOOGLE_API_KEY is set in environment variables
    if (error instanceof Error && error.message.includes("API key")) {
      return new Response(
        "API key not configured. Please set GOOGLE_API_KEY.",
        { status: 500 }
      );
    }
    return new Response("Failed to generate reminder", { status: 500 });
  }
}
