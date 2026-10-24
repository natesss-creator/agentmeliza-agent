/**
 * Reads the owner's property listings from the uhiko.com WordPress REST API
 * and normalizes them into Agentiz listings.
 *
 * Config (Vercel env, set by the owner; never in source):
 *   UHIKO_WP_URL           base site URL, e.g. https://uhiko.com/wp  (default)
 *   UHIKO_WP_USER          WordPress username that owns the Application Password
 *   UHIKO_WP_APP_PASSWORD  WordPress Application Password (Sensitive)
 *   UHIKO_WP_POST_TYPE     optional REST base of the property post type
 *                          (auto-detected when omitted)
 *
 * The property plugin/theme is not known yet, so field mapping matches
 * common meta key names (Houzez, Real Homes, Easy Property Listings, ACF).
 * `debug` output lists only field NAMES, never values, so it can be used to
 * tune the mapping without exposing data.
 */
import { PROPERTY_TYPES, type Listing, type PropertyType } from "./feed";

const DEFAULT_BASE = "https://uhiko.com/wp";
const CANDIDATE_TYPES = ["properties", "property", "listings", "listing", "estate_property", "rh_property"];

type WpPost = Record<string, any>;

function config() {
  const base = (process.env.UHIKO_WP_URL || DEFAULT_BASE).replace(/\/+$/, "");
  const user = process.env.UHIKO_WP_USER;
  const pass = process.env.UHIKO_WP_APP_PASSWORD;
  const headers: Record<string, string> = { Accept: "application/json", "User-Agent": "Meliza-Agentiz-Feed" };
  if (user && pass) {
    headers.Authorization = `Basic ${Buffer.from(`${user}:${pass.replace(/\s+/g, "")}`).toString("base64")}`;
  }
  return { base, headers, authenticated: Boolean(user && pass) };
}

async function wpGet(path: string) {
  const { base, headers } = config();
  const res = await fetch(`${base}/wp-json${path}`, { headers, cache: "no-store" });
  if (!res.ok) throw new Error(`WordPress ${path} returned HTTP ${res.status}`);
  return { body: await res.json(), total: Number(res.headers.get("x-wp-totalpages") || "1") };
}

export async function detectPropertyType(): Promise<string> {
  if (process.env.UHIKO_WP_POST_TYPE) return process.env.UHIKO_WP_POST_TYPE;
  const { body } = await wpGet("/wp/v2/types");
  const types = Object.values(body as Record<string, any>);
  const bases = types.map((t) => String(t.rest_base || t.slug));
  const hit = CANDIDATE_TYPES.find((c) => bases.includes(c)) ?? bases.find((b) => /propert|listing|estate/i.test(b));
  if (!hit) throw new Error(`No property post type found. Available REST bases: ${bases.join(", ")}`);
  return hit;
}

export async function fetchAllProperties(restBase: string): Promise<WpPost[]> {
  const out: WpPost[] = [];
  for (let page = 1; page <= 50; page++) {
    const { body, total } = await wpGet(
      `/wp/v2/${restBase}?per_page=100&page=${page}&status=publish&_embed=wp:featuredmedia,wp:term`,
    );
    if (!Array.isArray(body) || body.length === 0) break;
    out.push(...body);
    if (page >= total) break;
  }
  return out;
}

// ---- field mapping -------------------------------------------------------

function flatMeta(post: WpPost): Record<string, unknown> {
  const sources = [post.meta, post.acf, post.property_meta, post.fave_property_meta, post.custom_fields];
  const flat: Record<string, unknown> = {};
  for (const src of sources) {
    if (!src || typeof src !== "object") continue;
    for (const [k, v] of Object.entries(src)) {
      flat[k.toLowerCase()] = Array.isArray(v) && v.length === 1 ? v[0] : v;
    }
  }
  return flat;
}

function pick(meta: Record<string, unknown>, patterns: RegExp[]): unknown {
  for (const p of patterns) {
    const key = Object.keys(meta).find((k) => p.test(k));
    if (key !== undefined && meta[key] !== "" && meta[key] != null) return meta[key];
  }
  return undefined;
}

