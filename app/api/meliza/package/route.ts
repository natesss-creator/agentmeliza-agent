import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  assignStarterPackage,
  getUserPackageAssignment,
  isMelizaSeller,
  removeUserPackageAssignment,
  STARTER_PACKAGE,
} from "@/lib/user-packages";

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

export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const assignment = await getUserPackageAssignment(session.user.id);
    return NextResponse.json({
      userId: session.user.id,
      assignment,
      seller: session.user.emailVerified && isMelizaSeller(session.user.email),
      package: STARTER_PACKAGE,
    });
  } catch {
    return NextResponse.json({ error: "Could not load package settings; verify Upstash configuration." }, { status: 503 });
  }
}

export async function PUT(request: Request) {
  if (!hasSameOrigin(request)) {
    return NextResponse.json({ error: "Package changes must come from this site." }, { status: 403 });
  }
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.emailVerified || !isMelizaSeller(session.user.email)) {
    return NextResponse.json({ error: "Only a verified Meliza seller can assign packages." }, { status: 403 });
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return NextResponse.json({ error: "Send a valid JSON request." }, { status: 400 });
  }
  if (rawBody.length > 1024) return NextResponse.json({ error: "Request body is too large." }, { status: 413 });
  let body: { userId?: unknown; packageId?: unknown };
  try {
    body = JSON.parse(rawBody) as { userId?: unknown; packageId?: unknown };
  } catch {
    return NextResponse.json({ error: "Send a valid JSON request." }, { status: 400 });
  }
  if (
    typeof body.userId !== "string" ||
    body.userId.length < 1 ||
    body.userId.length > 128 ||
    !/^[a-zA-Z0-9_-]+$/.test(body.userId) ||
    (body.packageId !== STARTER_PACKAGE.id && body.packageId !== null)
  ) {
    return NextResponse.json({ error: "Provide a valid user ID and Starter assignment or null to remove it." }, { status: 400 });
  }

  try {
    if (body.packageId === null) {
      await removeUserPackageAssignment(body.userId);
      return NextResponse.json({ userId: body.userId, assignment: null });
    }
    const assignment = await assignStarterPackage(body.userId, session.user.id);
    return NextResponse.json({ userId: body.userId, assignment });
  } catch {
    return NextResponse.json({ error: "Could not save package assignment; verify Upstash configuration." }, { status: 503 });
  }
}
