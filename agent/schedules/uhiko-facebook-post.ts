import { defineSchedule } from "eve/schedules";

export default defineSchedule({
  // 07:52 UTC = 10:52 Africa/Nairobi, daily.
  cron: "52 7 * * *",
  markdown: [
    "Publish today's Uhiko Properties post to the Facebook Page, following the 'Uhiko Property Posts' and 'Autonomous Facebook and Instagram Publishing' instructions.",
    "First read the Innocent labs Page's recent posts: if the Facebook limit (3 posts in 24 hours, 3 hours apart) is reached, record skipped with reason daily_limit and stop.",
    "Call uhiko_listings, excluding listing ids posted in the last 14 days (from the publishing log and the Page's recent posts).",
    "Pick one listing, preferring a property type and location different from the previous Uhiko post. Use its posterA or posterB URL exactly, alternating layouts.",
    "Write a fresh, creative Facebook caption using only the facts from the tool, with the price, location, 'Call Nathan Muthee on 0792 373 023' and the listing link.",
    "Publish as a Facebook photo post to the Innocent labs Page, verify the post is live, and record it in the publishing log with listing id, layout and permalink.",
    "Do not post Uhiko listings to Instagram.",
  ].join(" "),
});
