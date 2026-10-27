import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Temporary, read-only HostAfrica connectivity probe. Remove after verification. */
export async function GET() {
  const token = process.env.HOSTAFRICA_API_TOKEN;
  if (!token) {
    return NextResponse.json({ ok: false, stage: "config", error: "HOSTAFRICA_API_TOKEN is not configured" }, { status: 500 });
  }

  try {
    const response = await fetch("https://api.hostafrica.com/vps/list-vps-services", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
      cache: "no-store",
    });

    const text = await response.text();
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 500) };
    }

    if (!response.ok) {
      return NextResponse.json({ ok: false, stage: "hostafrica", httpStatus: response.status, response: body }, { status: 502 });
    }

    const data = body as { status?: string; data?: { services?: unknown[] } };
    return NextResponse.json({
      ok: true,
      authenticated: true,
      hostafricaStatus: data?.status ?? null,
      serviceCount: Array.isArray(data?.data?.services) ? data.data.services.length : null,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, stage: "network", error: error instanceof Error ? error.message : "Unknown error" },
      { status: 502 },
    );
  }
}
