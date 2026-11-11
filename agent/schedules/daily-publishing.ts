import { defineSchedule } from "eve/schedules";

export default defineSchedule({
  cron: "0 5 * * *",
  content: "Automated listing publishing is disabled until a tenant-aware workflow with user-specific authorization and approvals is configured. Do not call tools or publish content. End this run without action.",
});
