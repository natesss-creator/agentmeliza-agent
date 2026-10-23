import { NextResponse } from "next/server";
export const runtime = "nodejs";
const ORIGIN = "https://production-sfo.browserless.io";
const title = "First Income Clarity — Practical 14-Day Guide";
const description = "A practical 14-day guide to help you clarify your next steps in about 45 minutes a day alongside a job or job search. KES 2,500 one-time. Lifetime access. No upsells. Explore: https://groketer.com/firstincome. No income or employment guarantees.";
export async function GET(request: Request) {
  const token = process.env.BROWSERLESS_API_KEY;
  if (!token) return NextResponse.json({status:"failed",reason:"BROWSERLESS_API_KEY is not configured"},{status:500});
  const profile = process.env.BROWSERLESS_YOUTUBE_PROFILE || "meliza-youtube";
  const code = `export default async ({ page, context }) => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const bodyText = () => page.evaluate(() => document.body?.innerText || "");
    const fill = async (selectors, value) => { for (const s of selectors) { const el = await page.$(s); if (el) { await el.click({clickCount:3}); await page.keyboard.press("Control+A"); await page.keyboard.type(value); return true; } } return false; };
    const click = async (words) => page.evaluate(ws => { const nodes=[...document.querySelectorAll("button,a,input[type=submit],input[type=button],[role=button]")]; const n=nodes.find(x=>ws.some(w=>(x.innerText||x.value||x.textContent||"").trim().toLowerCase().includes(w))); if(n){n.click();return true} return false }, words.map(x=>x.toLowerCase()));
    await page.goto(context.target,{waitUntil:"networkidle2",timeout:60000}); await sleep(2500);
    const text=(await bodyText()).toLowerCase();
    if(/captcha|cloudflare|turnstile|verify you are human|identity verification|phone verification/.test(text)) return {status:"blocked-human-verification",reason:"Human verification required"};
    if(/sign in|log in|login|create account|register/.test(text) && !/post an ad|post ad|add listing/.test(text)) return {status:"needs_profile",reason:"Saved browser profile is not authenticated on this site"};
    await fill(['input[name*=title i]','input[id*=title i]','input[placeholder*=title i]'],context.title);
    await fill(['textarea[name*=description i]','textarea[id*=description i]','textarea[placeholder*=description i]'],context.description);
    await fill(['input[name*=price i]','input[id*=price i]','input[placeholder*=price i]'],context.price);
    await click(["services","education"]); await sleep(500);
    const submitted=await click(["publish","post ad","post","submit","place ad"]); if(!submitted) throw new Error("Publish button not found");
    await sleep(5000); const final=await bodyText();
    const links=await page.$$eval('a[href^="http"]',els=>els.map(e=>e.href));
    const live=links.find(u=>!/login|register|signup|item_add/i.test(u)) || (location.href);
    if(!/success|published|posted|thank you|listing/i.test(final)) return {status:"attempted",url:live};
    return {status:"published",url:live,confirmation:final.slice(-1000)};
  };`;
  const target = "https://kenyaclassified.co.ke/index.php?page=item&action=item_add";
  const response = await fetch(`${ORIGIN}/function?token=${encodeURIComponent(token)}&profile=${encodeURIComponent(profile)}&timeout=180000`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code,context:{target,title,description,price:"2500"}})});
  const raw=await response.text();
  if(!response.ok) return NextResponse.json({status:"failed",reason:raw.slice(0,2000)},{status:502});
  try{return NextResponse.json(JSON.parse(raw))}catch{return NextResponse.json({status:"unknown",raw:raw.slice(0,4000)})}
}
