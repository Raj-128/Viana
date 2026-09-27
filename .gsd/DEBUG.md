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
