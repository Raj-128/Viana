# Wallpaper controls and carousel

Status: FINALIZED

- Replace catalogue selection and text actions with basket and image-download icon buttons.
- Keep existing download access checks pending the user's separate security requirements.
- Make carousel mouse swipes reliable, prevent native image dragging, and preserve vertical touch scrolling.
- Verify the build and browser behavior.

## Cart and downloads follow-up
- Persistent browser cart with thumbnails, quantities, removal, counts, and quote-request handoff.
- Accessible cart/download dialogs reachable from every site header.
- Persistent download history with download-again, loading/error feedback, and existing access checks.
- No payment gateway or account-synced backend in this change; security requirements remain pending.

## Server and enlarged-preview follow-up
- Add a local server with persistent users, hashed passwords, cookie sessions and per-design entitlement checks, plus owner-only terminal provisioning.
- Keep originals in a private directory denied by the development server and excluded from builds.
- Each catalogue image opens a large keyboard/swipe-accessible viewer. Repeat STUDIO VIANA across wallpaper previews and retain the cart action on each card.

## Image stream homepage hero
Status: FINALIZED
- Adapt the supplied mirrored perspective corridor to the existing vanilla Vite site, using local wallpaper and 3D previews.
- Center the heading above the stream and collection CTA below; support mobile, theme changes, reduced motion and pause control.
- Verify production build, existing tests, and browser screenshots.

## Customer-specific print delivery and records
- Save each customer design request with width/height in inches, paper, quantity and reference before WhatsApp handoff. Different sizes have independent files and approvals.
- Owner uploads and checks PDF/TIFF/JPG/PNG per request, then approves, declines or revokes. Customer downloads only that authorized request file.
- Preserve existing accounts and design-only approvals with additive SQLite tables. Record registrations and successful logins/logout for an owner-only account view.
- Support persistent backend data directory for GitHub Pages + Render hosting; verify storage before any live release.
- Extend native artwork deterrents without interfering with forms or approved downloads.

## Security hardening follow-up (FINALIZED)
Preserve existing accounts and approvals. Add server-enforced 30-minute idle expiry, five-failure account cooldown, exact origin allowlist, stronger compatible password hashing, and owner TOTP enrollment with replay prevention and terminal recovery. Verify with isolated HTTP tests. Document external WAF/hosting activation and repository-scoped GitHub permissions without deploying or changing accounts.

## Google customer sign-in (FINALIZED)
Use supplied public client ID with official server token verification, short-lived single-use nonce, phone completion for new customers, password-confirmed linking for existing customer emails, no admin Google login, existing sessions/approval checks preserved. Update CSP, test isolated HTTP flows and build, then publish through main.

## SEO follow-up (FINALIZED)
Correct production canonical/social URLs, descriptive static metadata, valid Organization schema, sitemap and private-page noindex. Preserve download authorization and existing page gates pending confirmation. No ranking guarantees.

## 3D shop categories (FINALIZED)
Add a responsive reference-inspired Shop Categories section below the homepage collection in 3D mode. Combine category and actual source-file extension filters, expose matching files only, and show honest empty states for unavailable assets. Preserve wallpaper mode and existing access controls.

## Shop logo interaction and placement (FINALIZED)
Use recognizable reference-style software logo assets, grey at rest and colored on hover/focus/selection. Logo clicks open the matching file listing and available source links, without stale category filters. Move the entire section directly below the hero Explore Collections CTA.

## Plan format quotas (FINALIZED)
Basic: 100 files total per 30-day approval. Daily limits: Max 9, C4D 2, Blender 3, Unreal 1, FBX 4 and OBJ 4 separately, Archmaterials 5, STL 4. Add 3 per format at each successive plan; preserve other prices, durations and daily caps. Enforce atomically. Approved snapshots keep their terms; pending orders adopt updated terms at approval. Archives count once overall and once per included format using trusted metadata.

## Plan WhatsApp handoff (FINALIZED)
Order now saves a pending request then opens WhatsApp Web for existing studio number 919737711570. Include authenticated email, request ID, plan price, validity, access and all format quotas. No automatic sending. Allow pending handoff to reopen and provide popup-block fallback. Only admin approval unlocks selected plan.

## Plan price and active badge (FINALIZED)
Prices: Basic 399, weekly 599, monthly 1199, Pro 3999, yearly 7199 INR. Display approved unexpired plan name in header, otherwise Choose a plan; refresh on return and expire automatically. Basic ends exactly 30 days after approval.

## Paid purchase state (FINALIZED)
Admin approval confirms paid purchase. Show Paid / Purchased and Active plan on approved cards; block duplicate active-plan purchases. Preserve paid history on expiry with Renew plan. Refresh approval state on focus and while visible.

## Section-specific commerce and remaining quotas (FINALIZED)
Filter cart, saved selections, downloads, counts, print requests and WhatsApp quote content by active wallpaper/3D mode without deleting the other mode entries. Active approved plan cards show remaining total/day allowance and separate daily format counters from authenticated server usage; refresh every five seconds.
