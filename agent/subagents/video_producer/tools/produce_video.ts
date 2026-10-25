import { put } from "@vercel/blob";
import { defineTool } from "eve/tools";
import { z } from "zod";

// The free video pipeline: a Ken-Burns pan/zoom over the listing's real
// poster photo, a synced voiceover from Microsoft Edge TTS (free, no API
// key, no account), and burned-in captions generated from Edge TTS's own
// sentence timestamps. $0 marginal cost per clip, no GPU, no paid
// AI-video API, no owner approval needed — see instructions.md "Current
// status" for how this fits next to the still-unconnected Replicate/Seedance
// path. Validated end-to-end in a real Vercel Sandbox before being wired in
// here: 1080x1920 h264+aac output, correct duration, ~20-30s of active CPU.
const RENDER_SCRIPT = `
import asyncio, json, subprocess, sys, urllib.request
import edge_tts

OUT_DIR = "/workspace/render"
VOICE = "en-US-AriaNeural"

with open(f"{OUT_DIR}/job.json") as f:
    job = json.load(f)

image_url = job["posterImageUrl"]
script_text = job["script"]

async def synth():
    communicate = edge_tts.Communicate(script_text, VOICE)
    submaker = edge_tts.SubMaker()
    with open(f"{OUT_DIR}/voice.mp3", "wb") as f:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] in ("WordBoundary", "SentenceBoundary"):
                submaker.feed(chunk)
    with open(f"{OUT_DIR}/subs.srt", "w") as f:
        f.write(submaker.get_srt())

req = urllib.request.Request(image_url, headers={"User-Agent": "Meliza-VideoProducer/1.0"})
with urllib.request.urlopen(req, timeout=30) as resp, open(f"{OUT_DIR}/photo.jpg", "wb") as out:
    out.write(resp.read())

asyncio.run(synth())

probe = subprocess.run(
    ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=nk=1:nw=1", f"{OUT_DIR}/voice.mp3"],
    capture_output=True, text=True, check=True,
)
duration = float(probe.stdout.strip())
fps = 30
frames = max(int(duration * fps), 1)

# scale+crop to fill a 1080x1920 (9:16) canvas regardless of the source
# photo's actual aspect ratio, THEN zoompan — avoids stretching/distorting
# listing photos that aren't already vertical.
filter_complex = (
    f"[0:v]scale=2160:3840:force_original_aspect_ratio=increase,"
    f"crop=2160:3840,"
    f"zoompan=z='min(zoom+0.0008,1.3)':d={frames}:s=1080x1920:fps={fps}[zoomed];"
    f"[zoomed]subtitles={OUT_DIR}/subs.srt:force_style="
    f"'FontName=Arial,FontSize=20,PrimaryColour=&HFFFFFF&,OutlineColour=&H000000&,"
    f"BorderStyle=3,Alignment=2,MarginV=120'[v]"
)

result = subprocess.run(
    [
        "ffmpeg", "-y",
        "-loop", "1", "-i", f"{OUT_DIR}/photo.jpg",
        "-i", f"{OUT_DIR}/voice.mp3",
        "-filter_complex", filter_complex,
        "-map", "[v]", "-map", "1:a",
        "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac",
        "-shortest", "-t", str(duration),
        f"{OUT_DIR}/out.mp4",
    ],
    capture_output=True, text=True,
)
if result.returncode != 0:
    print(result.stdout)
    print(result.stderr, file=sys.stderr)
    sys.exit(result.returncode)

print(f"DURATION:{duration}")
`.trim();

export default defineTool({
  description:
    "Render a free short vertical (9:16, 1080x1920) property video: a Ken-Burns pan/zoom over the listing's real poster photo, a synced voiceover from Microsoft Edge TTS (free, no key, no owner approval), and burned-in captions from Edge TTS's own sentence timestamps. Zero marginal cost per clip, no GPU, nothing paid. Pass a SPOKEN narration script — plain sentences, no emoji, no hashtags, no URLs (TTS will read those aloud literally) — this is distinct from the on-screen caption text used in the actual post, which keeps its normal emoji/hashtag style. Returns a public video URL to publish from, plus its duration.",
  inputSchema: z.object({
    posterImageUrl: z.string().url().describe("The listing's poster photo URL, from uhiko_listings (posterA or posterB)."),
    script: z
      .string()
      .min(20)
      .max(700)
      .describe(
        "Plain spoken narration — 2-4 short sentences, no emoji/hashtags/URLs. Keep it under ~350 characters for a ~15-20s clip; longer scripts make longer, slower-paced videos.",
      ),
    listingId: z.union([z.number().int(), z.string().min(1)]).describe("The listing id, used only to name the uploaded file."),
  }),
  async execute({ posterImageUrl, script, listingId }, ctx) {
    const sandbox = await ctx.getSandbox();
    await sandbox.writeTextFile({ path: "render/job.json", content: JSON.stringify({ posterImageUrl, script }) });
    await sandbox.writeTextFile({ path: "render/render.py", content: RENDER_SCRIPT });

    const result = await sandbox.run({ command: "python3 render/render.py" });
    if (result.exitCode !== 0) {
      throw new Error(`Video render failed (exit ${result.exitCode}): ${result.stderr || result.stdout}`);
    }

    const durationMatch = result.stdout.match(/DURATION:([\d.]+)/);
    const durationSeconds = durationMatch ? Number.parseFloat(durationMatch[1]) : null;

    const video = await sandbox.readBinaryFile({ path: "render/out.mp4" });
    if (!video || video.byteLength === 0) {
      throw new Error("The render command exited 0 but produced no video file.");
    }
    const MAX_BYTES = 80 * 1024 * 1024; // sanity cap; a 15-25s 1080p clip here runs a few MB
    if (video.byteLength > MAX_BYTES) {
      throw new Error(`Rendered video is ${video.byteLength} bytes, over the ${MAX_BYTES}-byte sanity cap. Shorten the script.`);
    }

    const blob = await put(`video-posts/uh-${listingId}-${Date.now()}.mp4`, Buffer.from(video), {
      access: "public",
      contentType: "video/mp4",
    });

    await sandbox.removePath({ path: "render", recursive: true, force: true });

    return { videoUrl: blob.url, durationSeconds, sizeBytes: video.byteLength };
  },
});
