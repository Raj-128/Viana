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

## Image stream hero (2026-09-21)
- Replaced homepage collage with the reference's mirrored perspective corridor, adapted to vanilla JS/CSS and local artwork in both modes.
- Added responsive sizing, reduced-motion handling, pause control and offscreen suspension.
- Verification: npm.cmd run build passed; npm.cmd test passed 25/25. Browser connector reports no browser available; screenshot verification remains outstanding.

## Automatic local wallpaper library
- Organized eight supplied collections under src/assets/images/wallpapers/library.
- Automatic import/watch, protected cached previews, duplicate detection, gallery grouping, collection/category filters, 24-card batches.
- Imported 1,774 designs from 1,960 unique images; 50 duplicate files; no image errors.
- Hero uses 18 distinct wallpapers across two rails, balanced across collections.
- Verified live source URL=403, generated catalogue=200, no raw library files in production output; 31 tests pass.

## SEO foundation
- Correct live GitHub Pages canonical/social URLs and descriptive titles; valid Organization/WebSite schema, real logo asset, homepage sitemap, private/gated page noindex.
- Existing access gates retained pending user choice about public information pages.
- Verified 56 tests, production build, emitted metadata/schema/sitemap/logo.
- Owner still needs Search Console ownership verification and sitemap submission; rankings not guaranteed.

## 3D Shop Categories
- Added reference-inspired homepage section below The Collection, visible in 3D mode: six format controls, ten category cards, four expandable categories, combined filters and clear action.
- Source files use explicit sourceFiles metadata with strict extension matching. Existing four projects have previews only; sourceFiles remains empty rather than claiming unavailable formats.
- Verified: 9 targeted tests pass; production build passes (existing large chunk warning). Headless Chrome: six formats, ten initial/fourteen expanded categories; Blender returns zero; reset returns four scenes; 390px mobile has no horizontal overflow.
- Screenshots: .private/shop-desktop.png and .private/shop-mobile.png. Current cards reuse existing studio render previews. No deployment performed.

## Shop logo follow-up
- Moved Shop Categories directly after hero Explore Collections. Replaced placeholder marks with bundled image/SVG logos; grayscale idle, color on hover/focus/selection.
- Logo clicks reset category, reveal matching sources, focus/scroll listing; available matching files expose Open links to their configured endpoints.
- Verified six targeted tests and production output (built in 22.12s; PowerShell classified existing chunk warning as NativeCommandError). Browser: placement true, all six logos load, hover grayscale(1) to grayscale(0), click focus shop-browse, format filtering correct; mobile width/scrollWidth both 390.
- Updated .private/shop-desktop.png and shop-mobile.png. Actual source files still need adding to sourceFiles metadata.

## STL Files category � 2026-10-10
- Added STL Files as the seventh shop format with a faceted mesh SVG and .stl source matching; desktop uses seven columns, mobile retains three.
- Verified: three catalogue tests, direct uppercase STL matching/filtering check, production build passed (existing chunk-size warning).
- Automated screenshot verification could not complete because the headless Chrome debugging session failed to connect. No deployment performed.

## Remove category cards � 2026-10-10
- Removed all 14 promotional category cards, expand button, and their frontend state/styles at user request. Retained seven format icons including STL and file results/reset.
- Syntax check and three catalogue tests pass; search confirms removed UI identifiers no longer occur in HTML, JS, or CSS. Screenshot verification unavailable in this session.
- Production build passed in isolated .private/shop-removal-dist (18.16s); default dist encountered a file-access error.

## Interior / Exterior collections � 2026-10-10
- 3D Collection facet now always lists Interior then Exterior. Assigned the furniture, lamp and playroom projects to Interior; Exterior remains visible with zero availability until matching projects are added.
- Verified syntax, six existing filter tests, and DOM-stub rendering plus Interior/Exterior selection checks.

