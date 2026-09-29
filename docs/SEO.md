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
