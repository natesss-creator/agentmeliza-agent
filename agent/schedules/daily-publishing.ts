import { defineSchedule } from "eve/schedules";

export default defineSchedule({
  // 08:00 Africa/Nairobi (05:00 UTC) every day.
  cron: "0 5 * * *",
  markdown: [
    "Run today's autonomous First Income Clarity publishing workflow.",
    "Use the publish_listing tool exactly once for KenyaClassified.",
    "Create a concise, helpful, non-hype title and description that accurately explains the 14-day guide, approximately 45 minutes/day alongside a job or job search, KES 2,500 one-time, lifetime access, no upsells, and the official link https://groketer.com/firstincome.",
    "Vary the wording from prior posts while remaining truthful and non-spammy.",
    "Use priceKes 2500 and contact email innocentlabs4@gmail.com.",
    "Do not claim guaranteed income, jobs, M-Pesa earnings, or quick riches.",
    "Do not publish to any site that is not explicitly enabled by the publisher tool.",
    "If the tool reports a blocker or failure, record it and do not retry repeatedly in the same run.",
  ].join(" "),
});