## Interior category options � 2026-10-10
- Selecting Interior reveals the user's 16 categories in the requested order. Collection changes clear selected categories; reset hides dependent options. Wallpaper facets retain their data-driven options.
- Assigned existing Interior projects to Furniture, Lighting and Kids Room. Empty categories remain visible with zero counts and disabled controls.
- Verified six existing tests and DOM interaction checks for the exact list, filtering, deselection, Exterior, reset and wallpaper mode; JS syntax passes.

## Residential styles � 2026-10-10
- Interior > Residential reveals the requested 16 Style options in exact order; suggestion chips use the same options. Residential and its styles remain selectable with zero results.
- Changing category or collection clears dependent style selections; other contexts restore catalogue styles.
- Verified residential DOM interaction checks (including empty catalogue results, exact labels/order, style filtering and reset), Interior regression checks, three catalogue tests and JS syntax.

- 2026-10-10: Confirmed all 16 Interior Category options in requested order; made every option selectable even at zero results. DOM checks verify all 16 enabled and Residential style flow still passes.

## Exterior categories � 2026-10-10
- Added the 15 requested Exterior categories in exact order. Both 3D collections and their predefined categories remain clickable with zero results.
- Verified exact Exterior labels/order and enabled controls, Interior and Residential interaction regressions, three catalogue tests, and JS syntax.

## Bathroom Accessories model package � 2026-10-10
- Inspected user's RAR: contains FBX, OBJ, MTL, two MAX scenes and texture maps. Added Bathroom Accessories 1 with optimized supplied preview under Interior / Bathroom and FBX/OBJ + MAX format listings.
- Copied package to .private/files/bathroom-accessories-1.rar and registered design bathroom-accessories-1 in the local database. Existing download entitlement checks remain in place. Added RAR response/client filename handling and explicit archive format matching.
- Excluded 3D FILE from automatic wallpaper imports.
- Verified 12 catalogue/server/wallpaper tests, actual project metadata/filter matches, preview generation and package byte length. Private package/database registration must accompany any future server deployment.
- Full build stayed in transformation for several minutes and was stopped; no build success or browser visual verification claimed. Syntax and targeted checks passed.

## Format catalogue navigation � 2026-10-10
- Replaced homepage inline results with real links to work.html?mode=3d&format=<id>#catalogue for all seven formats.
- Catalogue mode and title follow the selected format; both displayed results and facet counts use matching files. Existing Interior/Exterior/Residential filter flow is retained.
- Collection, Category, Style, Year and Source use one horizontal five-column row on format pages, with horizontal scrolling on narrow screens. All 3D groups are expanded; the format page filter panel stays open on mobile.
- Verified seven catalogue tests, link-generation checks for every format, removal of inline markup, dependent-filter interaction checks and JS syntax. Browser screenshot not verified.

## Direct model file download � 2026-10-10
- Bathroom Accessories now has Download file on its detail page and download panel; clicking immediately downloads the full RAR. Preview/approval choices and wallpaper request panels are hidden for this model.
- Explicit shared model manifest permits its exact registered package for signed-in users without entitlements. Other downloads retain existing approval rules.
- Verified real HTTP download without a grant, refusal for a swapped file, five tests and one-click RAR UI-handler check. Syntax checks pass.

## Unlimited download plans page � 2026-10-10
- Added red Unlimited download header link in static homepage and shared commerce header, opening plans.html.
- New standalone dark pricing page contains five colored circular-price cards with all supplied names, INR prices, validities, daily limits and access descriptions; responsive 5/3/2/1-column layout and contact/browse links.
- Added plans.html to Vite multi-page build. Verified exact plan content, links and isolated production page build. Headless Chrome/Edge did not produce screenshots, so visual browser verification remains unavailable.
- This is the requested pricing display; payment processing and subscription quota enforcement are not implemented.

