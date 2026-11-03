import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const COMPOSIO_API_BASE = "https://backend.composio.dev/api/v3.1";
const PLATFORM_CONFIGS = {
  facebook: { label: "Facebook", env: "COMPOSIO_AUTH_CONFIG_FACEBOOK" },
  instagram: { label: "Instagram", env: "COMPOSIO_AUTH_CONFIG_INSTAGRAM" },
  youtube: { label: "YouTube", env: "COMPOSIO_AUTH_CONFIG_YOUTUBE" },
  tiktok: { label: "TikTok", env: "COMPOSIO_AUTH_CONFIG_TIKTOK" },
} as const;

type Platform = keyof typeof PLATFORM_CONFIGS;

async function getUserId(request: Request): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id ?? null;
}

function configuredPlatforms() {
  return Object.entries(PLATFORM_CONFIGS)
    .filter(([, config]) => Boolean(process.env[config.env]))
    .map(([id, config]) => ({ id, label: config.label }));
}

function isPlatform(value: unknown): value is Platform {
  return typeof value === "string" && value in PLATFORM_CONFIGS;
}

function getAccounts(body: unknown): unknown[] {
  if (!body || typeof body !== "object") return [];
  const data = body as { items?: unknown; accounts?: unknown };
  if (Array.isArray(data.items)) return data.items;
  if (Array.isArray(data.accounts)) return data.accounts;
  return [];
}

function normalizeAccount(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const account = value as {
    id?: unknown;
    status?: unknown;
    toolkit_slug?: unknown;
    toolkit?: { slug?: unknown; name?: unknown };
  };
  const id = typeof account.id === "string" ? account.id : null;
  const toolkit =
    typeof account.toolkit_slug === "string"
      ? account.toolkit_slug
      : typeof account.toolkit?.slug === "string"
        ? account.toolkit.slug
        : typeof account.toolkit?.name === "string"
          ? account.toolkit.name
          : "Social account";
  const status = typeof account.status === "string" ? account.status : "unknown";
  return id ? { id, toolkit, status } : null;
}

function apiKey() {
  return process.env.COMPOSIO_API_KEY;
}

export async function GET(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = apiKey();
  if (!key) {
    return NextResponse.json(
      { error: "Social account connections are not configured on this deployment." },
      { status: 503 },
    );
  }

  try {
    const url = new URL(`${COMPOSIO_API_BASE}/connected-accounts`);
    url.searchParams.append("user_ids[]", userId);
    const response = await fetch(url, {
      headers: { "x-api-key": key, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: `Could not load connected accounts (Composio HTTP ${response.status}).` },
        { status: 502 },
      );
    }

    const accounts = getAccounts(await response.json())
      .map(normalizeAccount)
      .filter((account): account is NonNullable<typeof account> => account !== null);
    return NextResponse.json({ platforms: configuredPlatforms(), accounts });
  } catch {
    return NextResponse.json({ error: "Could not reach the social connection service." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const key = apiKey();
  if (!key) {
    return NextResponse.json(
      { error: "Social account connections are not configured on this deployment." },
      { status: 503 },
    );
  }

  let platform: unknown;
  try {
    ({ platform } = (await request.json()) as { platform?: unknown });
  } catch {
    return NextResponse.json({ error: "Send a valid JSON request." }, { status: 400 });
  }
  if (!isPlatform(platform)) {
    return NextResponse.json({ error: "Choose a supported social platform." }, { status: 400 });
  }

  const config = PLATFORM_CONFIGS[platform];
  const authConfigId = process.env[config.env];
  if (!authConfigId) {
    return NextResponse.json(
      { error: `${config.label} connections are not enabled for this deployment yet.` },
      { status: 400 },
    );
  }

  try {
    const response = await fetch(`${COMPOSIO_API_BASE}/connected-accounts/link`, {
      method: "POST",
      headers: { "x-api-key": key, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ user_id: userId, auth_config_id: authConfigId }),
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) {
      return NextResponse.json(
        { error: `Could not start ${config.label} authorization (Composio HTTP ${response.status}).` },
        { status: 502 },
      );
    }

    const body = (await response.json()) as { redirect_url?: unknown; redirectUrl?: unknown };
    const redirectUrl = body.redirect_url ?? body.redirectUrl;
    if (typeof redirectUrl !== "string") {
      return NextResponse.json({ error: "The connection service did not return an authorization link." }, { status: 502 });
    }

    let parsedRedirect: URL;
    try {
      parsedRedirect = new URL(redirectUrl);
    } catch {
      return NextResponse.json({ error: "The connection service returned an invalid authorization link." }, { status: 502 });
    }
    if (parsedRedirect.protocol !== "https:") {
      return NextResponse.json({ error: "The connection service returned an unsafe authorization link." }, { status: 502 });
    }

    return NextResponse.json({ redirectUrl: parsedRedirect.toString() });
  } catch {
    return NextResponse.json({ error: "Could not reach the social connection service." }, { status: 502 });
  }
}
