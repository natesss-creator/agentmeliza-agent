# Secure object storage setup: Cloudflare R2

The app keeps non-public objects (including encrypted YouTube OAuth credentials, report subscriptions/events, and publishing logs) in `S3_BUCKET`. Public media is written separately to `S3_PUBLIC_BUCKET`. **These must be two distinct R2 buckets.** R2's public custom domain exposes the whole bucket; object-key prefixes are not a bucket-level privacy boundary.

## Create the buckets

1. In Cloudflare, create a private R2 bucket for app data (for example, `meliza-private`). Do not enable public access or attach a public custom domain to it.
2. Create a second R2 bucket exclusively for public media (for example, `meliza-public-media`). Enable public read access for this bucket only and attach a Cloudflare-managed or custom domain. Do not put credentials, reports, logs, or other private files in it.
3. Create R2 S3 API credentials that can read/write the two buckets. Keep the credentials server-side in Render environment secrets; never expose them in browser code or commit them.
4. Copy the account S3 API endpoint from Cloudflare R2. The endpoint format is `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`.

## Configure Render environment variables

Set these in the Render service's Environment page:

```dotenv
S3_BUCKET=meliza-private
S3_PUBLIC_BUCKET=meliza-public-media
S3_REGION=auto
S3_ENDPOINT=https://<ACCOUNT_ID>.r2.cloudflarestorage.com
S3_ACCESS_KEY_ID=<R2_ACCESS_KEY_ID>
S3_SECRET_ACCESS_KEY=<R2_SECRET_ACCESS_KEY>
S3_PUBLIC_BASE_URL=https://<PUBLIC_MEDIA_DOMAIN>
S3_FORCE_PATH_STYLE=true
```

Use the exact bucket names and API credentials from Cloudflare. `S3_PUBLIC_BASE_URL` is the public media domain origin, without a bucket-name path, query, or trailing object key (for example, `https://media.example.com`). The app appends object keys such as `user-media/...` and `video-posts/...`.

## Safety behavior in the app

- `putObject`, `getObject`, `deleteObject`, and `listObjectKeys` operate only on the private `S3_BUCKET`.
- `putPublicObject` writes only to `S3_PUBLIC_BUCKET` and rejects keys outside `user-media/` and `video-posts/`.
- The app fails if `S3_PUBLIC_BUCKET` is configured to the same bucket as `S3_BUCKET`.
- The public bucket itself is still public in full. Keep it dedicated to media that is intended for public sharing; code-level prefix checks do not protect against manual uploads, another program, or a leaked write credential.

## Existing data and launch checks

Existing objects are not moved automatically. Keep the old bucket private, copy only intended public media into the new public bucket while preserving its keys, and leave OAuth credentials, reports, logs, and package data in the private bucket. If the old bucket contains mixed data and has been made public, disable public access immediately and review access logs/credentials before cutover.

After deployment, verify a sample `user-media/...` and `video-posts/...` URL loads over HTTPS. Also verify the private bucket has no public domain/access and that an unauthenticated request to a known private-object URL fails. Test upload, private object read/write, and report flows before enabling production publishing.
