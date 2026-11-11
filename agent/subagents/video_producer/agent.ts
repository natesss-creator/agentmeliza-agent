import { defineAgent } from "eve";

export default defineAgent({
  description: "Create and, when authorized, publish Uhiko property listing videos while following QA, pacing, verification, and approval policies.",
  model: "openai/gpt-6-luna-fast",
});