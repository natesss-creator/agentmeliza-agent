import { detectPropertyType, fetchProperty, toListing } from "@/lib/agentiz/wordpress";
import { renderPoster } from "@/lib/uhiko/poster";
import { toPosterData } from "@/lib/uhiko/poster-data";

export const runtime = "nodejs";

/**
 * Social posters for Uhiko listings, 1080x1350 JPEG.
 *
 *   /api/posters/uh-18384-a.jpg   editorial layout
 *   /api/posters/uh-18384-b.jpg   bold layout
 *   /api/posters/uh-18384-c.jpg   signature cover layout
 *   /api/posters/uh-18384-d.jpg   cream framed card layout
 *
 * Path-only URLs (no query string) because Instagram's media fetcher
 * rejects image URLs with query parameters.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ file: string }> }) {
  const { file } = await params;
  const m = file.match(/^uh-(\d+)-(a|b|c|d)\.(jpe?g|b64)$/i);
  if (!m) return new Response("Not found", { status: 404 });

  const postType = await detectPropertyType();
  const post = await fetchProperty(postType, Number(m[1]));
  if (!post) return new Response("Listing not found or not published", { status: 404 });
  const p = toPosterData(toListing(post));

  const layout = m[2].toLowerCase() as "a" | "b" | "c" | "d";
  let jpeg: Buffer;
  try {
    jpeg = await renderPoster(p, layout);
  } catch (err) {
    // New layouts (c, d) must never break a scheduled post: fall back to the proven editorial layout.
    if (layout === "a" || layout === "b") throw err;
    console.error("poster layout failed, falling back to a:", layout, err);
    jpeg = await renderPoster(p, "a");
  }

  // .b64 serves the same JPEG as base64 text, for previewing posters in tools that only handle text.
  if (m[3].toLowerCase() === "b64") {
    return new Response(jpeg.toString("base64"), { headers: { "Content-Type": "text/plain", "Cache-Control": "no-store" } });
  }

  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
    },
  });
}
