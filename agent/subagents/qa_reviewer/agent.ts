import { defineAgent } from "eve";

export default defineAgent({
  description: "Pre-publication check of draft posts for facts, brand voice, safety rules, and unauthorized personal data.",
  model: "openai/gpt-6-luna-fast",
});