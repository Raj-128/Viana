

## 2026-10-11: Collection navigation and regression audit
- All format cards remain navigable, including empty formats. Counts and format breakdowns are admin-only; auth changes update visibility. Black theme retained with a revised two-row card layout. Empty format views offer a prefilled WhatsApp request.
- 3D showcase expanded to 12 real assets. Mouse drag threshold, click suppression, keyboard navigation and blur cancellation added; touch/trackpad scrolling remain native. Showcase names now render as text rather than HTML.
- Previous follow-ups: lamp-off account panels inert; rounded sign-out styling; admin media deterrents; motion-aware trust marquee; aligned 3D plan details.
- Evidence: 121 automated tests passed (0 failures), including admin pagination, authentication/API protections, cache invalidation, category role changes and collection dragging. 77 JS modules passed syntax checks. Production HTML references verified across 10 pages.
- Limits: no rendered browser screenshots available (headless attempt produced no file); mobile appearance, real Google login, live backend/storage and real-device performance still require manual verification. Build retains a deferred catalogue chunk-size warning. No commit or push performed.

Test evidence: .gsd/release-audit/deep-final-tests.txt; build evidence: .gsd/release-audit/deep-build.txt.
