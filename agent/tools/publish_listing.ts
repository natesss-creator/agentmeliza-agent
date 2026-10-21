import { put } from "@vercel/blob";
import { defineTool } from "eve/tools";
import { z } from "zod";

const PUBLISHABLE_SITES = {
  kenyaclassified: { url: "https://kenyaclassified.co.ke/index.php?page=item&action=item_add", label: "KenyaClassified", useProfile: false },
  kobstore: { url: "https://www.kobstore.co.ke/register", label: "KobStore", useProfile: true },
  postadz: { url: "https://postadz.com/post", label: "Post Adz", useProfile: true },
  listitglobal: { url: "https://listitglobal.com/", label: "List It Global", useProfile: true },
  bizilisting: { url: "https://bizilisting.com/", label: "Bizilisting", useProfile: true },
  foxyads: { url: "https://foxyads.app/en", label: "Foxy Ads", useProfile: true },
  adhubkenya: { url: "https://adhubkenya.co.ke/", label: "AdHub Kenya", useProfile: true },
  fungadeal: { url: "https://fungadeal.com/", label: "FungaDeal", useProfile: true },
  esencial: { url: "https://esencialmarketplace.com/ke", label: "Esencial", useProfile: true },
  sokoads: { url: "https://sokoads.co.ke/", label: "Soko Ads", useProfile: true },
} as const;

const PRODUCT_DISCLOSURE =
  "Paid course: KES 2,500 one-time. Lifetime access. No upsells. Link: https://groketer.com/firstincome";

async function runTinyFish(input: {
  url: string;
  goal: string;
  outputSchema: Record<string, unknown>;
  useProfile: boolean;
}) {
  const apiKey = process.env.TINYFISH_API_KEY;
  if (!apiKey) throw new Error("TINYFISH_API_KEY is not configured.");

  const body: Record<string, unknown> = {
    url: input.url,
    goal: input.goal,
    browser_profile: "lite",
    output_schema: input.outputSchema,
  };

  if (input.useProfile) {
    const profileId = process.env.TINYFISH_PROFILE_ID;
    if (!profileId) throw new Error("TINYFISH_PROFILE_ID is not configured for authenticated publishing sites.");
    body.use_profile = true;
    body.profile_id = profileId;
  }

  const response = await fetch("https://agent.tinyfish.ai/v1/automation/run", {
    method: "POST",
    headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) throw new Error(`TinyFish returned HTTP ${response.status}: ${await response.text()}`);
  return response.json() as Promise<Record<string, unknown>>;
}

async function verifyPublicListingUrl(value: unknown, expectedTitle: string) {
  if (typeof value !== "string" || !value.trim()) {
    return { verified: false, reason: "No live listing URL was returned." };
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { verified: false, reason: "Returned liveUrl is not a valid URL." };
  }

  if (url.protocol !== "https:") {
    return { verified: false, reason: "Returned liveUrl is not HTTPS." };
  }

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: { "User-Agent": "Meliza-Publication-Verifier/1.0" },
    });

    if (!response.ok) {
      return { verified: false, reason: `Live URL verification returned HTTP ${response.status}.` };
    }

    const finalUrl = response.url || url.toString();
    const body = await response.text();
    const normalizedBody = body.toLowerCase();
    const normalizedTitle = expectedTitle.trim().toLowerCase();

    if (normalizedTitle && !normalizedBody.includes(normalizedTitle)) {
      return { verified: false, reason: "Live URL is reachable, but the published page does not contain the expected title." };
    }

    return { verified: true, liveUrl: finalUrl };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { verified: false, reason: `Live URL verification failed: ${reason}` };
  }
}

