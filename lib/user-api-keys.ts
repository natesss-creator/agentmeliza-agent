import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const PREFIX = "meliza:user-gemini-key:";

function redis(): { url: string; token: string } {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("API key storage requires Upstash Redis configuration.");
  if (new URL(url).protocol !== "https:") throw new Error("Upstash Redis must use HTTPS.");
  return { url: url.replace(/\/+$/, ""), token };
}

async function command<T>(args: string[]): Promise<T> {
  const { url, token } = redis();
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Upstash request failed (HTTP ${response.status}).`);
  return ((await response.json()) as { result: T }).result;
}

function encryptionKey(): Buffer {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is required to encrypt API keys.");
  return createHash("sha256").update(`meliza-user-api-keys:${secret}`).digest();
}

function storageKey(userId: string): string {
  return PREFIX + createHash("sha256").update(userId).digest("hex");
}

function encrypt(value: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString("base64")).join(".");
}

function decrypt(payload: string): string | null {
  try {
    const [iv, tag, data] = payload.split(".").map((part) => Buffer.from(part, "base64"));
    const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}

export async function getUserGeminiKey(userId: string): Promise<string | null> {
  const stored = await command<string | null>(["GET", storageKey(userId)]);
  return stored ? decrypt(stored) : null;
}

export async function setUserGeminiKey(userId: string, key: string): Promise<void> {
  await command(["SET", storageKey(userId), encrypt(key)]);
}

export async function removeUserGeminiKey(userId: string): Promise<void> {
  await command(["DEL", storageKey(userId)]);
}

export function maskKey(key: string): string {
  return `••••${key.slice(-4)}`;
}
