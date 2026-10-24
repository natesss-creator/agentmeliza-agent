import { defineAgent } from "eve";
import { melizaModel } from "@/lib/model-routing";

export default defineAgent({
  description:
    "Marketing strategist and copywriter for First Income Clarity and Uhiko Properties campaigns: audience research, positioning, and platform-native copy (social posts, captions, ad variants, content calendars). Delegate to this subagent when planning a new campaign angle or reviewing/improving copy before the root agent publishes it. It never publishes; it only researches and drafts.",
  model: melizaModel(),
});
