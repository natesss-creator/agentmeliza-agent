import { defineSchedule } from "eve/schedules";

export default defineSchedule({
  // 18:00 UTC = 21:00 EAT. The schedule creates a concise daily report
  // from the durable publishing log. It does not publish anything itself.
  cron: "0 18 * * *",
  markdown: [
    "Review the durable publishing-log memory for today's publishing activity.",
    "Produce a concise execution report covering attempted, published, skipped, and failed actions,",
    "including site/platform, result, live URLs when available, and blockers requiring human action.",
    "Do not invent activity. Do not expose credentials, OTPs, cookies, tokens, or email contents.",
    "If there was no activity, report that clearly.",
  ].join(" "),
});
