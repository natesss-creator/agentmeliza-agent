import { put } from "@vercel/blob";
import { defineTool } from "eve/tools";
import { z } from "zod";
import { getPublishingChannel, publishingChannelKeys } from "./publishing-registry";

export default defineTool({
  description:
    "Safely test a registered publishing channel without submitting a listing. This is the promotion gate between research and production publishing. It may navigate forms and inspect terms/category/authentication state, but must never submit an ad. Stop on CAPTCHA, Cloudflare, Turnstile, identity/phone verification, payment, or prohibited automation and record the blocker.",
  inputSchema: z.object({ site: z.enum(publishingChannelKeys) }),
  async execute({ site }) {
    const target = getPublishingChannel(site);
    const timestamp = new Date().toISOString();

    if (!target) return { site, status: "failed", reason: "Channel is not registered." };

    const apiKey = process.env.TINYFISH_API_KEY;
    if (!apiKey) return { site: target.label, status: "failed", reason: "TINYFISH_API_KEY is not configured." };

    const body: Record<string, unknown> = {
      url: target.url,
      browser_profile: "lite",
      goal: [
        `Test the normal publishing workflow for ${target.label} without publishing anything.`,
        target.useProfile ? "Use the supplied authorized TinyFish browser context only if already authenticated. Do not create an account or request credentials." : "Use the site's public workflow.",
        "Inspect terms/rules, category fit for a paid education/course/service listing, required fields, authentication state, and whether a normal human can reach the final submission step.",
        "Do not click the final submit/publish/create-ad button and do not create or modify any listing.",
        "If CAPTCHA, Cloudflare, Turnstile, identity verification, phone verification, payment, rate limiting, or a rule prohibiting automation appears, stop and report it exactly. Never bypass it.",
        "Return JSON with status, blocker, categoryFit, authState, finalStepReachable, and notes.",
      ].join("\n"),
      output_schema: {
        type: "object",
        properties: {
          status: { type: "string", enum: ["pass", "blocked", "failed"] },
          blocker: { type: "string" },
          categoryFit: { type: "string" },
          authState: { type: "string" },
          finalStepReachable: { type: "boolean" },
          notes: { type: "string" },
        },
        required: ["status", "blocker", "categoryFit", "authState", "finalStepReachable", "notes"],
      },
      ...(target.useProfile && process.env.TINYFISH_PROFILE_ID
        ? { use_profile: true, profile_id: process.env.TINYFISH_PROFILE_ID }
        : {}),
    };

    try {
      const response = await fetch("https://agent.tinyfish.ai/v1/automation/run", {
        method: "POST",
        headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(`TinyFish returned HTTP ${response.status}: ${await response.text()}`);
      const result = await response.json() as Record<string, unknown>;
      const record = {
        timestamp,
        site: target.label,
        action: "test-publishing-workflow",
        status: String(result.status ?? "failed"),
        blocker: typeof result.blocker === "string" ? result.blocker : "",
        categoryFit: typeof result.categoryFit === "string" ? result.categoryFit : "",
        authState: typeof result.authState === "string" ? result.authState : "",
        finalStepReachable: Boolean(result.finalStepReachable),
        notes: typeof result.notes === "string" ? result.notes : "",
      };
      await put(`publishing-tests/${Date.now()}-${site}.json`, JSON.stringify(record, null, 2), { access: "private", contentType: "application/json" });
      return record;
    } catch (error) {
      const record = { timestamp, site: target.label, action: "test-publishing-workflow", status: "failed", blocker: error instanceof Error ? error.message : String(error) };
      await put(`publishing-tests/${Date.now()}-${site}.json`, JSON.stringify(record, null, 2), { access: "private", contentType: "application/json" });
      return record;
    }
  },
});
