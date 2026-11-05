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

The web app manifest is served by Next.js at `/manifest.webmanifest`. The app uses the existing `/icon.svg` artwork and the generated Apple touch icon. No service worker or offline caching is enabled: installation does not make the AI features work offline, and private conversations are not cached by this PWA setup.

## Configure and deploy

Edit `agent/instructions.md` to define Meliza's identity and response guidelines, and `agent/agent.ts` for model and runtime configuration. Add capabilities under `agent/`.

For deployment, follow the [eve deployment documentation](https://eve.dev/docs/guides/deployment/vercel). After deploying, visit the production site over HTTPS and test installation in a browser that supports PWAs.
