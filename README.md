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

The canonical site is `https://studioviana.work.gd/`. Metadata, JSON-LD, `public/robots.txt`, and the sitemap use this address. The homepage includes visible questions and answers, founder details, and links to existing professional profiles. Structured data describes existing information; it does not promise search rankings or AI citations.

Home, About, Services, and Contact are public and indexable and appear in the sitemap. The design catalogue, project pages, and account/admin pages stay excluded from indexing; design access and downloads retain authentication. Do not add protected or `noindex` pages to the sitemap.

`npm run assets:optimize` regenerates WebP display copies, the small favicon, and the public social logo from the retained source images. The display copies live in `src/generated/site-media/` and must be committed with the HTML/CSS/JS references. Wallpaper previews already have their own generation pipeline.

The live domain was checked on 2026-10-01: HTTPS returned 200 from GitHub Pages, and HTTP redirected to HTTPS. Keep HTTPS enforcement enabled in the GitHub Pages settings. The static site uses the existing Pages delivery infrastructure; the API is hosted separately. Set the production backend's `APP_ORIGIN` to include `https://studioviana.work.gd` if that variable overrides the code default.

After deploying, measure the production pages with PageSpeed Insights or Lighthouse on a mobile connection. Image-byte savings are not a measurement of a two-second page load. Submit `https://studioviana.work.gd/sitemap.xml` in the owner's Search Console property.

Studio Viana operates online only, so Google Business Profile / Google Maps registration is not applicable: Google excludes online-only businesses. Do not create a storefront, service-area listing, or opening hours for this site. After deployment, verify the site in Google Search Console and submit the sitemap above. Add the canonical website to existing professional profiles (such as Behance and Adobe Stock) using the same studio name. Optional industry directories should explicitly support online businesses. Account verification remains an owner action; no directory registrations have been claimed or created. No street address, opening hours, review counts, or certifications have been invented for the schema.

Reference: [Google's AI search guidance](https://developers.google.com/search/docs/appearance/ai-features) and [GitHub Pages HTTPS settings](https://docs.github.com/en/pages/getting-started-with-github-pages/securing-your-github-pages-site-with-https).

## Tech Stack
- Vite (MPA)
- HTML / CSS / JavaScript
- GSAP, Locomotive Scroll, Vanilla Tilt

---

## Development
```bash
npm install
npm run dev
