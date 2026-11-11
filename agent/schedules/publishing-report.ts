import { defineSchedule } from "eve/schedules";

export default defineSchedule({
  cron: "0 18 * * *",
  content: "Automated publishing reports are disabled until tenant-specific logs and recipients are configured. Do not read shared state or call tools. End this run without action.",
});
