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
    [/farm|agricultural|plantation|ranch/, "life_land_farming"],
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

// ---- uhiko.com specifics ---------------------------------------------------
// The site stores no structured price/size fields: they live in the title and
// description ("Prime 2-Acre ... – KES 15.5 Million"). Taxonomies arrive as
// class_list slugs: property_type-*, property_location-*, property_status-*.

const KENYA_COUNTIES = [
  "nairobi", "kiambu", "machakos", "kajiado", "muranga", "nakuru", "mombasa", "kilifi", "kwale", "nyeri",
  "laikipia", "meru", "embu", "kirinyaga", "nyandarua", "narok", "kisumu", "kakamega", "bungoma", "kericho",
  "bomet", "nandi", "kitui", "makueni", "taita", "lamu", "naivasha", "thika", "eldoret", "uasin",
];

const titleCase = (s: string) => s.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

function classTerms(post: WpPost) {
  const list: string[] = Array.isArray(post.class_list) ? post.class_list : [];
  const of = (prefix: string) => list.filter((c) => c.startsWith(`${prefix}-`)).map((c) => c.slice(prefix.length + 1));
  return { types: of("property_type"), locations: of("property_location"), statuses: of("property_status") };
}

const MULT: Record<string, number> = { billion: 1e9, bn: 1e9, b: 1e9, million: 1e6, mn: 1e6, m: 1e6, thousand: 1e3, k: 1e3 };

/**
 * Finds a KES amount. Skips per-unit prices ("per acre", "per plot") because
 * Agentiz needs the full asking price; those listings are reported, not guessed.
 */
export function parseKes(text: string): { amount?: number; perMonth: boolean; perUnit: boolean } {
  const re = /(?:KES|KSHS?\.?|Kshs?\.?|Sh\.?)\s*([\d][\d,]*(?:\.\d+)?)\s*(billion|bn|million|mn|thousand|[bmk])?\b/gi;
  const UNIT = /(acre|plot|eighth|1\/8|⅛|unit|sq|square|ft|feet|metre|meter|room|bed)/;
  let perUnit = false;
  for (const m of text.matchAll(re)) {
    const start = m.index ?? 0;
    const after = text.slice(start + m[0].length, start + m[0].length + 30).toLowerCase();
    const before = text.slice(Math.max(0, start - 25), start).toLowerCase();
    const base = Number(m[1].replace(/,/g, ""));
    const amount = Math.round(base * (m[2] ? MULT[m[2].toLowerCase()] ?? 1 : 1));
    if (!Number.isFinite(amount) || amount < 1000) continue;
    if (/^\s*(per|\/|an?|each|for each)\s*month\b|^\s*(p\.?m\b|monthly)/.test(after) || /\b(rent|per month)\b[^.]{0,15}$/.test(before)) {
      return { amount, perMonth: true, perUnit };
    }
    // "KES 3.5M per acre", "3.5M an acre", "/acre", "per acre: KES 3.5M"
    if (new RegExp(`^\\s*(per|\\/|an?|each|for each)\\s*${UNIT.source}`).test(after) || new RegExp(`\\b(per|each)\\s*${UNIT.source}\\w*\\s*(is|at|of|:|-|–)?\\s*$`).test(before)) {
      perUnit = true;
      continue;
    }
    return { amount, perMonth: false, perUnit };
  }
  return { perMonth: false, perUnit };
}

const ACRE_M2 = 4046.8564;
/** Land size in m² from text like "2-Acre", "1/8 acre", "half an acre", "50x100". */
export function parseLandM2(text: string): number | undefined {
  const t = text.toLowerCase().replace(/⅛/g, "1/8").replace(/¼/g, "1/4").replace(/½/g, "1/2").replace(/¾/g, "3/4");
  const frac = t.match(/(?:^|[^\d])(\d+)\s*\/\s*(\d+)\s*-?\s*(?:of an?\s*)?acres?\b/);
  if (frac) return Math.round((Number(frac[1]) / Number(frac[2])) * ACRE_M2);
  if (/\bhalf(?:\s+an?)?\s*acre\b/.test(t)) return Math.round(ACRE_M2 / 2);
  if (/\bquarter(?:\s+an?)?\s*acre\b/.test(t)) return Math.round(ACRE_M2 / 4);
  const acres = t.match(/\b(\d{1,3}(?:,\d{3})*(?:\.\d+)?)\s*-?\s*acres?\b/);
  if (acres) return Math.round(Number(acres[1].replace(/,/g, "")) * ACRE_M2);
  const ft = t.match(/\b(\d{2,3})\s*(?:ft\s*)?(?:x|by)\s*(\d{2,3})\s*(?:ft|feet)?\b/);
  if (ft) return Math.round(Number(ft[1]) * Number(ft[2]) * 0.092903);
  return undefined;
}

