import { defineTool } from "eve/tools";
import { z } from "zod";
import { validateListing } from "@/lib/agentiz/feed";
import { detectPropertyType, fetchAllProperties, toListing } from "@/lib/agentiz/wordpress";
import { toPosterData } from "@/lib/uhiko/poster-data";

const BASE = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || "agentmeliza.vercel.app"}`;

/**
 * Same verified-facts source as the root agent's `uhiko_listings` tool.
 * Includes the poster image URLs (the real listing photo composited onto a
 * poster layout) as the source frame for an eventual image-to-video call,
 * once video generation is actually connected.
 */
export default defineTool({
  description:
    "List Uhiko Properties' current live listings (headline, KES price, location, size, type, link, and two ready-made poster image URLs) to source a listing's real facts and photo for a video, and to fact-check the resulting caption.",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(25).default(10).describe("How many listings to return, newest first."),
    excludeIds: z.array(z.number().int()).default([]).describe("Listing ids already posted recently, to skip."),
  }),
  async execute({ limit, excludeIds }) {
    const postType = await detectPropertyType();
    const posts = await fetchAllProperties(postType);
    const listings = posts
      .map((post) => ({ post, listing: toListing(post) }))
      .filter(({ listing }) => {
        const issues = validateListing(listing);
        const hasBlockingIssue = issues.some((i) => i.field !== "images");
        return !hasBlockingIssue && (listing.images?.length ?? 0) > 0;
      })
      .map(({ listing }) => {
        const p = toPosterData(listing);
        return {
          id: p.id,
          headline: p.headline,
          price: p.priceText,
          location: p.location,
          size: p.sizeText ?? null,
          listingUrl: p.link,
          posterA: `${BASE}/api/posters/uh-${p.id}-a.jpg`,
          posterB: `${BASE}/api/posters/uh-${p.id}-b.jpg`,
          posterC: `${BASE}/api/posters/uh-${p.id}-c.jpg`,
          posterD: `${BASE}/api/posters/uh-${p.id}-d.jpg`,
        };
      })
      .filter((l) => !excludeIds.includes(l.id))
      .slice(0, limit);
    return { count: listings.length, listings };
  },
});
