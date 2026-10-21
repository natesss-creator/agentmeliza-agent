import { defineMemory } from "eve/memory";
import { fileMemory } from "eve/memory/file";
import { byPrincipal } from "eve/memory/scope";

export default defineMemory({
  description:
    "Durable audit log for publishing execution. Record each attempted or completed action with timestamp, platform/site, action, title or content identifier, status, independently verified live URL when available, and skip/failure or human-verification blocker reason. Never store credentials, OTPs, cookies, session tokens, API keys, or full email contents. Reports must use this memory as their source of truth and must never invent activity or URLs.",
  provider: fileMemory({ maxCharacters: 12000 }),
  scope: byPrincipal,
});
