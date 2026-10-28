import { NextResponse } from "next/server";
import { detectPropertyType } from "@/lib/agentiz/wordpress";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TITLE = "¼ Acre Dairy Unit in Nyathuna, Wangige – KES 12M";
const CONTENT = `
<p><strong>¼ acre dairy unit in Nyathuna, Wangige, Kiambu County.</strong></p>
<p><strong>Asking price: KES 12,000,000.</strong></p>
<p>Available information is limited. Buyers should independently verify acreage, tenure, utilities, access, dairy-unit improvements, and all other particulars with the seller before purchase.</p>
<p><strong>Location:</strong> Nyathuna, Wangige, Kiambu County.</p>
<p>Contact Uhiko Properties for viewing and further details.</p>
`;

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
  if (!res.ok) {
    throw new Error(`WordPress ${path} returned HTTP ${res.status}: ${typeof body === "string" ? body.slice(0, 300) : body?.message || "request failed"}`);
  }
  return body;
}

async function deleteWp(base: string, headers: Record<string, string>, path: string) {
  try { await wpJson(base, headers, path, { method: "DELETE" }); } catch {}
}

export async function POST(request: Request) {
  const trigger = process.env.UHIKO_NYATHUNA_TRIGGER;
  if (!trigger || request.headers.get("x-meliza-publish-trigger") !== trigger) {
    return jsonError("Unauthorized publication request", 401);
  }

  let postType = "";
  let postId: number | null = null;
  try {
    const { base, headers } = wpConfig();
    postType = await detectPropertyType();

    const duplicates = await wpJson(
      base,
      headers,
      `/wp/v2/${postType}?search=${encodeURIComponent(TITLE)}&per_page=100&context=edit`,
    );
    const exact = Array.isArray(duplicates) && duplicates.find(
      (p: any) => String(p?.title?.rendered || "").trim().toLowerCase() === TITLE.toLowerCase(),
    );
    if (exact) {
      return NextResponse.json(
        { status: "duplicate", postType, id: exact.id, link: exact.link, title: TITLE, message: "Exact title already exists; no write performed." },
        { status: 409 },
      );
    }

    const published = await wpJson(base, headers, `/wp/v2/${postType}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: TITLE, content: CONTENT, status: "publish" }),
    });
    postId = Number(published.id);

    const publicLink = String(published.link || "");
    if (!publicLink) throw new Error("WordPress published the post but returned no public link");

    const publicRes = await fetch(publicLink, { cache: "no-store", redirect: "follow" });
    const publicHtml = await publicRes.text();
    const verified = publicRes.ok && publicHtml.toLowerCase().includes("nyathuna") && publicHtml.toLowerCase().includes("12,000,000");
    if (!verified) throw new Error(`Public verification failed (HTTP ${publicRes.status})`);

    return NextResponse.json({
      status: "published",
      verified: true,
      postType,
      id: postId,
      title: TITLE,
      price: "KES 12,000,000",
      location: "Nyathuna, Wangige, Kiambu County",
      link: publicLink,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    try {
      const { base, headers } = wpConfig();
      if (postId && postType) await deleteWp(base, headers, `/wp/v2/${postType}/${postId}?force=true`);
    } catch {}
    return jsonError(message, 502);
  }
}
