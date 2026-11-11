import { defineSchedule } from "eve/schedules";

export default defineSchedule({
  // Kept as a no-op schedule so the paused campaign cannot continue through
  // an already-deployed cron entry.
  cron: "0 5 * * *",
  content: "First Income Clarity publishing is paused by the owner. Do not call publishing or discovery tools, create listings, or distribute campaign content. End this run without taking action.",
});
