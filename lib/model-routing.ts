import { google } from "@ai-sdk/google";
import { anthropic } from "eve/models/anthropic";
import { openai } from "eve/models/openai";

/**
 * Shared model selection for the root agent and every subagent.
 *
 * Anthropic's account credit balance has been exhausted (first seen
 * 2026-10-19, confirmed again 2026-10-24/25). ANTHROPIC_API_KEY is set, but
 * every call to it fails outright with "credit balance is too low" — so
 * presence of the key alone is not a safe signal to use Claude.
 *
 * Until that balance is topped up at console.anthropic.com -> Plans &
 * Billing, this routes through Gemini (GOOGLE_GENERATIVE_AI_API_KEY, already
 * configured) so Meliza keeps running. If an OPENAI_API_KEY is ever added in
 * Vercel, GPT becomes the second fallback automatically.
 *
 * Tiers: melizaModel("fast") selects Haiku for lightweight subagents
 * (qa_reviewer, auditor) when Claude is active; default "main" is Sonnet.
 *
 * To force Claude back on for a quick test once credits are restored,
 * without touching code, set MELIZA_FORCE_ANTHROPIC=1 in Vercel env vars.
 */
export type ModelTier = "main" | "fast";

export function melizaModel(tier: ModelTier = "main") {
  const forceAnthropic = process.env.MELIZA_FORCE_ANTHROPIC === "1";
  const hasAnthropic = Boolean(process.env.ANTHROPIC_API_KEY);
  const hasGemini = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  const hasOpenAI = Boolean(process.env.OPENAI_API_KEY);
  // Token optimization: cheap judge/audit subagents use Haiku when Claude is
  // the active provider; everything else keeps Sonnet. Gemini/OpenAI paths
  // are unchanged.
  const claude = () =>
    anthropic(tier === "fast" ? "claude-haiku-5-5" : "claude-sonnet-5-5");

  if (forceAnthropic && hasAnthropic) return claude();
  if (hasGemini) return google("gemini-3.5-flash-lite");
  if (hasOpenAI) return openai();
  if (hasAnthropic) return claude();

  throw new Error(
    "No model API key configured. Set one of ANTHROPIC_API_KEY, GOOGLE_GENERATIVE_AI_API_KEY, or OPENAI_API_KEY in Vercel.",
  );
}
