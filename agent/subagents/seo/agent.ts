import { google } from "@ai-sdk/google";
import { defineAgent } from "eve";
import { anthropic } from "eve/models/anthropic";

const useClaude = Boolean(process.env.ANTHROPIC_API_KEY);

export default defineAgent({
  description:
    "SEO specialist for uhiko.com and the First Income Clarity landing page (groketer.com/firstincome): technical SEO audits, on-page/meta review, structured data, and content/keyword recommendations. Use when asked to audit a page's search visibility or recommend SEO fixes. It reads live pages only and never edits code or publishes anything.",
  model: useClaude ? anthropic("claude-sonnet-5-5") : google("gemini-3.5-flash-lite"),
});
