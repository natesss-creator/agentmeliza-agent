import { defineTool } from "eve/tools";
import { z } from "zod";

const CHANNELS = ["etsy", "ebay", "amazon", "takealot", "shopify", "woocommerce", "lemonsqueezy", "paddle"] as const;

type Channel = (typeof CHANNELS)[number];

type Result = {
  channel: Channel;
  status: "published" | "ready" | "not_configured" | "failed";
  liveUrl?: string;
  externalId?: string;
  reason?: string;
};

function env(name: string) { return process.env[name]; }

async function jsonRequest(url: string, init: RequestInit) {
  const response = await fetch(url, init);
  const text = await response.text();
  let body: any = undefined;
  try { body = text ? JSON.parse(text) : undefined; } catch { body = undefined; }
  return { response, body };
}

async function publishPaddle(title: string, description: string, priceKes: number): Promise<Result> {
  const key = env("PADDLE_API_KEY");
  if (!key) return { channel: "paddle", status: "not_configured", reason: "PADDLE_API_KEY is not configured." };
  const { response, body } = await jsonRequest("https://api.paddle.com/products", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json", "Paddle-Version": "1" },
    body: JSON.stringify({ name: title, description, tax_category: "digital-goods", custom_data: { source: "meliza", price_kes: priceKes } }),
  });
  if (!response.ok) return { channel: "paddle", status: "failed", reason: `Paddle returned HTTP ${response.status}.` };
  const id = body?.data?.id;
  return id ? { channel: "paddle", status: "ready", externalId: id, reason: "Product created in Paddle catalog; price/checkout publication still requires an authorized price configuration." } : { channel: "paddle", status: "failed", reason: "Paddle returned no product ID." };
}

async function publishLemonSqueezy(title: string): Promise<Result> {
  const key = env("LEMONSQUEEZY_API_KEY");
  const storeId = env("LEMONSQUEEZY_STORE_ID");
  if (!key || !storeId) return { channel: "lemonsqueezy", status: "not_configured", reason: "LEMONSQUEEZY_API_KEY and LEMONSQUEEZY_STORE_ID are required." };
  const { response, body } = await jsonRequest(`https://api.lemonsqueezy.com/v1/products?filter[store_id]=${encodeURIComponent(storeId)}`, {
    method: "GET",
    headers: { Accept: "application/vnd.api+json", "Content-Type": "application/vnd.api+json", Authorization: `Bearer ${key}` },
  });
  if (!response.ok) return { channel: "lemonsqueezy", status: "failed", reason: `Lemon Squeezy returned HTTP ${response.status}.` };
  const existing = Array.isArray(body?.data) ? body.data.find((p: any) => String(p?.attributes?.name || "").toLowerCase() === title.toLowerCase()) : undefined;
  if (existing?.attributes?.buy_now_url) return { channel: "lemonsqueezy", status: "published", externalId: existing.id, liveUrl: existing.attributes.buy_now_url, reason: "Existing published product verified through Lemon Squeezy API." };
  return { channel: "lemonsqueezy", status: "ready", reason: "Authenticated store is reachable; product creation requires the account's product/file setup." };
}

async function publishShopify(title: string, description: string, priceKes: number): Promise<Result> {
  const domain = env("SHOPIFY_STORE_DOMAIN");
  const token = env("SHOPIFY_ADMIN_ACCESS_TOKEN");
  if (!domain || !token) return { channel: "shopify", status: "not_configured", reason: "SHOPIFY_STORE_DOMAIN and SHOPIFY_ADMIN_ACCESS_TOKEN are required." };
  const endpoint = `https://${domain}/admin/api/2026-10/graphql.json`;
  const query = `mutation { productCreate(product: {title: ${JSON.stringify(title)}, descriptionHtml: ${JSON.stringify(`<p>${description}</p>`)} , productType: "Digital course", status: ACTIVE}) { product { id handle status } userErrors { field message } } }`;
  const { response, body } = await jsonRequest(endpoint, { method: "POST", headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": token }, body: JSON.stringify({ query }) });
  if (!response.ok) return { channel: "shopify", status: "failed", reason: `Shopify returned HTTP ${response.status}.` };
  const result = body?.data?.productCreate;
  if (result?.userErrors?.length) return { channel: "shopify", status: "failed", reason: result.userErrors.map((e: any) => e.message).join("; ") };
  const product = result?.product;
  if (!product?.id) return { channel: "shopify", status: "failed", reason: "Shopify returned no product ID." };
  return { channel: "shopify", status: "ready", externalId: product.id, liveUrl: `https://${domain}/products/${product.handle}`, reason: `Product created at KES ${priceKes}; publication should be independently verified before reporting live.` };
}

async function configured(channel: Channel): Promise<Result> {
  const prefixes: Record<Channel, string> = { etsy: "ETSY", ebay: "EBAY", amazon: "AMAZON", takealot: "TAKEALOT", woocommerce: "WOOCOMMERCE", shopify: "SHOPIFY", lemonsqueezy: "LEMONSQUEEZY", paddle: "PADDLE" };
  const prefix = prefixes[channel];
  const keys = Object.keys(process.env).filter(k => k.startsWith(`${prefix}_`));
  return keys.length ? { channel, status: "ready", reason: `Configuration detected: ${keys.length} ${prefix}_ variables.` } : { channel, status: "not_configured", reason: `No ${prefix}_ credentials/configuration are present.` };
}

export default defineTool({
  description: "Multi-channel publishing engine for First Income Clarity. Uses only official API integrations and never browser automation. Supports Etsy, eBay, Amazon, Takealot, Shopify, WooCommerce, Lemon Squeezy, and Paddle. Never claims a live publication without platform evidence.",
  inputSchema: z.object({ channel: z.enum(CHANNELS), title: z.string().min(10).max(120), description: z.string().min(20).max(2500), priceKes: z.number().int().positive() }),
  async execute({ channel, title, description, priceKes }) {
    if (channel === "paddle") return publishPaddle(title, description, priceKes);
    if (channel === "lemonsqueezy") return publishLemonSqueezy(title);
    if (channel === "shopify") return publishShopify(title, description, priceKes);
    return configured(channel);
  },
});
