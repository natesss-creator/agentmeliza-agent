import { defineAgent } from "eve";
import { melizaModel } from "@/lib/model-routing";

export default defineAgent({
  description:
    "Pre-publish QA gate for every outbound First Income Clarity or Uhiko Properties post, adapted from the agent roster's 'QA Reviewer' role: checks a drafted caption for facts, tone, and brand before the root agent publishes it — not a compliance/legal review (that's `lawyer`) and not copywriting (that's `marketing`). Call it with the exact draft (platform, brand, caption, listing id if Uhiko) before every publish. It never publishes anything; it returns PASS or FAIL with specific issues and a suggested fix.",
  model: melizaModel(),
});
