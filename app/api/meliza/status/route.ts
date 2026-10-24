import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Check = { ok: boolean; detail: string };

/** One cheap authenticated call to Anthropic (list models). Never returns the key. */
async function checkAnthropic(): Promise<Check> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return { ok: false, detail: "ANTHROPIC_API_KEY not set" };
  try {
    const res = await fetch("https://api.anthropic.com/v1/models?limit=100", {
      headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
      cache: "no-store",
    });
    if (!res.ok) return { ok: false, detail: `Anthropic returned HTTP ${res.status}` };
    const body: any = await res.json();
    const ids: string[] = (body?.data || []).map((m: any) => m.id);
    return ids.includes("claude-sonnet-5-5")
      ? { ok: true, detail: "key valid; claude-sonnet-5-5 available" }
      : { ok: false, detail: `key valid but claude-sonnet-5-5 not listed (${ids.length} models visible)` };
  } catch (e) {
    return { ok: false, detail: `network error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/** MCP initialize + tools/list against Composio Connect. Never returns the key. */
async function checkComposio(): Promise<Check> {
  const key = process.env.COMPOSIO_API_KEY;
  if (!key) return { ok: false, detail: "COMPOSIO_API_KEY not set" };
  const url = "https://connect.composio.dev/mcp";
  const headers: Record<string, string> = {
    "x-consumer-api-key": key,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  const parse = async (res: Response) => {
    const text = await res.text();
    const json = text.trim().startsWith("{") ? text : (text.match(/^data: (.*)$/m)?.[1] ?? "{}");
    try { return JSON.parse(json); } catch { return {}; }
  };
  try {
    const init = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0", id: 1, method: "initialize",
        params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "meliza-status", version: "1" } },
      }),
      cache: "no-store",
    });
    if (!init.ok) return { ok: false, detail: `Composio initialize returned HTTP ${init.status}` };
    const session = init.headers.get("mcp-session-id");
    await parse(init);
    const list = await fetch(url, {
      method: "POST",
      headers: { ...headers, ...(session ? { "mcp-session-id": session } : {}) },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: {} }),
      cache: "no-store",
    });
    if (!list.ok) return { ok: false, detail: `Composio tools/list returned HTTP ${list.status}` };
    const body = await parse(list);
    const n = body?.result?.tools?.length ?? 0;
    return n > 0 ? { ok: true, detail: `key valid; ${n} Composio tools available` } : { ok: false, detail: "connected but no tools returned" };
  } catch (e) {
    return { ok: false, detail: `network error: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/** Which integrations are live. Reports presence only, never key values. ?check=1 verifies keys. */
export async function GET(request: Request) {
  const claude = Boolean(process.env.ANTHROPIC_API_KEY);
  const composio = Boolean(process.env.COMPOSIO_API_KEY);
  const verify = new URL(request.url).searchParams.get("check") === "1";
  return NextResponse.json({
    model: claude ? "claude-sonnet-5-5 (Anthropic direct)" : "gemini-3.5-flash-lite (fallback: ANTHROPIC_API_KEY not set)",
    socialPublishing: composio
      ? { status: "enabled", via: "Composio", accounts: ["Facebook Page: Innocent labs", "Instagram: @innocentlabs4"], approval: "owner approval required per post" }
      : { status: "disabled", reason: "COMPOSIO_API_KEY not set in Vercel" },
    agentizFeed: "/api/agentiz/feed",
    deployment: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    ...(verify ? { checks: { anthropic: await checkAnthropic(), composio: await checkComposio() } } : {}),
  });
}
