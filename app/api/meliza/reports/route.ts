import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  getUserPostingReportSubscription,
  removeUserPostingReportSubscription,
  setUserPostingReportSubscription,
} from "@/lib/user-posting-reports";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COMPOSIO_API_BASE = "https://backend.composio.dev/api/v3.1";

async function getSession(request: Request) {
  return auth.api.getSession({ headers: request.headers });
}

async function hasConnectedGmail(userId: string): Promise<boolean> {
  const key = process.env.COMPOSIO_API_KEY;
  if (!key) return false;

  const url = new URL(`${COMPOSIO_API_BASE}/connected-accounts`);
  url.searchParams.append("user_ids[]", userId);
  const response = await fetch(url, {
    headers: { "x-api-key": key, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`Could not check the Gmail connection (Composio HTTP ${response.status}).`);

  const body: unknown = await response.json();
  if (!body || typeof body !== "object") throw new Error("Composio returned an invalid connections response.");
  const data = body as { items?: unknown; accounts?: unknown };
  const accounts = Array.isArray(data.items)
    ? data.items
    : Array.isArray(data.accounts)
      ? data.accounts
      : [];
  return accounts.some((account) => {
    if (!account || typeof account !== "object") return false;
    const value = account as {
      toolkit_slug?: unknown;
      toolkit?: { slug?: unknown; name?: unknown };
    };
    const toolkit = [
      value.toolkit_slug,
      value.toolkit?.slug,
      value.toolkit?.name,
    ].find((candidate): candidate is string => typeof candidate === "string");
    return toolkit?.toLowerCase().includes("gmail") ?? false;
  });
}

export async function GET(request: Request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const [subscription, gmailConnected] = await Promise.all([
      getUserPostingReportSubscription(session.user.id),
      hasConnectedGmail(session.user.id),
    ]);
    return NextResponse.json({
      enabled: Boolean(subscription),
      email: session.user.email,
      emailVerified: session.user.emailVerified,
      gmailConfigured: Boolean(process.env.COMPOSIO_API_KEY && process.env.COMPOSIO_AUTH_CONFIG_GMAIL),
      gmailConnected,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not load daily report settings." },
      { status: 503 },
    );
  }
}

export async function PUT(request: Request) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { enabled?: unknown };
  try {
    body = (await request.json()) as { enabled?: unknown };
  } catch {
    return NextResponse.json({ error: "Send a valid JSON request." }, { status: 400 });
  }
  if (typeof body.enabled !== "boolean") {
    return NextResponse.json({ error: "Choose whether to enable daily reports." }, { status: 400 });
  }

  if (!body.enabled) {
    try {
      await removeUserPostingReportSubscription(session.user.id);
      return NextResponse.json({ enabled: false });
    } catch {
      return NextResponse.json({ error: "Could not turn off daily reports." }, { status: 503 });
    }
  }

  if (!session.user.emailVerified) {
    return NextResponse.json({ error: "Verify your sign-in email before enabling reports." }, { status: 403 });
  }
  if (!process.env.COMPOSIO_API_KEY || !process.env.COMPOSIO_AUTH_CONFIG_GMAIL) {
    return NextResponse.json({ error: "Gmail report delivery is not configured for this deployment." }, { status: 503 });
  }

  try {
    if (!(await hasConnectedGmail(session.user.id))) {
      return NextResponse.json({ error: "Connect Gmail in Social accounts before enabling email reports." }, { status: 409 });
    }
    await setUserPostingReportSubscription({
      userId: session.user.id,
      email: session.user.email,
      enabled: true,
    });
    return NextResponse.json({ enabled: true });
  } catch {
    return NextResponse.json({ error: "Could not enable daily reports." }, { status: 503 });
  }
}
