# Architecture

Updated 2026-10-11 for the performance and visual refinement.

Studio Viana is a Vite multi-page site with a separate Node/SQLite API. Ten HTML entry points share `studio-system.css`, native navigation and an adaptive motion policy. Marketing content and Search Console metadata remain in HTML. Catalogue/detail pages use `main.js`; login uses `auth.js`; plans and administration have their own entry modules.

Public pages load a small generated wallpaper selection plus the 3D catalogue. `loadWallpaperCatalogue()` imports the full wallpaper snapshot only for browsing, a wallpaper detail, existing saved selections, commerce panels or authorized administration. It preserves the shared projects array so filtering and commerce see the same records. Private originals are never part of these snapshots.

The API owns users, signed sessions, MFA, roles, print approvals, plan approval/expiry and atomic download quotas. Client state changes presentation only. SQLite and uploaded packages live under `.private`; the model importer and authenticated sync endpoint connect local originals to the API. Remote credentials go only to the configured Render origin; browser storage cannot override it.

`createVisibleRefresh()` deduplicates concurrent work, throttles focus events, pauses hidden pages and backs off failures. Plan/admin status updates run at one-minute intervals while relevant; header plan and 3D catalogue checks use five minutes. Explicit refresh actions remain available. Plan expiry labels also update locally.

The home hero uses ten wallpaper corridor cards or six 3D gallery cards on capable desktops, and three still cards on smaller or modest devices. Reduced-motion preferences, data-saving mode, <=2 CPU threads, or <=4 threads combined with <=4 GB reported memory disable decorative motion. Touch input alone does not disable animation. Hardware values are hints, not a guaranteed performance measurement. No custom cursor or pointer-following handlers are installed.

Tests cover real HTTP authorization and downloads, plan limits, MFA, receipts, catalogue imports, state transitions, lazy catalogue hydration and refresh scheduling. Production builds minify browser assets. GitHub Actions tests/builds/publishes the frontend; Render deployment and persistent storage are separate operational concerns.

Remaining constraints: browser visual testing requires a connected browser; the full catalogue remains a large deferred chunk; model archive metadata is still bundled; GitHub Pages cannot set all server response headers; print uploads remain capped at 250 MB and require storage until receipt. Do not expose `.private` or original source libraries in the web root.
