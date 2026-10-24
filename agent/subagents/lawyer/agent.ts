import { defineAgent } from "eve";
import { melizaModel } from "@/lib/model-routing";

export default defineAgent({
  description:
    "Compliance reviewer for Meliza's marketing claims, data handling, and platform-policy adherence across First Income Clarity and Uhiko Properties. Adapted from ECC's security-reviewer and refocused on legal/regulatory risk patterns rather than code. It is NOT a licensed attorney and gives no binding legal advice — it flags patterns worth a professional's attention. Use for the daily report or before a sensitive claim goes out. It never publishes anything.",
  model: melizaModel(),
});
