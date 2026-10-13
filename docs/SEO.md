# Search visibility

The production frontend is https://raj-128.github.io/Viana/. Canonical links and social metadata must use this address until a real custom domain is configured. The public sitemap is https://raj-128.github.io/Viana/sitemap.xml.

Only publicly accessible pages belong in the sitemap. Work and project details currently require login, so they are excluded and marked noindex. Login and owner pages are also noindex. Do not remove authentication or private download checks for crawlers. The same content and access rules must apply to everyone.

## Owner setup

1. Add a **URL-prefix property** for `https://raj-128.github.io/Viana/` in Google Search Console.
2. Verify ownership using Google's supplied HTML file (place it in `public/`) or verification meta tag. Never invent a verification token.
3. Submit `sitemap.xml` and inspect the homepage URL after deployment. Request indexing once; submission does not guarantee indexing or rankings.
4. Review indexing reports and search queries over time. Publish useful, original project descriptions and real installation examples rather than repetitive keyword pages.

A robots.txt file must live at the hostname root, `https://raj-128.github.io/robots.txt`. A file under `/Viana/` is not a robots.txt for this site. Configure the root repository separately if needed; submit this project's sitemap directly in Search Console. Robots rules and noindex are not security controls.

For local discovery, the owner can maintain an eligible Google Business Profile with accurate location, contact details, real photos and customer reviews. No fabricated reviews, ratings, addresses or ranking claims are added to the site.

References: https://developers.google.com/search/docs/fundamentals/seo-starter-guide and https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap.

## Search visibility, assets and image delivery

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
