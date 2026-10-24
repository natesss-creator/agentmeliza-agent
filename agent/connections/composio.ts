import { melizaComposioConnection } from "@/lib/composio-connection";

/**
 * Composio Connect: gives Meliza the owner's existing Composio connected
 * accounts (Facebook Page "Innocent labs", Instagram @innocentlabs4, Gmail,
 * Slack, Linear, GitHub, ...) without storing any platform credentials here.
 *
 * Auth: the Composio key lives only in the Vercel env var COMPOSIO_API_KEY
 * (Sensitive) and is sent as the `x-consumer-api-key` header.
 */
export default melizaComposioConnection(
  "Composio: the owner's already-authorized app connections. Use for the Facebook Page 'Innocent labs' (publish posts/photos, read posts, insights), Instagram @innocentlabs4 (create and publish media, read media, insights), and Gmail (send the daily report to the owner), Slack, Linear, GitHub. Always reuse existing connected accounts; never create new or duplicate connections.",
);
