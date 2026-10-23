# Meliza Publishing State

This file is the durable, non-secret operating record for Meliza's currently verified publishing capabilities and campaign state. Never store passwords, OTPs, cookies, access tokens, API keys, or full email contents here.

## Identity and offer

- Agent: **Meliza / agentmeliza**
- Owner/brand: **Nate / Innocent Labs**
- Primary offer: **First Income Clarity**
- Price: **KES 2,500 one-time**
- Access: **Lifetime access**
- Upsells: **None**
- Official URL: https://groketer.com/firstincome
- Positioning: practical 14-day guide, about 45 minutes/day alongside a job or job search.
- Claims rule: never promise income, jobs, M-Pesa payments, guaranteed results, or use misleading/fake testimonials.

## Verified social publishing

### Instagram

- Account: `@innocentlabs4`
- Composio connection alias: `meliza-instagram`
- Status: **verified working**
- Supported flow: create image media -> publish -> independently verify permalink.
- Requirement: use fresh/varied creative; do not repeatedly reuse the same image.
- Verified public posts include:
  - https://www.instagram.com/p/De2PuZiiYl2/ — "The Fork in the Road 🧭"
  - https://www.instagram.com/p/De2PsgKnXZj/ — "Your Next Move Is Smaller Than You Think. ✍🏾"

### Facebook

- Connected account alias: `meliza-facebook`
- Managed Page: **Innocent labs**
- Page ID: `1490707094122032`
- Category: Science, technology and engineering
- Verified page capabilities include `CREATE_CONTENT` and `MANAGE`.
- Status: **verified working**
- Supported flow: publish photo post to the Page -> retain composite post ID -> independently verify permalink.
- Verified public posts include:
  - https://www.facebook.com/122097480429523427/posts/122097480165523427 — "The Fork in the Road 🧭"
  - https://www.facebook.com/122097480429523427/posts/122097480159523427 — "Your Next Move Is Smaller Than You Think. ✍🏾"
- Facebook publishing applies to the Page, not the personal profile.

## Verified creative assets

Fresh creative has been generated for recent social posts. Stable Shopify CDN copies used by social publishing:

- https://cdn.shopify.com/s/files/1/0742/0991/9011/files/meliza-first-income-clarity-direction.jpg?v=1792781535
- https://cdn.shopify.com/s/files/1/0742/0991/9011/files/meliza-first-income-clarity-next-move.jpg?v=1792781548

Do not assume these are the only available creatives. Generate or source new on-brand creative for future posts when practical.

## Shopify product source of truth

- Product: **First Income Clarity**
- Product GID: `gid://shopify/Product/7300795858979`
- Variant GID: `gid://shopify/ProductVariant/44067149414435`
- Status: ACTIVE
- Product type: Digital course
- Variant price: KES 2,500.00
- Customer storefront: https://bi2u3y-q1.myshopify.com/products/first-income-clarity
- Admin product URL: https://admin.shopify.com/products/7300795858979
- Featured image: https://cdn.shopify.com/s/files/1/0742/0991/9011/files/image.png?v=1792694373

## Other publishing destinations

The publishing registry is intended to cover regional and global channels, but a destination is **not** automatically authorized merely because it is discovered. Meliza may publish only through a legitimate supported API or authenticated integration that the owner has explicitly authorized.

Previously reported account setup includes Locanto, PigiaMe, Craigslist, and Quora. KenyaClassified was previously reported as having an automated publishing tool. Other destinations previously investigated (including KobStore, List It Global, Bizilisting, Foxy Ads, AdHub Kenya, FungaDeal, Esencial, and Soko Ads) must remain draft/manual until a legitimate supported publishing route is verified and authorized.

## YouTube recovery

- YouTube API upload quota failures (`HTTP 429` with video-insert quota wording) are a route-switch signal, not a reason to retry in a loop.
- Preserve the publishing job and switch to the authenticated YouTube Studio/browser route when the authorized Browserless profile is available.
- Browserless profile: `meliza-youtube` (configured by `BROWSERLESS_YOUTUBE_PROFILE` when present).
- Never request/store credentials or bypass CAPTCHA, Cloudflare/Turnstile, MFA, phone verification, identity checks, or other anti-abuse controls.
- If the profile is unavailable or human verification appears, record a blocker instead of claiming publication.

## Durable execution rules

For every publishing attempt, record:
`timestamp, site/platform, action, title/content identifier, status, live URL if available, reason/blocker if skipped or failed`.

Allowed statuses:
`published`, `attempted`, `skipped`, `failed`, `blocked-human-verification`.

After a run, report totals and each destination's verified result. Never invent a URL or claim publication without independent verification.

## Deployment/runtime notes

- Vercel project: `agentmeliza`
- Project ID: `prj_9D5lRFGJMeWNsntrnE5MVBX1itgA`
- Team ID: `team_d3rsfV62HAV7OgLaYfN2J0Y8`
- Production alias: `agentmeliza.vercel.app`
- Framework: Next.js
- Node: 24.x
- EVE: 0.66.0
- AI SDK: 7.0.112
- Current model configuration: `@ai-sdk/google` -> `gemini-3.5-flash-lite`
- Meliza should use direct provider configuration rather than requiring Vercel AI Gateway/card verification.
- EVE file memory requires Vercel Blob when `fileMemory()` is used; the deployment must provide the required `EVE_MEMORY_BLOB_STORE_ID` or use an explicitly configured alternative backend.

## Operational principle

Prefer real, authorized, verifiable automation. Adapt content per platform, respect platform/category rules and rate limits, avoid spam and deceptive claims, and stop for human-only verification rather than attempting to bypass it.
