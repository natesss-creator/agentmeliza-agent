import { createGoogleGenerativeAI, google } from "@ai-sdk/google";

export type ModelTier = "main" | "fast";

/**
 * Model selection is deliberately provider-native and EVE-free.
 * Google is the configured primary provider for Meliza.
 */
export function melizaModel(_tier: ModelTier = "main", userApiKey?: string | null) {
  if (userApiKey) return createGoogleGenerativeAI({ apiKey: userApiKey })("gemini-3.5-flash-lite");
  if (!process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
    throw new Error("No model API key configured. Set GOOGLE_GENERATIVE_AI_API_KEY in the application environment.");
  }

  return google("gemini-3.5-flash-lite");
}
