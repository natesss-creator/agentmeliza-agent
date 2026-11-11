import { defineSchedule } from "eve/schedules";

export default defineSchedule({
  cron: "0 7 * * *",
  content: "Automated social publishing is disabled until a tenant-aware schedule with user-specific authorization and approvals is configured. Do not call tools, access shared account data, publish, or schedule content. End this run without action.",
});
