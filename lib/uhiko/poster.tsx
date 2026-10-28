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

function Svg({ d, size = 34, color }: { d: string; size?: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d={d} fill={color} />
    </svg>
  );
}
const ICON_PIN = "M12 2C8.1 2 5 5.1 5 9c0 5.2 7 13 7 13s7-7.8 7-13c0-3.9-3.1-7-7-7zm0 9.5a2.5 2.5 0 110-5 2.5 2.5 0 010 5z";
const ICON_AREA = "M3 3h7v2H5v5H3V3zm18 0v7h-2V5h-5V3h7zM3 21v-7h2v5h5v2H3zm18 0h-7v-2h5v-5h2v7z";
const ICON_HOME = "M12 3l9 8h-3v9h-5v-6h-2v6H6v-9H3l9-8z";
const ICON_PHONE = "M6.6 10.8a15.1 15.1 0 006.6 6.6l2.2-2.2a1 1 0 011-.25 11.4 11.4 0 003.6.6 1 1 0 011 1V20a1 1 0 01-1 1A17 17 0 013 4a1 1 0 011-1h3.5a1 1 0 011 1c0 1.25.2 2.45.6 3.6a1 1 0 01-.25 1l-2.25 2.2z";

function PhotoBox({ p, w, h }: { p: PosterData; w: number; h: number }) {
  return p.photo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={p.photo} width={w} height={h} style={{ width: w, height: h, objectFit: "cover" }} />
  ) : (
    <div style={{ display: "flex", width: w, height: h, background: `linear-gradient(135deg, ${GREEN}, #1F5C4A)` }} />
  );
}

/** Layout "c": full-bleed magazine cover with a corner sash, glass footer and price-per-acre badge. */
function Signature({ p }: { p: PosterData }) {
  const c = contact();
  const big = p.headline.length > 55;
  return (
    <div style={{ display: "flex", position: "relative", width: W, height: H, fontFamily: "Montserrat", color: "#fff", background: GREEN, overflow: "hidden" }}>
      <Photo p={p} height={H} />
      <div style={{ display: "flex", position: "absolute", top: 0, left: 0, width: W, height: H, backgroundImage: "linear-gradient(180deg, rgba(8,24,19,0.72) 0%, rgba(8,24,19,0) 24%, rgba(8,24,19,0) 42%, rgba(8,24,19,0.86) 70%, rgba(8,24,19,0.98) 100%)" }} />
      <div style={{ display: "flex", position: "absolute", top: 0, right: 0, width: 300, height: 300, overflow: "hidden" }}>
        <div style={{ display: "flex", position: "absolute", top: 62, right: -92, width: 420, justifyContent: "center", background: GOLD, color: GREEN, fontSize: 30, fontWeight: 900, letterSpacing: 4, padding: "14px 0", transform: "rotate(45deg)" }}>
          {p.dealLabel}
        </div>
      </div>
      <div style={{ display: "flex", position: "absolute", top: 56, left: 56, alignItems: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={LOGO_URL} width={64} height={64} style={{ width: 64, height: 64, borderRadius: 999, objectFit: "cover", border: `3px solid ${GOLD}` }} />
        <div style={{ display: "flex", flexDirection: "column", marginLeft: 16 }}>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 900, letterSpacing: 8 }}>UHIKO</div>
          <div style={{ display: "flex", width: 120, height: 4, background: GOLD, marginTop: 6 }} />
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", position: "absolute", left: 56, right: 56, bottom: 176 }}>
        <div style={{ display: "flex", alignSelf: "flex-start", background: "rgba(247,243,234,0.14)", border: "2px solid rgba(232,185,49,0.7)", color: GOLD, fontSize: 26, fontWeight: 700, letterSpacing: 3, padding: "8px 22px", borderRadius: 999 }}>
          {p.typeLabel.toUpperCase()}
        </div>
        <div style={{ display: "flex", fontSize: big ? 54 : 66, fontWeight: 900, lineHeight: 1.08, marginTop: 22 }}>{p.headline}</div>
        <div style={{ display: "flex", alignItems: "center", marginTop: 20 }}>
          <Svg d={ICON_PIN} size={38} color={GOLD} />
          <div style={{ display: "flex", fontSize: 34, marginLeft: 12, color: "#E4EEE9" }}>{[p.location, p.sizeText].filter(Boolean).join("   •   ")}</div>
        </div>
        {p.priceText ? <div style={{ display: "flex", fontSize: 104, fontWeight: 900, color: GOLD, lineHeight: 1, marginTop: 26 }}>{p.priceText}</div> : null}
        {p.perUnitText ? (
          <div style={{ display: "flex", alignSelf: "flex-start", marginTop: 18, background: GOLD, color: GREEN, fontSize: 28, fontWeight: 700, padding: "8px 20px", borderRadius: 10 }}>
            {`Works out at ${p.perUnitText}`}
          </div>
        ) : null}
      </div>
      <div style={{ display: "flex", position: "absolute", left: 0, right: 0, bottom: 0, height: 132, background: "rgba(14,42,34,0.94)", borderTop: `4px solid ${GOLD}`, alignItems: "center", justifyContent: "space-between", padding: "0 56px" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Svg d={ICON_PHONE} size={44} color={GOLD} />
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 18 }}>
            <div style={{ display: "flex", fontSize: 24, color: "#CFE3DA" }}>{`Call ${c.name}`}</div>
            <div style={{ display: "flex", fontSize: 46, fontWeight: 900, color: "#fff" }}>{c.phone || "uhiko.com"}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 900, color: GOLD }}>uhiko.com</div>
          <div style={{ display: "flex", fontSize: 22, color: "#CFE3DA", marginTop: 4 }}>{`Ref UH-${p.id}`}</div>
        </div>
      </div>
    </div>
  );
}

