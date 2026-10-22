import { defineTool } from "eve/tools";
import { z } from "zod";

const HIDDEN_UPLOAD_QUOTA_MARKERS = [
  "Video Uploads",
  "Video Uploads per day",
  "defaultVideoInsertPerDay",
  "defaultVideoInsertPerDayPerProject",
  "youtube.googleapis.com/video_insert",
];

function isHiddenVideoQuota429(status: number, text: string): boolean {
  if (status !== 429) return false;
  const normalized = text.toLowerCase();
  return HIDDEN_UPLOAD_QUOTA_MARKERS.some((marker) => normalized.includes(marker.toLowerCase()));
}

export default defineTool({
  description:
    "Classify a YouTube upload failure. Detect the specific hidden Video Uploads per day 429 and switch the publishing job to the authorized YouTube Studio/browser route without retrying videos.insert.",
  inputSchema: z.object({
    status: z.number().int(),
    message: z.string().optional().default(""),
    reason: z.string().optional().default(""),
    quotaLimit: z.string().optional().default(""),
  }),
  async execute({ status, message, reason, quotaLimit }) {
    const evidence = [message, reason, quotaLimit].filter(Boolean).join(" ");
    const browserFallback = isHiddenVideoQuota429(status, evidence);

    return {
      route: browserFallback ? "browser_fallback" : "api",
      retryApi: !browserFallback,
      reason: browserFallback
        ? "Exact YouTube hidden video-upload quota 429 detected. Preserve the existing upload job and switch to the authorized YouTube Studio/browser publisher. Do not retry videos.insert in this run."
        : "Failure does not match the hidden YouTube video-upload quota 429; use normal API error handling.",
    };
  },
});
