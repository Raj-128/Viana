# Studio Viana

Studio Viana is a digital artist and 3D visualization studio producing custom wallpapers, mural concepts and 3D renders for residential and commercial spaces. This repository holds the whole product: a dual-mode portfolio (Wallpaper and 3D Model Art) plus the ordering, account and download system behind it.

- **Site:** <https://studioviana.work.gd/> — also reachable at <https://raj-128.github.io/Viana/>
- **API:** <https://viana-fpph.onrender.com>

> **The custom domain is blocked on some networks.** Airtel, Quad9 and Cloudflare's security resolver sinkhole `*.work.gd`, a free subdomain space with a poor reputation. Affected visitors get a connection timeout, not an error page. The github.io address always works. Moving to an owned domain is the only real fix.

---

## Requirements

- **Node 22.5 or newer.** The server stores data in SQLite through the built-in `node:sqlite` module, which does not exist in earlier versions. On Node 20 the build fails before Vite starts, because `vite.config.js` loads the API through a plugin.
- No database server, no container runtime. SQLite and the filesystem are the whole data layer.

## Quick start

```bash
npm install
npm run dev     # Vite dev server with the API attached, http://localhost:5173
```

`npm run dev` also imports the local 3D model library on startup and watches it for additions.

To run the production arrangement locally — the Node server serving the built site and the API from one origin:

```bash
npm run build
npm start       # http://127.0.0.1:3000
```

Create the owner account once, interactively:

```bash
npm run server:admin
```

## Layout

```
├── *.html                 Pages. Each is a Vite entry point.
├── src/
│   ├── css/               Styles. studio-system.css is shared by every page.
│   ├── js/                Browser code, plain ES modules, no framework.
│   ├── assets/            Committed source images.
│   └── generated/         Build output committed on purpose: wallpaper
│                          catalogue, previews, optimized site media.
├── server/                Node HTTP API. No framework.
│   ├── start.js           Entry point: serves dist/ and the API together.
│   ├── api.js             Routing, sessions, CORS, SQLite schema.
│   ├── plan-orders.js     Download plans and their approval flow.
│   ├── print-requests.js  Size-specific print requests and private files.
│   └── model-library.js   3D model import, previews, catalogue.
├── scripts/               Importers and image optimizers.
├── tests/                 node:test. No framework, no fixtures.
└── docs/                  Operational detail for each subsystem.
```

The frontend is vanilla HTML, CSS and JavaScript built by Vite as a multi-page app. There is no React, TypeScript or Tailwind, and component libraries written for those stacks cannot be dropped in.

## Deployment

The two halves deploy by different mechanisms, and **keeping them in step is the single most common source of apparent bugs in this project.**

| Half | Where | Trigger |
| --- | --- | --- |
| Frontend | GitHub Pages | GitHub Actions, automatically on every push to `main` |
| Backend | Render (`viana-fpph`) | Render's Auto-Deploy, which has repeatedly failed to fire |

When the backend lags behind `main`, the site does not report a deployment problem. It reports a feature problem: a sign-in that returns an unknown field, an endpoint answering `API route not found`. Both have happened. **After changing anything in `server/`, confirm the deploy actually landed** — check the commit hash on the Render dashboard, or call an endpoint the new code adds.

Pages must be configured with **Settings → Pages → Source: GitHub Actions**. `public/CNAME` republishes the custom domain with every deployment so the setting cannot be lost.

## Environment variables

Set these on the backend host. Everything has a working local default except the admin seed.

| Variable | Purpose |
| --- | --- |
| `APP_ORIGIN` | Comma-separated list of origins allowed to call the API. Once set it is the **only** allowlist — a new site domain that is missing here is rejected, and the browser reports it as an unreachable server. |
| `STUDIO_DATA_DIR` | Where SQLite and private files live. Defaults to `.private/`. Must be absolute on a host. |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Recreate the owner account on boot. This is why admin login survives a wiped database when customer accounts do not. |
| `ADMIN_NAME`, `ADMIN_PHONE` | Optional details for that account. |
| `MFA_KEY` | 32 random bytes, base64, encrypting admin MFA secrets. Keep it forever: replacing it strands every stored secret and locks the owner out. Without it the key is a file, which an ephemeral host discards. |
| `MODEL_SYNC_TOKEN`, `MODEL_SYNC_URL` | Authorize catalogue uploads from the local model watcher. |
| `MODEL_LIBRARY_DIR` | Source 3D library on the importing machine. |
| `NODE_ENV`, `HOST`, `PORT` | Standard. `NODE_ENV=production` requires an HTTPS `APP_ORIGIN` and enables secure cookies. |

## Owner commands

```bash
npm run server:admin            # create the owner account
npm run server:reset-admin      # reset its password
npm run server:admin-mfa        # enrol an authenticator
npm run server:grant            # grant a customer access to a design
npm run server:revoke           # withdraw that access
npm run models:import           # import the local 3D library once
npm run models:watch            # keep importing and sync to the live API
npm run assets:optimize         # regenerate site images and favicons
npm run assets:catalogue        # regenerate wallpaper previews
```

## Tests

```bash
npm test
```

Plain `node:test`, no framework. They cover authentication, MFA, plan orders, print requests, download approval, the hero's motion behaviour and catalogue loading. Run them before pushing: several encode deliberate product decisions, so a failure may mean a decision is being reversed rather than that something broke.

## Operational constraints

These are properties of the current hosting, not defects to be fixed in code. They matter before real customers use the site.

- **The backend filesystem is ephemeral.** Render's free tier discards local changes on every deploy, restart and spin-down. That takes customer accounts, sessions, download entitlements and uploaded print files with it. The admin account returns only because it is reseeded from the environment. A persistent disk, or the dormant Litestream configuration below, is required before anyone pays for anything.
- **`litestream.yml` is committed but not running.** It replicates SQLite to Cloudflare R2 and restores it when a container starts empty. Switching it on is host configuration — the binary in the build command and the start command wrapping the server — plus R2 credentials. See [docs/LIVE-DATABASE-AND-PRINT-FILES.md](docs/LIVE-DATABASE-AND-PRINT-FILES.md). It permits exactly one writer, so the service cannot be scaled past one instance while it is in use.
- **The free service sleeps after 15 minutes of inactivity** and takes about a minute to wake. An uptime monitor on `/api/health` keeps it warm. That is a speed measure only — it does not protect data.
- **Motion is automatic.** Reduced-motion preferences, data saver and low-end hardware hints hold decorative animation still. There is no motion setting in the interface, by design.

## Further reading

| Document | Covers |
| --- | --- |
| [docs/LIVE-DATABASE-AND-PRINT-FILES.md](docs/LIVE-DATABASE-AND-PRINT-FILES.md) | Storage, persistence, print file handling |
| [docs/MODEL-LIBRARY.md](docs/MODEL-LIBRARY.md) | Importing, classifying and syncing the 3D library |
| [docs/DOWNLOAD-APPROVALS.md](docs/DOWNLOAD-APPROVALS.md) | How a customer download is authorized |
| [docs/GOOGLE-SIGN-IN.md](docs/GOOGLE-SIGN-IN.md) | Google identity setup |
| [docs/SECURITY-SETUP.md](docs/SECURITY-SETUP.md), [docs/SECURITY-CHECKS.md](docs/SECURITY-CHECKS.md) | Headers, media protection, review checklist |
| [docs/SEO.md](docs/SEO.md) | Indexing, metadata, Search Console |
| [docs/PERFORMANCE.md](docs/PERFORMANCE.md) | Response caching, catalogue splitting, motion policy |
| [docs/runbook.md](docs/runbook.md) | Routine operations |
