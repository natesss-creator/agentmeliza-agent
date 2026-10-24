import { defineTool } from "eve/tools";
import { z } from "zod";

/**
 * The owner's notification address, for the daily report or other
 * owner-facing notices. Kept out of instructions.md so the address lives in
 * one place (the Vercel env var) and matches what the Gmail approval guard
 * in lib/composio-approval.ts checks against.
 */
export default defineTool({
  description: "Get the owner's notification email address, for sending the daily report or another owner-facing notice.",
  inputSchema: z.object({}),
  async execute() {
    return { email: process.env.OWNER_NOTIFY_EMAIL || null };
  },
});