export default defineTool({
  description:
    "Publish one compliant First Income Clarity listing to an explicitly authorized allowlisted site. Authenticated sites use the owner's saved TinyFish browser context profile. This tool may test authorized sites and promote only successful independently verified submissions to published status. Never bypass CAPTCHA, Cloudflare, Turnstile, login, phone/identity verification, payment gates, email verification, rate limits, or platform restrictions. A TinyFish completed/published response is NOT proof of publication. Return published only after this server independently fetches the returned public URL and confirms it is reachable and contains the expected title. Do not invent URLs or claim a listing is live without verification.",
  inputSchema: z.object({
    site: z.enum([
      "kenyaclassified", "kobstore", "postadz", "listitglobal", "bizilisting", "foxyads",
      "adhubkenya", "fungadeal", "esencial", "sokoads",
    ]),
    title: z.string().min(10).max(120),
    description: z.string().min(80).max(2500),
    priceKes: z.number().int().min(0).max(100000),
  }),
  async execute({ site, title, description, priceKes }) {
    const target = PUBLISHABLE_SITES[site];
    const finalDescription = `${description.trim()}\n\n${PRODUCT_DISCLOSURE}`;
    const startedAt = new Date().toISOString();

    try {
      const result = await runTinyFish({
        url: target.url,
        useProfile: target.useProfile,
        goal: [
          `Publish exactly one listing for First Income Clarity on ${target.label}.`,
          target.useProfile
            ? "Use the supplied authorized TinyFish browser context profile if it is already authenticated for this site. Do not create an account, request credentials, or expose credentials."
            : "Use the site's normal public posting workflow.",
          `Title: ${title}`,
          `Description: ${finalDescription}`,
          `Price: KES ${priceKes}`,
          "Contact email: innocentlabs4@gmail.com",
          "Choose the most accurate education, training, tutoring, course, digital-service, or services category available.",
          "Use accurate service-area information only; never invent a street address.",
          "Submit exactly one listing.",
          "Return the resulting public listing URL only if you actually reached the published listing page.",
          "If authentication, account creation, email verification, phone verification, identity verification, payment, CAPTCHA, Cloudflare, Turnstile, rate limiting, or a platform automation restriction blocks the workflow, stop and report the exact blocker. Never bypass it.",
          "If the saved profile is not authenticated for this site, report login-required/profile-not-authenticated; do not ask for a password.",
          "Return JSON with status, liveUrl, titleUsed, reason, and site.",
        ].join("\n"),
        outputSchema: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["published", "skipped", "failed", "blocked-human-verification"] },
            liveUrl: { type: "string" }, titleUsed: { type: "string" }, reason: { type: "string" }, site: { type: "string" },
          },
          required: ["status", "titleUsed", "reason", "site"],
        },
      });

      const returnedStatus = String(result.status ?? "failed");
      const returnedLiveUrl = typeof result.liveUrl === "string" ? result.liveUrl : undefined;
      const verification = await verifyPublicListingUrl(returnedLiveUrl, title);

      let status: "published" | "skipped" | "failed" | "blocked-human-verification" =
        returnedStatus === "skipped" || returnedStatus === "blocked-human-verification" || returnedStatus === "failed"
          ? returnedStatus
          : "failed";
      let reason = typeof result.reason === "string" ? result.reason : undefined;
      let liveUrl: string | undefined;

      if (returnedStatus === "published") {
        if (verification.verified) {
          status = "published";
          liveUrl = verification.liveUrl;
        } else {
          status = "failed";
          reason = `TinyFish reported published, but independent verification failed: ${verification.reason}`;
        }
      } else if (returnedLiveUrl && verification.verified) {
        status = "failed";
        reason = `Automation returned status '${returnedStatus}', so the listing is not counted as published even though the URL was reachable.`;
      }

      const record = {
        timestamp: startedAt, site: target.label, action: "publish", titleContentIdentifier: title,
        status, liveUrl,
        reason,
      };
      await put(`publishing-log/${Date.now()}-${site}.json`, JSON.stringify(record, null, 2), { access: "private", contentType: "application/json" });
      return record;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const record = { timestamp: startedAt, site: target.label, action: "publish", titleContentIdentifier: title, status: "failed", reason };
      await put(`publishing-log/${Date.now()}-${site}.json`, JSON.stringify(record, null, 2), { access: "private", contentType: "application/json" });
      return record;
    }
  },
});
