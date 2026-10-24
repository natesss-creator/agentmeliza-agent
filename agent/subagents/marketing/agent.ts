import { google } from "@ai-sdk/google";
import { defineAgent } from "eve";
import { anthropic } from "eve/models/anthropic";

// Mirrors the root agent's model selection so this subagent never depends on
// a second, separately-configured key.
const useClaude = Boolean(process.env.ANTHROPIC_API_KEY);

export default defineAgent({
  description:
    "Marketing strategist and copywriter for First Income Clarity and Uhiko Properties campaigns: audience research, positioning, and platform-native copy (social posts, captions, ad variants, content calendars). Delegate to this subagent when planning a new campaign angle or reviewing/improving copy before the root agent publishes it. It never publishes; it only researches and drafts.",
  model: useClaude ? anthropic("claude-sonnet-5-5") : google("gemini-3.5-flash-lite"),
});
