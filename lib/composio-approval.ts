/**
 * Approval rules for Composio tool calls made by Meliza.
 *
 * Composio Connect exposes meta-tools; the concrete app action (e.g.
 * FACEBOOK_CREATE_PHOTO_POST) travels inside the tool input, so rules match
 * on the serialized input.
 */

// Approval policy (owner's decision, 2026-10-24):
// - Facebook Page and Instagram publishing run autonomously, no approval.
// - Publishing on other social platforms still needs approval until each
//   account is verified and the owner opts it in.
// - Deleting content and adding/removing Composio connections always need
//   approval: they are irreversible, and duplicate connections are forbidden.
const AUTONOMOUS_PLATFORMS = /\b(FACEBOOK|INSTAGRAM)_/;
const SOCIAL_WRITE =
  /\b(FACEBOOK|INSTAGRAM|THREADS|LINKEDIN|TWITTER|YOUTUBE|TIKTOK|PINTEREST|REDDIT)_[A-Z0-9_]*(CREATE|PUBLISH|POST|UPLOAD|SEND|REPLY|COMMENT|UPDATE|EDIT|SCHEDULE)[A-Z0-9_]*\b/g;
const DESTRUCTIVE = /\b[A-Z]+_[A-Z0-9_]*(DELETE|REMOVE|DISCONNECT|UNPUBLISH)[A-Z0-9_]*\b/;
// Listing connections is read-only and is how Meliza verifies the Page and
// account before posting; only changes to connections are gated.
const CONNECTION_CHANGE = /INITIATE_CONNECTION|DELETE_CONNECTION|"action"\s*:\s*"(add|remove|rename)"/;

// Gmail sends don't match SOCIAL_WRITE (Gmail isn't a social platform), so
// without this guard they would silently fall through to autonomous for any
// recipient. Restrict autonomous sending to the owner's own notification
// address (e.g. the daily report); anything else still needs approval.
const GMAIL_SEND = /\bGMAIL_(SEND_EMAIL|SEND_DRAFT|REPLY_TO_THREAD)\b/;
const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

function serialize(input: unknown): string {
  try {
    return JSON.stringify(input ?? "");
  } catch {
    return "";
  }
}

function isOwnerOnlyRecipient(toolInput: unknown): boolean {
  const owner = (process.env.OWNER_NOTIFY_EMAIL || "").toLowerCase();
  if (!owner) return false; // no owner address configured: never autonomous
  const addresses = serialize(toolInput).toLowerCase().match(EMAIL_RE) ?? [];
  if (addresses.length === 0) return false; // no recipient found: don't risk it
  return addresses.every((a) => a === owner);
}

export function composioApproval(toolName: string, toolInput: unknown): "user-approval" | "not-applicable" {
    const text = `${toolName} ${serialize(toolInput)}`;
    if (DESTRUCTIVE.test(text)) return "user-approval";
    if (/MANAGE_CONNECTIONS|INITIATE_CONNECTION|DELETE_CONNECTION/.test(text) && CONNECTION_CHANGE.test(text)) return "user-approval";
    if (GMAIL_SEND.test(text)) return isOwnerOnlyRecipient(toolInput) ? "not-applicable" : "user-approval";
    // A batched call is autonomous only if every social write in it targets Facebook/Instagram.
    const writes = text.match(SOCIAL_WRITE) ?? [];
    if (writes.some((w) => !AUTONOMOUS_PLATFORMS.test(w))) return "user-approval";
    return "not-applicable";
}
