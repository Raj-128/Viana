# Studio Viana

Studio Viana is a digital artist and 3D visualization studio that creates custom wallpapers, mural concepts, and immersive 3D renders for residential and commercial spaces.  
This website is built as a dual‑mode portfolio and ordering experience: Wallpaper on one side and 3D Model Art on the other.


[ Live Site →](https://studioviana.work.gd/)

---

## Why the Wallpaper Section Exists

The wallpaper side is built as a real product experience, not just a gallery:

- **Showcase real wallpapers** with large, continuous preview strips that feel like a physical showroom.
- **Let clients explore by theme** (Child, Nature, Floral, Minimal, Luxury, Abstract).
- **Let clients estimate price instantly** using width + height + finish + quantity.
- **Make ordering fast** with a one‑click WhatsApp inquiry that includes size, paper finish, and project reference.

The goal is to help a client go from “I like this design” to “I’m ready to order” in one page.

---

## Why the 3D Model Art Section Exists

Studio Viana also delivers 3D visualizations, not only wallpapers.  
This mode is for showcasing:

- 3D concept renders
- product visualizations
- lighting studies
- spatial design previews

The 3D side is visually darker and more cinematic, so it feels like a separate studio lane.

---

## Features
- Dual‑mode site: Wallpaper / 3D Model Art
- Persistent mode toggle (stays across pages)
- Work archive with filters and dynamic project pages
- Continuous wallpaper marquee loop
- Live wallpaper price estimator
- WhatsApp order message generator
- Client login/register + separate admin login
- Media protection deterrents (right‑click/drag/print)
- Responsive layout with custom UI styling

---

## Pages
- Home: `index.html`
- Work: `work.html`
- Project detail: `project.html`
- Services: `services.html`
- About: `about.html`
- Contact: `contact.html`
- Client login/register: `login.html`
- Admin login: `admin-login.html`

---

## Search visibility and image delivery

Customer-facing print and plan request IDs use the registered account name plus a unique numeric sequence, for example `raj-patel-000123`. References are stored permanently and also assigned to older requests when first read; renaming an account does not change existing references. Admin views, customer history, WhatsApp messages and print download names share that reference. Internal IDs and ownership checks remain unchanged. Deploy the backend with the frontend to enable the new format; older API responses retain their previous ID as a compatibility fallback.

Customer print-file receipt: approved size-specific orders show **I received the file** in Downloads. Customers must save and check their download, then explicitly confirm permanent removal. The backend verifies ownership, approval and the file version, records receipt, removes only that order's uploaded file, and disables further downloads. Order dimensions, file size/type and receipt time remain in the database. A failed deletion keeps its reference and offers a retry; downloads never delete files automatically. Shared legacy originals and previews are unaffected. This removes the active uploaded copy, not external backups. The current print-file limit remains 250 MB; persistent storage is still needed until receipt, and 10 GB/resumable uploads are not implemented.

The canonical site is `https://studioviana.work.gd/`. Metadata, JSON-LD, `public/robots.txt`, and the sitemap use this address. The homepage includes visible questions and answers, founder details, and links to existing professional profiles. Structured data describes existing information; it does not promise search rankings or AI citations.

Home, About, Services, and Contact are public and indexable and appear in the sitemap. The design catalogue, project pages, and account/admin pages stay excluded from indexing; design access and downloads retain authentication. Do not add protected or `noindex` pages to the sitemap.

`npm run assets:optimize` regenerates WebP display copies, the small favicon, and the public social logo from the retained source images. The display copies live in `src/generated/site-media/` and must be committed with the HTML/CSS/JS references.

`npm run assets:catalogue` optimizes wallpaper previews from the retained originals using MozJPEG: 1000-pixel detail previews at quality 78 with baked watermarks, and 640-pixel clean card thumbnails at quality 76. Sizes, filenames and catalogue IDs stay stable. This is lossy display compression, not compression of customer print files. The encoding profile is cached so normal builds do not repeatedly recompress previews; the first migration can take several minutes. The build also applies this profile to new source images automatically. Commit the generated JPEGs alongside the code. Deployments without private originals retain the public snapshot. Original art and downloadable model packages are never modified by this command.

The live domain was checked on 2026-10-01: HTTPS returned 200 from GitHub Pages, and HTTP redirected to HTTPS. Keep HTTPS enforcement enabled in the GitHub Pages settings. The static site uses the existing Pages delivery infrastructure; the API is hosted separately. Set the production backend's `APP_ORIGIN` to include `https://studioviana.work.gd` if that variable overrides the code default.

After deploying, measure the production pages with PageSpeed Insights or Lighthouse on a mobile connection. Image-byte savings are not a measurement of a two-second page load. Submit `https://studioviana.work.gd/sitemap.xml` in the owner's Search Console property.

Studio Viana operates online only, so Google Business Profile / Google Maps registration is not applicable: Google excludes online-only businesses. Do not create a storefront, service-area listing, or opening hours for this site. After deployment, verify the site in Google Search Console and submit the sitemap above. Add the canonical website to existing professional profiles (such as Behance and Adobe Stock) using the same studio name. Optional industry directories should explicitly support online businesses. Account verification remains an owner action; no directory registrations have been claimed or created. No street address, opening hours, review counts, or certifications have been invented for the schema.

Reference: [Google's AI search guidance](https://developers.google.com/search/docs/appearance/ai-features) and [GitHub Pages HTTPS settings](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https).

### Brand search follow-up (2026-10-09)

The owner confirmed Search Console ownership with the homepage HTML tag and showed a successful live URL test. Actual Google indexing, sitemap processing success, and search impressions still need confirmation in Search Console. The four public pages, robots.txt, and sitemap returned HTTP 200 in the live audit; the public pages have self-referencing canonical URLs and allow indexing.

Local brand improvements put Studio Viana first in the homepage title, add `og:site_name`, and distinguish the studio's Instagram identity from the founder's portfolio profiles in JSON-LD. After publishing, inspect the homepage's **Google Index** status (not only Live Test) and Google's selected canonical. Check sitemap status, then inspect About, Services, and Contact. In Performance, track queries containing `studio viana` and `viana` and compare impressions/clicks over time. Keep existing public profile names and website links consistent. Ranking for the broad term `Viana` and an automatically generated knowledge panel cannot be guaranteed by code or schema. Keep the Search Console verification tag permanently.

## Tech Stack
- Vite (MPA)
- HTML / CSS / JavaScript
- GSAP, Locomotive Scroll, Vanilla Tilt

---

## Development

### Automatic 3D model library

The source library defaults to `E:\3d design file studio viana`. Override it with `MODEL_LIBRARY_DIR` on another PC. Originals are never renamed or edited. `npm run models:import` matches previews and packages, reads original product names and formats from archives, creates small WebP previews, and copies downloads into `STUDIO_DATA_DIR/files` (locally `.private/files`). Archive listing requires libarchive/bsdtar; Windows' built-in `tar.exe` works. Set `MODEL_ARCHIVE_TOOL` to another libarchive executable if needed. Archive contents are never extracted into the website. GitHub receives only the generated catalogue and previews, not the model packages.

Use matching names in the same category folder, such as `Modern Pendant.rar` and `Modern Pendant IMAGE.jpg`. Numbered pairs such as `DESIGN-1.rar` and `DESIGN -1 IMAGE.jpg` also work, including archives without extensions. The importer waits for writes to settle, verifies the copied file checksum, and retries failures. It leaves unmatched previews/files and ambiguous pairs unpublished. Existing imports survive an unavailable source drive or removal from the source folder. Changing an existing file keeps its ID and added date; newly discovered models appear first. The first import uses source creation dates. The homepage shows the nine most recently added downloadable models.

Category and item type come from actual product names before folder labels. Current-library style classifications were reviewed against previews and are stored in `server/model-library-overrides.json`. Future names/folder labels containing Modern, Urban/Loft, Classic, Scandinavian, Art Deco or Bohemian cues can classify automatically; unknown styles are left blank, not invented. For exact metadata, add a JSON sidecar next to a package (for example `DESIGN-1.rar.json`):

```json
{"title":"Delta Light Boxy R Spotlights","collection":"interior","category":"lighting","itemType":"ceiling spotlight","theme":"modern"}
```

Use `"hold":"Reason to check this pair"` to hold a new uncertain pair. Import results and unmatched/mismatched items are listed in `.private/model-import-report.json`. All 181 source pairs are imported. The chair and sofa encrypted packages were opened with the password supplied in their archive comments and repacked with their texture archives. The mislabeled tile package contains Spiraea Betulifolia Autumn Plants; its actual embedded 3DS Max viewport thumbnail is used, with the model categorized as exterior garden plants. Reviewed package/preview mappings live in the ignored `.private/model-prepared.json`; source SHA-256 checks prevent stale reviewed files from replacing a changed source. Source originals remain untouched. Unpaired future archives remain unpublished.

`npm run dev` imports on startup and checks for additions every 15 seconds. `npm run models:watch` runs the importer continuously and, when configured, syncs new/changed models to the live backend. Keep this PC and the watcher running for PC-to-live updates. A stopped/offline watcher catches up next time it runs. Runtime catalogue clients check for published changes every 30 seconds, so newly synced models need no frontend rebuild. Live-only project links load metadata before rendering. The generated snapshot remains available if the backend is unreachable.

Running `npm run dev` again while this workspace's Vite server is already running prints its local URL and exits successfully. The development-only status endpoint identifies this workspace before reusing the server. A different application occupying the port is never stopped or reused.

Reviewed watermark edits are registered with `node scripts/register-clean-model-preview.js "relative source IMAGE.jpg" "reviewed-edit.png"`. The importer uses `server/model-preview-overrides.json` to select the reviewed copy and checks the original image checksum before applying it. Full edited copies stay locally in `src/assets/images/clean-model-previews/`; generated WebP previews and the catalogue are the deployable assets. Original images and model packages remain untouched. New folder additions import automatically; image cleanup is a separate reviewed step. The 3D preview displays the full model photo beside a file card showing formats verified from the downloadable package.

For live activation:

1. Deploy this frontend to GitHub Pages and the updated server to the existing Render service.
2. Point Render's `STUDIO_DATA_DIR` at the existing persistent disk. Allow enough free space for this approximately 6.64 GB source library and future additions; old file versions are retained.
3. Set Render's `MODEL_SYNC_TOKEN` to the token in the local, ignored `.private/model-sync.json`. Keep the key private. This credential permits catalogue uploads only, not access to user accounts or plan approvals. The `url` in that file is the existing Render API. Set `enabled` to `true` only after backend deployment and token configuration.
4. Run `npm run models:sync` for the initial upload, or leave `npm run models:watch` running. A failed sync retries on the next pass and skips already published versions. Packages transfer as streams (2 GB maximum per package); metadata is published only after checksum-verified upload. Downloads still require an approved plan and quota checks.

The watcher status is `.private/model-watch-status.json`. On this PC, the Windows task `Studio Viana Model Library Sync` starts `scripts/model-watch.vbs` at user sign-in, which runs the Node watcher hidden; a process lock prevents duplicate watchers. `scripts/start-model-watch.ps1` is an alternative manual background launcher with `.private/model-watch.log` and `.private/model-watch-error.log` output. Authentication keys, SQLite files and private model originals must never be committed or placed in `public/`.

```bash
npm install
npm run dev
```

### Performance and visual refinement
Customer plan responses use a two-minute local-storage cache; print and original-access request lists use one minute. Cache entries are partitioned by a SHA-256 session-token hash and API URL, bounded to five responses of at most 250,000 characters, and shared across page navigation. Simultaneous reads share one request. Manual refresh bypasses freshness; successful writes, file downloads, logout/account changes and unauthorized responses invalidate the cache, with cross-tab invalidation. Failed, expired, corrupt or unavailable cache entries fall back to the API. Authentication checks, administrative records and download files are never stored by this response cache; server authorization remains mandatory. Live catalogue polling retains its existing revision mechanism rather than storing large base64 preview payloads in local storage.

All pages share `src/css/studio-system.css`. Decorative motion automatically reduces for reduced-motion/data-saving preferences and combined low-end CPU/memory hints. There is no motion setting in the interface. Browsing, login, plan approvals and downloads work in either mode. Hardware hints are not a benchmark or a guarantee of frame rate.

The homepage keeps the studio's wallpaper corridor movement with ten cards instead of eighteen, and a six-card 3D gallery. Small screens and reduced-motion devices use three still images. Hidden tabs, off-screen heroes, hover and keyboard focus pause the animation. Animation runs in the browser from precomputed keyframes, without pointer tracking or a JavaScript frame loop.

The wallpaper catalogue is split into a small committed landing-page snapshot and a full deferred module. Import/watch regenerates both. Preserve `src/generated/wallpaper-featured.js` in deployments without the private source library. Build output is minified; source files remain readable.

Production API calls use the fixed Render origin in `src/js/api-config.js`. Browser-local API URL overrides are intentionally ignored so they cannot redirect credentials. To migrate the backend, change that origin and the matching CSP origin in `server/security-headers.js` together. Local development still uses its same-origin API.

Frontend deployment uses the existing GitHub Actions workflow on main. The unused `gh-pages` CLI and its manual deploy script have been removed. Backend deployment, persistent uploaded-file storage and backups are separate from publishing the frontend.
