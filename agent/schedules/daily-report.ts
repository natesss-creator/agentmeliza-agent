import { defineSchedule } from "eve/schedules";

export default defineSchedule({
  cron: "0 6 * * *",
  content: "Automated email reporting is disabled until a tenant-aware workflow with user-specific data and recipients is configured. Do not call tools or send email. End this run without action.",
});
