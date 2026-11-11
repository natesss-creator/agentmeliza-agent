import { jsonSchema, tool, type ToolSet } from "ai";
import {
  recordPackagePostAttempt,
  reserveStarterPost,
  STARTER_PACKAGE,
} from "@/lib/user-packages";

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
function isPaidAdvertisingAction(slug: string): boolean {
  return /(?:^|_)(?:AD|ADS|ADSET|AD_SET|AD_CAMPAIGN|ADVERTISING|CAMPAIGN|BOOST|PROMOTE|SPONSORED)(?:_|$)/i.test(slug);
}

function isSocialReplyAction(slug: string): boolean {
  return /(?:^|_)(?:CREATE|SEND|REPLY|COMMENT|RESPOND|ANSWER|UPDATE|EDIT)(?:_|$)/i.test(slug) &&
    /(?:^|_)(?:COMMENT|COMMENTS|REPLY|REPLIES|MESSAGE|MESSAGES|DM|DIRECT_MESSAGE|INBOX)(?:_|$)/i.test(slug);
}

function isPostAction(slug: string): boolean {
  return /(?:^|_)(?:CREATE|PUBLISH|SCHEDULE|UPLOAD|POST|UPDATE|EDIT|INSERT)(?:_|$)/i.test(slug) &&
    /(?:^|_)(?:POST|MEDIA|VIDEO|PHOTO|REEL|SHORT|CONTENT)(?:_|$)/i.test(slug);
}

function postingUnits(arguments_: unknown): number {
  let totalCount = 0;
  const targetLists = /(?:accounts?|targets?|platforms?|channels?|posts?)/i;
  function visit(value: unknown, key = ""): void {
    if (Array.isArray(value)) {
      if (targetLists.test(key)) totalCount += value.length;
      for (const item of value) visit(item);
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [childKey, child] of Object.entries(value)) visit(child, childKey);
  }
  visit(arguments_);
  return Math.max(1, totalCount);
}

function scheduledPostingDate(arguments_: unknown): Date {
  let scheduleValue: string | undefined;
  const scheduleField = /^(?:scheduled?_?(?:at|time|date)|publish_?(?:at|time|date)|schedule_?(?:at|time|date)|datetime)$/i;
  function visit(value: unknown, key = ""): void {
    if (scheduleValue) return;
    if (typeof value === "string" && scheduleField.test(key)) {
      scheduleValue = value;
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [childKey, child] of Object.entries(value)) visit(child, childKey);
  }
  visit(arguments_);
  if (!scheduleValue) return new Date();
  const parsed = new Date(scheduleValue);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

export async function createSocialSessionTools(
  userId: string,
  packageId: string | null,
) {
  if (packageId !== STARTER_PACKAGE.id) return { tools: {}, close: async () => {} };
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
    const aiTools: ToolSet = Object.create(null);

    for (const sessionTool of sessionTools) {
      const slug = sessionTool.slug;
      aiTools[slug] = tool({
        description: sessionTool.description || `Run the ${slug} social integration action.`,
        inputSchema: jsonSchema(sessionTool.input_parameters as Parameters<typeof jsonSchema>[0]),
        execute: async (arguments_) => {
          if (isPaidAdvertisingAction(slug)) {
            throw new Error("Paid advertising actions are disabled. Prepare a draft and obtain explicit per-campaign approval.");
          }
          if (isSocialReplyAction(slug)) {
            throw new Error("Automatic replies are disabled until the seller configures approved reply rules and templates.");
          }
          if (/\bFirst Income Clarity\b/i.test(JSON.stringify(arguments_))) {
            throw new Error("First Income Clarity publishing and promotion are paused.");
          }
          if (isPostAction(slug)) {
            const reserved = await reserveStarterPost(
              userId,
              postingUnits(arguments_),
              scheduledPostingDate(arguments_),
            );
            if (reserved === 0) {
              throw new Error(`The Starter limit of ${STARTER_PACKAGE.postsPerDay} social posts per UTC day has been reached.`);
            }
          }
          const response = await composioFetch(
            `/tool_router/session/${encodeURIComponent(sessionId)}/execute`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ tool_slug: slug, arguments: arguments_ }),
            },
          );
          if (!response.ok) throw await responseError(response, `Executing ${slug}`);
          const result = await response.json();
          if (isPostAction(slug)) {
            try {
              await recordPackagePostAttempt(userId, slug);
            } catch (error) {
              console.error("Could not record a social posting action for the daily report.", error);
            }
          }
          return result;
        },
      }) as unknown as ToolSet[string];
    }

    return { tools: aiTools, close };
  } catch (error) {
    await close();
    throw error;
  }
}
