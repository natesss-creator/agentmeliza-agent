import { defineAgent } from "eve";

export default defineAgent({
  description: "Read-only systems auditor for Meliza's integrations, publishing activity, feed, poster rendering, and rule compliance.",
  model: "openai/gpt-6-luna-fast",
});