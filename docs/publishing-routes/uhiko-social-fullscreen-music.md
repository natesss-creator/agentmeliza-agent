# Uhiko Social Publishing Route — Full-Screen + Embedded Music

## Purpose
Use this route for automated Uhiko Properties social publishing when the goal is a single full-screen creative that fits mobile screens and carries its own audio across platforms.

## Approved route
- **Creative format:** vertical MP4, 9:16, target 1080×1920.
- **Audio:** embed original audio/music directly in the MP4. Do not depend on platform music-library selection. This makes the audio portable across TikTok, Instagram and Facebook.
- **TikTok:** publish through the existing **Publora** connection. Enable the platform's music/audio handling where supported, but prefer embedded audio in the source MP4.
- **Instagram:** publish the same MP4 as a **Reel** through the existing authorized Instagram Business connection. Use `media_type=REELS`, and publish only after the container reaches FINISHED.
- **Facebook:** publish the same MP4 as a Page video through the existing authorized Facebook Page connection.

## Current verified connections
- TikTok → Publora connection `pesazako` (active at last verification).
- Instagram → existing authorized connection alias `meliza-instagram-reauth-2`.
- Facebook → existing authorized connection alias `meliza-facebook-reauth`.

## Creative rules
1. Always render the important text/content inside the safe central area of the 9:16 canvas.
2. Avoid landscape or square source images for Reels/TikTok unless they are first rendered into the 1080×1920 composition.
3. Keep property photos, FOR SALE badge, location, price and UHIKO PROPERTIES branding visible without edge cropping.
4. Use the same finished vertical MP4 across TikTok, Instagram and Facebook when the creative is intended to be cross-posted.
5. Do not invent property facts. Pull the listing details from an authenticated Uhiko source before generating the creative.
6. Do not add hashtags unless explicitly requested.
7. Check recent published/scheduled destinations first to prevent duplicate listings/creatives.

## Verification rules
Never report success from a request/creation response alone.

- TikTok/Publora: check the post status after publishing. Only report `published` when Publora returns `status: published`.
- Instagram: after publish, retrieve the published media object and require a numeric media ID plus permalink.
- Facebook: retrieve the post and require `is_published: true` plus permalink.
- If a platform is pending/scheduled, report it as pending/scheduled—not published.
- Never fabricate a permalink or post ID.

## Reference successful run
A vertical MP4 route was successfully published on 2026-10-28:
- Instagram Reel: https://www.instagram.com/reel/DfBN0H2jxr8/
- Facebook video post ID: `1158182559895676`
- TikTok: Publora returned `status: published`; Publora did not return a public TikTok permalink for that post.

## Important limitation
Platform APIs do not provide a universal way to select a specific licensed song from each platform's music library. For reliable cross-platform audio, use embedded original audio in the MP4. Platform-native music-library selection should only be used when the relevant platform/API explicitly supports it.
