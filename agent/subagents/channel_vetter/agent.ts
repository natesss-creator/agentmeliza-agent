import { defineAgent } from "eve";

export default defineAgent({
  description: "Read-only review of publishing platforms' terms, supported automation, category fit, and human-verification barriers before enabling a channel.",
  model: "openai/gpt-6-luna-fast",
});