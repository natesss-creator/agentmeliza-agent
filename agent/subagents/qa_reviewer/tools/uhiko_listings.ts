import { defineTool } from "eve/tools";
import { z } from "zod";
import { validateListing } from "@/lib/agentiz/feed";
import { detectPropertyType, fetchAllProperties, toListing } from "@/lib/agentiz/wordpress";
import { toPosterData } from "@/lib/uhiko/poster-data";

/**
 * Same verified-facts source as the root agent's `uhiko_listings` tool, used
 * here to fact-check a drafted Uhiko caption against the listing's live
 * price, location, size, and type before the root agent publishes it.
 */
export default defineTool({
  description:
    "List Uhiko Properties' current live listings (headline, KES price, location, size, type, link) to fact-check a drafted post's claims against what the listing actually says.",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(25).default(10).describe("How many listings to return, newest first."),
  }),
  async execute({ limit }) {
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
        };
      })
      .slice(0, limit);
    return { count: listings.length, listings };
  },
});
