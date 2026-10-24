/**
 * Agentiz Kenya XML feed builder.
 *
 * Implements the Agentiz partnership XML specification (Kenya):
 * - UTF-8, standard XML header on the first line
 * - <root> with <date-generated>, <contacts>, repeating <ad>
 * - one property per <ad>, stable <external_id>
 * - geo values in Kiswahili, dates in Y-m-d\TH:i:sP
 * - no HTML in texts, control characters stripped, XML entities escaped
 *
 * The feed must contain ads from ONE advertiser in ONE country; the contact
 * block applies to every ad. Callers must only pass listings the owner is
 * entitled to advertise.
 */

export type DealType = "sale" | "rent";

export const PROPERTY_TYPES = [
  "business_buildings_agricultural", "business_buildings_industrial", "business_buildings_leisure",
  "business_buildings_medical", "business_buildings_na", "business_buildings_office",
  "business_buildings_residential", "business_buildings_retail", "business_land_agricultural",
  "business_land_commercial", "business_land_industrial", "business_land_na", "business_land_residential",
  "business_other_business", "business_other_franchise", "business_other_na",
  "life_housing_apartment", "life_housing_apartment_mlti", "life_housing_bungalow", "life_housing_cabin",
  "life_housing_cottage", "life_housing_duplex", "life_housing_farmhouse", "life_housing_floor",
  "life_housing_fourplex", "life_housing_house", "life_housing_loft", "life_housing_manor",
  "life_housing_mansion", "life_housing_na", "life_housing_penthouse", "life_housing_ranch",
  "life_housing_room", "life_housing_terraced", "life_housing_triplex", "life_housing_villa",
  "life_housing_wing", "life_land_building", "life_land_farming", "life_land_na",
  "life_mobile_boat", "life_mobile_caravan", "life_mobile_house", "life_mobile_houseboat", "life_mobile_na",
  "life_other_garage", "life_other_manufactured", "life_other_na", "life_other_parking",
] as const;
export type PropertyType = (typeof PROPERTY_TYPES)[number];

export type Contacts = {
  name_company?: string;
  name_first?: string;
  name_last?: string;
  phone_code?: string; // e.g. "254"
  phone_number?: string;
};

export type Listing = {
  external_id: string; // stable ID in the source system, max 45 chars
  deal_type: DealType;
  property_type: PropertyType;
  info_link?: string; // https:// link to the listing on the owner's site
  geo: {
    area_1?: string; // region (Kiswahili)
    area_2?: string;
    locality?: string;
    sublocality_1?: string;
    sublocality_2?: string;
    street?: string;
    number?: string;
    lat?: number;
    lng?: number;
  };
  created: string | Date; // real creation date
  updated: string | Date; // real last-change date; do not bump artificially
  title: { en?: string; sw?: string }; // max 100 chars each
  text: { en?: string; sw?: string }; // max 5000 chars each
  interior?: {
    bedrooms?: number; // 0 = studio
    bathrooms?: number;
    rooms_of?: number;
    size_s_total_metric?: number;
    floor?: number | string;
    floors?: number;
    furniture_availability?: "full" | "no" | "partially";
  };
  lot?: { size_s_metric?: number };
  price: {
    currency?: string; // ISO 4217; omitted => KES
    sum_total?: number; // sale price
    per_month?: number; // rent
    deposit_base_sum?: number;
  };
  images: string[]; // public https URLs: jpg, jpeg, png, gif, webp; <=20MB each
  review?: string; // set by an importer when a value looks wrong; the listing is held back
};

export type ValidationIssue = { external_id: string; field: string; message: string };

const IMAGE_EXT = /\.(jpe?g|png|gif|webp)(\?.*)?$/i;

// Strip characters the spec forbids (first 32 ASCII except tab/LF/CR) and HTML tags.
export function cleanText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

