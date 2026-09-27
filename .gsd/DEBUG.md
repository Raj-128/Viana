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
