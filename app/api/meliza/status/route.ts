import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MODEL_PROVIDER = "Google";
const MODEL_NAME = "gemini-3.5-flash-lite";

type Check = { ok: boolean; detail: string };

function parseMcpResponse(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  const candidates = trimmed.startsWith("{")
    ? [trimmed]
    : trimmed
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice("data:".length).trim());

  for (const candidate of candidates) {
    try {
      const parsed: unknown = JSON.parse(candidate);
      if (parsed && typeof parsed === "object") {
        return parsed as Record<string, unknown>;
      }
    } catch {
      // SSE streams can contain non-JSON events; try the next data line.
    }
  }

  throw new Error("Composio returned an invalid MCP response");
}

/** Checks whether the configured Composio key can list its available tools. */
async function checkComposio(): Promise<Check> {
  const key = process.env.COMPOSIO_API_KEY;
  if (!key) return { ok: false, detail: "COMPOSIO_API_KEY is not configured" };

  const url = "https://connect.composio.dev/mcp";
  const headers = {
    "x-consumer-api-key": key,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };

  try {
    const init = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "initialize",
        params: {
          protocolVersion: "2025-06-18",
          capabilities: {},
          clientInfo: { name: "meliza-status", version: "1" },
        },
      }),
      cache: "no-store",
    });
    if (!init.ok) {
      return { ok: false, detail: `Composio initialize returned HTTP ${init.status}` };
    }

    const initBody = parseMcpResponse(await init.text());
    if (initBody.error) {
      return { ok: false, detail: "Composio rejected the initialize request" };
    }

    const sessionId = init.headers.get("mcp-session-id");
    const list = await fetch(url, {
      method: "POST",
      headers: {
        ...headers,
        ...(sessionId ? { "mcp-session-id": sessionId } : {}),
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 2,
        method: "tools/list",
        params: {},
      }),
      cache: "no-store",
    });
    if (!list.ok) {
      return { ok: false, detail: `Composio tools/list returned HTTP ${list.status}` };
    }

    const body = parseMcpResponse(await list.text());
    if (body.error) {
      return { ok: false, detail: "Composio could not list available tools" };
    }

    const result = body.result;
    const tools =
      result && typeof result === "object" && "tools" in result
        ? (result as { tools?: unknown }).tools
        : undefined;
    if (!Array.isArray(tools)) {
      return { ok: false, detail: "Composio returned an unexpected tools/list response" };
    }

    return { ok: true, detail: `connected; ${tools.length} tools available` };
  } catch (error) {
    return {
      ok: false,
      detail: `connection check failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/** Reports configured integrations; ?check=1 performs a live Composio connectivity check. */
export async function GET(request: Request) {
  const modelConfigured = Boolean(process.env.GOOGLE_GENERATIVE_AI_API_KEY);
  const composioConfigured = Boolean(process.env.COMPOSIO_API_KEY);
  const verify = new URL(request.url).searchParams.get("check") === "1";

  return NextResponse.json({
    model: {
      provider: MODEL_PROVIDER,
      name: MODEL_NAME,
      status: modelConfigured ? "configured" : "not_configured",
    },
    socialPublishing: {
      provider: "Composio",
      status: composioConfigured ? "configured" : "not_configured",
    },
    deployment: process.env.APP_VERSION ?? null,
    ...(verify
      ? {
          checks: {
            model: {
              ok: modelConfigured,
              detail: modelConfigured
                ? "Google API key is configured; model reachability was not tested"
                : "GOOGLE_GENERATIVE_AI_API_KEY is not configured",
            },
            composio: await checkComposio(),
          },
        }
      : {}),
  });
}
