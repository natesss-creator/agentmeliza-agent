import type { Listing } from "@/lib/agentiz/feed";

export type PosterData = {
  id: number;
  headline: string;
  priceText?: string;
  dealLabel: string;
  location: string;
  sizeText?: string;
  typeLabel: string;
  photo?: string;
  link?: string;
  /** Land listings only: price worked out per acre (or per m2 for small plots). */
  perUnitText?: string;
};

const ACRE_M2 = 4046.8564;

// Satori renders text only; emoji and pictographs are stripped so nothing is fetched remotely.
const stripEmoji = (s: string) =>
  s.replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, "").replace(/\s+/g, " ").trim();

export function formatKes(n: number): string {
  if (n >= 1e9) return `KES ${trim(n / 1e9)}B`;
  if (n >= 1e6) return `KES ${trim(n / 1e6)}M`;
  if (n >= 1e3) return `KES ${trim(n / 1e3)}K`;
  return `KES ${n.toLocaleString("en")}`;
}
const trim = (x: number) => (Math.round(x * 100) / 100).toString();

function sizeText(m2?: number): string | undefined {
  if (!m2) return undefined;
  const acres = m2 / ACRE_M2;
  if (acres >= 0.12) {
    const fractions: Array<[number, string]> = [[0.125, "1/8"], [0.25, "1/4"], [0.5, "1/2"], [0.75, "3/4"]];
    const f = fractions.find(([v]) => Math.abs(acres - v) < 0.02);
    if (f) return `${f[1]} acre`;
    return `${trim(acres)} ${acres === 1 ? "acre" : "acres"}`;
  }
  return `${Math.round(m2).toLocaleString("en")} m²`;
}

const TYPE_LABEL: Array<[RegExp, string]> = [
  [/farming/, "Agricultural Land"],
  [/business_land/, "Commercial Land"],
  [/life_land/, "Land"],
  [/office/, "Commercial Property"],
  [/apartment/, "Apartments"],
  [/terraced/, "Townhouse"],
  [/villa/, "Villa"],
  [/house|bungalow/, "House"],
];

function perUnit(amount: number, m2: number): string | undefined {
  const acres = m2 / ACRE_M2;
  const v = acres >= 0.12 ? amount / acres : amount / m2;
  if (!isFinite(v) || v <= 0) return undefined;
  return `${formatKes(v)} / ${acres >= 0.12 ? "acre" : "m²"}`;
}

export function toPosterData(l: Listing): PosterData {
  // Headline: listing title without emoji, "For sale:" prefixes or the trailing price.
  const headline = stripEmoji(l.title.en || "")
    .replace(/^for\s+sale\s*[:\-–]\s*/i, "")
    .replace(/\s*[–\-|]\s*(KES|KSH|Kshs?)\b.*$/i, "")
    .replace(/\s+—\s+.*$/, "")
    .slice(0, 80);
  const amount = l.deal_type === "sale" ? l.price.sum_total : l.price.per_month;
  const lotM2 = l.lot?.size_s_metric;
  const perUnitText =
    l.deal_type === "sale" && amount && lotM2 && /land|farming/.test(l.property_type) ? perUnit(amount, lotM2) : undefined;
  const place = [l.geo.locality, l.geo.area_1].filter((x, i, a) => x && a.indexOf(x) === i).join(", ");
  return {
    id: Number(l.external_id.replace(/^UH-/, "")),
    headline,
    priceText: amount ? `${formatKes(amount)}${l.deal_type === "rent" ? " / month" : ""}` : undefined,
    dealLabel: l.deal_type === "rent" ? "FOR RENT" : "FOR SALE",
    location: place || "Kenya",
    sizeText: sizeText(l.lot?.size_s_metric ?? l.interior?.size_s_total_metric),
    typeLabel: TYPE_LABEL.find(([re]) => re.test(l.property_type))?.[1] ?? "Property",
    photo: l.images[0],
    link: l.info_link,
    perUnitText,
  };
}
