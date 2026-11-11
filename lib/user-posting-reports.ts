import { createHash, randomUUID } from "node:crypto";
import { deleteObject, getObject, listObjectKeys, putObject } from "@/lib/object-storage";

const SUBSCRIPTIONS_PREFIX = "user-posting-report-subscriptions";
const EVENTS_PREFIX = "user-posting-events";

export type UserPostingReportSubscription = {
  userId: string;
  email: string;
  enabled: true;
};

export type UserPostingEvent = {
  timestamp: string;
  action: string;
  status: string;
  permalink?: string;
  scheduledFor?: string;
};

function userKey(userId: string): string {
  return createHash("sha256").update(userId).digest("hex").slice(0, 32);
}

export function reportSubscriptionPath(userId: string): string {
  return `${SUBSCRIPTIONS_PREFIX}/${userKey(userId)}.json`;
}

export async function getUserPostingReportSubscription(
  userId: string,
): Promise<UserPostingReportSubscription | null> {
  const path = reportSubscriptionPath(userId);
  const result = await getObject(path);
  if (!result) return null;
  const value: unknown = JSON.parse(result.toString("utf8"));
  if (
    !value ||
    typeof value !== "object" ||
    !("userId" in value) ||
    value.userId !== userId ||
    !("email" in value) ||
    typeof value.email !== "string" ||
    !("enabled" in value) ||
    value.enabled !== true
  ) {
    throw new Error("Stored daily report subscription is invalid.");
  }
  return value as UserPostingReportSubscription;
}

export async function setUserPostingReportSubscription(
  subscription: UserPostingReportSubscription,
): Promise<void> {
  await putObject(
    reportSubscriptionPath(subscription.userId),
    JSON.stringify(subscription),
    { contentType: "application/json" },
  );
}

export async function removeUserPostingReportSubscription(userId: string): Promise<void> {
  await deleteObject(reportSubscriptionPath(userId));
}

export async function recordUserPostingEvent(
  userId: string,
  event: UserPostingEvent,
): Promise<void> {
  const day = event.timestamp.slice(0, 10);
  await putObject(
    `${EVENTS_PREFIX}/${userKey(userId)}/${day}/${randomUUID()}.json`,
    JSON.stringify(event),
    { contentType: "application/json" },
  );
}

export async function listUserPostingEventsForToday(
  userId: string,
  now = new Date(),
): Promise<UserPostingEvent[]> {
  const day = now.toISOString().slice(0, 10);
  const prefix = `${EVENTS_PREFIX}/${userKey(userId)}/${day}/`;
  const events: UserPostingEvent[] = [];
  let cursor: string | undefined;

  do {
    const page = await listObjectKeys(prefix, cursor);
    for (const key of page.keys) {
      const result = await getObject(key);
      if (!result) continue;
      const value: unknown = JSON.parse(result.toString("utf8"));
      if (isUserPostingEvent(value)) events.push(value);
    }
    cursor = page.nextCursor;
  } while (cursor);

  return events.sort((left, right) => left.timestamp.localeCompare(right.timestamp));
}

export async function listUserPostingReportSubscriptions(): Promise<UserPostingReportSubscription[]> {
  const subscriptions: UserPostingReportSubscription[] = [];
  let cursor: string | undefined;

  do {
    const page = await listObjectKeys(`${SUBSCRIPTIONS_PREFIX}/`, cursor);
    for (const key of page.keys) {
      const result = await getObject(key);
      if (!result) continue;
      const value: unknown = JSON.parse(result.toString("utf8"));
      if (isSubscription(value)) subscriptions.push(value);
    }
    cursor = page.nextCursor;
  } while (cursor);

  return subscriptions;
}

function isSubscription(value: unknown): value is UserPostingReportSubscription {
  return Boolean(
    value &&
      typeof value === "object" &&
      "userId" in value &&
      typeof value.userId === "string" &&
      "email" in value &&
      typeof value.email === "string" &&
      "enabled" in value &&
      value.enabled === true,
  );
}

function isUserPostingEvent(value: unknown): value is UserPostingEvent {
  return Boolean(
    value &&
      typeof value === "object" &&
      "timestamp" in value &&
      typeof value.timestamp === "string" &&
      "action" in value &&
      typeof value.action === "string" &&
      "status" in value &&
      typeof value.status === "string",
  );
}
