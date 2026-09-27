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
