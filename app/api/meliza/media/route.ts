import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { auth } from "@/lib/auth";
import { putPublicObject } from "@/lib/object-storage";
import { MAX_USER_MEDIA_BYTES, USER_MEDIA_TYPES, userMediaPrefix } from "@/lib/user-media";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME_EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "video/mp4": "mp4",
};

async function getUserId(request: Request): Promise<string | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (session?.user.id) return session.user.id;
  return process.env.NODE_ENV === "development" ? "meliza-development-user" : null;
}

export async function POST(request: Request) {
  const userId = await getUserId(request);
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Send a valid multipart file upload." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Choose an image or MP4 video to upload." }, { status: 400 });
  }
  if (!USER_MEDIA_TYPES.includes(file.type as (typeof USER_MEDIA_TYPES)[number])) {
    return NextResponse.json(
      { error: "Supported files are JPEG, PNG, WebP, or MP4." },
      { status: 415 },
    );
  }
  if (file.size === 0 || file.size > MAX_USER_MEDIA_BYTES) {
    return NextResponse.json({ error: "Media files must be between 1 byte and 4 MB." }, { status: 413 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  let contentType: string;
  let extension: string;

  if (file.type.startsWith("image/")) {
    let format: string | undefined;
    try {
      format = (await sharp(bytes, { limitInputPixels: 40_000_000 }).metadata()).format;
    } catch {
      return NextResponse.json({ error: "The uploaded file is not a valid supported image." }, { status: 400 });
    }
    const detectedType = format === "jpeg" ? "image/jpeg" : format ? `image/${format}` : "";
    if (!MIME_EXTENSION[detectedType] || detectedType !== file.type) {
      return NextResponse.json({ error: "Image contents do not match the selected file type." }, { status: 400 });
    }
    contentType = detectedType;
    extension = MIME_EXTENSION[detectedType];
  } else {
    if (bytes.length < 12 || bytes.toString("ascii", 4, 8) !== "ftyp") {
      return NextResponse.json({ error: "The uploaded file is not a valid MP4 video." }, { status: 400 });
    }
    contentType = "video/mp4";
    extension = "mp4";
  }

  try {
    const blob = await putPublicObject(
      `${userMediaPrefix(userId)}/${randomUUID()}.${extension}`,
      bytes,
      { contentType },
    );
    return NextResponse.json({
      media: {
        url: blob.url,
        contentType,
        name: file.name.slice(0, 200),
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Media storage is unavailable. Try again later." },
      { status: 503 },
    );
  }
}