## Plan animation and price update � 2026-10-10
- Added staggered card entrances, hover lift/glow, price sheen, brief floating badges and header button feedback, with reduced-motion support.
- Doubled prices to INR 198, 298, 598, 1,998 and 3,598; updated starting-price description. Validity, limits and access remain as supplied.
- Verified all five prices and isolated production page build.

- Slowed pricing animations: 1.8s staggered perspective entry, 1.1s hover tilt, 7s badge float/rotation and 1.8s sheen. Added dimensional shadows; reduced-motion rules preserved. Isolated page build passes.

## Plan quotas and WhatsApp follow-up
Implemented Basic total 100/30 days, separate format quotas (+3 per tier), atomic usage counters, trusted archive formats; existing approved snapshots retain purchased terms. WhatsApp Web handoff uses server-authenticated email and full plan details; pending requests can reopen. Admin confirmation marks paid/purchased, activation lasts the specified duration, Basic expiry boundary tested at exactly 30 days. Header fetches active plan name; automatic polling/expiry removes stale plan names. Updated prices 399/599/1199/3999/7199 INR. New HTTP and client tests cover identity, approval gate, popup fallback, renewal and quotas. Browser automation unavailable (sandbox kernel/GPU failures); build/test evidence in .gsd/evidence. No deployment performed.

Final verification: 82/82 tests passed; final production build exit code 0; all five displayed and WhatsApp prices match. Automated screenshot verification could not run in this environment. Changes remain local, with pre-existing working-tree changes preserved.

## Section commerce and live remaining quota verification
Cart/downloads/saved lists and checkout now follow selected mode. 3D hides wallpaper print panels and wall-measurement copy. Plan API returns authenticated format usage for the current India day; cards show remaining total and per-format counts only on active purchases. Verified 85/85 tests and live Vite transforms/HTTP checks. Preserved stored entries across section switches.

## Compact animated plans UI
Reduced card height through smaller price circles, inline badges, tighter spacing and compact features. Added decorative CSS 3D cubes/orbits/glows with reduced-motion support, pause control and hidden-tab pause. Plan behavior tests: 14 passed. Live HTTP assets and animation controls verified. Browser screenshot tool unavailable; no temporary browser profile created.

## Premium interior plan styling
Replaced generic cubes with animated lounge chair, pendant/interior-room and material-layer SVG illustrations. Premium charcoal cards, metallic colored borders, larger prices, illuminated buttons and gold Pro treatment. Compact responsive layout, pause control and reduced-motion behavior retained. Plans-only production build passed; 14 purchase/quota tests passed. Browser visual capture remains unavailable.

## Plan-required download redirect
3D download rejection for missing/expired/revoked/pending plan now returns PLAN_REQUIRED. Client navigates to plans.html?notice=renew-plan, with top First renew your plan banner. Guest model downloads also redirect. Daily-quota, network and wallpaper errors retain their existing behavior. Dedicated redirect, server response and notification tests passed.

## Archmaterials import � 2026-10-10
Added Aerial Texture 12 from the user-provided E:\3d design file studio viana folder. Preview converted to WebP; original RAR copied into .private/files and registered in local designs database. Verified archive contents MAT/MAX/FBX/OBJ/MTL/JPG, configured tier 0 and verified format quotas, connected direct protected download. Archive integrity check passed; 13 catalogue/quota tests passed; catalogue, preview and project module returned HTTP 200. Original source files preserved.

## Category click transition correction
Removed permanent category intro panel. Shop category links now play a matching 1.5-second full-screen SVG transition before navigation. Skip, reduced-motion immediate navigation and modified-click native behavior retained. Seven transition/catalogue tests passed; JS syntax checks passed.

## Require plans for every 3D download account
Removed admin-role model download bypass. All model downloads require an approved unexpired plan and enforce quotas. Existing PLAN_REQUIRED/401 redirect opens plans.html?notice=renew-plan with red First renew your plan notice. Verified admin missing/pending/revoked/expired rejection and approved quota consumption; 15 quota, redirect and real HTTP tests passed.

