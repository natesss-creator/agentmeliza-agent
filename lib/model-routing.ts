import { google } from "@ai-sdk/google";

export type ModelTier = "main" | "fast";

/**
 * Model selection is deliberately provider-native and EVE-free.
 * Google is the configured primary provider for Meliza.
 */
export function melizaModel(_tier: ModelTier = "main") {
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("No model API key configured. Set GOOGLE_GENERATIVE_AI_API_KEY in Vercel.");
  }

  return google("gemini-3.5-flash-lite");
}
