import type { PublishingChannel } from "../publishing-registry";

export type PublishingRoute = "api" | "browser" | "email" | "webhook" | "manual";

export type RouteResult = {
  status: "published" | "attempted" | "failed" | "blocked-human-verification" | "manual_required";
  route: PublishingRoute;
  liveUrl?: string;
  reason?: string;
};

export function resolvePublishingRoute(channel: PublishingChannel): PublishingRoute {
  return channel.mode;
}

/**
 * Non-browser routes are deliberately configuration-driven. Meliza must never
 * invent an endpoint or claim publication without platform evidence.
 */
export async function executeConfiguredRoute(input: {
  channel: PublishingChannel;
  title: string;
  description: string;
  priceKes: number;
}): Promise<RouteResult> {
  const route = resolvePublishingRoute(input.channel);

  if (route === "manual") {
    return { status: "manual_required", route, reason: "No authorized automated route is configured for this channel." };
  }

  if (route === "api" || route === "webhook") {
    const endpoint = process.env[`${input.channel.key.toUpperCase()}_PUBLISH_ENDPOINT`];
    if (!endpoint) {
      return { status: "manual_required", route, reason: `No configured ${route} endpoint for ${input.channel.label}.` };
    }
    return { status: "attempted", route, reason: `Configured ${route} route is available but requires a channel-specific adapter and publication evidence.` };
  }

  if (route === "email") {
    const recipient = process.env[`${input.channel.key.toUpperCase()}_PUBLISH_EMAIL`];
    if (!recipient) {
      return { status: "manual_required", route, reason: `No authorized publish-by-email destination is configured for ${input.channel.label}.` };
    }
    return { status: "attempted", route, reason: `Publish-by-email destination is configured; delivery must be handled by an authorized mail connector and verified independently.` };
  }

  return { status: "blocked-human-verification", route: "browser", reason: "Browser automation provider is unavailable; do not bypass authentication or verification controls." };
}