## Admin management tabs
Added Login history (default), Wallpapers, and 3D plans accessible tabs. Accounts and activity shown by default. Wallpaper inbox, counters, original selectors and access register filter to wallpaper designs; model plan requests stay in 3D tab. Improved dark admin text contrast. Four tab, account audit, approval navigation and HTTP approval tests passed; live admin page HTTP 200.

## Admin unread notification badges
Added persisted per-owner, per-tab seen timestamps and authenticated notification count endpoint. Red new-count badges cover sign-in/registration, wallpaper requests, and 3D plan orders. Polls every 15 seconds while visible and on focus. Clicking a tab refreshes its records before acknowledging the previous snapshot; failed loads preserve counts. Login remains default. Three account/tab/notification tests passed, including owner isolation and preservation of later requests.

## Complimentary plan grants
Admin 3D tab now provides registered-email suggestions, plan selection and Activate free plan. Admin-only grant endpoint atomically supersedes approved/pending plans and grants full validity from now, retaining daily usage. Complimentary flag is migrated in SQLite and shown honestly on admin/customer views; no paid label for free grants. Customer badges/polling use existing activation flow. Eighteen plan/client/HTTP tests pass, including authorization, unknown email, expiry, replacement and actual quota consumption.

## Performance, design and security refinement � 2026-10-11
- Preserved pre-existing catalogue, plan, import and admin work. Starting inventory: 694 changed/untracked image assets and 83 source files; source and images are not equivalent rewrite targets.
- Added a shared paper/forest-green visual system to all ten entry pages, compact Plans placement, consistent static marketing/catalogue headers and mobile menu shortcuts. Replaced the perspective hero with three editorial artwork frames and consolidated repeated pricing styles. Admin keeps its logo, role guard and management tabs.
- Removed pointer-driven tilt/magnetic/glow effects, counters, scrolling progress, forced format navigation overlays, old animation helpers/styles and unused GSAP/VanillaTilt/Locomotive/gh-pages dependencies. Motion is automatic/reduced with conservative device hints and OS accessibility preference; native cursor remains everywhere.
- Added visible request scheduling and deduplication. Plans/admin refreshes reduced from 5/15 seconds to 60 seconds; header/catalogue use five minutes. Explicit refresh, account changes and expiry still update the UI; server authorization remains authoritative.
- Deferred the full wallpaper catalogue. The first shared project chunk fell from 1,681.25 KB (329.10 KB gzip) to 419.93 KB (54.77 KB gzip); the complete 1,276.13 KB catalogue is loaded when needed. Existing saved selections trigger full hydration before commerce writes to avoid dropping designs. Catalogue identity/data-preservation tests added.
- Production API destination is pinned rather than trusting browser-storage/window/meta overrides. Removed unused unpkg script permission and unrestricted HTTPS connect permission. Compatible npm advisory fixes applied; audit reports zero known vulnerabilities.
- Functional and security checks passed (103 tests plus two new catalogue-loading tests); final verification recorded in the refinement build/test logs. No connected browser is available, so responsive layout and visual polish still need actual browser review. No commit, push or deployment performed for this refinement.
- Final verification: 105/105 tests passed; follow-up polling tests passed after backoff handling; production build passed in 25.13 seconds; all ten built pages and 138 local asset references validated; the full wallpaper chunk is absent from homepage preload links; git diff --check passed. The remaining build warning refers to the intentionally deferred full catalogue.

