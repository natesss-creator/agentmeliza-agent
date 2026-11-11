# Meliza

Meliza is an [eve](https://eve.dev) agent with a Next.js web app.

## Run locally

This project uses Node.js 24 and pnpm 12. Install dependencies and start the development server from the project root:

```bash
corepack enable
pnpm install
pnpm dev
```

Open the local URL printed by Next.js. The eve development TUI is also available with `eve dev` when working on the agent itself.

Useful checks and commands:

```bash
pnpm typecheck
pnpm build
pnpm start
```

## Install Meliza

Meliza can be installed from supported browsers when served over HTTPS (or from localhost during development). Open the app and select **Install Meliza**. If the browser does not expose a native installation prompt, use its browser menu and choose **Install app** or **Add to Home Screen**. On iPhone and iPad, open the site in Safari, tap **Share**, then **Add to Home Screen**.

The web app manifest is served by Next.js at `/manifest.webmanifest` and includes 192×192 and 512×512 PNG icons for install prompts and launchers. The app also uses `/icon.svg` and a generated Apple touch icon. No service worker or offline caching is enabled: installation does not make the AI features work offline, and private conversations are not cached by this PWA setup.

## Access and use Meliza

The homepage is open to visitors for answers, research, planning, and private drafts. Public chats have no social-account access, publishing tools, or media uploads. Sign in with Google for private sessions and account-specific tools. From a chat, choose a feature card or type a request in the message box. A feature card adds an example prompt to the composer without replacing existing text; review the prompt and send it when ready. Use **Guide & features** in the chat header to reopen the catalog at any time.

The feature guide covers Uhiko property marketing and social publishing, campaign research and copy, short-form property videos, listing-channel research, SEO reviews, content QA and compliance, YouTube support, and publishing reports or system audits. Availability depends on configured integrations and permissions. First Income Clarity publishing is currently paused, so do not ask Meliza to publish that content until the owner resumes it. Use [Social accounts](/settings/connections) to manage authorized connections.

Social posting tools require a seller-assigned package. The only active package is Starter at $20 USD/month, with a limit of 20 posting actions per UTC day across connected accounts. The limit is reserved before a publishing action; failed or uncertain provider calls can still use a slot. Package assignments and atomic daily counters require `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. Set `MELIZA_SELLER_EMAILS` to a comma-separated list of verified seller sign-in emails; if unset, `OWNER_NOTIFY_EMAIL` is the only seller. The seller assigns Starter manually in **Social accounts** using the customer's account ID. Higher tiers are not active.

Meliza can read supported connected-account interactions and help identify potential customers, but automatic comment/DM replies remain disabled until approved reply templates and rules are configured. Craigslist and other classified listings are draft-only unless an authorized integration is enabled. Paid advertising is draft-only and must not be launched or spend money without explicit per-campaign approval. Daily email reporting requires a verified email, connected Gmail, and opt-in; delivery needs a configured dispatcher.

## Configure and deploy without Vercel or Docker

Meliza's web app runs as a standard Next.js Node server. Deploy it to any managed Node.js 24 host or your own server using its native Node/buildpack option—no Docker installation is needed on your laptop or the host. Persistent objects are stored in an S3-compatible bucket, authentication uses Google OAuth, and the model is called directly through Google's AI SDK.

1. Copy `.env.example` to `.env` and set real values. `APP_URL` must be the public HTTPS origin. Set `BETTER_AUTH_SECRET` to a unique random value of at least 32 characters.
2. In Google Cloud, configure an OAuth web client with authorized redirect URI `${APP_URL}/api/auth/callback/google`. For YouTube publishing, configure its OAuth redirect URI as `${APP_URL}/api/youtube/callback`; these may share a Google OAuth client if its scopes and consent configuration allow it.
3. Configure `S3_BUCKET`, `S3_REGION`, and credentials (or the host's default AWS credentials). For S3-compatible services, also set `S3_ENDPOINT`. Set `S3_PUBLIC_BASE_URL` to the HTTPS public base URL that serves objects from this bucket.
4. Configure bucket access so only the `user-media/*` and `video-posts/*` prefixes can be fetched publicly. Other objects—including OAuth credentials, posting logs, reports, and package data—must remain private. Public media URLs are needed by social platforms; only upload content you are authorized to share.
5. Add Composio and model API credentials for the integrations you plan to use. Package assignment and daily quota enforcement additionally require Upstash Redis settings.
6. Configure the host's build and start commands:

   ```bash
   corepack enable
   pnpm install --frozen-lockfile
   pnpm build
   pnpm start
   ```

For a Git-based host, use `pnpm install --frozen-lockfile && pnpm build` as the build command and `pnpm start` as the start command. Set all production environment variables in the host's secret/environment settings, and configure its custom domain with HTTPS. For local checks, run the commands above in a Node.js 24 environment.

Existing objects in Vercel Blob are not copied automatically. Before cutover, migrate any required objects while preserving their keys. Reconnect YouTube if its encrypted OAuth credentials are not migrated, and ask clients to opt in again if their report subscriptions are not migrated.

The Next.js Node service runs the web app and its API routes. If you deploy the authored eve schedules as well, run the eve self-hosted Node service separately with persistent workflow storage; do not rely on Vercel's workflow or cron services. See the [eve self-hosting guide](https://eve.dev/docs/guides/deployment/self-hosting) for its workflow persistence, route protection, and schedule requirements.

### Test before launch

- Run `pnpm typecheck` and `pnpm build`.
- Run `pnpm start` with staging environment values; verify `/`, Google sign-in, and `/api/meliza/status`.
- Connect a test social account through **Connect accounts**; confirm cancellation, popup-blocked fallback, and post-authorization refresh.
- Test one public media upload and verify its `S3_PUBLIC_BASE_URL` works from outside the server. Confirm private S3 objects are not publicly readable.
- Test chat, quota limits, daily-report opt-in, and YouTube OAuth only with test accounts. Keep paid promotion and real publishing disabled during smoke tests.
- After release, confirm HTTPS cookies and OAuth callbacks, restart the service to check persistence, and inspect health/errors before enabling any scheduled publishing.
