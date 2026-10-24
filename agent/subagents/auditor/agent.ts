import { google } from "@ai-sdk/google";
import { defineAgent } from "eve";
import { anthropic } from "eve/models/anthropic";

const useClaude = Boolean(process.env.ANTHROPIC_API_KEY);

export default defineAgent({
  description:
    "System auditor for every component Meliza depends on: the Claude/Anthropic model connection, the Composio Facebook/Instagram/Gmail connections and their recent-post pacing/duplicate compliance, the Agentiz XML feed, and poster rendering. Use for the daily report or whenever something seems broken. It only reads status; it never publishes, deletes, or changes configuration.",
  model: useClaude ? anthropic("claude-sonnet-5-5") : google("gemini-3.5-flash-lite"),
});
