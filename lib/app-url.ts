export function appBaseUrl(): string {
  const configured = process.env.APP_URL;
  if (!configured) throw new Error("APP_URL must be set to the public base URL of this Meliza deployment.");

  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error("APP_URL must be a valid absolute URL.");
  }
  if (
    (url.protocol !== "https:" && !(process.env.NODE_ENV === "development" && url.protocol === "http:")) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== "/"
  ) {
    throw new Error("APP_URL must be an HTTPS origin without credentials, path, query, or fragment.");
  }
  return url.origin;
}
