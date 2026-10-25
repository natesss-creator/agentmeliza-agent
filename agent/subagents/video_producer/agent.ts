import { defineAgent } from "eve";
import { melizaModel } from "@/lib/model-routing";

export default defineAgent({
  description:
    "Video producer for short-form Uhiko Properties video posts, adapted from the agent roster's 'Short Video Producer' role (First Income Clarity is currently paused, so it has no active brief right now). Unlike every other Meliza subagent, it has its own direct Composio publish access to the Facebook Page, Instagram, and TikTok (via WoopSocial) — scoped to the same already-authorized accounts the root agent uses — so it generates the video, writes the caption, runs it through `qa_reviewer`, and publishes and verifies the post itself rather than handing a draft back to the root agent. Video generation uses Replicate running ByteDance Seedance (image-to-video, animates the real listing photo) — the owner's chosen engine, but it needs the owner's own Replicate account connected and `lib/composio-approval.ts` still gates the actual billable generation call behind per-clip approval until a tier and daily spending cap are confirmed. Delegate any 'make/post a video' request here; it will say plainly what's still missing (connection or approval) rather than fabricate a video.",
  model: melizaModel(),
});
