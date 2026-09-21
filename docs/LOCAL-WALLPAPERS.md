# Local wallpaper library

Put collections in `src/assets/images/wallpapers/library/<Collection>/<Style>/`.
The eight supplied collections have been moved there with their existing names and subfolders intact.
New collection folders placed directly inside `src/assets/images/` are also discovered.

Run `npm run dev`. Adding, replacing, or removing images refreshes the local catalogue automatically after preview generation. Production requires `npm run build` and publishing the new build.

- JPG, JPEG, PNG, WebP, AVIF and TIFF are supported. PSD, PSB, CDR, ZIP and XMP stay as source material and are not published.
- Folder names supply collection/style; the filename supplies its title. Rimura product codes, Rebelwalls product codes, and numbered Unique Places variants group into one design with a gallery. Other images become individual designs. No invented year or location is added.
- Exact duplicates appear once. Content-based design IDs survive moving/renaming the same image; replacing its contents creates a new ID.
- Previews are limited to 1,000 pixels and carry a baked-in watermark. Original collection folders are blocked by the local server and excluded from production output.
- Generated previews and catalogue code live in `src/generated/`. They rebuild automatically; do not edit them.
- Git includes the generated, watermarked catalogue snapshot so a fresh checkout builds without the private source library. Source folders and unwatermarked originals stay local and are ignored by Git. Back them up separately. Supply the full source library before rebuilding its contents on another computer.
- Corrupt/unsupported images are reported in the terminal and skipped, never served unprotected.
- The catalogue shows 24 cards at a time and supports collection/style filters and filename searches.
