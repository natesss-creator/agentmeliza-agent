import { jsonSchema, tool } from "ai";

const COMPOSIO_API_BASE = "https://backend.composio.dev/api/v3.1";
const SOCIAL_TOOLKITS = ["facebook", "instagram", "youtube", "tiktok"] as const;
const TOOL_SLUG_PATTERN = /^[A-Z][A-Z0-9_]{0,127}$/;

type ComposioTool = {
  slug: string;
  description?: string;
  input_parameters: Record<string, unknown>;
};

type ComposioSession = {
  session_id?: string;
  sessionId?: string;
};

function getApiKey(): string {
  const key = process.env.COMPOSIO_API_KEY;
  if (!key) throw new Error("Social integrations are not configured on this deployment.");
  return key;
}

function getEnabledToolkits(): string[] {
  return SOCIAL_TOOLKITS.filter((toolkit) => {
    const envName = `COMPOSIO_AUTH_CONFIG_${toolkit.toUpperCase()}`;
    return Boolean(process.env[envName]);
  });
}

async function composioFetch(path: string, init: RequestInit = {}): Promise<Response> {
  return fetch(`${COMPOSIO_API_BASE}${path}`, {
    ...init,
    headers: {
      "x-api-key": getApiKey(),
      Accept: "application/json",
      ...init.headers,
    },
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(20_000),
  });
}

async function responseError(response: Response, action: string): Promise<Error> {
  // Avoid returning raw upstream response bodies, which can contain account metadata.
  return new Error(`${action} failed (Composio HTTP ${response.status}).`);
}

async function readTools(sessionId: string): Promise<ComposioTool[]> {
  const tools: ComposioTool[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < 10; page += 1) {
    const url = new URL(`${COMPOSIO_API_BASE}/tool_router/session/${encodeURIComponent(sessionId)}/tools`);
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("cursor", cursor);

    const response = await composioFetch(url.toString().slice(COMPOSIO_API_BASE.length));
    if (!response.ok) throw await responseError(response, "Loading social tools");

    const body = (await response.json()) as {
      items?: unknown;
      next_cursor?: unknown;
      nextCursor?: unknown;
    };
    if (!Array.isArray(body.items)) throw new Error("Composio returned an invalid tools response.");

    for (const item of body.items) {
      if (!item || typeof item !== "object") continue;
      const candidate = item as Partial<ComposioTool>;
      if (
        typeof candidate.slug === "string" &&
        TOOL_SLUG_PATTERN.test(candidate.slug) &&
        candidate.input_parameters &&
        typeof candidate.input_parameters === "object" &&
        !Array.isArray(candidate.input_parameters)
      ) {
        tools.push(candidate as ComposioTool);
      }
    }

    const next = body.next_cursor ?? body.nextCursor;
    if (typeof next !== "string" || !next) return tools;
    cursor = next;
  }

  throw new Error("Composio returned too many tools; refusing to expose an incomplete tool list.");
}

/** Creates a per-user Composio session and AI SDK tools for its connected social accounts. */
export async function createSocialSessionTools(userId: string) {
  const toolkits = getEnabledToolkits();
  if (!toolkits.length) return { tools: {}, close: async () => {} };

  const createResponse = await composioFetch("/tool_router/session", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      user_id: userId,
      toolkits: { enable: toolkits },
      // Social-account linking is handled in Meliza's connection UI, not by agent tool calls.
      manage_connections: { enable: false },
      // Expose only app tools for the enabled social toolkits; no broad discovery/meta tools.
      workbench: { enable: false },
      preload: { tools: "all" },
      search: { enable: false },
      execute: { enable_multi_execute: false },
      experimental: { no_elicitation_support_fallback: "deny" },
    }),
  });
  if (!createResponse.ok) throw await responseError(createResponse, "Creating a user-scoped Composio session");

  const sessionBody = (await createResponse.json()) as ComposioSession;
  const sessionId = sessionBody.session_id ?? sessionBody.sessionId;
  if (typeof sessionId !== "string" || !sessionId) {
    throw new Error("Composio did not return a session ID.");
  }

  let closed = false;
  const close = async () => {
    if (closed) return;
    closed = true;
    try {
      await composioFetch(`/tool_router/session/${encodeURIComponent(sessionId)}`, { method: "DELETE" });
    } catch {
      // Session expiry and provider cleanup are best-effort; do not hide the chat result.
    }
  };

  try {
    const sessionTools = await readTools(sessionId);
    const aiTools: Record<string, ReturnType<typeof tool>> = Object.create(null);

    for (const sessionTool of sessionTools) {
      const slug = sessionTool.slug;
      aiTools[slug] = tool({
        description: sessionTool.description || `Run the ${slug} social integration action.`,
        inputSchema: jsonSchema(sessionTool.input_parameters as Parameters<typeof jsonSchema>[0]),
        execute: async (arguments_) => {
          const response = await composioFetch(
            `/tool_router/session/${encodeURIComponent(sessionId)}/execute`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tool_slug: slug, arguments: arguments_ }),
            },
          );
          if (!response.ok) throw await responseError(response, `Executing ${slug}`);
          return response.json();
        },
      });
    }

    return { tools: aiTools, close };
  } catch (error) {
    await close();
    throw error;
  }
}
