import { put } from "@vercel/blob";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { getPublishingChannel, publishingChannelKeys } from "../publishing-registry";
import { executeConfiguredRoute } from "./publishing-routes";

const PRODUCT_DISCLOSURE =
  "Paid course: KES 2,500 one-time. Lifetime access. No upsells. Link: https://groketer.com/firstincome";

async function verifyPublicListingUrl(value: unknown, expectedTitle: string) {
  if (typeof value !== "string" || !value.trim()) return { verified: false, reason: "No live listing URL was returned." };
  let url: URL;
  try { url = new URL(value); } catch { return { verified: false, reason: "Returned liveUrl is not a valid URL." }; }
  if (url.protocol !== "https:") return { verified: false, reason: "Returned liveUrl is not HTTPS." };
  try {
    const response = await fetch(url, { method: "GET", redirect: "follow", headers: { "User-Agent": "Meliza-Publication-Verifier/1.0" } });
    if (!response.ok) return { verified: false, reason: `Live URL verification returned HTTP ${response.status}.` };
    const body = (await response.text()).toLowerCase();
    if (expectedTitle.trim() && !body.includes(expectedTitle.trim().toLowerCase())) return { verified: false, reason: "Live URL is reachable, but the published page does not contain the expected title." };
    return { verified: true, liveUrl: response.url || url.toString() };
  } catch (error) { return { verified: false, reason: `Live URL verification failed: ${error instanceof Error ? error.message : String(error)}` }; }
}

async function writeLog(record: Record<string, unknown>) {
  await put(`publishing-log/${Date.now()}-${String(record.site).toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`, JSON.stringify(record, null, 2), { access: "private", contentType: "application/json" });
}

export default defineTool({
  description: "Production publisher using only configured API, email, or webhook routes. Browser automation has been removed. Discovery/testing are separate from live execution. Never bypass CAPTCHA, Cloudflare, Turnstile, login, identity verification, payment gates, rate limits, or platform restrictions. Only an independently verified public listing may be reported as published.",
  inputSchema: z.object({ site: z.enum(publishingChannelKeys), title: z.string().min(10).max(120), description: z.string().min(80).max(2500), priceKes: z.number().int().min(0).max(100000) }),
  async execute({ site, title, description, priceKes }) {
    const target = getPublishingChannel(site);
    const startedAt = new Date().toISOString();
    if (!target) { const record = { timestamp: startedAt, site, action: "publish", titleContentIdentifier: title, status: "skipped", reason: "Channel is not registered." }; await writeLog(record); return record; }
    if (!target.liveEnabled || target.status !== "ready") {
      const record = { timestamp: startedAt, site: target.label, action: "publish", route: target.mode, titleContentIdentifier: title, status: "skipped", reason: `Live publishing is disabled. Registry status=${target.status}.` };
      await writeLog(record); return record;
    }

    const routed = await executeConfiguredRoute({
      channel: target,
      title,
      description: `${description.trim()}\n\n${PRODUCT_DISCLOSURE}`,
      priceKes,
    });

    let status = routed.status;
    let liveUrl = routed.liveUrl;
    let reason = routed.reason;

    if (routed.status === "published") {
      const verification = await verifyPublicListingUrl(routed.liveUrl, title);
      if (!verification.verified) {
        status = "failed";
        liveUrl = undefined;
        reason = `Route reported published, but independent verification failed: ${verification.reason}`;
      } else {
        liveUrl = verification.liveUrl;
      }
    }

    const record = {
      timestamp: startedAt,
      site: target.label,
      action: "publish",
      route: routed.route,
      titleContentIdentifier: title,
      status,
      liveUrl,
      reason,
    };
    await writeLog(record);
    return record;
  },
});
