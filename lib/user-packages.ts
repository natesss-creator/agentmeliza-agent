import { createHash } from "node:crypto";
import { recordUserPostingEvent } from "@/lib/user-posting-reports";

export const STARTER_PACKAGE = {
  id: "starter",
  name: "Starter",
  price: "$20 USD/month",
  postsPerDay: 20,
} as const;

export type UserPackageAssignment = {
  userId: string;
  packageId: typeof STARTER_PACKAGE.id;
  assignedAt: string;
  assignedBy: string;
};

const ASSIGNMENT_PREFIX = "meliza:package-assignment:";
const DAILY_POST_PREFIX = "meliza:daily-posts:";
const POST_RESERVATION_SCRIPT = [
  "local count = tonumber(redis.call('GET', KEYS[1]) or '0')",
  "local limit = tonumber(ARGV[1])",
  "local units = tonumber(ARGV[2])",
  "if count + units > limit then return 0 end",
  "local next = redis.call('INCRBY', KEYS[1], units)",
  "if count == 0 then redis.call('EXPIRE', KEYS[1], tonumber(ARGV[3])) end",
  "return next",
].join("\n");

function redisConfig(): { url: string; token: string } {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error("Package and usage controls require Upstash Redis configuration.");
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== "https:") throw new Error("Upstash Redis must use HTTPS.");
  return { url: url.replace(/\/+$/, ""), token };
}

async function redisCommand<T>(command: (string | number)[]): Promise<T> {
  const { url, token } = redisConfig();
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Upstash request failed (HTTP ${response.status}).`);

  const body: unknown = await response.json();
  if (!body || typeof body !== "object" || !("result" in body)) {
    throw new Error("Upstash returned an invalid response.");
  }
  return (body as { result: T }).result;
}

function assignmentKey(userId: string): string {
  const userKey = createHash("sha256").update(userId).digest("hex");
  return `${ASSIGNMENT_PREFIX}${userKey}`;
}

function isAssignment(value: unknown, userId: string): value is UserPackageAssignment {
  return Boolean(
    value &&
      typeof value === "object" &&
      "userId" in value &&
      value.userId === userId &&
      "packageId" in value &&
      value.packageId === STARTER_PACKAGE.id &&
      "assignedAt" in value &&
      typeof value.assignedAt === "string" &&
      "assignedBy" in value &&
      typeof value.assignedBy === "string",
  );
}

export async function getUserPackageAssignment(userId: string): Promise<UserPackageAssignment | null> {
  const value = await redisCommand<string | null>(["GET", assignmentKey(userId)]);
  if (value === null) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("Stored package assignment is invalid JSON.");
  }
  if (!isAssignment(parsed, userId)) throw new Error("Stored package assignment is invalid.");
  return parsed;
}

export async function assignStarterPackage(
  userId: string,
  assignedBy: string,
): Promise<UserPackageAssignment> {
  const assignment: UserPackageAssignment = {
    userId,
    packageId: STARTER_PACKAGE.id,
    assignedAt: new Date().toISOString(),
    assignedBy,
  };
  await redisCommand(["SET", assignmentKey(userId), JSON.stringify(assignment)]);
  return assignment;
}

export async function removeUserPackageAssignment(userId: string): Promise<void> {
  await redisCommand(["DEL", assignmentKey(userId)]);
}

export async function reserveStarterPost(
  userId: string,
  units = 1,
  postingDate = new Date(),
): Promise<number> {
  if (!Number.isInteger(units) || units < 1 || units > STARTER_PACKAGE.postsPerDay) {
    throw new Error("Invalid post quota reservation.");
  }
  if (Number.isNaN(postingDate.getTime())) throw new Error("Invalid scheduled posting date.");
  const now = new Date();
  const day = postingDate.toISOString().slice(0, 10);
  const dayStart = Date.parse(`${day}T00:00:00.000Z`);
  const todayStart = Date.parse(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
  const maximumScheduleTime = todayStart + 366 * 24 * 60 * 60 * 1000;
  if (dayStart < todayStart || dayStart > maximumScheduleTime) {
    throw new Error("Scheduled posts must be dated today or within the next year.");
  }
  const expiresAt = Math.max(
    now.getTime() + 172_800_000,
    dayStart + 2 * 24 * 60 * 60 * 1000,
  );
  const ttlSeconds = Math.ceil((expiresAt - now.getTime()) / 1000);
  const result = await redisCommand<number>([
    "EVAL",
    POST_RESERVATION_SCRIPT,
    "1",
    `${DAILY_POST_PREFIX}${createHash("sha256").update(userId).digest("hex")}:${day}`,
    STARTER_PACKAGE.postsPerDay,
    units,
    ttlSeconds,
  ]);
  if (!Number.isInteger(result) || result < 0) throw new Error("Upstash returned an invalid post quota result.");
  return result;
}

export async function recordPackagePostAttempt(userId: string, action: string): Promise<void> {
  await recordUserPostingEvent(userId, {
    timestamp: new Date().toISOString(),
    action,
    status: "requested",
  });
}

export function isMelizaSeller(email: string | undefined): boolean {
  if (!email) return false;
  const configured = process.env.MELIZA_SELLER_EMAILS || process.env.OWNER_NOTIFY_EMAIL || "";
  const sellers = configured.split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  return sellers.includes(email.toLowerCase());
}
