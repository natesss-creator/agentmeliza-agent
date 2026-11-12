import { betterAuth } from "better-auth";
import { Pool } from "pg";

const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;
// `next build` imports route modules to collect page data; configuration is only
// enforced at runtime so builds (and preview builds) work without secrets.
const IS_BUILD = process.env.NEXT_PHASE === "phase-production-build";
const DEVELOPMENT_ALLOWED_HOSTS = ["localhost:*", "127.0.0.1:*", "*.app.github.dev"];

function getAllowedHosts(): string[] {
  if (process.env.NODE_ENV === "development") {
    return DEVELOPMENT_ALLOWED_HOSTS;
  }
  if (IS_BUILD && !process.env.APP_URL) return ["localhost"];
  const appUrl = process.env.APP_URL;
  if (!appUrl) {
    throw new Error("APP_URL must be configured with the public URL of this deployment.");
  }
  let hostname: string;
  try {
    const url = new URL(appUrl);
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    ) {
      throw new Error();
    }
    hostname = url.host;
  } catch {
    throw new Error("APP_URL must be an HTTPS origin without a path, query, or fragment.");
  }
  const extraHosts = (process.env.APP_ALLOWED_HOSTS ?? "")
    .split(",")
    .map((host) => host.trim())
    .filter(Boolean);
  return Array.from(new Set([hostname, ...extraHosts]));
}

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === "development") return `development-${name}`;
  if (IS_BUILD) return `build-placeholder-${name}`;
  throw new Error(`Missing required environment variable: ${name}`);
}

function getDatabasePool(): Pool | undefined {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString && IS_BUILD) return undefined;
  if (!connectionString && process.env.NODE_ENV !== "development") {
    throw new Error("DATABASE_URL must be configured with a persistent PostgreSQL database.");
  }
  if (!connectionString) return undefined;

  return new Pool({
    connectionString,
    max: 5,
    connectionTimeoutMillis: 10_000,
    idleTimeoutMillis: 30_000,
  });
}

export const auth = betterAuth({
  database: getDatabasePool(),
  baseURL: {
    allowedHosts: getAllowedHosts(),
    protocol: process.env.NODE_ENV === "development" ? "auto" : "https",
  },
  secret: requireEnvironmentVariable("BETTER_AUTH_SECRET"),
  session: {
    expiresIn: SESSION_MAX_AGE_SECONDS,
    disableSessionRefresh: true,
    cookieCache: {
      enabled: true,
      maxAge: SESSION_MAX_AGE_SECONDS,
      refreshCache: false,
      strategy: "jwe",
    },
  },
  socialProviders: {
    google: {
      clientId: requireEnvironmentVariable("GOOGLE_OAUTH_CLIENT_ID"),
      clientSecret: requireEnvironmentVariable("GOOGLE_OAUTH_CLIENT_SECRET"),
    },
  },
});
