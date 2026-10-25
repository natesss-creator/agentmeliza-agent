import { defineSchedule } from "eve/schedules";

export default defineSchedule({
  // Once daily, 09:00 UTC = 12:00 Africa/Nairobi. Vercel's Hobby plan caps
  // cron jobs at once per day; a tighter interval (e.g. every 3 hours) needs
  // the Pro plan. Offset from daily-report.ts (06:00 UTC) so they don't run
  // back to back.
  cron: "0 9 * * *",
  markdown: [
    "Run the full 'Uhiko Property Posts' flow, following that section and 'Uhiko New-Listing Cross-Posting' in your instructions.",
    "Call `uhiko_listings` with limit 25, excluding ids already posted in the last 14 days (check the publishing log and each platform's recent posts). It already excludes listings with no real photo.",
    "Post every eligible listing it returns, not just one, to every currently authorized autonomous destination (Facebook Page, Instagram @innocentlabs4, TikTok @pesazako) — looping through listings per platform until that platform's daily pacing cap is reached, then moving on. Skip a destination (recording `skipped` with the reason) rather than breaking its pacing or duplicate-check rules.",
    "If nothing eligible is found, do nothing and end the run quietly.",
    "Record every attempt in the publishing log with platform, listing id, poster layout, status, and permalink, exactly as the Uhiko Property Posts flow requires.",
  ].join(" "),
});
