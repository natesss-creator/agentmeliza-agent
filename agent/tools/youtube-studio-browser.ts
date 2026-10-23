import { defineTool } from "eve/tools";
import { z } from "zod";

const ORIGIN = "https://production-sfo.browserless.io";

function browserlessToken() {
  const token = process.env.BROWSERLESS_API_KEY;
  if (!token) throw new Error("BROWSERLESS_API_KEY is not configured.");
  return token;
}

function profileName() {
  return process.env.BROWSERLESS_YOUTUBE_PROFILE || "meliza-youtube";
}

async function runBrowserlessFunction(context: Record<string, unknown>) {
  const token = browserlessToken();
  const profile = profileName();
  const code = `
    export default async ({ page, context }) => {
      const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
      const text = async () => await page.evaluate(() => document.body?.innerText || "");
      const clickText = async (value) => {
        const clicked = await page.evaluate((needle) => {
          const nodes = Array.from(document.querySelectorAll("button, tp-yt-paper-button, tp-yt-paper-radio-button, [role=button], [role=radio]"));
          const node = nodes.find((el) => (el.textContent || "").trim().toLowerCase().includes(needle.toLowerCase()));
          if (!node) return false;
          node.click();
          return true;
        }, value);
        if (!clicked) throw new Error("Could not find clickable text: " + value);
      };

      await page.goto("https://www.youtube.com/upload", { waitUntil: "networkidle2", timeout: 60000 });
      await sleep(2000);

      const body = await text();
      if (/sign in|choose an account|accounts.google.com/i.test(body) && !/Upload videos/i.test(body)) {
        return { status: "needs_profile", message: "The Browserless YouTube profile is not authenticated. Create/save an authenticated Browserless profile named " + context.profile + "." };
      }

      await page.waitForSelector('input[type="file"]', { visible: true, timeout: 30000 });

      const videoResponse = await fetch(context.videoUrl);
      if (!videoResponse.ok) throw new Error("Could not fetch video asset: HTTP " + videoResponse.status);
      const bytes = new Uint8Array(await videoResponse.arrayBuffer());
      if (bytes.byteLength > 50 * 1024 * 1024) throw new Error("Video asset exceeds Browserless upload limit of 50 MB.");
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunk, bytes.length)));
      }
      const content = btoa(binary);

      const cdp = await page.createCDPSession();
      const upload = await cdp.send("Browserless.uploadFile", {
        selector: 'input[type="file"]',
        files: [{ name: context.fileName || "first-income-clarity-doodle.mp4", content, mimeType: "video/mp4" }],
      });
      if (!upload?.ok) throw new Error("Browserless.uploadFile failed: " + JSON.stringify(upload));

      await sleep(2500);

      const title = context.title || "3 Steps to Get Clear on Your First Income | First Income Clarity";
      const description = context.description || "Feeling stuck on your next step? First Income Clarity is a practical 14-day guide designed to help you clarify your next steps in about 45 minutes a day alongside a job or job search.\\n\\nKES 2,500 one-time. Lifetime access. No upsells.\\n\\nExplore: https://groketer.com/firstincome\\n\\nThis guide offers practical structure and does not guarantee income or employment.";

      const titleSelectors = [
        '#title-textarea #textbox',
        'ytcp-social-suggestions-textbox[slot="title"] #textbox',
        'textarea[aria-label*="title" i]',
        '[contenteditable="true"][aria-label*="title" i]'
      ];
      const descSelectors = [
        '#description-textarea #textbox',
        'textarea[aria-label*="description" i]',
        '[contenteditable="true"][aria-label*="description" i]'
      ];

      let titleSelector = null;
      for (const s of titleSelectors) { if (await page.$(s)) { titleSelector = s; break; } }
      let descSelector = null;
      for (const s of descSelectors) { if (await page.$(s)) { descSelector = s; break; } }
      if (!titleSelector || !descSelector) throw new Error("YouTube Studio metadata fields were not found.");

      await page.click(titleSelector, { clickCount: 3 });
      await page.keyboard.press("Control+A");
      await page.keyboard.type(String(title).slice(0, 100));
      await page.click(descSelector, { clickCount: 3 });
      await page.keyboard.press("Control+A");
      await page.keyboard.type(String(description).slice(0, 5000));

      await page.evaluate(() => {
        const el = document.querySelector('tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"], [name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]');
        if (el) el.click();
      });
      await sleep(500);

      for (let i = 0; i < 3; i++) {
        await clickText("Next");
        await sleep(1200);
      }

      await page.evaluate(() => {
        const el = document.querySelector('tp-yt-paper-radio-button[name="PUBLIC"], [name="PUBLIC"]');
        if (el) el.click();
      });
      await sleep(500);
      await clickText("Publish");
      await sleep(2500);

      const finalText = await text();
      const hrefs = await page.$$eval('a[href*="youtu.be/"], a[href*="youtube.com/watch"], a[href*="youtube.com/shorts/"]', (els) => els.map((e) => e.href));
      const url = hrefs[0] || null;
      if (!url && !/published|video published/i.test(finalText)) {
        throw new Error("Publish confirmation was not detected.");
      }
      return { status: "published", url, confirmation: finalText.slice(-1000) };
    };
  `;

  const response = await fetch(`${ORIGIN}/function?token=${encodeURIComponent(token)}&profile=${encodeURIComponent(profile)}&timeout=180000`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, context: { ...context, profile } }),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error(`Browserless function failed: HTTP ${response.status} ${raw.slice(0, 2000)}`);
  try { return JSON.parse(raw); } catch { return { status: "unknown", raw: raw.slice(0, 4000) }; }
}

export default defineTool({
  description:
    "Publish a prepared First Income Clarity video through an authenticated YouTube Studio browser session using Browserless. Use this only after the YouTube API upload path returns the known hidden Video Uploads per day 429. Requires BROWSERLESS_API_KEY and a saved Browserless profile in BROWSERLESS_YOUTUBE_PROFILE. Never bypass human verification challenges.",
  inputSchema: z.object({
    videoUrl: z.string().url(),
    fileName: z.string().optional().default("first-income-clarity-doodle.mp4"),
    title: z.string().max(100).optional(),
    description: z.string().max(5000).optional(),
  }),
  async execute(input) {
    return await runBrowserlessFunction(input);
  },
});
