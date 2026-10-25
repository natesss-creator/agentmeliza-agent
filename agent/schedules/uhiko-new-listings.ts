import { defineSchedule } from "eve/schedules";

export default defineSchedule({
  // Every 3 hours.
  cron: "0 */3 * * *",
  markdown: [
    "Check for a new Uhiko Properties listing to cross-post, following the 'Uhiko Property Posts' and 'Uhiko New-Listing Cross-Posting' sections of your instructions.",
    "Call `uhiko_listings` and compare against the publishing log to find any listing not already posted in the last 14 days. Prefer the most recently updated listing not yet posted.",
    "If nothing new is found, do nothing and end the run quietly — do not post an old or already-logged listing just to have something to report.",
    "If a new listing is found, run the full 'Uhiko Property Posts' flow for it across every currently authorized autonomous destination (Facebook Page, TikTok @pesazako) — one listing per destination per run, respecting each platform's pacing and duplicate-check rules from 'Autonomous Facebook, Instagram, and TikTok Publishing'. Skip a destination (recording `skipped` with the reason) rather than breaking its pacing limit.",
    "Record every attempt in the publishing log with platform, listing id, poster layout, status, and permalink, exactly as the Uhiko Property Posts flow requires.",
  ].join(" "),
});