const num = (v: unknown): number | undefined => {
  if (v == null) return undefined;
  const n = Number(String(v).replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

// Kenya spans roughly lat -4.7..5.0, lng 33.9..41.9; anything else is bad data.
function coordsInKenya(latRaw: unknown, lng: number | undefined): lng is number {
  const lat = Number(latRaw);
  return latRaw != null && latRaw !== "" && Number.isFinite(lat) && lng !== undefined && Number.isFinite(lng) &&
    lat > -5 && lat < 5.5 && lng > 33.5 && lng < 42.5;
}

const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—",
  rsquo: "'", lsquo: "'", ldquo: '"', rdquo: '"', hellip: "…",
};

// WordPress returns rendered HTML with entities (e.g. &#8211;); decode to plain text.
const stripHtml = (html: string) =>
  html
    .replace(/<[^>]*>/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&([a-z]+);/gi, (m, n) => NAMED[n.toLowerCase()] ?? m)
    .replace(/\s+/g, " ")
    .trim();

function termNames(post: WpPost): string[] {
  const groups = post._embedded?.["wp:term"];
  if (!Array.isArray(groups)) return [];
  return groups.flat().map((t: any) => String(t?.name || "").toLowerCase()).filter(Boolean);
}

function dealType(meta: Record<string, unknown>, terms: string[], text: string): "sale" | "rent" {
  const status = String(pick(meta, [/property_status/, /^status$/, /listing_type/, /deal/]) ?? "").toLowerCase();
  const all = `${status} ${terms.join(" ")} ${text.slice(0, 300).toLowerCase()}`;
  return /\brent|to let|lease|kukodisha|per month/.test(all) && !/for sale|\bsale\b/.test(status) ? "rent" : "sale";
}

function propertyType(terms: string[], title: string): PropertyType {
  const s = `${terms.join(" ")} ${title}`.toLowerCase();
  const map: Array<[RegExp, PropertyType]> = [
    [/penthouse/, "life_housing_penthouse"],
    [/townhouse|town house|maisonette/, "life_housing_terraced"],
    [/bungalow/, "life_housing_bungalow"],
    [/villa/, "life_housing_villa"],
    [/duplex/, "life_housing_duplex"],
    [/studio|apartment|flat|condo/, "life_housing_apartment"],
    [/office/, "business_buildings_office"],
    [/shop|retail/, "business_buildings_retail"],
    [/warehouse|godown|industrial/, "business_buildings_industrial"],
    [/commercial land|commercial plot/, "business_land_commercial"],
    [/farm|agricultural|acre/, "life_land_farming"],
    [/land|plot/, "life_land_building"],
    [/house|home|mansion/, "life_housing_house"],
  ];
  return map.find(([re]) => re.test(s))?.[1] ?? "life_housing_na";
}

function images(post: WpPost, meta: Record<string, unknown>): string[] {
  const urls = new Set<string>();
  const featured = post._embedded?.["wp:featuredmedia"]?.[0]?.source_url;
  if (featured) urls.add(featured);
  const gallery = pick(meta, [/gallery/, /images/, /photos/]);
  const list = Array.isArray(gallery) ? gallery : typeof gallery === "string" ? gallery.split(/[,\s]+/) : [];
  for (const g of list) {
    const u = typeof g === "string" ? g : (g as any)?.url || (g as any)?.source_url;
    if (typeof u === "string" && /^https:\/\//.test(u)) urls.add(u);
  }
  return [...urls].slice(0, 30);
}

export function toListing(post: WpPost): Listing {
  const meta = flatMeta(post);
  const terms = termNames(post);
  const title = stripHtml(post.title?.rendered || "");
  const text = stripHtml(post.content?.rendered || post.excerpt?.rendered || "");
  const deal = dealType(meta, terms, text);
  const price = num(pick(meta, [/^(fave_)?property_price$/, /^price$/, /_price$/, /price/]));
  // num() drops negatives, and Kenyan latitudes are often negative, so parse directly.
  let latRaw: unknown = pick(meta, [/lat(itude)?$/]);
  let lngRaw = pick(meta, [/(lng|lon|long|longitude)$/]);
  // Houzez also stores "lat,lng" in one field.
  const pair = pick(meta, [/property_location$/, /^location$/, /coordinates/]);
  if ((latRaw == null || lngRaw == null) && typeof pair === "string" && /^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(pair.trim())) {
    const [a, b] = pair.split(",").map((x) => x.trim());
    latRaw = a;
    lngRaw = b;
  }
  const lng = lngRaw == null ? undefined : Number(lngRaw);
  const address = pick(meta, [/property_address$/, /^address$/, /map_address/, /location/]);
  const locality = pick(meta, [/city$/, /locality/, /area$/, /neighbou?rhood/]) ?? terms.find((t) => /westlands|kilimani|karen|lavington|kileleshwa|runda|parklands|ruiru|kiambu/.test(t));

  return {
    external_id: `UH-${post.id}`,
    deal_type: deal,
    property_type: propertyType(terms, title),
    info_link: typeof post.link === "string" && post.link.startsWith("https://") ? post.link : undefined,
    geo: {
      area_1: String(pick(meta, [/state$/, /county/, /region/]) ?? "Nairobi"),
      locality: locality ? String(locality).replace(/\b\w/g, (c) => c.toUpperCase()) : undefined,
      street: typeof address === "string" ? address.slice(0, 255) : undefined,
      ...(coordsInKenya(latRaw, lng) ? { lat: Number(latRaw), lng } : {}),
    },
    created: post.date_gmt ? `${post.date_gmt}Z` : post.date,
    updated: post.modified_gmt ? `${post.modified_gmt}Z` : post.modified,
    title: { en: title.slice(0, 100) },
    text: { en: text.slice(0, 5000) },
    interior: {
      bedrooms: num(pick(meta, [/bedroom/, /^beds?$/])),
      bathrooms: num(pick(meta, [/bathroom/, /^baths?$/])),
      size_s_total_metric: num(pick(meta, [/property_size$/, /^size$/, /area_size/, /sqm|square/])),
    },
    lot: { size_s_metric: num(pick(meta, [/land_area/, /lot_size/, /plot_size/])) },
    price: deal === "sale" ? { currency: "KES", sum_total: price } : { currency: "KES", per_month: price },
    images: images(post, meta),
  };
}

/** Field names only (no values) for tuning the mapping. */
export function describeFields(posts: WpPost[]) {
  const top = new Set<string>();
  const meta = new Set<string>();
  for (const p of posts.slice(0, 10)) {
    Object.keys(p).forEach((k) => top.add(k));
    Object.keys(flatMeta(p)).forEach((k) => meta.add(k));
  }
  return { postFields: [...top].sort(), metaKeys: [...meta].sort(), knownTypes: PROPERTY_TYPES.length };
}

/**
 * Temporary diagnostic: one published listing as WordPress returns it with
 * edit context (which can include registered meta), plus the theme's REST
 * namespaces. Listing data is already public on uhiko.com; nothing
 * credential-like is returned.
 */
export async function rawSample(restBase: string) {
  const { body: list } = await wpGet(`/wp/v2/${restBase}?per_page=1&status=publish`);
  const id = Array.isArray(list) && list[0]?.id;
  if (!id) return { error: "no published listing found" };
  let edit: unknown = null;
  try {
    edit = (await wpGet(`/wp/v2/${restBase}/${id}?context=edit`)).body;
  } catch (e) {
    edit = { error: e instanceof Error ? e.message : String(e) };
  }
  const { body: root } = await wpGet("/");
  const strip = (o: any) => {
    if (!o || typeof o !== "object") return o;
    const { _links, guid, password, ...rest } = o;
    return rest;
  };

  // Why is auth rejected? WordPress returns a specific error code:
  // rest_not_logged_in => Authorization header never reached WordPress (host strips it)
  // invalid_username / incorrect_password / invalid_email => wrong credentials
  const { base, headers } = config();
  const me = await fetch(`${base}/wp-json/wp/v2/users/me?context=edit`, { headers, cache: "no-store" });
  const meBody: any = await me.json().catch(() => null);
  const auth = me.ok
    ? { ok: true, roles: meBody?.roles }
    : { ok: false, status: me.status, code: meBody?.code, message: meBody?.message };

  // Routes offered by the site's custom namespaces (public index, names only).
  const customRoutes = Object.keys(root?.routes || {}).filter((r) => !/^\/(wp\/v2|oembed|wp-site-health|wp-block-editor|wp-abilities)\b/.test(r) && r !== "/");

  const pub = strip(list[0]);
  if (pub?.content?.rendered) pub.content = { rendered: String(pub.content.rendered).slice(0, 2000) };
  if (pub?._embedded) delete pub._embedded;

  return { id, namespaces: root?.namespaces, customRoutes, auth, public: pub, edit: strip(edit) };
}

export function wordpressConfigured() {
  return config().authenticated;
}
