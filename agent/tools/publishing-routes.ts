import { defineTool } from "eve/tools";
import { z } from "zod";
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

function envKey(site: string, suffix: string) {
  return `${site.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_${suffix}`;
}

function extractLiveUrl(value: unknown): string | undefined {
  if (!value || typeof value !== "object") return undefined;
  const record = value as Record<string, unknown>;
  const candidates = [record.liveUrl, record.url, record.listingUrl, record.publicUrl];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && /^https:\/\//i.test(candidate)) return candidate;
  }
  return undefined;
}

/**
 * Executes only explicitly configured non-browser routes.
 * The adapter is intentionally generic: each platform supplies its own
 * official endpoint and credentials. Meliza never invents endpoints,
 * bypasses access controls, or treats an HTTP request as publication unless
 * the platform response supplies publication evidence.
 */
export async function executeConfiguredRoute(input: {
  channel: PublishingChannel;
  title: string;
  description: string;
  priceKes: number;
}): Promise<RouteResult> {
  const route = resolvePublishingRoute(input.channel);

  if (route === "browser") {
    return {
      status: "blocked-human-verification",
      route,
      reason: "Browser automation is disabled. Use an official API, authorized webhook, or authorized publishing email route instead.",
    };
  }

  if (route === "manual") {
    return { status: "manual_required", route, reason: "No authorized automated route is configured for this channel." };
  }

  if (route === "api" || route === "webhook") {
    const endpoint = process.env[envKey(input.channel.key, "PUBLISH_ENDPOINT")];
    if (!endpoint) {
      return { status: "manual_required", route, reason: `No configured ${route} endpoint for ${input.channel.label}.` };
    }

    let parsed: URL;
    try {
      parsed = new URL(endpoint);
      if (parsed.protocol !== "https:") throw new Error("Publishing endpoints must use HTTPS.");
    } catch (error) {
      return { status: "failed", route, reason: `Invalid publishing endpoint: ${error instanceof Error ? error.message : String(error)}` };
    }

    const apiKey = process.env[envKey(input.channel.key, "PUBLISH_API_KEY")];
    const payload = {
      title: input.title,
      description: input.description,
      priceKes: input.priceKes,
      source: "meliza",
      requestedAt: new Date().toISOString(),
    };

    try {
      const response = await fetch(parsed, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const text = await response.text();
      let body: unknown = undefined;
      try { body = text ? JSON.parse(text) : undefined; } catch { body = undefined; }

      if (!response.ok) {
        return { status: "failed", route, reason: `Publishing endpoint returned HTTP ${response.status}.` };
      }

      const liveUrl = extractLiveUrl(body);
      if (!liveUrl) {
        return { status: "attempted", route, reason: "Endpoint accepted the request but returned no independently verifiable liveUrl/publicUrl/listingUrl." };
      }

      return { status: "published", route, liveUrl, reason: "Official configured route returned a public listing URL." };
    } catch (error) {
      return { status: "failed", route, reason: `Publishing request failed: ${error instanceof Error ? error.message : String(error)}` };
    }
  }

  if (route === "email") {
    const recipient = process.env[envKey(input.channel.key, "PUBLISH_EMAIL")];
    if (!recipient) {
      return { status: "manual_required", route, reason: `No authorized publish-by-email destination is configured for ${input.channel.label}.` };
    }
    return {
      status: "attempted",
      route,
      reason: `Authorized publish-by-email destination is configured at ${recipient}; an approved mail connector must deliver and independently verify the resulting listing.`,
    };
  }

  return { status: "manual_required", route, reason: "No executable authorized route is configured." };
}

export default defineTool({
  description: "Execute only explicitly configured API, webhook, or authorized email publishing routes. Browser automation is disabled. Never bypass authentication, CAPTCHA, Cloudflare, Turnstile, payment gates, rate limits, or platform restrictions. Never claim publication without platform evidence and independent URL verification.",
  inputSchema: z.object({
    site: z.string().min(1),
    title: z.string().min(1),
    description: z.string().min(1),
    priceKes: z.number().int().min(0),
  }),
  async execute() {
    return { status: "manual_required" as const, route: "manual" as const, reason: "The production publisher executes only registry-approved configured routes." };
  },
});
