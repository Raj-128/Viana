---
status: verifying
trigger: Hero cards jump into the center, 3D images have black regions, localhost login fails.
updated: 2026-09-27
---

## Evidence
- Pulled main at e25b925 with a clean working tree.
- Travel and hover were on the same transformed link in a shared preserve-3d scene.
- Nine 3D cards had a fixed 180cqw travel range, smaller than the required card spacing on narrow screens.
- Global reduced-motion duration .01ms conflicted with the hero's negative delays.
- Hero thumbnails were subject to screenshot/window-blur concealment.
- Local /api/health and /api/auth/session respond 200; adminConfigured=true. Frontend defaulted to Render even on localhost.

## Changes
- Project reference corridor coordinates before painting flat independent motion slots. Hover only transforms the inner visual surface; the link hit area stays fixed.
- Give the gallery a loop based on nine card widths plus gaps, with no shared Z intersections.
- Provide authored inline static poses for reduced motion and clip overflow without focus-induced scrolling.
- Generate 18 separate clean 640px hero thumbnails; detail/gallery covers retain baked-in watermarks.
- Keep public hero thumbnails visible on blur; detail-page concealment remains.
- Route loopback hosts to their own API; deployed Render routing remains unchanged.
- Replace 1,978 eager image-module imports with static asset URLs; verified the local served catalogue has zero per-image module imports. Production asset hashing still builds successfully.

## Verification
- 37 tests pass, including reference projection, gallery spacing, clean versus watermarked pixels, import watcher, and local/deployed API selection.
- Production build passes. Local homepage, motion module, API module, both thumbnail variants and session endpoint return HTTP 200.
- Browser connector reports no available browsers/apps. Final interactive screenshot validation remains unavailable; no claim of visual reproduction or browser verification.
- Changes remain local on main. No deployment or remote push performed.


## Work previews and approval navigation (2026-09-27)
- User requested clean work carousel/cards and watermark only after opening the design. Generate clean 640px thumbnails for every catalogue entry; protected cover/gallery URLs remain separate. Six legacy clean thumbnails recovered from original Git assets without publishing full originals.
- Owner Check approval status now opens admin-downloads.html, which already supports private upload, Approve and Decline. Customers refresh on return and poll pending requests every 15 seconds while the download panel is visible; original download stays disabled until approved. API authorization remains unchanged.
- Automated tests: 39 passing, including owner/customer navigation and approved/declined download authorization. Local work page, admin page and health endpoint return HTTP 200. Catalogue has 1,774 clean thumbnails, 1,774 protected covers and 18 hero selections. Browser connection inventory is empty; visual verification unavailable. No push/deploy.
- Final production build: exit 0, completed in 22.70s; catalogue bundle-size warning remains. No live server changes.


## Design-first download entry (2026-09-27)
- Work card and enlarged-viewer download actions now open the matching project detail page, rather than immediately opening the download drawer. Labels explain the destination.
- Detail page exposes Request download access for both wallpaper and 3D designs; the existing selected-design estimator, inch dimensions and WhatsApp request remain intact. Permission checks and admin approval flow are unchanged.
- Verified: 39 tests pass; production build exit 0 in 23.27s. Browser visual verification unavailable (no connected browser). No push or deployment.


## Size-specific requests, accounts and native protection (2026-09-27)
- Cause: old entitlement keys were user/design and did not contain size or request-file identity. WhatsApp estimates were not persisted.
- Added print_requests table, request IDs, size/paper/quantity snapshot, per-request streaming private upload, approval confirmation bound to file version, and authenticated download. New sizes and customers are independent. Existing shared originals preserved in legacy owner controls.
- Added account_events with owner-only searchable account/activity endpoint and UI; STUDIO_DATA_DIR supports an existing persistent mount. Historical login dates are not fabricated. Pages workflow now runs tests.
- Extended delegated artwork context-menu/drag/select protection to hero and newly loaded cards, preserving input editing and normal clicks.
- User could not confirm whether Render has a persistent disk. Documentation records required dashboard check, backup/migration and backend-before-frontend release order. No paid resource, live migration, push or deployment performed.
- Verification: 42 tests pass; production build exit 0 in 25.84s. Local project/admin pages and health endpoint return 200; unsigned account/print-request endpoints return 401. Browser inventory has no connected surfaces, so no visual verification claimed. Manual test checklist is docs/SECURITY-CHECKS.md.
- Attachment follow-up: added Windows/macOS capture-event detection, short viewer-reference overlays on large viewers only, CSP with existing font/animation allowances, HTTPS-only HSTS, and shared Node/Vite security headers. No canvas overrides or fictitious screenshot guarantees; GitHub Pages header limitations documented. Corrected legacy download URL double-prefix while retaining authorization.
- Final verification: 46 tests pass; production build exit 0 in 27.79s. Local HTTP confirms CSP and X-Frame-Options DENY; generated Pages HTML has its applicable CSP meta. Browser visual checks remain unavailable. No live changes.

- Right-click follow-up: context menus now blocked across non-editable page areas, including blank backgrounds, using capture-phase delegation. Editable form controls retain native menus. Regression assertion added.
- Right-click verification: all 46 tests pass; build exit 0 in 23.21s. Local only.
- Capture timing follow-up: keyboard listeners moved to window capture phase; detected capture immediately adds a separate no-transition/no-animation concealment state for all img/canvas/video, including hero thumbnails. Keydown does not schedule reveal; keyup restores after two seconds, with focused-page interaction recovery if the OS swallowed keyup. Browser repaint/OS capture timing remains outside JavaScript control. All 46 tests pass.
- Capture change build: exit 0 in 27.08s. No OS screenshot timing or browser visual verification claimed. Local only.
