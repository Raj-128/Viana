# Technology stack

Updated 2026-10-11.

- Node.js 24 in CI; project engine >=22.5 for node:sqlite.
- Vanilla JavaScript ES modules, semantic HTML and CSS; native Web Animations for short section entrances.
- Vite via rolldown-vite 7.2.5 builds ten HTML entry points with shared chunks and a deferred wallpaper catalogue.
- `google-auth-library` verifies Google credentials on the server.
- `sharp` creates bounded public previews and processes permitted uploaded images.
- SQLite stores users, sessions, audit records, approvals and plan/download usage.
- Node's test runner verifies frontend state modules and real HTTP API behavior.
- GitHub Actions + GitHub Pages publish the frontend at studioviana.work.gd.
- Render hosts the API at viana-fpph.onrender.com; its writable file storage has a lifecycle independent of Pages deployment.
- WhatsApp handoff uses user-initiated links; approval/payment status is controlled by the server.

Removed GSAP, VanillaTilt, Locomotive Scroll and the redundant gh-pages CLI. Deployment remains in the existing Actions workflow. The lockfile includes compatible advisory fixes; npm audit reported zero known vulnerabilities on 2026-10-11. This is dependency evidence, not a guarantee of application security.

Production secrets and origins remain server environment settings. Never put authentication keys, sync tokens, private originals or database files in frontend modules or generated public assets.
