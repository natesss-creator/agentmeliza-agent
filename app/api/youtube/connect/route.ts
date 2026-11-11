import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { youtubeAuthorizationUrl } from "../../../../lib/youtube-oauth";

export const runtime = "nodejs";

export async function GET() {
  const state = randomBytes(32).toString("base64url");
  const cookieStore = await cookies();
  cookieStore.set("meliza_youtube_oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV !== "development",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(youtubeAuthorizationUrl(state));
}
