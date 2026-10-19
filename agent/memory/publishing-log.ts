import { defineMemory } from "eve/memory";
import { fileMemory } from "eve/memory/file";
import { byPrincipal } from "eve/memory/scope";

export default defineMemory({
  description:
    "Keep a durable audit log of publishing execution. Record each attempted or completed publishing action with timestamp, platform/site, action, title or content identifier, status, live URL when available, skip/failure reason, and any human-verification blocker. Keep records concise. Never store passwords, API keys, OTPs, cookies, session tokens, or full email contents.",
  provider: fileMemory({ maxCharacters: 12000 }),
  scope: byPrincipal,
});
