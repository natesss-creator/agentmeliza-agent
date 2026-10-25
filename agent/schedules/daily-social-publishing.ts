import { defineSchedule } from "eve/schedules";

export default defineSchedule({
  // 07:00 UTC = 10:00 Africa/Nairobi, daily. This is the SINGLE schedule
  // responsible for initiating and triggering today's Facebook/Instagram/
  // TikTok posts for both brands — do not publish social posts from any
  // other schedule. (Separate from daily-publishing.ts, which handles First
  // Income Clarity's classifieds/directory-site publishing via
  // publish_listing, not social media.) Offset from daily-report.ts
  // (06:00 UTC) and daily-publishing.ts (05:00 UTC) so nothing runs back to
  // back; Vercel's Hobby plan caps each cron job at once per day.
  cron: "0 7 * * *",
  markdown: [
    "You are the one daily trigger for social post publication across both brands. Run both parts below in this single pass.",

    "Part A — First Income Clarity: follow 'Autonomous Facebook, Instagram, and TikTok Publishing' in your instructions to publish one fresh First Income Clarity post today, on whichever of Facebook/Instagram/TikTok currently has pacing room and hasn't had a First Income Clarity post too recently. Use fresh creative and a fresh angle — never repeat a recent image or opening line. If no suitable fresh creative exists for a platform, skip it and record `skipped` with reason `no_media` rather than reusing an old asset.",

    "Part B — Uhiko Properties: follow 'Uhiko Property Posts' and 'Uhiko New-Listing Cross-Posting' in full. Call `uhiko_listings` with limit 25, excluding ids already posted in the last 14 days (check the publishing log and each platform's recent posts) — it already excludes listings with no real photo. Post every eligible listing it returns, not just one, to every currently authorized autonomous destination (Facebook Page, Instagram @innocentlabs4, TikTok @pesazako) — looping through listings per platform until that platform's daily pacing cap is reached, then moving on to the next platform. If nothing eligible is found, do nothing for this part and end quietly.",

    "QA gate — for every caption in both parts, before publishing it, delegate the exact platform, brand, and caption text (plus the listing id for Uhiko) to the `qa_reviewer` subagent. On PASS, publish. On FAIL, apply its suggested fix once and send the revised caption back to `qa_reviewer`; if it fails a second time, skip that post and record `qa_rejected` with its reason rather than publishing or retrying further.",

    "Skip a destination (recording `skipped` with the reason) rather than breaking its pacing or duplicate-check rules. Record every attempt from both parts in the publishing log with platform, brand, listing id (Uhiko only), poster layout, QA result, status, and permalink.",
  ].join(" "),
});
