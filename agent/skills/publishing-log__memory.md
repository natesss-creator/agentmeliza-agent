---
name: publishing-log__memory
description: Use the durable publishing-log memory as the source of truth for publishing execution records and reports.
---

# Publishing Log Memory

Use the `publishing-log` persistent memory slot for every publishing attempt.

## Required record
Store only concise operational metadata:
- timestamp
- site/platform
- action
- title or content identifier
- status: published, attempted, skipped, failed, or blocked-human-verification
- live URL only when independently verified
- reason/blocker when skipped or failed

## Truthfulness rules
- Never claim `published` from an automation response alone.
- A published record requires an independently verified public URL.
- Never invent URLs, activity, timestamps, or results.
- If no durable log record exists, report that the action is unverified rather than claiming it happened.
- Never store passwords, OTPs, cookies, session tokens, API keys, or full email contents.

## Reporting
When asked for today's publishing report or execution history, read the durable `publishing-log` memory and summarize only records actually present there. Include totals, per-site status, verified live URLs, blockers, and next actions.
