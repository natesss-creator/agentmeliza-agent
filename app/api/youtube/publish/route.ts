import { NextResponse } from "next/server";
import { loadYoutubeCredentials, refreshYoutubeAccessToken } from "../../../../lib/youtube-oauth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const credentials = await loadYoutubeCredentials();
  if (!credentials) return NextResponse.json({ status: "not_authorized", reason: "YouTube channel is not connected to Meliza." }, { status: 401 });

  const body = await request.json() as {
    videoUrl?: string;
    title?: string;
    description?: string;
    tags?: string[];
    privacyStatus?: "private" | "unlisted" | "public";
    categoryId?: string;
    madeForKids?: boolean;
    containsSyntheticMedia?: boolean;
  };

  if (!body.videoUrl || !body.title || !body.description) {
    return NextResponse.json({ status: "failed", reason: "videoUrl, title and description are required." }, { status: 400 });
  }

  const source = await fetch(body.videoUrl);
  if (!source.ok || !source.body) {
    return NextResponse.json({ status: "failed", reason: `Could not fetch source video: ${source.status}` }, { status: 400 });
  }

  const contentType = source.headers.get("content-type") || "video/mp4";
  if (!contentType.startsWith("video/")) {
    return NextResponse.json({ status: "failed", reason: `Source URL is not a video (${contentType}).` }, { status: 400 });
  }

  const length = source.headers.get("content-length");
  if (!length) {
    return NextResponse.json({ status: "failed", reason: "Source video must provide a Content-Length header for resumable YouTube upload." }, { status: 400 });
  }

  try {
    const token = await refreshYoutubeAccessToken(credentials.refreshToken);
    const metadata = {
      snippet: {
        title: body.title,
        description: body.description,
        tags: body.tags?.slice(0, 500),
        categoryId: body.categoryId || "22",
      },
      status: {
        privacyStatus: body.privacyStatus || "public",
        selfDeclaredMadeForKids: Boolean(body.madeForKids),
        ...(body.containsSyntheticMedia !== undefined ? { containsSyntheticMedia: body.containsSyntheticMedia } : {}),
      },
    };

    const init = await fetch("https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": contentType,
        "X-Upload-Content-Length": length,
      },
      body: JSON.stringify(metadata),
    });

    const uploadUrl = init.headers.get("location");
    if (!init.ok || !uploadUrl) {
      const detail = await init.text();
      return NextResponse.json({ status: "failed", reason: `YouTube upload initialization failed: ${detail || init.status}` }, { status: 502 });
    }

    const upload = await fetch(uploadUrl, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
        "Content-Type": contentType,
        "Content-Length": length,
      },
      body: source.body,
      // Node.js fetch requires this flag when streaming a request body.
      duplex: "half",
    } as RequestInit & { duplex: "half" });

    const result = await upload.json().catch(() => ({}));
    if (!upload.ok || !result.id) {
      return NextResponse.json({ status: "failed", reason: `YouTube upload failed: ${result.error?.message || upload.status}` }, { status: 502 });
    }

    const videoId = result.id as string;
    const verify = await fetch(`https://www.googleapis.com/youtube/v3/videos?part=id,status&id=${encodeURIComponent(videoId)}`, {
      headers: { Authorization: `Bearer ${token.access_token}` },
    });
    const verification = await verify.json();
    const item = verification.items?.[0];
    if (!verify.ok || !item?.id) {
      return NextResponse.json({ status: "attempted", videoId, reason: "Upload returned an ID but independent verification failed." }, { status: 502 });
    }

    return NextResponse.json({
      status: "published",
      videoId,
      liveUrl: `https://www.youtube.com/watch?v=${videoId}`,
      privacyStatus: item.status?.privacyStatus,
      uploadStatus: item.status?.uploadStatus,
      channelId: credentials.channelId,
      channelTitle: credentials.channelTitle,
    });
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "Unknown YouTube publishing error";
    return NextResponse.json({ status: "failed", reason: message }, { status: 500 });
  }
}
