/**
 * Approval rules for Composio tool calls made by Meliza.
 *
 * Composio Connect exposes meta-tools; the concrete app action (e.g.
 * FACEBOOK_CREATE_PHOTO_POST) travels inside the tool input, so rules match
 * on the serialized input.
 */

// Approval policy (owner's decisions, 2026-10-24 and 2026-10-25):
// - Facebook Page and Instagram publishing run autonomously, no approval.
// - TikTok (@pesazako, via WoopSocial) also runs autonomously, no approval,
//   but only for that one verified account — see isAutonomousTikTokOnly.
// - Publishing on any other social platform still needs approval until each
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

// WoopSocial is Meliza's TikTok route (account "pesazako", social_account_id
// 187715468390301696, connected 2026-10-25). Its tool names don't start with
// the platform name (WOOP_SOCIAL_SCHEDULE_POST, not TIKTOK_...), so
// SOCIAL_WRITE above never matches them and a WoopSocial call would
// otherwise fall through to autonomous for ANY platform WoopSocial can
// reach. Owner authorized autonomous publishing (2026-10-25) scoped to only
// this one verified TikTok account; WoopSocial also exposes its own
// Facebook/Instagram/LinkedIn/Pinterest/X/YouTube/Threads targets, which are
// NOT authorized through this route and still require approval.
const WOOP_SOCIAL_PUBLISH = /\bWOOP_SOCIAL_(SCHEDULE_POST|PUBLISH_POST_NOW|CREATE_POST)[A-Z0-9_]*\b/;
const AUTONOMOUS_TIKTOK_SOCIAL_ACCOUNT_ID = "187715468390301696";

// Video generation costs real, nonrefundable money per clip the instant it
// starts — there is no free path on any engine. Owner picked Replicate
// running ByteDance Seedance as the engine (2026-10-25), ~$0.04-0.15/second
// depending on tier (Lite vs Pro), billed to the owner's own Replicate
// account once connected. Gemini Veo and MiniMax remain available but
// unchosen. Every one of these still needs approval per call, even for a
// subagent (e.g. `video_producer`) that otherwise has direct publish
// access, until the owner confirms a tier and a daily spending cap — do not
// relax this without that explicit decision.
const BILLABLE_VIDEO_GENERATION =
  /\b(GEMINI_GENERATE_VIDEOS|MINIMAX_CREATE_(VIDEO|LEGACY_VIDEO|TEMPLATE_VIDEO)|MINIMAX_REGENERATE_VIDEO|REPLICATE_(MODELS_)?PREDICTIONS_CREATE)\b/;

function isAutonomousTikTokOnly(toolInput: unknown): boolean {
  let parsed: unknown = toolInput;
  if (typeof toolInput === "string") {
    try {
      parsed = JSON.parse(toolInput);
    } catch {
      return false;
    }
  }
  const targets = (parsed as { social_accounts?: unknown })?.social_accounts;
  if (!Array.isArray(targets) || targets.length === 0) return false;
  return targets.every(
    (t) =>
      t &&
      typeof t === "object" &&
      (t as Record<string, unknown>).platform === "TIKTOK" &&
      (t as Record<string, unknown>).social_account_id === AUTONOMOUS_TIKTOK_SOCIAL_ACCOUNT_ID,
  );
}

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
    if (BILLABLE_VIDEO_GENERATION.test(text)) return "user-approval";
    if (/MANAGE_CONNECTIONS|INITIATE_CONNECTION|DELETE_CONNECTION/.test(text) && CONNECTION_CHANGE.test(text)) return "user-approval";
    if (GMAIL_SEND.test(text)) return isOwnerOnlyRecipient(toolInput) ? "not-applicable" : "user-approval";
    if (WOOP_SOCIAL_PUBLISH.test(text)) return isAutonomousTikTokOnly(toolInput) ? "not-applicable" : "user-approval";
    // A batched call is autonomous only if every social write in it targets Facebook/Instagram.
    const writes = text.match(SOCIAL_WRITE) ?? [];
    if (writes.some((w) => !AUTONOMOUS_PLATFORMS.test(w))) return "user-approval";
    return "not-applicable";
}
