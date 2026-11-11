import { defineTool } from "eve/tools";
import { z } from "zod";

/**
 * The owner's notification address and canonical public app URL for reports
 * and health checks. Both values are kept in the server environment.
 */
export default defineTool({
  description: "Get the owner's notification email address, for sending the daily report or another owner-facing notice.",
  inputSchema: z.object({}),
  async execute() {
    return {
      email: process.env.OWNER_NOTIFY_EMAIL || null,
      appUrl: process.env.APP_URL || null,
    };
  },
});
