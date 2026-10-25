import { defineAgent } from "eve";
import { melizaModel } from "@/lib/model-routing";

export default defineAgent({
  description:
    "Video producer for short-form Uhiko Properties video posts, adapted from the agent roster's 'Short Video Producer' role (First Income Clarity is paused, so this has no active brief for that brand). Unlike every other Meliza subagent, it has its own direct Composio publish access to the Facebook Page, Instagram, and TikTok (via WoopSocial) — scoped to the same already-authorized accounts the root agent uses — so it generates the video, writes the caption, runs it through `qa_reviewer`, and publishes and verifies the post itself rather than handing a draft back to the root agent. Its working, live, $0-per-clip video path (via the `produce_video` tool, running in its own sandbox) is a Ken-Burns pan/zoom over the listing's real poster photo with a free Microsoft Edge TTS voiceover and burned-in captions — no GPU, no paid API, no owner approval needed. A true AI photo-animation upgrade (Replicate running ByteDance Seedance) was explored but isn't connected or approved, and isn't the default. Delegate any 'make/post a video' request here.",
  model: melizaModel(),
});