// Towns/areas seen on uhiko.com mapped to their county (area_1).
const TOWN_COUNTY: Array<[RegExp, string]> = [
  [/kitengela|isinya|enkasit|kajiado|ngong|rongai|kiserian|korompoi|kimuka|athi river(?! road)/, "Kajiado"],
  [/juja|thika|ruiru|tatu city|kiambu|banana|limuru|kikuyu|githunguri|kilimambogo|ngemwa|gatundu|kiambaa/, "Kiambu"],
  [/sagana|kagio|kirinyaga|kerugoya|mwea/, "Kirinyaga"],
  [/bamburi|nyali|mombasa|shanzu|mtwapa(?=.*mombasa)/, "Mombasa"],
  [/diani|ukunda|kwale/, "Kwale"],
  [/kilifi|malindi|watamu|mtwapa/, "Kilifi"],
  [/\bvoi\b|taita|taveta|mwatate/, "Taita Taveta"],
  [/\btala\b|machakos|kangundo|syokimau|mlolongo|athi river/, "Machakos"],
  [/nakuru|naivasha|gilgil|njoro/, "Nakuru"],
  [/nanyuki|laikipia/, "Laikipia"],
  [/nyeri|karatina/, "Nyeri"],
  [/murang'?a|kenol|makuyu/, "Murang'a"],
  [/kisumu/, "Kisumu"],
  [/eldoret|uasin gishu/, "Uasin Gishu"],
  [/westlands|kilimani|lavington|karen|kileleshwa|parklands|upper ?hill|utawala|komarock|embakasi|runda|riara|argwings|south c|south b|langata|kasarani|roysambu|donholm|nairobi|thika road|katani(?=.*nairobi)/, "Nairobi"],
];

function countyFrom(text: string): string | undefined {
  const t = text.toLowerCase();
  const explicit = t.match(/\b([a-z' ]{3,20}?)\s+county\b/);
  if (explicit) {
    const name = explicit[1].trim().split(" ").pop()!;
    const hit = TOWN_COUNTY.find(([, c]) => c.toLowerCase().startsWith(name));
    if (hit) return hit[1];
    if (KENYA_COUNTIES.includes(name)) return titleCase(name);
  }
  return TOWN_COUNTY.find(([re]) => re.test(t))?.[1];
}

function geoFromLocationSlug(slug: string | undefined, context = "") {
  if (!slug) return { area_1: countyFrom(context) };
  const parts = slug.split("-");
  const last = parts[parts.length - 1];
  if (parts.length > 1 && KENYA_COUNTIES.includes(last)) {
    return { locality: titleCase(parts.slice(0, -1).join("-")), area_1: countyFrom(last) ?? titleCase(last) };
  }
  // Slug is the locality itself (e.g. "kitengela"); county from slug or listing text.
  return { locality: titleCase(slug), area_1: countyFrom(slug.replace(/-/g, " ")) ?? countyFrom(context) };
}

export function toListing(post: WpPost): Listing {
  const meta = flatMeta(post);
  const ct = classTerms(post);
  const terms = [...termNames(post), ...ct.types.map((t) => t.replace(/-/g, " "))];
  const title = stripHtml(post.title?.rendered || "");
  const text = stripHtml(post.content?.rendered || post.excerpt?.rendered || "");
  const fromTitle = parseKes(title);
  const fromText = fromTitle.amount ? fromTitle : parseKes(text);
  const metaPrice = num(pick(meta, [/^(fave_)?property_price$/, /^price$/, /_price$/, /price/]));
  // "for sale" in the title wins: "House + 2 Rental Units for Sale" is a sale.
  const saysSale = /\b(for sale|on sale|selling)\b/i.test(title);
  const isRent = !saysSale && (fromText.perMonth || /\b(for rent|to let|for lease)\b/i.test(title));
  const deal: "sale" | "rent" = metaPrice ? dealType(meta, terms, text) : isRent ? "rent" : "sale";
  let price = metaPrice ?? (deal === "sale" && fromText.perMonth ? undefined : fromText.amount);
  const slugGeo = geoFromLocationSlug(ct.locations[0], `${title} ${text.slice(0, 800)}`);
  const lotM2 = num(pick(meta, [/land_area/, /lot_size/, /plot_size/])) ?? parseLandM2(`${title} ${text.slice(0, 1500)}`);

  // Sanity checks: hold the listing for review rather than publish a wrong price.
  let review: string | undefined;
  if (deal === "sale" && price !== undefined && price < 300_000) {
    review = `sale price KES ${price.toLocaleString("en")} looks like a rent or per-unit figure`;
  } else if (deal === "sale" && price !== undefined && lotM2 && lotM2 >= 5 * ACRE_M2 && price / (lotM2 / ACRE_M2) < 250_000) {
    review = `KES ${price.toLocaleString("en")} for ${Math.round(lotM2 / ACRE_M2)} acres looks like a per-acre price`;
  } else if (price === undefined && (fromText.perUnit || fromTitle.perUnit)) {
    review = "only a per-acre/per-plot price is given; add the total asking price to the listing";
  }
  if (review) price = undefined;
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
  const locality = pick(meta, [/city$/, /locality/, /area$/, /neighbou?rhood/]);

  return {
    external_id: `UH-${post.id}`,
    deal_type: deal,
    property_type: propertyType(terms, title),
    info_link: typeof post.link === "string" && post.link.startsWith("https://") ? post.link : undefined,
    geo: {
      area_1: (pick(meta, [/state$/, /county/, /region/]) as string | undefined) ?? slugGeo.area_1,
      locality: locality ? titleCase(String(locality)) : slugGeo.locality,
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
    lot: { size_s_metric: lotM2 },
    review,
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
