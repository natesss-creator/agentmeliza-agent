import { defineAgent } from "eve";

export default defineAgent({
  description: "Non-lawyer compliance-pattern review of Meliza's publishing claims, listing accuracy, data handling, and platform risk.",
  model: "openai/gpt-6-luna-fast",
});