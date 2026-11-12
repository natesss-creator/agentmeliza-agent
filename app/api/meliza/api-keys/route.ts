import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getUserGeminiKey, maskKey, removeUserGeminiKey, setUserGeminiKey } from "@/lib/user-api-keys";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// The key is never returned in full; only a masked preview.
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const key = await getUserGeminiKey(session.user.id);
    return NextResponse.json({ configured: Boolean(key), preview: key ? maskKey(key) : null });
  } catch {
    return NextResponse.json({ error: "Could not load API key settings." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "Must come from this site." }, { status: 403 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await request.json().catch(() => null)) as { key?: unknown } | null;
  const key = typeof body?.key === "string" ? body.key.trim() : "";
  if (key.length < 20 || key.length > 200 || /\s/.test(key)) {
    return NextResponse.json({ error: "Enter a valid Gemini API key." }, { status: 400 });
  }
  try {
    await setUserGeminiKey(session.user.id, key);
    return NextResponse.json({ configured: true, preview: maskKey(key) });
  } catch {
    return NextResponse.json({ error: "Could not save the API key." }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  if (!hasSameOrigin(request)) return NextResponse.json({ error: "Must come from this site." }, { status: 403 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await removeUserGeminiKey(session.user.id);
    return NextResponse.json({ configured: false, preview: null });
  } catch {
    return NextResponse.json({ error: "Could not remove the API key." }, { status: 503 });
  }
}
