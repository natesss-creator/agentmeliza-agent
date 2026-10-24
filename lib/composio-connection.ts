import { defineMcpClientConnection } from "eve/connections";
import { composioApproval } from "@/lib/composio-approval";

/**
 * Shared Composio Connect definition. Used by the root agent and by
 * read-focused subagents (auditor, lawyer) that independently check
 * connection health or recent posts rather than relying on the root to
 * relay everything. The approval policy is identical everywhere: destructive
 * actions and connection changes always need the owner; social writes stay
 * autonomous only for Facebook/Instagram; Gmail sends stay autonomous only
 * to the owner's own address.
 */
export function melizaComposioConnection(description: string) {
  const configured = Boolean(process.env.COMPOSIO_API_KEY);
  return defineMcpClientConnection({
    url: "https://connect.composio.dev/mcp",
    ...(configured ? {} : { tools: { allow: [] } }),
    description,
    headers: (): Record<string, string> => {
      const key = process.env.COMPOSIO_API_KEY;
      return key ? { "x-consumer-api-key": key } : {};
    },
    approval: ({ toolName, toolInput }) => composioApproval(toolName, toolInput),
  });
}