## Asset compression and automatic hero motion ? 2026-10-11
- Optimized 4,066 generated wallpaper/detail and card images from original sources with MozJPEG, retaining JPEG URLs, dimensions, watermarks, catalogue IDs and private originals. The complete 4,074-image JPEG library fell from 293755959 to 233623444 bytes (20.47% / 60.13 MB saved); eight legacy/orphan images remain unchanged. Every image dimension was compared with the pre-pass copy, and both catalogue modules retained identical hashes.
- Added assets:catalogue command and cached encoding profile; normal builds reuse optimized previews. Added a CI safeguard so tracked model reference photos do not replace the complete wallpaper snapshot in a checkout without the private wallpaper source library.
- Per user correction, removed the motion selector and its storage preference everywhere. Motion is automatic using OS, data-saving, pointer and hardware hints. Restored the earlier corridor movement with ten wallpaper cards (previously eighteen) and six 3D gallery cards; smaller/reduced-motion devices show three still cards. Hover/focus, off-screen and hidden-tab pausing retained; no cursor tracking or JavaScript animation loop.
- 108 tests passed, plus the five catalogue tests after the CI safeguard. All 4,074 JPEG dimensions and formats verified, and representative before/after artwork inspected. Browser layout/frame-rate verification remains unavailable because no browser is connected. No commit, push or deployment performed.
- Production build passed in 18.80 seconds. Validated all ten built pages, 138 HTML asset references and 4,114 catalogue preview references; no motion buttons in built HTML. Built images total 241,684,229 bytes. The full deferred catalogue retains the existing bundle-size warning.

## Readable customer request references - 2026-10-11
- Added a persistent shared request-reference sequence for print and plan requests: registered account-name slug plus six-or-more digits. Existing requests acquire references on first read; duplicate names stay unique and references survive account renaming and restarts. Internal UUID relations, authorization and file-storage names remain intact.
- Admin/customer request views, plan and wallpaper WhatsApp messages, and downloaded print filenames show the readable reference. Older backend responses retain a compatibility fallback; backend and frontend deployment are both required.
- 109 tests passed, covering stable references, duplicate names, retries, cross-kind uniqueness, WhatsApp content and real print approval/download ownership. No commit or push performed.

## Plans redesign and original palette restored - 2026-10-11
- User explicitly corrected the palette: restored warm cream wallpaper colors and black/white 3D colors in the shared tokens, removing the introduced forest-green scheme. Plans use the 3D black theme.
- Redesigned plans heading with lightweight CSS artwork, rounded cards, readable prices, active-state outlines, a preferred-format comparison selector, expandable full limits, and three activation steps. All five prices, permissions, limits and approval flow retained. Responsive grids adapt from five to three, two and one column.
- Comparison is entirely local; verified all 40 format/plan values and expand/collapse accessibility state. Existing 109 tests passed. No browser is connected for visual review. No commit or push.

## Local-storage API response caching - 2026-10-11
- Added bounded, token-hash/API-scoped local-storage caches for customer plans (120 seconds), print requests and original access requests (60 seconds). Shared across page navigation, with in-flight deduplication.
- Manual refresh bypasses freshness. Successful mutations and protected downloads invalidate balances; token/logout/401 and cross-tab invalidation clear cached display data. In-flight responses cannot repopulate invalidated cache entries. Restricted/full/corrupt storage falls back to network. Admin data, auth checks and file responses remain uncached and server-authorized.
- Added five cache behavior tests and updated existing client fixtures. 114 tests passed; scoped diff check passed. No push or deployment performed.

## Category redesign and capable-PC motion - 2026-10-11
- Replaced narrow format tiles with horizontal icon cards in the existing monochrome theme, three desktop columns, two tablet columns and one mobile column. Available formats sort first; counts accurately say assets, deduplicate package variants and update from the existing catalogue event without extra requests. Empty categories say Not available yet and omit links until assets exist.
- Removed blanket animation exclusion for touch input or a single four-core/four-GB hint. Reduced motion now follows OS/data-saving settings or combined low-end hints (<=2 cores, <=4 cores with <=4 GB, or <=2 GB with unknown cores). Narrow screens retain the still hero layout. Changed hover pause to artwork cards only rather than the entire hero stage.
- 114 tests passed; category empty-to-available DOM updates verified. Actual browser hardware and visual frame rate cannot be confirmed without a connected browser. No push performed.

