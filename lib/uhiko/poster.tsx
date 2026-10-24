import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import sharp from "sharp";
import type { PosterData } from "./poster-data";

/** Uhiko listing posters, 1080x1350 (Instagram 4:5). Layout "a" editorial, "b" bold. */
const W = 1080;
const H = 1350;
const GREEN = "#0E2A22";
const GOLD = "#E8B931";
const CREAM = "#F7F3EA";

// Stable Facebook Graph "picture" edge for the connected Innocent labs Page
// (Page ID 1490707094122032, meliza-facebook connection). This proxy URL
// always redirects to the Page's current profile photo, so it never goes
// stale the way a signed CDN link from a single API call would.
const LOGO_URL = "https://graph.facebook.com/1490707094122032/picture?type=large&width=200&height=200";

function contact() {
  const name = [process.env.UHIKO_CONTACT_FIRST_NAME, process.env.UHIKO_CONTACT_LAST_NAME].filter(Boolean).join(" ") || "Uhiko Properties";
  const raw = process.env.UHIKO_CONTACT_PHONE || "";
  const phone = raw ? `0${raw.slice(0, 3)} ${raw.slice(3, 6)} ${raw.slice(6)}` : "";
  return { name, phone };
}

function Photo({ p, height }: { p: PosterData; height: number }) {
  return p.photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.photo} width={W} height={height} style={{ width: W, height, objectFit: "cover" }} />
  ) : (
    <div style={{ display: "flex", width: W, height, background: `linear-gradient(135deg, ${GREEN}, #1F5C4A)` }} />
  );
}

function Editorial({ p }: { p: PosterData }) {
  const c = contact();
  const photoH = 800;
  return (
    <div style={{ display: "flex", flexDirection: "column", width: W, height: H, background: GREEN, fontFamily: "Montserrat" }}>
      <div style={{ display: "flex", position: "relative", width: W, height: photoH }}>
        <Photo p={p} height={photoH} />
        <div style={{ display: "flex", position: "absolute", top: 48, left: 48, background: GOLD, color: GREEN, fontSize: 30, fontWeight: 700, padding: "12px 26px", borderRadius: 999, letterSpacing: 2 }}>
          {p.dealLabel}
        </div>
        <div style={{ display: "flex", position: "absolute", top: 48, right: 48, background: "rgba(14,42,34,0.82)", color: CREAM, fontSize: 28, padding: "12px 24px", borderRadius: 999 }}>
          {p.typeLabel}
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "44px 56px 40px", color: CREAM }}>
        <div style={{ display: "flex", fontSize: p.headline.length > 55 ? 44 : 52, fontWeight: 700, lineHeight: 1.15 }}>{p.headline}</div>
        <div style={{ display: "flex", alignItems: "baseline", marginTop: 26 }}>
          {p.priceText ? <div style={{ display: "flex", fontSize: 72, fontWeight: 800, color: GOLD }}>{p.priceText}</div> : null}
        </div>
        <div style={{ display: "flex", fontSize: 32, marginTop: 14, color: "#CFE3DA" }}>
          {[p.location, p.sizeText].filter(Boolean).join("  •  ")}
        </div>
        <div style={{ display: "flex", flex: 1 }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "2px solid rgba(232,185,49,0.5)", paddingTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={LOGO_URL} width={52} height={52} style={{ width: 52, height: 52, borderRadius: 999, objectFit: "cover", border: `2px solid ${GOLD}` }} />
            <div style={{ display: "flex", fontSize: 26, marginTop: 0 }}>uhiko.com</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
            <div style={{ display: "flex", fontSize: 28 }}>{c.name}</div>
            {c.phone ? <div style={{ display: "flex", fontSize: 38, fontWeight: 800, marginTop: 4 }}>{c.phone}</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function Bold({ p }: { p: PosterData }) {
  const c = contact();
  return (
    <div style={{ display: "flex", position: "relative", width: W, height: H, fontFamily: "Montserrat", color: "#fff" }}>
      <Photo p={p} height={H} />
      <div style={{ display: "flex", position: "absolute", top: 0, left: 0, width: W, height: H, backgroundImage: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 28%, rgba(0,0,0,0.15) 50%, rgba(8,24,19,0.92) 78%, rgba(8,24,19,0.98) 100%)" }} />
      <div style={{ display: "flex", position: "absolute", top: 52, left: 56, right: 56, justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", background: "rgba(8,24,19,0.55)", padding: "8px 16px", borderRadius: 999 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_URL} width={38} height={38} style={{ width: 38, height: 38, borderRadius: 999, objectFit: "cover" }} />
        </div>
        <div style={{ display: "flex", background: GOLD, color: GREEN, fontSize: 28, fontWeight: 900, padding: "10px 24px", letterSpacing: 2 }}>{p.dealLabel}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", position: "absolute", left: 56, right: 56, bottom: 170 }}>
        <div style={{ display: "flex", fontSize: 30, color: GOLD, letterSpacing: 2 }}>{p.typeLabel.toUpperCase()}{p.sizeText ? `  ·  ${p.sizeText.toUpperCase()}` : ""}</div>
        <div style={{ display: "flex", fontSize: p.headline.length > 55 ? 50 : 60, fontWeight: 800, lineHeight: 1.1, marginTop: 14 }}>{p.headline}</div>
        <div style={{ display: "flex", fontSize: 34, marginTop: 18, color: "#DDE8E3" }}>{p.location}</div>
        {p.priceText ? <div style={{ display: "flex", fontSize: 96, fontWeight: 900, color: GOLD, marginTop: 18 }}>{p.priceText}</div> : null}
      </div>
      <div style={{ display: "flex", position: "absolute", left: 0, right: 0, bottom: 0, height: 130, background: GOLD, color: GREEN, alignItems: "center", justifyContent: "space-between", padding: "0 56px" }}>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 26 }}>Call {c.name}</div>
          <div style={{ display: "flex", fontSize: 44, fontWeight: 900 }}>{c.phone || "uhiko.com"}</div>
        </div>
        <div style={{ display: "flex", fontSize: 34, fontWeight: 800 }}>uhiko.com</div>
      </div>
    </div>
  );
}

let fontsPromise: Promise<{ name: string; data: Buffer; weight: 400 | 700 | 900; style: "normal" }[]> | null = null;
function fonts() {
  fontsPromise ??= Promise.all(
    ([400, 700, 900] as const).map(async (weight) => ({
      name: "Montserrat",
      data: await readFile(join(process.cwd(), "assets/fonts", `montserrat-latin-${weight}-normal.woff`)),
      weight,
      style: "normal" as const,
    })),
  );
  return fontsPromise;
}


export async function renderPoster(p: PosterData, layout: "a" | "b"): Promise<Buffer> {
  const png = new ImageResponse(layout === "a" ? <Editorial p={p} /> : <Bold p={p} />, { width: W, height: H, fonts: await fonts() });
  return sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
}
