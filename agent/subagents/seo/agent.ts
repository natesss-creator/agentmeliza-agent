import { defineAgent } from "eve";

export default defineAgent({
  description: "Read-only technical and content SEO auditor for uhiko.com and groketer.com/firstincome.",
  model: "openai/gpt-6-luna-fast",
});