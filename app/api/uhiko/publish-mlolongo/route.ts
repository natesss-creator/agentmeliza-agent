import { NextResponse } from "next/server";
import { detectPropertyType } from "@/lib/agentiz/wordpress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TITLE = "7.5 Acres Touching Mombasa Road at Mlolongo Town";
const PRICE_LINE = "Selling At KES 70M Per Acre";
const DESCRIPTION = `${TITLE}. ${PRICE_LINE}.`;

function wpConfig() {
  const base = (process.env.UHIKO_WP_URL || "https://uhiko.com/wp").replace(/\/+$/, "");
  const user = process.env.UHIKO_WP_USER;
  const pass = process.env.UHIKO_WP_APP_PASSWORD;
  if (!user || !pass) throw new Error("WordPress publishing credentials are not configured");
  const authorization = `Basic ${Buffer.from(`${user}:${pass.replace(/\s+/g, "")}`).toString("base64")}`;
  return { base, headers: { Authorization: authorization, Accept: "application/json" } };
}

function jsonError(message: string, status = 500) {
  return NextResponse.json({ status: "failed", reason: message }, { status });
}

async function wpJson(base: string, headers: Record<string, string>, path: string, init?: RequestInit) {
  const res = await fetch(`${base}/wp-json${path}`, {
    ...init,
    headers: { ...headers, ...(init?.headers || {}) },
    cache: "no-store",
  });
  const text = await res.text();
  let body: any;
  try { body = JSON.parse(text); } catch { body = text; }
  if (!res.ok) throw new Error(`WordPress ${path} returned HTTP ${res.status}: ${typeof body === "string" ? body.slice(0, 300) : body?.message || "request failed"}`);
  return body;
}

async function deleteWp(base: string, headers: Record<string, string>, path: string) {
  try { await wpJson(base, headers, path, { method: "DELETE" }); } catch {}
}

export async function POST(request: Request) {
  const nonce = process.env.UHIKO_MLOLONGO_PUBLISH_NONCE;
  const trigger = process.env.UHIKO_MLOLONGO_TRIGGER;
  const suppliedNonce = request.headers.get("x-meliza-publish-nonce");
  const suppliedTrigger = request.headers.get("x-meliza-publish-trigger");
  const authorized = (nonce && suppliedNonce === nonce) || (trigger && suppliedTrigger === trigger);
  if (!authorized) return jsonError("Unauthorized publication request", 401);

  let postType = "";
  let postId: number | null = null;
  const mediaIds: number[] = [];
  try {
    const form = await request.formData();
    const files = form.getAll("images").filter((x): x is File => x instanceof File);
    if (files.length !== 5) return jsonError(`Exactly five JPEG images are required; received ${files.length}`, 400);
    if (files.some((f) => !f.type.startsWith("image/jpeg"))) return jsonError("All five supplied images must be JPEG files", 400);

    const { base, headers } = wpConfig();
    postType = await detectPropertyType();

    const duplicates = await wpJson(base, headers, `/wp/v2/${postType}?search=${encodeURIComponent(TITLE)}&per_page=100&context=edit`);
    const exact = Array.isArray(duplicates) && duplicates.find((p: any) => String(p?.title?.rendered || "").trim().toLowerCase() === TITLE.toLowerCase());
    if (exact) {
      return NextResponse.json({ status: "duplicate", postType, id: exact.id, link: exact.link, title: TITLE, message: "Exact title already exists; no write performed." }, { status: 409 });
    }

    const draft = await wpJson(base, headers, `/wp/v2/${postType}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: TITLE, content: `<p>${DESCRIPTION}</p>`, status: "draft" }),
    });
    postId = Number(draft.id);

    for (const file of files) {
      const bytes = await file.arrayBuffer();
      const media = await wpJson(base, headers, "/wp/v2/media", {
        method: "POST",
        headers: {
          "Content-Disposition": `attachment; filename="${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}"`,
          "Content-Type": "image/jpeg",
        },
        body: bytes,
      });
      mediaIds.push(Number(media.id));
      await wpJson(base, headers, `/wp/v2/media/${media.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post: postId }),
      });
    }

    const published = await wpJson(base, headers, `/wp/v2/${postType}/${postId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "publish", featured_media: mediaIds[0] }),
    });

    const publicLink = String(published.link || "");
    if (!publicLink) throw new Error("WordPress published the post but returned no public link");

    const publicRes = await fetch(publicLink, { cache: "no-store", redirect: "follow" });
    const publicHtml = await publicRes.text();
    const verified = publicRes.ok && publicHtml.toLowerCase().includes(TITLE.toLowerCase());
    if (!verified) throw new Error(`Public verification failed (HTTP ${publicRes.status})`);

    return NextResponse.json({
      status: "published",
      verified: true,
      postType,
      id: postId,
      title: TITLE,
      price: "KES 70,000,000 per acre",
      location: "Mlolongo Town, touching Mombasa Road",
      mediaIds,
      featuredMedia: mediaIds[0],
      link: publicLink,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      const { base, headers } = wpConfig();
      if (postId) await deleteWp(base, headers, `/wp/v2/${postType}/${postId}?force=true`);
      for (const id of mediaIds) await deleteWp(base, headers, `/wp/v2/media/${id}?force=true`);
    } catch {}
    return jsonError(message, 502);
  }
}
