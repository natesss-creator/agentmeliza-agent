import { NextResponse } from "next/server";

export const runtime = "nodejs";

const ORIGIN = "https://production-sfo.browserless.io";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secret = request.headers.get("x-meliza-publish-secret") || url.searchParams.get("secret");
  if (!secret || secret !== process.env.MELIZA_BROWSER_PUBLISH_SECRET) {
    return NextResponse.json({ status: "forbidden" }, { status: 403 });
  }

  const videoData = url.searchParams.get("videoData");
  if (!videoData) return NextResponse.json({ status: "failed", reason: "videoData is required" }, { status: 400 });

  const token = process.env.BROWSERLESS_API_KEY;
  if (!token) return NextResponse.json({ status: "failed", reason: "BROWSERLESS_API_KEY is not configured" }, { status: 500 });

  const profile = process.env.BROWSERLESS_YOUTUBE_PROFILE || "meliza-youtube";
  const title = "3 Steps to Get Clear on Your First Income | First Income Clarity";
  const description = "Feeling stuck on your next step? First Income Clarity is a practical 14-day guide designed to help you clarify your next steps in about 45 minutes a day alongside a job or job search.\n\nKES 2,500 one-time. Lifetime access. No upsells.\n\nExplore: https://groketer.com/firstincome\n\nThis guide offers practical structure and does not guarantee income or employment.";

  const code = `
    export default async ({ page, context }) => {
      const sleep = ms => new Promise(r => setTimeout(r, ms));
      const text = async () => await page.evaluate(() => document.body?.innerText || "");
      const clickText = async value => {
        const ok = await page.evaluate(needle => {
          const nodes = Array.from(document.querySelectorAll("button,tp-yt-paper-button,tp-yt-paper-radio-button,[role=button],[role=radio]"));
          const node = nodes.find(el => (el.textContent || "").trim().toLowerCase().includes(needle.toLowerCase()));
          if (!node) return false; node.click(); return true;
        }, value);
        if (!ok) throw new Error("Could not find clickable text: " + value);
      };
      await page.goto("https://www.youtube.com/upload", {waitUntil:"networkidle2", timeout:60000});
      await sleep(2000);
      const body = await text();
      if (/sign in|choose an account|accounts.google.com/i.test(body) && !/Upload videos/i.test(body)) return {status:"needs_profile"};
      await page.waitForSelector('input[type="file"]', {visible:true, timeout:30000});
      const r = await fetch(context.videoData);
      if (!r.ok) throw new Error("Video fetch failed: HTTP " + r.status);
      const bytes = new Uint8Array(await r.arrayBuffer());
      let binary=""; for(let i=0;i<bytes.length;i+=0x8000) binary += String.fromCharCode(...bytes.subarray(i,Math.min(i+0x8000,bytes.length)));
      const cdp = await page.createCDPSession();
      const up = await cdp.send("Browserless.uploadFile", {selector:'input[type="file"]', files:[{name:"first-income-clarity-doodle.mp4",content:btoa(binary),mimeType:"video/mp4"}]});
      if(!up?.ok) throw new Error("Browserless.uploadFile failed");
      await sleep(3000);
      const titleSel = ['#title-textarea #textbox','ytcp-social-suggestions-textbox[slot="title"] #textbox','textarea[aria-label*="title" i]','[contenteditable="true"][aria-label*="title" i]'];
      const descSel = ['#description-textarea #textbox','textarea[aria-label*="description" i]','[contenteditable="true"][aria-label*="description" i]'];
      const ts=titleSel.find(s=>page.$(s)); const ds=descSel.find(s=>page.$(s));
      if(!ts||!ds) throw new Error("YouTube metadata fields not found");
      await page.click(ts,{clickCount:3}); await page.keyboard.press("Control+A"); await page.keyboard.type(context.title);
      await page.click(ds,{clickCount:3}); await page.keyboard.press("Control+A"); await page.keyboard.type(context.description);
      await page.evaluate(()=>document.querySelector('tp-yt-paper-radio-button[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"],[name="VIDEO_MADE_FOR_KIDS_NOT_MFK"]')?.click());
      for(let i=0;i<3;i++){await clickText("Next");await sleep(1200);}
      await page.evaluate(()=>document.querySelector('tp-yt-paper-radio-button[name="PUBLIC"],[name="PUBLIC"]')?.click());
      await clickText("Publish"); await sleep(3000);
      const finalText=await text(); const hrefs=await page.$$eval('a[href*="youtube.com/watch"],a[href*="youtu.be/"]',els=>els.map(e=>e.href));
      const liveUrl=hrefs[0]||null;
      if(!liveUrl && !/published|video published/i.test(finalText)) throw new Error("Publish confirmation was not detected");
      return {status:"published",url:liveUrl,confirmation:finalText.slice(-800)};
    };
  `;

  const response = await fetch(`${ORIGIN}/function?token=${encodeURIComponent(token)}&profile=${encodeURIComponent(profile)}&timeout=180000`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, context: { profile, videoData, title, description } }),
  });
  const raw = await response.text();
  if (!response.ok) return NextResponse.json({ status: "failed", reason: raw.slice(0, 2000) }, { status: 502 });
  try { return NextResponse.json(JSON.parse(raw)); } catch { return NextResponse.json({ status: "unknown", raw: raw.slice(0, 4000) }); }
}
