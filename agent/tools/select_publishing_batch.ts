import { defineTool } from "eve/tools";
import { z } from "zod";
import { PUBLISHING_CHANNELS } from "../publishing-registry";

/**
 * Selects a rotating batch from the universal registry so Meliza does not keep
 * retrying the same small set. Selection never makes a channel live-enabled.
 */
export default defineTool({
  description:
    "Select a rotating batch of registered publishing channels for testing or live execution. Prefer untested/candidate channels, diversify regions, avoid blocked/skipped/manual-only channels, and never treat selection as authorization or proof of publication. Use this before a multi-site publishing run so the run does not repeatedly target the same three sites.",
  inputSchema: z.object({
    mode: z.enum(["test", "live"]).default("test"),
    batchSize: z.number().int().min(1).max(15).default(10),
    offset: z.number().int().min(0).default(0),
  }),
  async execute({ mode, batchSize, offset }) {
    const all = Object.values(PUBLISHING_CHANNELS);
    const eligible = all.filter((channel) => {
      if (["blocked", "skip", "not_recommended_for_autonomous_posting", "manual_review_required"].includes(channel.status)) return false;
      if (mode === "live") return channel.liveEnabled && channel.status === "ready";
      return true;
    });

    // Deterministic rotation across the full inventory rather than a hard-coded
    // list. A different offset can be supplied on each run to continue through
    // the inventory without repeatedly starting at the first entries.
    const start = eligible.length ? offset % eligible.length : 0;
    const rotated = eligible.slice(start).concat(eligible.slice(0, start));

    // Interleave regions where possible so a batch is globally diverse.
    const remaining = [...rotated];
    const selected: typeof remaining = [];
    const seenRegions = new Set<string>();
    while (remaining.length && selected.length < batchSize) {
      let index = remaining.findIndex((item) => (item.regions ?? []).some((r) => !seenRegions.has(r)));
      if (index < 0) index = 0;
      const [item] = remaining.splice(index, 1);
      selected.push(item);
      for (const region of item.regions ?? []) seenRegions.add(region);
    }

    return {
      mode,
      batchSize: selected.length,
      totalEligible: eligible.length,
      nextOffset: eligible.length ? (start + selected.length) % eligible.length : 0,
      channels: selected.map((channel) => ({
        site: channel.key,
        label: channel.label,
        url: channel.url,
        mode: channel.mode,
        status: channel.status,
        liveEnabled: channel.liveEnabled,
        regions: channel.regions ?? [],
        categories: channel.categories ?? [],
      })),
    };
  },
});
