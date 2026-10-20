import { defineSchedule } from "eve/schedules";

export default defineSchedule({
  // 08:00 Africa/Nairobi (05:00 UTC) every day.
  cron: "0 5 * * *",
  markdown: [
    "Run today's autonomous First Income Clarity publishing workflow.",
    "Use publish_listing only for sites in its explicit allowlist and only within the owner's publishing policy.",
    "Process at most 5 sites per day and wait at least 15 minutes between successful publishing attempts.",
    "Prioritize sites that are authorized and have not yet been successfully validated, then sites previously published successfully.",
    "For each selected site, create a concise, helpful, non-hype title and description explaining the 14-day guide, approximately 45 minutes/day alongside a job or job search, KES 2,500 one-time, lifetime access, no upsells, and https://groketer.com/firstincome.",
    "Vary wording from prior posts while remaining truthful and non-spammy. Use priceKes 2500 and contact email innocentlabs4@gmail.com.",
    "Never claim guaranteed income, jobs, M-Pesa earnings, or quick riches.",
    "For authenticated sites, use the configured authorized TinyFish browser context profile; never request, expose, or store passwords, OTPs, cookies, or session tokens in the model context.",
    "If a site reports login-required, profile-not-authenticated, email verification, CAPTCHA, Cloudflare, Turnstile, phone/identity verification, payment, rate limiting, prohibited automation, or another blocker, record it and do not bypass it or repeatedly retry it in the same run.",
    "Only report published when the resulting public URL has been verified. Otherwise report skipped, failed, or blocked-human-verification with the exact reason.",
  ].join(" "),
});
