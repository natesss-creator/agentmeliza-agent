import { defineSchedule } from "eve/schedules";

export default defineSchedule({
  // 08:00 Africa/Nairobi (05:00 UTC) every day.
  cron: "0 5 * * *",
  markdown: [
    "Run today's autonomous First Income Clarity publishing workflow.",
    "Publish exactly one listing to KenyaClassified using publish_listing, then wait at least 15 minutes before the next site.",
    "After the 15-minute gap, publish exactly one listing to KobStore using publish_listing and its authorized saved browser profile.",
    "For each site, create a concise, helpful, non-hype title and description that accurately explains the 14-day guide, approximately 45 minutes/day alongside a job or job search, KES 2,500 one-time, lifetime access, no upsells, and the official link https://groketer.com/firstincome.",
    "Vary the wording from prior posts while remaining truthful and non-spammy.",
    "Use priceKes 2500 and contact email innocentlabs4@gmail.com.",
    "Do not claim guaranteed income, jobs, M-Pesa earnings, or quick riches.",
    "Do not publish to any site that is not explicitly enabled by the publisher tool.",
    "If a site reports login-required, email-verification-required, CAPTCHA, Cloudflare, Turnstile, phone/identity verification, payment, rate limiting, or another blocker, record that result and do not bypass it or repeatedly retry it in the same run.",
    "The saved TinyFish browser profile is authorized for KobStore. Never ask for or expose its password, cookies, OTPs, or session tokens.",
  ].join(" "),
});