export function escapeXml(value: string): string {
  return cleanText(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Y-m-d\TH:i:sP in Africa/Nairobi (+03:00, no DST).
export function formatDate(input: string | Date): string {
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) throw new Error(`Invalid date: ${String(input)}`);
  const local = new Date(d.getTime() + 3 * 3600 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${local.getUTCFullYear()}-${pad(local.getUTCMonth() + 1)}-${pad(local.getUTCDate())}` +
    `T${pad(local.getUTCHours())}:${pad(local.getUTCMinutes())}:${pad(local.getUTCSeconds())}+03:00`
  );
}

export function validateListing(l: Listing): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const id = l.external_id || "(missing)";
  const add = (field: string, message: string) => issues.push({ external_id: id, field, message });

  if (!l.external_id) add("external_id", "required");
  else if (l.external_id.length > 45) add("external_id", "max 45 characters");
  if (l.deal_type !== "sale" && l.deal_type !== "rent") add("deal_type", "must be sale or rent");
  if (!PROPERTY_TYPES.includes(l.property_type)) add("property_type", `unknown value ${l.property_type}`);
  if (l.info_link && !/^https:\/\//i.test(l.info_link)) add("info_link", "must start with https://");

  const g = l.geo || {};
  if (!g.area_1 && !g.locality) add("geo", "location is mandatory (at least area_1 or locality)");
  if ((g.lat === undefined) !== (g.lng === undefined)) add("geo", "lat and lng must be given together");

  for (const key of ["created", "updated"] as const) {
    try { formatDate(l[key]); } catch { add(`date.${key}`, "required, must be a real date"); }
  }

  if (!l.title?.en && !l.title?.sw) add("title", "at least one language required");
  for (const lang of ["en", "sw"] as const) {
    if ((l.title?.[lang]?.length ?? 0) > 100) add(`title.${lang}`, "max 100 characters");
    if ((l.text?.[lang]?.length ?? 0) > 5000) add(`text.${lang}`, "max 5000 characters");
  }

  if (l.review) add("review", l.review);
  else if (l.deal_type === "sale" && !l.price?.sum_total) add("price.sum_total", "no total KES price found in the title or description");
  else if (l.deal_type === "rent" && !l.price?.per_month) add("price.per_month", "no monthly KES rent found in the title or description");

  if (!l.images?.length) add("images", "at least one photo recommended");
  for (const url of l.images || []) {
    if (!/^https:\/\//i.test(url)) add("images", `not https: ${url}`);
    else if (!IMAGE_EXT.test(url)) add("images", `unsupported type (jpg/png/gif/webp only): ${url}`);
  }
  return issues;
}

const el = (name: string, value: string | number | undefined, indent: string) =>
  value === undefined || value === "" ? "" : `${indent}<${name}>${escapeXml(String(value))}</${name}>\n`;

function buildAd(l: Listing): string {
  const i = "    ";
  const ii = i + "  ";
  const iii = ii + "  ";
  let xml = `  <ad>\n`;
  xml += el("deal_type", l.deal_type, i);
  xml += el("property_type", l.property_type, i);
  xml += el("external_id", l.external_id, i);
  xml += el("info_link", l.info_link, i);

  xml += `${i}<geo>\n`;
  for (const k of ["area_1", "area_2", "locality", "sublocality_1", "sublocality_2", "street", "number"] as const) {
    xml += el(k, l.geo[k], ii);
  }
  if (l.geo.lat !== undefined && l.geo.lng !== undefined) {
    xml += el("lat", l.geo.lat.toFixed(6), ii);
    xml += el("lng", l.geo.lng.toFixed(6), ii);
  }
  xml += `${i}</geo>\n`;

  xml += `${i}<date>\n${el("creation", formatDate(l.created), ii)}${el("updated", formatDate(l.updated), ii)}${i}</date>\n`;

  xml += `${i}<desc>\n`;
  const interior = l.interior || {};
  const interiorXml = (["rooms_of", "bedrooms", "bathrooms", "size_s_total_metric", "floor", "floors"] as const)
    .map((k) => el(k, interior[k], iii))
    .join("");
  if (interiorXml) xml += `${ii}<interior>\n${interiorXml}${ii}</interior>\n`;
  if (interior.furniture_availability) {
    xml += `${ii}<facilities>\n${el("furniture_availability", interior.furniture_availability, iii)}${ii}</facilities>\n`;
  }
  if (l.lot?.size_s_metric) xml += `${ii}<lot>\n${el("size_s_metric", l.lot.size_s_metric, iii)}${ii}</lot>\n`;
  xml += `${ii}<annex>\n`;
  xml += `${iii}<header>\n${el("sw", l.title.sw, iii + "  ")}${el("en", l.title.en, iii + "  ")}${iii}</header>\n`;
  xml += `${iii}<text>\n${el("sw", l.text?.sw, iii + "  ")}${el("en", l.text?.en, iii + "  ")}${iii}</text>\n`;
  xml += `${ii}</annex>\n`;
  xml += `${i}</desc>\n`;

  xml += `${i}<deal>\n`;
  xml += el("currency", l.price.currency || "KES", ii);
  xml += `${ii}<price>\n`;
  xml += el("sum_total", l.price.sum_total, iii);
  xml += el("per_month", l.price.per_month, iii);
  xml += el("deposit_base_sum", l.price.deposit_base_sum, iii);
  xml += `${ii}</price>\n`;
  xml += `${i}</deal>\n`;

  if (l.images?.length) {
    xml += `${i}<media>\n${l.images.map((u) => el("image", u, ii)).join("")}${i}</media>\n`;
  }
  xml += `  </ad>\n`;
  return xml;
}

export type FeedResult = {
  xml: string;
  included: string[];
  skipped: ValidationIssue[];
};

/** Builds the feed. Listings with validation errors are skipped and reported, never half-written. */
export function buildAgentizFeed(contacts: Contacts, listings: Listing[], now: Date = new Date()): FeedResult {
  const seen = new Set<string>();
  const included: string[] = [];
  const skipped: ValidationIssue[] = [];
  let ads = "";

  for (const listing of listings) {
    const issues = validateListing(listing);
    // A missing photo is a warning, not a reason to drop the listing.
    const blocking = issues.filter((x) => x.message !== "at least one photo recommended");
    if (seen.has(listing.external_id)) {
      skipped.push({ external_id: listing.external_id, field: "external_id", message: "duplicate external_id in feed" });
      continue;
    }
    if (blocking.length) {
      skipped.push(...blocking);
      continue;
    }
    seen.add(listing.external_id);
    included.push(listing.external_id);
    ads += buildAd(listing);
  }

  const c = (["name_company", "name_first", "name_last", "phone_code", "phone_number"] as const)
    .map((k) => el(k, contacts[k], "    "))
    .join("");

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<root>\n` +
    `  <date-generated>${formatDate(now)}</date-generated>\n` +
    `  <contacts>\n${c}  </contacts>\n` +
    ads +
    `</root>\n`;

  return { xml, included, skipped };
}
