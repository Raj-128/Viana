# Live database, customer records and print files

The current site address is https://raj-128.github.io/Viana/ (the repository belongs to Raj-128).
GitHub Pages serves the built website. The existing API is https://viana-fpph.onrender.com.
GitHub Pages cannot run the Node API or keep a writable customer database.

## Database choice

Keep the existing SQLite database for this single-backend deployment. No account migration to a different database is needed for these changes. SQLite holds accounts, hashed passwords, sessions, registration/sign-in events, design requests, dimensions and approval status. Files are stored privately beside the database, not inside the public website.

The server now supports `STUDIO_DATA_DIR`. With no setting, local development continues using `.private/`. For a persistent Render disk mounted at `/var/data`, set:

```text
STUDIO_DATA_DIR=/var/data/viana
APP_ORIGIN=https://raj-128.github.io
NODE_ENV=production
```

Use the actual disk mount path shown in your Render dashboard. The directory contains `studio.sqlite`, its SQLite journal files, and the private `files/` directory. The API and owner-management commands use the same setting. Never put this directory, passwords or API tokens in GitHub or `dist/`.

Render requires a paid service for a persistent disk. A free service has an ephemeral filesystem: redeploying, restarting or spinning down can lose SQLite accounts and uploaded files. Do not use that arrangement for customer orders. If a paid persistent disk is not an option, migration to a managed database plus private object storage is a separate required change; merely setting `STUDIO_DATA_DIR` does not make storage persistent.

To check the current setup: open Render Dashboard, select the existing **viana-fpph** service, and inspect **Disks** for a mounted disk and its mount path. Then check **Environment** for `STUDIO_DATA_DIR`. If no disk is listed, do not assume the database is persistent. The disk status was not available in this session.

## Existing live data comes first

Before changing the disk path or redeploying an existing service, back up the current SQLite database consistently and copy its private files. Arrange a maintenance window with writes paused for that backup and migration. Do not copy only an active `studio.sqlite` file while ignoring its WAL journal. Restore the database and all files into the persistent data directory before starting the new release. An empty directory would create a new empty database; it does not automatically import existing accounts.

Keep regular, access-controlled backups of both the database and private files, and test restoring them. Hosting persistence is not a substitute for backups. No live disk, account, data migration, paid plan or deployment was changed by this local implementation.

## What the customer does

1. Open a design, enter width and height in inches, choose paper and quantity.
2. Click **Send design request**. The server saves the exact specification and returns a reference. Repeating the same pending/approved request returns that reference; a different size creates a separate request.
3. Optionally click **Discuss this request on WhatsApp**. The message contains the same specification and reference. The website saves the request before offering WhatsApp; it does not depend on the customer sending the message.
4. Open **Your requests and print files** or the header's Downloads button. Pending, approved, declined and revoked states are shown per request.
5. Once approved, click **Download my print file**. The server checks the account and this exact request on every download.

## What the owner does

Open `admin-downloads.html` while signed in as the owner. In the request row, check the customer, reference, inches, paper and quantity. Prepare the artwork for those specifications using the master source, upload its PDF/TIFF/JPG/PNG (up to 250 MB), download it to check, confirm it is print-ready for the requested size, then approve.

An upload alone does not grant access. Replacing a pending file invalidates any earlier file confirmation. An approved file cannot be silently replaced; each different size belongs to a separate request. Decline and revoke block customer downloads. Preparing crop, resolution, colour profile, bleed and print panels is the studio's responsibility: the website does not enlarge a small preview and claim it is print-ready.

Earlier design-only downloads remain available under the clearly labelled legacy controls; they do not grant access to a new size-specific request.

## User records

The owner page includes **Users and sign-in history**, with search, pagination, registration date, last successful sign-in, recorded sign-in count, and registration/login/logout events. This is protected by the backend's admin check. Passwords, password hashes and session tokens are not returned.

Events start being recorded with this release. Older accounts stay present, but previously unrecorded dates and login events cannot be reconstructed. Passwords remain hashed using the existing authentication implementation.

## Release order

1. Confirm persistent storage and complete the backup/migration above. Use Node 24 on the backend; build with `npm ci`, start with `npm start`. Keep the existing owner credentials; do not reset them during deployment.
2. Deploy the backend changes first. Check `/api/health`; test registration, owner account records, a size request, private upload, approval and a customer download. Test that a different customer cannot download that request. Use a dedicated test account/file.
3. In the GitHub repository, set **Settings > Pages > Source** to **GitHub Actions**. The existing workflow deploys `main`, now running `npm test` before `npm run build`. Publishing requires pushing the verified release to `main` or dispatching its workflow.
4. Publish the frontend after the API is ready. The current frontend already points to the existing Render API on GitHub Pages; localhost continues using its own API. `APP_ORIGIN` is the origin only, without `/Viana/`.
5. Check the live page end to end and verify records/files remain after a backend restart. Monitor available disk space as print files accumulate.

The local implementation is not automatically live. Backend credentials and the persistent-storage configuration must be verified before publishing.

## Native content protection

No paid protection service or browser library is required. Artwork blocks right-click, dragging and selection, including dynamically loaded cards. Existing save/source/inspect shortcut deterrents remain; editable inputs and normal artwork navigation continue working. Large previews retain watermarks, while public thumbnails remain small and clean as requested.

Large viewers also overlay a short signed-in account reference, without exposing email or IP addresses. Print Screen and Windows/macOS capture shortcuts temporarily conceal protected previews if their events reach the page; loss of focus also conceals them. The site displays rendered 3D images rather than GLB/GLTF models. No canvas methods are overridden because doing so is bypassable and can break valid preview exports.

Node responses and local development include CSP, frame-denial, MIME-sniffing, referrer and permissions headers. The stronger CSP permits the site's existing animation/font resources and blocks inline executable scripts. HTTPS backend responses include HSTS. Built GitHub Pages HTML includes a CSP meta policy, but GitHub Pages response headers remain controlled by GitHub: `frame-ancestors` cannot be enforced through a meta tag. See [MDN frame-ancestors](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-ancestors). Enable GitHub Pages' Enforce HTTPS setting; backend headers cannot change GitHub's frontend headers.

Original print files are private and require a server-authorized request download. Their stored file paths are not returned in customer/admin list responses. Uploads have format-signature and size checks; authorization is rechecked on downloads. A change of request size never grants access automatically.

Browser deterrents cannot guarantee screenshot prevention or stop a determined user saving a public thumbnail. There is no verified basis for a 95% prevention claim. Apache `.htaccess` rules do not run on GitHub Pages or this Node server, so no ineffective `.htaccess` file has been added. Account credentials and SQLite backups are excluded from Git.

References: [GitHub Pages static hosting](https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages), [Render persistent disks](https://render.com/docs/disks), [Render free-service storage limitations](https://render.com/docs/free).
