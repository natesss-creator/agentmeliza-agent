import { put } from "@vercel/blob";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { getPublishingChannel, publishingChannelKeys } from "../publishing-registry";
import { executeConfiguredRoute } from "./publishing-routes";

const PRODUCT_DISCLOSURE =
  "Paid course: KES 2,500 one-time. Lifetime access. No upsells. Link: https://groketer.com/firstincome";

async function runTinyFish(input: { url: string; goal: string; outputSchema: Record<string, unknown>; useProfile: boolean }) {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) throw new Error("Browser route unavailable: TINYFISH_API_KEY is not configured.");
  const body: Record<string, unknown> = { url: input.url, goal: input.goal, browser_profile: "lite", output_schema: input.outputSchema };
  if (input.useProfile) {
    const profileId = process.env.TINYFISH_PROFILE_ID;
    if (!profileId) throw new Error("Browser route unavailable: TINYFISH_PROFILE_ID is not configured.");
    body.use_profile = true;
    body.profile_id = profileId;
  }
  const response = await fetch("https://agent.tinyfish.ai/v1/automation/run", {
    method: "POST",
    headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`Browser provider returned HTTP ${response.status}: ${await response.text()}`);
  return response.json() as Promise<Record<string, unknown>>;
}

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
  description: "Production publisher with configurable API, browser, email, webhook, and manual routes. Discovery/testing are separate from live execution. Never bypass CAPTCHA, Cloudflare, Turnstile, login, phone/identity verification, payment gates, rate limits, or platform restrictions. Only an independently verified public listing may be reported as published.",
  inputSchema: z.object({ site: z.enum(publishingChannelKeys), title: z.string().min(10).max(120), description: z.string().min(80).max(2500), priceKes: z.number().int().min(0).max(100000) }),
  async execute({ site, title, description, priceKes }) {
    const target = getPublishingChannel(site);
    const startedAt = new Date().toISOString();
    if (!target) { const record = { timestamp: startedAt, site, action: "publish", titleContentIdentifier: title, status: "skipped", reason: "Channel is not registered." }; await writeLog(record); return record; }
    if (!target.liveEnabled || target.status !== "ready") {
      const record = { timestamp: startedAt, site: target.label, action: "publish", route: target.mode, titleContentIdentifier: title, status: "skipped", reason: `Live publishing is disabled. Registry status=${target.status}.` };
      await writeLog(record); return record;
    }

    if (target.mode !== "browser") {
      const routed = await executeConfiguredRoute({ channel: target, title, description, priceKes });
      const record = { timestamp: startedAt, site: target.label, action: "publish", route: routed.route, titleContentIdentifier: title, status: routed.status, liveUrl: routed.liveUrl, reason: routed.reason };
      await writeLog(record);
      return record;
    }

    try {
      const result = await runTinyFish({
        url: target.url,
        useProfile: target.useProfile,
        goal: [
          `Publish exactly one listing for First Income Clarity on ${target.label}.`,
          target.useProfile ? "Use only the supplied authorized browser context if already authenticated. Do not create an account or request credentials." : "Use the site's normal public posting workflow.",
          `Title: ${title}`, `Description: ${description.trim()}\n\n${PRODUCT_DISCLOSURE}`, `Price: KES ${priceKes}`, "Contact email: innocentlabs4@gmail.com",
          "Choose the most accurate education, training, tutoring, course, digital-service, or services category.", "Submit exactly one listing.", "Return a public listing URL only after reaching the actual published listing page.",
          "Stop on login, account creation, email/phone/identity verification, payment, CAPTCHA, Cloudflare, Turnstile, rate limiting, or a platform automation restriction. Never bypass.",
          "Return JSON with status, liveUrl, titleUsed, reason, and site.",
        ].join("\n"),
        outputSchema: { type: "object", properties: { status: { type: "string" }, liveUrl: { type: "string" }, titleUsed: { type: "string" }, reason: { type: "string" }, site: { type: "string" } }, required: ["status", "titleUsed", "reason", "site"] },
      });
      const returnedStatus = String(result.status ?? "failed");
      const returnedLiveUrl = typeof result.liveUrl === "string" ? result.liveUrl : undefined;
      const verification = await verifyPublicListingUrl(returnedLiveUrl, title);
      let status: "published" | "skipped" | "failed" | "blocked-human-verification" = ["skipped", "blocked-human-verification", "failed"].includes(returnedStatus) ? returnedStatus as "published" | "skipped" | "failed" | "blocked-human-verification" : "failed";
      let reason = typeof result.reason === "string" ? result.reason : undefined;
      let liveUrl: string | undefined;
      if (returnedStatus === "published") {
        if (verification.verified) { status = "published"; liveUrl = verification.liveUrl; } else { status = "failed"; reason = `Browser provider reported published, but independent verification failed: ${verification.reason}`; }
      } else if (returnedLiveUrl && verification.verified) { status = "failed"; reason = `Automation returned status '${returnedStatus}', so the listing is not counted as published.`; }
      const record = { timestamp: startedAt, site: target.label, action: "publish", route: "browser", titleContentIdentifier: title, status, liveUrl, reason };
      await writeLog(record); return record;
    } catch (error) {
      const record = { timestamp: startedAt, site: target.label, action: "publish", route: "browser", titleContentIdentifier: title, status: "failed", reason: error instanceof Error ? error.message : String(error) };
      await writeLog(record); return record;
    }
  },
});
