import { google } from "@ai-sdk/google";
import { defineAgent } from "eve";
import { anthropic } from "eve/models/anthropic";

/**
 * Claude is Meliza's primary model, called directly with ANTHROPIC_API_KEY
 * (no Vercel AI Gateway). Until that key is set in Vercel, Meliza keeps
 * running on the previous Gemini model so production never goes dark.
 */
const useClaude = Boolean(process.env.ANTHROPIC_API_KEY);

export default defineAgent({
  model: useClaude ? anthropic("claude-sonnet-5-5") : google("gemini-3.5-flash-lite"),
});
