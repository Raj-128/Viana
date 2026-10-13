# Performance and response caching

How responses are cached, how the catalogue is split and how motion degrades. Moved here from the README, unchanged.

Customer plan responses use a two-minute local-storage cache; print and original-access request lists use one minute. Cache entries are partitioned by a SHA-256 session-token hash and API URL, bounded to five responses of at most 250,000 characters, and shared across page navigation. Simultaneous reads share one request. Manual refresh bypasses freshness; successful writes, file downloads, logout/account changes and unauthorized responses invalidate the cache, with cross-tab invalidation. Failed, expired, corrupt or unavailable cache entries fall back to the API. Authentication checks, administrative records and download files are never stored by this response cache; server authorization remains mandatory. Live catalogue polling retains its existing revision mechanism rather than storing large base64 preview payloads in local storage.

All pages share `src/css/studio-system.css`. Decorative motion automatically reduces for reduced-motion/data-saving preferences and combined low-end CPU/memory hints. There is no motion setting in the interface. Browsing, login, plan approvals and downloads work in either mode. Hardware hints are not a benchmark or a guarantee of frame rate.

The homepage keeps the studio's wallpaper corridor movement with ten cards instead of eighteen, and a six-card 3D gallery. Small screens and reduced-motion devices use three still images. Hidden tabs, off-screen heroes, hover and keyboard focus pause the animation. Animation runs in the browser from precomputed keyframes, without pointer tracking or a JavaScript frame loop.

The wallpaper catalogue is split into a small committed landing-page snapshot and a full deferred module. Import/watch regenerates both. Preserve `src/generated/wallpaper-featured.js` in deployments without the private source library. Build output is minified; source files remain readable.

Production API calls use the fixed Render origin in `src/js/api-config.js`. Browser-local API URL overrides are intentionally ignored so they cannot redirect credentials. To migrate the backend, change that origin and the matching CSP origin in `server/security-headers.js` together. Local development still uses its same-origin API.

Frontend deployment uses the existing GitHub Actions workflow on main. The unused `gh-pages` CLI and its manual deploy script have been removed. Backend deployment, persistent uploaded-file storage and backups are separate from publishing the frontend.
