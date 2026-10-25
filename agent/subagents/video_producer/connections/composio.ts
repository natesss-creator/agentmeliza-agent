import { melizaComposioConnection } from "@/lib/composio-connection";

/**
 * Composio Connect, with direct publish access — unlike auditor/lawyer's
 * read-only connections. "Direct" means this subagent publishes itself
 * rather than relaying a draft back to the root agent; it does NOT mean a
 * wider scope. The shared approval policy in lib/composio-approval.ts only
 * allows autonomous writes to the same three accounts the root agent
 * already publishes to, for anyone who holds this connection — a write
 * anywhere else still needs the owner's approval exactly like the root
 * agent's own connection. Video-generation tool calls (Gemini Veo, MiniMax
 * video) are hard-gated behind owner approval there too, until the owner
 * picks and funds an engine — see this subagent's instructions before
 * assuming video generation actually works yet.
 */
export default melizaComposioConnection(
  "Composio: direct publish access for Uhiko Properties video posts to the Facebook Page 'Innocent labs', Instagram @innocentlabs4, and TikTok @pesazako (via WoopSocial) — the same three accounts the root agent already publishes to, under the same pacing/duplicate rules. Any write outside those exact accounts, any connection change, and any video-generation tool call (Gemini Veo, MiniMax video) still requires owner approval exactly like the root agent's connection.",
);
