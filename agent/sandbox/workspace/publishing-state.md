# Meliza Publishing State

Runtime sandbox copy of the durable publishing state. This file contains non-secret operational state only; never add credentials, OTPs, cookies, session tokens, or API keys.

- Agent: Meliza / agentmeliza
- First Income Clarity: KES 2,500 one-time; lifetime access; no upsells; https://groketer.com/firstincome
- First Income Clarity social publishing is paused by owner instruction dated 2026-10-25; Uhiko Properties is the active social priority.
- Instagram: @innocentlabs4 via meliza-instagram; verified working.
- Facebook Page: Innocent labs, Page ID 1490707094122032, via meliza-facebook; verified working.
- TikTok: @pesazako via WoopSocial, social_account_id 187715468390301696; verified working.
- Publishing rule: only report published after independent verification of the live post/permalink. Never invent URLs or claim publication without verification.
- Runtime: Node 24.x. Set `APP_URL` to the canonical HTTPS origin and configure the S3-compatible object store; do not assume Vercel-specific hosting.
- HostAfrica authentication is configured by the production HOSTAFRICA_API_TOKEN secret; never expose its value.
