import { NextResponse } from "next/server";
import { buildAgentizFeed, type Contacts } from "@/lib/agentiz/feed";
import { describeFields, detectPropertyType, fetchAllProperties, toListing, wordpressConfigured } from "@/lib/agentiz/wordpress";

export const runtime = "nodejs";
// Agentiz polls this URL; cache briefly at the edge so polling never hammers WordPress.
export const revalidate = 900;

/**
 * Agentiz Kenya property feed for Uhiko Properties.
 *
 *   GET /api/agentiz/feed          -> XML feed (paste this URL into Agentiz > Import)
 *   GET /api/agentiz/feed?debug=1  -> JSON report: counts, skipped listings and why,
 *                                     WordPress field NAMES (no values) for mapping
 *
 * Only listings already published publicly on uhiko.com are included.
 */
function contacts(): Contacts {
  return {
    name_company: process.env.UHIKO_CONTACT_COMPANY || "Uhiko Properties",
    name_first: process.env.UHIKO_CONTACT_FIRST_NAME || undefined,
    name_last: process.env.UHIKO_CONTACT_LAST_NAME || undefined,
    phone_code: process.env.UHIKO_CONTACT_PHONE_CODE || "254",
    phone_number: process.env.UHIKO_CONTACT_PHONE || undefined,
  };
}

export async function GET(request: Request) {
  const debug = new URL(request.url).searchParams.get("debug") === "1";
  try {
    const postType = await detectPropertyType();
    const posts = await fetchAllProperties(postType);
    const listings = posts.map(toListing);
    const feed = buildAgentizFeed(contacts(), listings);

    if (debug) {
      return NextResponse.json({
        wordpressAuthenticated: wordpressConfigured(),
        postType,
        fetched: posts.length,
        included: feed.included.length,
        skipped: feed.skipped,
        contactPhoneSet: Boolean(contacts().phone_number),
        fields: describeFields(posts),
      });
    }

    return new NextResponse(feed.xml, {
      headers: {
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, s-maxage=900, stale-while-revalidate=3600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    // Never serve an empty feed on failure: Agentiz could read it as "all listings removed".
    return NextResponse.json({ status: "failed", reason: message }, { status: 502 });
  }
}
