# 3D model library

How the local 3D source library becomes the published catalogue. Moved here from the README, unchanged.

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
