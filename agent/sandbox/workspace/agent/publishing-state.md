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

## Publishing pipeline (2026-10-25)

- `agent/schedules/daily-social-publishing.ts` is the single daily trigger for social posts across Facebook/Instagram/TikTok, replacing the former `uhiko-facebook-post.ts` (stale, Facebook-only, predated the mixed-brand Instagram policy) and `uhiko-new-listings.ts` (merged in). `daily-publishing.ts` is unrelated — it's First Income Clarity's classifieds/directory-site publishing via `publish_listing`, not social.
- Every drafted caption now passes through the `qa_reviewer` subagent before publishing.
- **First Income Clarity publishing paused (owner instruction, 2026-10-25).** Uhiko Properties is the sole active social-publishing priority across all channels. `daily-social-publishing.ts` currently runs Uhiko only.

## Verified social publishing

### Instagram
- Account: `@innocentlabs4`
- Composio connection alias: `meliza-instagram`
- Status: **verified working**
- Supported flow: create image media -> publish -> independently verify permalink.
- As of 2026-10-25 this account carries both brands (Uhiko Properties and First Income Clarity), owner-confirmed.
- Verified public posts include:
  - https://www.instagram.com/p/De2PuZiiYl2/
  - https://www.instagram.com/p/De2PsgKnXZj/
  - https://www.instagram.com/p/De5aoHzCXdh/
  - https://www.instagram.com/p/De8PE73DYv7/
  - https://www.instagram.com/p/De-YZqKiSVW/

### Facebook
- Connected account alias: `meliza-facebook`
- Managed Page: **Innocent labs**
- Page ID: `1490707094122032`
- Status: **verified working**
- Supported flow: publish photo post to the Page -> retain composite post ID -> independently verify permalink.

### TikTok (via WoopSocial)
- TikTok account: `@pesazako` ("Pesa Zako")
- Route: Composio `woop_social` connection -> WoopSocial TikTok app.
- WoopSocial social_account_id: `187715468390301696`
- Status: **verified working 2026-10-25** — test post published and confirmed live: https://www.tiktok.com/@pesazako/video/7700394253507218696
- Media upload requires `file.s3key`; plain URLs are rejected.
- Approval: autonomous, tightly scoped to this TikTok account.

## Verified creative assets
- https://cdn.shopify.com/s/files/1/0742/0991/9011/files/meliza-first-income-clarity-direction.jpg?v=1792781535
- https://cdn.shopify.com/s/files/1/0742/0991/9011/files/meliza-first-income-clarity-next-move.jpg?v=1792781548

## Shopify product source of truth
- Product: **First Income Clarity**
- Product GID: `gid://shopify/Product/7300795858979`
- Variant GID: `gid://shopify/ProductVariant/44067149414435`
- Status: ACTIVE
- Variant price: KES 2,500.00
- Customer storefront: https://bi2u3y-q1.myshopify.com/products/first-income-clarity

## Other publishing destinations
The publishing registry covers regional and global channels, but a destination is not automatically authorized merely because it is discovered. Meliza may publish only through a legitimate supported API or authenticated integration that the owner has explicitly authorized.

Previously reported account setup includes Locanto, PigiaMe, Craigslist, and Quora. KenyaClassified was previously reported as having an automated publishing tool. Other destinations previously investigated must remain draft/manual until a legitimate supported publishing route is verified and authorized.

## YouTube recovery
- YouTube API upload quota failures (`HTTP 429`) are a route-switch signal, not a reason to retry in a loop.
- Never bypass CAPTCHA, Cloudflare/Turnstile, MFA, phone verification, identity checks, or other anti-abuse controls.
- If the profile is unavailable or human verification appears, record a blocker instead of claiming publication.

## Durable execution rules
For every publishing attempt, record: `timestamp, site/platform, action, title/content identifier, status, live URL if available, reason/blocker if skipped or failed`.

Allowed statuses: `published`, `attempted`, `skipped`, `failed`, `blocked-human-verification`.

After a run, report totals and each destination's verified result. Never invent a URL or claim publication without independent verification.

## Deployment/runtime notes
- Public app URL: set `APP_URL` to the canonical HTTPS origin for the deployment.
- Framework: Next.js
- Node: 24.x
- EVE: 0.66.0
- AI SDK: 7.0.112
- Current model configuration: `@ai-sdk/google` -> `gemini-3.5-flash-lite`
- Meliza uses direct provider configuration rather than a managed AI gateway.
- App-managed objects use the configured S3-compatible store. Public media URLs use `S3_PUBLIC_BASE_URL`; other app objects must remain private.

## Operational principle
Prefer real, authorized, verifiable automation. Adapt content per platform, respect platform/category rules and rate limits, avoid spam and deceptive claims, and stop for human-only verification rather than attempting to bypass it.
