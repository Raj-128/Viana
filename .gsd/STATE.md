# Wallpaper controls and carousel

- Replaced catalogue text actions and selection overlays with accessible basket and image-download icon buttons.
- Preserved existing download access checks; security requirements are pending from the user.
- Added carousel pointer capture, cancellation handling, horizontal gesture checks, native image drag prevention, and keyboard arrows. Autoplay pauses during drag.
- Verification: production build passed; Node assertions passed for left/right swipes, wraparound, cancellation, vertical gestures, short drags, autoplay pause, native drag prevention, pointer release, and two-button card markup.
- Visual verification blocked: browser tool reports no available browser.
- Existing user changes were present in the edited files; no commit made to avoid including unrelated work.

## Cart, downloads, security and development follow-up

- Added persistent cart drawer with thumbnails, quantities, removal, badge counts, browser-tab synchronization and WhatsApp quote handoff. Repeated card clicks open the cart rather than remove items.
- Added download library and retry/history behavior. Removed fake payment unlock and all local payment/admin authorization for downloads. Downloads now require the server endpoint; backend hosting is an unanswered user question and downloads remain unavailable until implemented.
- Added preview watermark overlays, print exclusions, baseline headers, storage normalization and escaped commerce markup. Public previews remain downloadable; screenshots/extensions cannot be blocked reliably. Existing browser-local login remains a prototype.
- Moved the shared custom cursor into the modal top layer while open and restore it on close. Fixed reduced-motion initialization and removed the viewport-width cursor override.
- Found two Vite servers sharing a cache. Stopped the agent-owned extra server, selected a fresh `.vite-viana` cache and enabled strict port 5173. Existing user server responds HTTP 200 and optimized dependency fetch passed; no cache directories deleted.
- Verification: 13 Node tests passed; production build passed; `git diff --check` passed; live page/module responses and anti-framing/MIME headers verified. Browser inventory is empty, so visual interaction checks remain pending.
- User test instructions and backend requirements: `docs/CART-SECURITY-TESTING.md`.

## Server implemented and wallpaper viewer added

- Implemented same-origin API in Vite dev/preview and a standalone Node static/API server. Persistent SQLite users, salted scrypt passwords, HttpOnly sessions, per-design download authorization, CSRF origin checks, rate limits, and private file streaming are active.
- Replaced frontend-local auth with server session hydration and API login/register/logout. Old local credentials are not trusted or migrated. Owner creation and download grants/revocation are terminal-only commands.
- `.private` is ignored by Git, excluded from builds and denied by Vite. A middleware returns a plain 403 before Vite's file handler so security probes do not generate misleading allow-list warnings. Never add this folder to the serving allow list.
- Card images open a large viewer with arrows, swipe, Escape and repeating diagonal STUDIO VIANA watermark. Card/cart buttons remain visible. Tiled watermarks also cover card, hero and gallery previews.
- Verification: all 14 tests pass, including real HTTP registration, session persistence, authorized image bytes, revoked/unauthorized downloads, forbidden file paths, logout and rate limits. Build and diff checks pass. Dev health=200/private=403; standalone site=200, private/source=404, signed-out download=401. Stopped the agent's standalone test server; user Vite remains running.
- No real users, owner credentials, originals or download grants were provisioned. User must register again and explicitly provide private originals/grants. Production hosting/payment integration remains outstanding; visible overlays do not protect public preview URLs. Browser visual testing remains unavailable.

## Separate admin login
- User clarified the intended rule: normal login accepts customers AND admins; admin login accepts admins only. Updated the server accordingly. Admins retain their server-owned role on either route; client role flags do not elevate customers.
- Tests cover admin success through both routes, customer rejection on the admin route, and ignored spoofed role flags.

## Login follow-ups
- Confirmed one real admin account exists; no real credential changes performed by the agent.
- Added email/phone remembrance (no password storage), removed stale browser admin setup form, and refresh admin setup status when returning to the tab.
- Account cards now live in inert templates until signed in and detach on logout.
- Added terminal-only `server:reset-admin`, hidden password confirmation for create/reset, fresh salted hash, and revocation of existing admin sessions. Tests verify old-password rejection and new-password success through both login routes; all 14 tests pass. User must run reset and enter their own password if needed.
