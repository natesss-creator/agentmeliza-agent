import { defineSandbox } from "eve/sandbox";
import { VercelSandbox } from "eve/sandbox/vercel";

// video_producer's free video pipeline (ffmpeg Ken-Burns pan/zoom + Microsoft
// Edge TTS voiceover + burned-in captions, see tools/produce_video.ts) needs
// two binaries the default sandbox image doesn't ship: ffmpeg and the
// edge-tts Python package. Both are baked into the snapshot once here, not
// installed per-render, so a live render only pays for the TTS call + ffmpeg
// encode (tested at ~20-30s of active CPU for a ~15-20s clip) — trivial
// against Vercel Sandbox's free Hobby-plan quota (5 Active-CPU hours and 420
// GB-hours/month) even at this agent's daily posting caps.
export const environment = VercelSandbox.environment({
  prepare: async (sandbox) => {
    const commands = [
      "sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg",
      "pip install --break-system-packages --quiet edge-tts",
    ];
    for (const command of commands) {
      const result = await sandbox.run({ command });
      if (result.exitCode !== 0) {
        throw new Error(`video_producer sandbox prepare failed (exit ${result.exitCode}): ${result.stderr || result.stdout}`);
      }
    }
  },
});

// Network policy is a tight allow-list, not the permissive default: the free
// pipeline only ever needs to (1) download the listing's poster photo from
// this project's own deployment, and (2) call Microsoft's free Edge TTS
// endpoint for voice synthesis. Nothing else should be reachable from here —
// there is no LLM call, no stock-footage fetch, no paid video API in this
// path (that's the whole point of the free path; see instructions.md).
const POSTER_HOST = process.env.VERCEL_PROJECT_PRODUCTION_URL || "agentmeliza.vercel.app";
const EDGE_TTS_HOST = "speech.platform.bing.com";

export default defineSandbox(() =>
  environment.open({
    networkPolicy: {
      allow: {
        [POSTER_HOST]: [],
        [EDGE_TTS_HOST]: [],
      },
    },
  }),
);
