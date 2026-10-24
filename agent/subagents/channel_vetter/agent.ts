import { google } from "@ai-sdk/google";
import { defineAgent } from "eve";
import { anthropic } from "eve/models/anthropic";

const useClaude = Boolean(process.env.ANTHROPIC_API_KEY);

export default defineAgent({
  description:
    "Vets a candidate publishing channel (from the publishing registry, or a brand-new site Nate asks about) before it is trusted with autonomous posting: checks terms of service for automation/bot restrictions, what authentication or payment it requires, and whether an official API or legitimate route exists. Adapted from ECC's security-reviewer, refocused on third-party platform trust rather than this app's own code. Use before promoting a registry channel to ready/liveEnabled, or before adding a new destination. It never posts, signs up, or logs in anywhere itself.",
  model: useClaude ? anthropic("claude-sonnet-5-5") : google("gemini-3.5-flash-lite"),
});
