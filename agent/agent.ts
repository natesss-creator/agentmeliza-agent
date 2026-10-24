import { defineAgent } from "eve";
import { melizaModel } from "@/lib/model-routing";

export default defineAgent({
  model: melizaModel(),
});
