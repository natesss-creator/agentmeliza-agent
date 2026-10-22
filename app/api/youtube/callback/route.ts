import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { exchangeYoutubeCode, fetchYoutubeChannel, saveYoutubeCredentials } from "../../../../lib/youtube-oauth";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("meliza_youtube_oauth_state")?.value;
  cookieStore.delete("meliza_youtube_oauth_state");

  if (error) return new NextResponse(`YouTube authorization was cancelled: ${error}`, { status: 400 });
  if (!code || !state || !expectedState || state !== expectedState) {
    return new NextResponse("Invalid YouTube OAuth state. Please restart the connection from Meliza.", { status: 400 });
  }

  try {
    const tokens = await exchangeYoutubeCode(code);
    if (!tokens.refresh_token) {
      return new NextResponse("Google did not return a refresh token. Restart the connection and approve access again.", { status: 400 });
    }
    const channel = await fetchYoutubeChannel(tokens.access_token);
    await saveYoutubeCredentials({
      refreshToken: tokens.refresh_token,
      channelId: channel.id,
      channelTitle: channel.title,
      channelUrl: channel.url,
    });

    return NextResponse.redirect(new URL("/?youtube=connected", url.origin));
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Unknown OAuth error";
    return new NextResponse(`YouTube connection failed: ${message}`, { status: 500 });
  }
}
