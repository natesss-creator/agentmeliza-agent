import { put } from "@vercel/blob";
import { defineTool } from "eve/tools";
import { z } from "zod";

const PUBLISHABLE_SITES = {
  kenyaclassified: {
    url: "https://kenyaclassified.co.ke/index.php?page=item&action=item_add",
    label: "KenyaClassified",
    useProfile: false,
  },
  kobstore: {
    url: "https://www.kobstore.co.ke/register",
    label: "KobStore",
    useProfile: true,
  },
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
    if (!profileId) {
      throw new Error(
        "TINYFISH_PROFILE_ID is not configured. Save an authenticated KobStore browser profile before enabling autonomous KobStore publishing.",
      );
    }
    body.use_profile = true;
    body.profile_id = profileId;
  }

  const response = await fetch("https://agent.tinyfish.ai/v1/automation/run", {
    method: "POST",
    headers: {
      "X-API-Key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`TinyFish returned HTTP ${response.status}: ${await response.text()}`);
  }

  return response.json() as Promise<Record<string, unknown>>;
}

export default defineTool({
  description:
    "Publish one compliant First Income Clarity listing to an explicitly allowlisted authorized site. KenyaClassified uses a public posting flow. KobStore uses a saved authenticated TinyFish browser profile and must already be authorized. Never bypass CAPTCHA, Cloudflare, Turnstile, login, phone/identity verification, payment gates, email verification, or rate limits. Return the verified live URL or the exact blocker. The tool is intended for autonomous scheduled publishing.",
  inputSchema: z.object({
    site: z.enum(["kenyaclassified", "kobstore"]),
    title: z.string().min(10).max(120),
    description: z.string().min(80).max(2500),
    priceKes: z.number().int().min(0).max(100000),
  }),
  async execute({ site, title, description, priceKes }) {
    const target = PUBLISHABLE_SITES[site];
    const finalDescription = `${description.trim()}\n\n${PRODUCT_DISCLOSURE}`;
    const startedAt = new Date().toISOString();
    const logName = site;

    try {
      const result = await runTinyFish({
        url: target.url,
        useProfile: target.useProfile,
        goal: [
          `Publish exactly one listing for First Income Clarity on ${target.label}.`,
          target.useProfile
            ? "Use the supplied authenticated browser profile. Do not create a new account, ask for credentials, or expose credentials."
            : "This site has a public posting form and does not require an account according to the tested workflow.",
          `Title: ${title}`,
          `Description: ${finalDescription}`,
          `Price: KES ${priceKes}`,
          "Contact email: innocentlabs4@gmail.com",
          "Use the appropriate education, training, tutoring, or online-service category available on the site.",
          "Use accurate Kenya service-area information only; do not invent a street address.",
          "Submit only one listing.",
          "After submission, verify anonymously/publicly where possible that the listing is actually live and return its public URL.",
          "If the listing account is not authenticated, stop and report login-required rather than asking for a password.",
          "If email verification is required, stop and report email-verification-required rather than attempting to access or bypass verification controls.",
          "If any CAPTCHA, Cloudflare, Turnstile, phone/identity verification, payment gate, or rate-limit challenge appears, stop immediately and report blocked-human-verification or the exact blocker. Never bypass it.",
          "Return JSON with status, liveUrl, titleUsed, reason, and site.",
        ].join("\n"),
        outputSchema: {
          type: "object",
          properties: {
            status: { type: "string", enum: ["published", "skipped", "failed", "blocked-human-verification"] },
            liveUrl: { type: "string" },
            titleUsed: { type: "string" },
            reason: { type: "string" },
            site: { type: "string" },
          },
          required: ["status", "titleUsed", "reason", "site"],
        },
      });

      const record = {
        timestamp: startedAt,
        site: target.label,
        action: "publish",
        titleContentIdentifier: title,
        status: String(result.status ?? "failed"),
        liveUrl: typeof result.liveUrl === "string" ? result.liveUrl : undefined,
        reason: typeof result.reason === "string" ? result.reason : undefined,
      };

      await put(`publishing-log/${Date.now()}-${logName}.json`, JSON.stringify(record, null, 2), {
        access: "private",
        contentType: "application/json",
      });

      return record;
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      const record = {
        timestamp: startedAt,
        site: target.label,
        action: "publish",
        titleContentIdentifier: title,
        status: "failed",
        reason,
      };

      await put(`publishing-log/${Date.now()}-${logName}.json`, JSON.stringify(record, null, 2), {
        access: "private",
        contentType: "application/json",
      });

      return record;
    }
  },
});
