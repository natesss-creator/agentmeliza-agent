import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Which integrations are live. Reports presence only, never key values. */
export function GET() {
  const claude = Boolean(process.env.ANTHROPIC_API_KEY);
  const composio = Boolean(process.env.COMPOSIO_API_KEY);
  return NextResponse.json({
    model: claude ? "claude-sonnet-5-5 (Anthropic direct)" : "gemini-3.5-flash-lite (fallback: ANTHROPIC_API_KEY not set)",
    socialPublishing: composio
      ? { status: "enabled", via: "Composio", accounts: ["Facebook Page: Innocent labs", "Instagram: @innocentlabs4"], approval: "owner approval required per post" }
      : { status: "disabled", reason: "COMPOSIO_API_KEY not set in Vercel" },
    agentizFeed: "/api/agentiz/feed",
    deployment: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
  });
}
