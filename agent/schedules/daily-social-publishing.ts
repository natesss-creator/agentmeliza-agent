import { defineSchedule } from "eve/schedules";

export default defineSchedule({
  // 07:00 UTC = 10:00 Africa/Nairobi, daily. This is the SINGLE schedule
  // responsible for initiating and triggering today's Facebook/Instagram/
  // TikTok posts — do not publish social posts from any other schedule.
  // Currently Uhiko-only: First Income Clarity's social posting is paused
  // by owner instruction (2026-10-25); see agent/instructions.md. Re-add a
  // First Income Clarity part here if that pause is lifted. (Separate from
  // daily-publishing.ts, which handles First Income Clarity's classifieds/
  // directory-site publishing via publish_listing, not social media — that
  // one is untouched by this pause unless told otherwise.) Offset from
  // daily-report.ts (06:00 UTC) and daily-publishing.ts (05:00 UTC) so
  // nothing runs back to back; Vercel's Hobby plan caps each cron job at
  // once per day.
  cron: "0 7 * * *",
  markdown: [
    "You are the one daily trigger for social post publication. First Income Clarity publishing is paused by owner instruction (2026-10-25) — do not publish any First Income Clarity content here; Uhiko Properties is the sole active priority across every channel. Re-check your instructions in case this has since changed before assuming it's still paused.",

    "Uhiko Properties: follow 'Uhiko Property Posts' and 'Uhiko New-Listing Cross-Posting' in full. Call `uhiko_listings` with limit 25, excluding ids already posted in the last 14 days (check the publishing log and each platform's recent posts) — it already excludes listings with no real photo. Post every eligible listing it returns, not just one, to every currently authorized autonomous destination (Facebook Page, Instagram @innocentlabs4, TikTok @pesazako) — looping through listings per platform until that platform's daily pacing cap is reached, then moving on to the next platform. If nothing eligible is found, do nothing and end quietly.",

    "QA gate — for every caption, before publishing it, delegate the exact platform, brand, and caption text plus the listing id to the `qa_reviewer` subagent. On PASS, publish. On FAIL, apply its suggested fix once and send the revised caption back to `qa_reviewer`; if it fails a second time, skip that post and record `qa_rejected` with its reason rather than publishing or retrying further.",

    "Skip a destination (recording `skipped` with the reason) rather than breaking its pacing or duplicate-check rules. Record every attempt in the publishing log with platform, listing id, poster layout, QA result, status, and permalink.",
  ].join(" "),
});
