export type YouTubePublishPath = "api" | "browser_fallback";

export type YouTubeUploadError = {
  status?: number;
  message?: string;
  reason?: string;
  quotaLimit?: string;
};

const HIDDEN_UPLOAD_QUOTA_MARKERS = [
  "Video Uploads",
  "Video Uploads per day",
  "defaultVideoInsertPerDay",
  "defaultVideoInsertPerDayPerProject",
  "youtube.googleapis.com/video_insert",
];

/**
 * Detects the specific YouTube API failure that should switch Meliza away from
 * repeated API retries. This is intentionally narrow: ordinary 429s and other
 * failures must not silently switch publishing paths.
 */
export function isYouTubeVideoUploadQuota429(error: YouTubeUploadError): boolean {
  if (error.status !== 429) return false;

  const text = [error.message, error.reason, error.quotaLimit]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return HIDDEN_UPLOAD_QUOTA_MARKERS.some((marker) =>
    text.includes(marker.toLowerCase()),
  );
}

export function chooseYouTubePublishPath(error?: YouTubeUploadError): YouTubePublishPath {
  return error && isYouTubeVideoUploadQuota429(error) ? "browser_fallback" : "api";
}

export function youtubeFallbackReason(error: YouTubeUploadError): string {
  return isYouTubeVideoUploadQuota429(error)
    ? "YouTube API video-insert quota is exhausted or hidden-throttled. Do not retry videos.insert; hand the same authorized upload job to the authenticated YouTube Studio/browser publisher."
    : "YouTube API upload did not match the hidden video-upload quota 429; keep normal error handling.";
}
