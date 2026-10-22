import { get, put } from "@vercel/blob";
import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const TOKEN_PATH = "integrations/youtube/credentials.json";
// Channel lookup uses channels.list?mine=true, which requires read access in addition to upload.
const SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
].join(" ");

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function redirectUri(): string {
  return process.env.YOUTUBE_REDIRECT_URI || "https://agentmeliza.vercel.app/api/youtube/callback";
}

function encryptionKey(): Buffer {
  return createHash("sha256").update(required("BETTER_AUTH_SECRET")).digest();
}

function encrypt(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ciphertext]).toString("base64url");
}

function decrypt(value: string): string {
  const raw = Buffer.from(value, "base64url");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export function youtubeAuthorizationUrl(state: string): string {
  const clientId = required("YOUTUBE_CLIENT_ID");
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("state", state);
  return url.toString();
}

export function youtubeRedirectUri(): string {
  return redirectUri();
}

export async function exchangeYoutubeCode(code: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: required("YOUTUBE_CLIENT_ID"),
      client_secret: required("YOUTUBE_CLIENT_SECRET"),
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(`YouTube OAuth token exchange failed: ${data.error_description || data.error || response.status}`);
  }
  return data as { access_token: string; refresh_token?: string; expires_in: number; scope: string; token_type: string };
}

export async function fetchYoutubeChannel(accessToken: string) {
  const response = await fetch("https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await response.json();
  if (!response.ok) {
    throw new Error(`YouTube channel lookup failed: ${data.error?.message || response.status}`);
  }
  if (!data.items?.[0]) {
    throw new Error(
      "Google authorization succeeded, but this account has no YouTube channel available to Meliza. Create a YouTube channel for the authorized Google account, then reconnect YouTube."
    );
  }
  const item = data.items[0];
  return { id: item.id as string, title: item.snippet?.title as string, url: `https://www.youtube.com/channel/${item.id}` };
}

export async function saveYoutubeCredentials(input: {
  refreshToken: string;
  channelId: string;
  channelTitle: string;
  channelUrl: string;
}) {
  const payload = {
    version: 1,
    provider: "youtube",
    scope: SCOPES,
    refreshToken: encrypt(input.refreshToken),
    channelId: input.channelId,
    channelTitle: input.channelTitle,
    channelUrl: input.channelUrl,
    connectedAt: new Date().toISOString(),
  };
  await put(TOKEN_PATH, JSON.stringify(payload), { access: "private", allowOverwrite: true });
}

export async function loadYoutubeCredentials() {
  try {
    const result = await get(TOKEN_PATH, { access: "private", useCache: false });
    if (!result) return null;
    const text = await new Response(result.stream).text();
    const payload = JSON.parse(text) as { refreshToken: string; channelId: string; channelTitle: string; channelUrl: string; connectedAt: string };
    return { ...payload, refreshToken: decrypt(payload.refreshToken) };
  } catch {
    return null;
  }
}

export async function refreshYoutubeAccessToken(refreshToken: string) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: required("YOUTUBE_CLIENT_ID"),
      client_secret: required("YOUTUBE_CLIENT_SECRET"),
      grant_type: "refresh_token",
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) {
    throw new Error(`YouTube token refresh failed: ${data.error_description || data.error || response.status}`);
  }
  return data as { access_token: string; expires_in: number; scope?: string; token_type: string };
}
