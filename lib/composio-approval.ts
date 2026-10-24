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

function serialize(input: unknown): string {
  try {
    return JSON.stringify(input ?? "");
  } catch {
    return "";
  }
}

export function composioApproval(toolName: string, toolInput: unknown): "user-approval" | "not-applicable" {
    const text = `${toolName} ${serialize(toolInput)}`;
    if (DESTRUCTIVE.test(text)) return "user-approval";
    if (/MANAGE_CONNECTIONS|INITIATE_CONNECTION|DELETE_CONNECTION/.test(text) && CONNECTION_CHANGE.test(text)) return "user-approval";
    // A batched call is autonomous only if every social write in it targets Facebook/Instagram.
    const writes = text.match(SOCIAL_WRITE) ?? [];
    if (writes.some((w) => !AUTONOMOUS_PLATFORMS.test(w))) return "user-approval";
    return "not-applicable";
}