function Chip({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", background: "#fff", border: "2px solid rgba(14,42,34,0.15)", borderRadius: 999, padding: "10px 22px", marginRight: 14, marginTop: 10, fontSize: 28, fontWeight: 700, color: GREEN }}>
      <Svg d={icon} size={30} color={GREEN} />
      <div style={{ display: "flex", marginLeft: 10 }}>{text}</div>
    </div>
  );
}

/** Layout "d": light cream card with an offset gold frame, overlapping price tag and info chips. */
function Frame({ p }: { p: PosterData }) {
  const c = contact();
  const big = p.headline.length > 55;
  return (
    <div style={{ display: "flex", flexDirection: "column", position: "relative", width: W, height: H, background: CREAM, fontFamily: "Montserrat", color: GREEN }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "44px 56px 0" }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={LOGO_URL} width={56} height={56} style={{ width: 56, height: 56, borderRadius: 999, objectFit: "cover", border: `3px solid ${GOLD}` }} />
          <div style={{ display: "flex", fontSize: 32, fontWeight: 900, letterSpacing: 7, marginLeft: 16 }}>UHIKO</div>
        </div>
        <div style={{ display: "flex", background: GREEN, color: GOLD, fontSize: 26, fontWeight: 900, letterSpacing: 3, padding: "10px 24px", borderRadius: 999 }}>{p.dealLabel}</div>
      </div>
      <div style={{ display: "flex", position: "relative", margin: "30px 56px 0", width: 968, height: 600 }}>
        <div style={{ display: "flex", position: "absolute", top: 18, left: 18, width: 968, height: 600, border: `6px solid ${GOLD}`, borderRadius: 28 }} />
        <div style={{ display: "flex", position: "relative", width: 968, height: 600, borderRadius: 28, overflow: "hidden" }}>
          <PhotoBox p={p} w={968} h={600} />
        </div>
        {p.priceText ? (
          <div style={{ display: "flex", position: "absolute", left: -20, bottom: -34, background: GREEN, color: GOLD, padding: "16px 34px", borderRadius: 18, fontSize: 66, fontWeight: 900, border: `4px solid ${CREAM}` }}>{p.priceText}</div>
        ) : null}
      </div>
      <div style={{ display: "flex", flexDirection: "column", padding: "74px 56px 0" }}>
        <div style={{ display: "flex", fontSize: big ? 44 : 52, fontWeight: 900, lineHeight: 1.12 }}>{p.headline}</div>
        <div style={{ display: "flex", flexWrap: "wrap", marginTop: 16 }}>
          <Chip icon={ICON_PIN} text={p.location} />
          {p.sizeText ? <Chip icon={ICON_AREA} text={p.sizeText} /> : null}
          <Chip icon={ICON_HOME} text={p.typeLabel} />
        </div>
        {p.perUnitText ? <div style={{ display: "flex", marginTop: 22, fontSize: 28, fontWeight: 700, color: "#4B6B5E" }}>{`Works out at ${p.perUnitText}`}</div> : null}
      </div>
      <div style={{ display: "flex", position: "absolute", left: 0, right: 0, bottom: 0, height: 140, background: GREEN, color: CREAM, alignItems: "center", justifyContent: "space-between", padding: "0 56px", borderTop: `6px solid ${GOLD}` }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <Svg d={ICON_PHONE} size={44} color={GOLD} />
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 18 }}>
            <div style={{ display: "flex", fontSize: 24, color: "#CFE3DA" }}>{`Call ${c.name}`}</div>
            <div style={{ display: "flex", fontSize: 46, fontWeight: 900 }}>{c.phone || "uhiko.com"}</div>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
          <div style={{ display: "flex", fontSize: 34, fontWeight: 900, color: GOLD }}>uhiko.com</div>
          <div style={{ display: "flex", fontSize: 22, color: "#CFE3DA", marginTop: 4 }}>{`Ref UH-${p.id}`}</div>
        </div>
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


export type PosterLayout = "a" | "b" | "c" | "d";

export async function renderPoster(p: PosterData, layout: PosterLayout = "a"): Promise<Buffer> {
  const node =
    layout === "a" ? <Editorial p={p} /> : layout === "b" ? <Bold p={p} /> : layout === "c" ? <Signature p={p} /> : <Frame p={p} />;
  const png = new ImageResponse(node, { width: W, height: H, fonts: await fonts() });
  return sharp(Buffer.from(await png.arrayBuffer())).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
}
