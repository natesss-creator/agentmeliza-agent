import { defineMcpClientConnection } from "eve/connections";
import { composioApproval } from "@/lib/composio-approval";

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

// Until the owner adds COMPOSIO_API_KEY in Vercel, expose no tools at all so
// Meliza reports the integration as not configured instead of erroring.
const configured = Boolean(process.env.COMPOSIO_API_KEY);

export default defineMcpClientConnection({
  url: "https://connect.composio.dev/mcp",
  ...(configured ? {} : { tools: { allow: [] } }),
  description:
    "Composio: the owner's already-authorized app connections. Use for the Facebook Page 'Innocent labs' (publish posts/photos, read posts, insights), Instagram @innocentlabs4 (create and publish media, read media, insights), and Gmail, Slack, Linear, GitHub. Always reuse existing connected accounts; never create new or duplicate connections.",
  headers: (): Record<string, string> => {
    const key = process.env.COMPOSIO_API_KEY;
    // Not configured: send no credentials; the empty allow-list keeps the model off this connection.
    return key ? { "x-consumer-api-key": key } : {};
  },
  approval: ({ toolName, toolInput }) => composioApproval(toolName, toolInput),
});
