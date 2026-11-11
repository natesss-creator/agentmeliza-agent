import { createHash } from "node:crypto";
import { isPublicObjectUrlForPrefix } from "@/lib/object-storage";

export const MAX_USER_MEDIA_BYTES = 4 * 1024 * 1024;
export const USER_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
] as const;

export type UserMediaType = (typeof USER_MEDIA_TYPES)[number];

export function userMediaPrefix(userId: string): string {
  const userKey = createHash("sha256").update(userId).digest("hex").slice(0, 32);
  return `user-media/${userKey}`;
}

export function isUserMediaReference(
  value: unknown,
  userId: string,
): value is { url: string; contentType: UserMediaType; name: string } {
  if (!value || typeof value !== "object") return false;
  const media = value as Record<string, unknown>;
  if (
    typeof media.url !== "string" ||
    typeof media.contentType !== "string" ||
    !USER_MEDIA_TYPES.includes(media.contentType as UserMediaType) ||
    typeof media.name !== "string" ||
    media.name.length > 200
  ) {
    return false;
  }

  return isPublicObjectUrlForPrefix(media.url, userMediaPrefix(userId));
}
