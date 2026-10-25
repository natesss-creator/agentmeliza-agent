import { defineTool } from "eve/tools";
import { z } from "zod";
import { validateListing } from "@/lib/agentiz/feed";
import { detectPropertyType, fetchAllProperties, toListing } from "@/lib/agentiz/wordpress";
import { toPosterData } from "@/lib/uhiko/poster-data";

const BASE = `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || "agentmeliza.vercel.app"}`;

/**
 * Uhiko Properties listings ready for social posts, each with two designed
 * poster images (public JPEG URLs that Instagram and Facebook can fetch).
 */
export default defineTool({
  description:
    "List Uhiko Properties' published property listings from uhiko.com for social media posts. Each listing includes verified facts (headline, KES price, location, size, type, listing link, a description excerpt) and two ready-made 1080x1350 JPEG posters: posterA (editorial layout) and posterB (bold layout). Use the poster URLs exactly as given as the image for Facebook photo posts, Instagram media, and TikTok/YouTube media uploads. Only listings with a verified total price AND at least one real photo are returned — a listing with no photos would otherwise render a plain gradient poster, so it is excluded here rather than posted with a placeholder.",
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
        // A missing-images warning is tolerated for the Agentiz feed (it only
        // wants a "recommended" nudge there), but for social posts it is
        // disqualifying: no real photo means no real poster. Exclude any
        // listing with a blocking issue OTHER than images, then additionally
        // require at least one real photo.
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
      .filter((l) => !excludeIds.includes(l.id))
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
