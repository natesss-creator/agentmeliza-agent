import { NextResponse } from "next/server";
import { loadYoutubeCredentials } from "../../../../lib/youtube-oauth";

export const runtime = "nodejs";

export async function GET() {
  const credentials = await loadYoutubeCredentials();
  if (!credentials) return NextResponse.json({ connected: false });
  return NextResponse.json({
    connected: true,
    provider: "youtube",
    channelId: credentials.channelId,
    channelTitle: credentials.channelTitle,
    channelUrl: credentials.channelUrl,
    connectedAt: credentials.connectedAt,
    scope: "https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly",
  });
}
