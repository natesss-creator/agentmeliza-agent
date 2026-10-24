import { defineTool } from "eve/tools";
import { z } from "zod";
import { validateListing } from "@/lib/agentiz/feed";
import { detectPropertyType, fetchAllProperties, toListing } from "@/lib/agentiz/wordpress";
import { toPosterData } from "@/lib/uhiko/poster-data";

/**
 * Same verified-facts source as the root agent's `uhiko_listings` tool, used
 * here to check whether a published post's price/facts still match the live
 * listing (a listing can be edited on uhiko.com after a post goes out).
 */
export default defineTool({
  description:
    "List Uhiko Properties' current live listings (headline, KES price, location, size, type, link) to check whether a previously published post's facts still match the live listing.",
  inputSchema: z.object({
    limit: z.number().int().min(1).max(25).default(10).describe("How many listings to return, newest first."),
  }),
  async execute({ limit }) {
    const postType = await detectPropertyType();
    const posts = await fetchAllProperties(postType);
    const listings = posts
      .map((post) => ({ post, listing: toListing(post) }))
      .filter(({ listing }) => validateListing(listing).every((i) => i.field === "images"))
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