## 2026-10-11: Separate wallpaper and 3D content
- Excluded clean-model-previews from wallpaper generation; regenerated snapshots without the model-preview collection.
- Removed four synthetic demo concepts and their homepage/optimizer references. Actual model assets remain.
- Restored underlying wallpaper grid spacing and copy padding; 3D styling retained.
- Added separate 3D download FAQs and render only the active showcase track.
- Validation: 114 tests passed, targeted navigation/hero checks passed, production build passed. Local changes only; not pushed.


## 2026-10-11: Studio pages, navigation and owner workspace
- About: original cream/black palettes, collection toggle, distinct copy/credentials/principles, editorial portrait layout and project CTA.
- Public navigation: consistent Explore/Services/Studio/Contact links, current-page state, rounded controls, preserve keyboard focus while scrolling.
- Admin: clearer tabs, print workflow, collapsed grant/history tools, responsive surfaces. Wallpaper actions now preserve button states and no longer refresh/disable unrelated plan controls.
- User clarified spacing meant homepage hero: restored original 18 wallpaper cards (9 per rail), with lightweight automatic fallback retained.
- Validation: 116 tests passed; build 17.98s; 10 built pages and 136 local references valid. No browser available for visual verification. No commit/push.


## 2026-10-11: Clean browsing and protected detail previews; admin metrics
- Removed dynamic hero figures from Studio/Services/Contact; collection toggle remains only on Home.
- Browsing card/logo overlays removed. Opened model covers now use baked watermarked WebP files; clean thumbnails remain separate. Live API caches baked versions by preview hash. Eight older wallpaper/model detail previews now generated with baked marks too.
- Browser extensions can still capture clean displayed thumbnails; no claim of extension-proof protection.
- Admin metric cards are clickable and colour-coded; pending/approved metrics share the same request totals as filter badges. Shared originals plus print-file storage count labelled explicitly.
- 118 tests passed, build 18.53s; inspected a generated watermarked model image. Full UI visual testing still unavailable. Not pushed.


## 2026-10-11: Registration-only customer list
- Stop persisting new login/logout activity; record each registration once. Historical events are retained but not displayed.
- Admin account endpoint returns five accounts, registration dates and pagination metadata; no sign-in history. Notification counts now count registrations only.
- Customer list replaces one five-record page at a time, loads the next page on scroll inside the list or Next, and caches up to 20 previously viewed pages in memory. Busy guard and failed-page retries prevent skipping pages.
- Validation: full 118-test suite plus new pagination regression passed; production build checked. Requires frontend and backend deployment; not pushed.


## 2026-10-11: Compact request actions
- Print action buttons now fit their labels and wrap side by side, with 44px minimum tap height. File inputs limited to 640px.
- Decline/revoke use a quiet outlined danger treatment instead of competing filled bars. No action logic changed.
- Customer pagination follow-up: removed previous/next controls; scrolling appends five registrations and preserves previous loaded rows.



## 2026-10-11: Collection navigation and regression audit
- All format cards remain navigable, including empty formats. Counts and format breakdowns are admin-only; auth changes update visibility. Black theme retained with a revised two-row card layout. Empty format views offer a prefilled WhatsApp request.
- 3D showcase expanded to 12 real assets. Mouse drag threshold, click suppression, keyboard navigation and blur cancellation added; touch/trackpad scrolling remain native. Showcase names now render as text rather than HTML.
- Previous follow-ups: lamp-off account panels inert; rounded sign-out styling; admin media deterrents; motion-aware trust marquee; aligned 3D plan details.
- Evidence: 121 automated tests passed (0 failures), including admin pagination, authentication/API protections, cache invalidation, category role changes and collection dragging. 77 JS modules passed syntax checks. Production HTML references verified across 10 pages.
- Limits: no rendered browser screenshots available (headless attempt produced no file); mobile appearance, real Google login, live backend/storage and real-device performance still require manual verification. Build retains a deferred catalogue chunk-size warning. No commit or push performed.
