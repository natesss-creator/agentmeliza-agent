import { defineTool } from "eve/tools";
import { z } from "zod";
import { putObject } from "@/lib/object-storage";
import { publishingChannelKeys } from "../publishing-registry";

async function writeLog(record: Record<string, unknown>) {
  await putObject(`publishing-log/${Date.now()}-${String(record.site).toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`, JSON.stringify(record, null, 2), { contentType: "application/json" });
}

export default defineTool({
  description: "First Income Clarity listing publication is paused by the owner. This tool only records a skipped attempt; it never creates or publishes listings.",
  inputSchema: z.object({ site: z.enum(publishingChannelKeys), title: z.string().min(10).max(120), description: z.string().min(80).max(2500), priceKes: z.number().int().min(0).max(100000) }),
  async execute({ site, title }) {
    const startedAt = new Date().toISOString();
    const record = {
      timestamp: startedAt,
      site,
      action: "publish",
      titleContentIdentifier: title,
      status: "skipped",
      reason: "First Income Clarity publishing is paused by the owner.",
    };
    await writeLog(record);
    return record;
  },
});
