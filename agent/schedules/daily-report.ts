import { defineSchedule } from "eve/schedules";

export default defineSchedule({
  // 06:00 UTC = 09:00 Africa/Nairobi, daily.
  cron: "0 6 * * *",
  content: [
    "Produce and email the daily Meliza performance report to the owner.",
    "Delegate to the `auditor` subagent for a full system audit (model/API health, Composio connection health, Facebook/Instagram pacing and duplicate compliance, the Agentiz feed, and poster rendering).",
    "Delegate to the `lawyer` subagent for a compliance review of recent posts and current practices (First Income Clarity claims, Uhiko Properties listing accuracy, data handling, platform policy). Keep its 'not legal advice' disclaimer in full.",
    "Wait for both to finish. Combine their findings into one email: a short top-line summary (overall audit status, any compliance flags), then the auditor's full findings under a 'System Audit' heading, then the lawyer's full findings under a 'Compliance Review' heading.",
    "Call `owner_contact` to get the recipient email and public app URL. Pass the app URL to the auditor. If it returns no email, skip sending and note in the run report that OWNER_NOTIFY_EMAIL is not configured.",
    "Otherwise send the report via the `composio` connection's Gmail tool (GMAIL_SEND_EMAIL) to that address only, with subject 'Meliza Daily Report — <today's date>'.",
    "If either subagent could not complete (a tool or connection failure), say so plainly in the email under its heading rather than omitting that section.",
  ].join(" "),
});
