import { defineTool } from "eve/tools";
import { z } from "zod";
import { validateListing } from "@/lib/agentiz/feed";
import { detectPropertyType, fetchAllProperties, toListing } from "@/lib/agentiz/wordpress";
import { toPosterData } from "@/lib/uhiko/poster-data";

const BASE = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || "agentmeliza.vercel.app"}`;

/**
 * Same verified-facts source as the root agent's `uhiko_listings` tool, so
 * this subagent's copy is always grounded in real listing data rather than
 * invented details. Read-only: this subagent never publishes.
 */
export default defineTool({
  description:
    "List Uhiko Properties' published listings from uhiko.com for copywriting. Each listing includes verified facts only (headline, KES price, location, size, type, listing link, description excerpt) and the two poster image URLs already generated for it (posterA, posterB), so copy can reference which visual goes with which angle. Only listings with a verified total price are returned.",
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
      .map(({ post, listing }) => {
        const p = toPosterData(listing);
        return {
          id: p.id,
          headline: p.headline,
          price: p.priceText,
          deal: p.dealLabel,
          type: p.typeLabel,
          location: p.location,
          size: p.sizeText ?? null,
          listingUrl: p.link,
          descriptionExcerpt: (listing.text.en || "").slice(0, 600),
          posterA: `${BASE}/api/posters/uh-${p.id}-a.jpg`,
          posterB: `${BASE}/api/posters/uh-${p.id}-b.jpg`,
          updated: post.modified_gmt,
        };
      })
      .slice(0, limit);
    return {
      count: listings.length,
      contact: {
        company: "Uhiko Properties",
        name: [process.env.UHIKO_CONTACT_FIRST_NAME, process.env.UHIKO_CONTACT_LAST_NAME].filter(Boolean).join(" "),
        phone: process.env.UHIKO_CONTACT_PHONE ? `0${process.env.UHIKO_CONTACT_PHONE}` : null,
      },
      listings,
    };
  },
});
