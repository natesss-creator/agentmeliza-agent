import { defineMcpClientConnection } from "eve/connections";

/**
 * Composio Connect: gives Meliza the owner's existing Composio connected
 * accounts (Facebook Page "Innocent labs", Instagram @innocentlabs4, Gmail,
 * Slack, Linear, GitHub, ...) without storing any platform credentials here.
 *
 * Auth: the Composio key lives only in the Vercel env var COMPOSIO_API_KEY
 * (Sensitive) and is sent as the `x-consumer-api-key` header.
 *
 * Composio Connect exposes meta-tools (search / execute / manage connections)
 * and the concrete app action (e.g. FACEBOOK_CREATE_POST) travels inside the
 * tool input, so the approval policy inspects the input for write actions.
 */

// Actions that publish, change or delete content on a connected account.
const WRITE_ACTION =
  /\b(FACEBOOK|INSTAGRAM|THREADS|LINKEDIN|TWITTER|YOUTUBE|TIKTOK|PINTEREST|REDDIT)_[A-Z0-9_]*(CREATE|PUBLISH|POST|UPLOAD|SEND|REPLY|COMMENT|UPDATE|EDIT|DELETE|REMOVE|SCHEDULE)[A-Z0-9_]*\b/;
const DESTRUCTIVE = /\b[A-Z]+_[A-Z0-9_]*(DELETE|REMOVE|DISCONNECT)[A-Z0-9_]*\b/;
// Creating or deleting connections must never happen silently: the brief
// forbids duplicate connections.
const CONNECTION_MGMT = /MANAGE_CONNECTIONS|INITIATE_CONNECTION|DELETE_CONNECTION/;

function serialize(input: unknown): string {
  try {
    return JSON.stringify(input ?? "");
  } catch {
    return "";
  }
}

export default defineMcpClientConnection({
  url: "https://connect.composio.dev/mcp",
  description:
    "Composio: the owner's already-authorized app connections. Use for the Facebook Page 'Innocent labs' (publish posts/photos, read posts, insights), Instagram @innocentlabs4 (create and publish media, read media, insights), and Gmail, Slack, Linear, GitHub. Always reuse existing connected accounts; never create new or duplicate connections.",
  headers: () => {
    const key = process.env.COMPOSIO_API_KEY;
    if (!key) {
      throw new Error(
        "COMPOSIO_API_KEY is not configured in Vercel. Add it as a Sensitive environment variable on the agentmeliza project.",
      );
    }
    return { "x-consumer-api-key": key };
  },
  approval: ({ toolName, toolInput }) => {
    const text = `${toolName} ${serialize(toolInput)}`;
    if (CONNECTION_MGMT.test(text)) return "user-approval";
    if (DESTRUCTIVE.test(text)) return "user-approval";
    if (WRITE_ACTION.test(text)) return "user-approval";
    return "not-applicable";
  },
});
