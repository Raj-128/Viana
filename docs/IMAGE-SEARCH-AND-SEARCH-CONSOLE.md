# Studio Viana image search and sitemap guide

This guide sets up a public, no-sign-in **Search by image** feature on the Work page. A visitor uploads or takes a photo; Google Vision Product Search compares it only with the wallpaper images in Studio Viana's product set and returns matching designs from the Studio Viana website. It is not a search of Google Lens or the wider web.

The web page and API route are implemented. Image search becomes operational after the Cloud Vision project, product set, credentials, and Render environment are configured below. The public sitemap is generated at [`public/sitemap.xml`](../public/sitemap.xml).

## A. Prepare the Studio Viana catalogue for image matching

### 1. Create a Google Cloud project

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project (or select one you control) and copy its **Project ID**.
3. Link a billing account.
4. In **APIs & Services → Library**, enable **Cloud Vision API**.
5. Choose one supported Product Search region, for example `us-west1`, and use it consistently in the import and Render settings.

Product Search has a separate visual index containing your product catalogue; it does not search the public internet. New product/reference-image imports can take about a day to appear in matches. Check current rates before enabling it: Google's published price table lists monthly query and image-storage tiers, and other Cloud Storage charges can apply. [Product Search pricing](https://cloud.google.com/vision/product-search/pricing), [indexing notes](https://docs.cloud.google.com/vision/product-search/docs/create-reference-images).

### 2. Create the image bucket and service account

Install the Google Cloud CLI, then in PowerShell replace the sample values and run:

```powershell
$ProjectId = "YOUR_GOOGLE_CLOUD_PROJECT_ID"
$Bucket = "a-globally-unique-bucket-name"
$ServiceAccountName = "studio-viana-image-search"
$Location = "us-west1"

gcloud config set project $ProjectId
gcloud services enable vision.googleapis.com
gcloud storage buckets create "gs://$Bucket" --location=$Location --uniform-bucket-level-access
gcloud iam service-accounts create $ServiceAccountName --display-name="Studio Viana image search"
$ServiceAccount = "$ServiceAccountName@$ProjectId.iam.gserviceaccount.com"
gcloud projects add-iam-policy-binding $ProjectId --member="serviceAccount:$ServiceAccount" --role="roles/vision.user"
gcloud storage buckets add-iam-policy-binding "gs://$Bucket" --member="serviceAccount:$ServiceAccount" --role="roles/storage.objectViewer"
```

The account that runs the import also needs permission to call Vision Product Search and read the bucket. Use the Google Cloud Console IAM page to grant access to that account. Keep permissions narrow; don't give the production service account Project Owner. Google's authentication guidance covers service accounts and Cloud Storage access. [Vision authentication](https://docs.cloud.google.com/vision/docs/authentication), [Product Search setup](https://docs.cloud.google.com/vision/product-search/docs/before-you-begin).

### 3. Export your wallpaper images and CSV

From the repository root, first build the current public catalogue, then export the images and Product Search CSV:

```powershell
npm.cmd run build
npm.cmd run visual-search:export -- --bucket=$Bucket --product-set=studio-viana-wallpapers
```

The script creates `visual-search-export/images/` and `visual-search-export/catalogue.csv`. The export contains the wallpaper catalogue only. These files are ignored by Git because the images are uploaded directly to Google Cloud Storage.

Upload both:

```powershell
gcloud storage cp --recursive .\visual-search-export\images "gs://$Bucket/visual-search/"
gcloud storage cp .\visual-search-export\catalogue.csv "gs://$Bucket/visual-search/catalogue.csv"
```

### 4. Import the catalogue into Product Search

Sign in for local application credentials, set the quota project, and run the importer:

```powershell
gcloud auth application-default login
gcloud auth application-default set-quota-project $ProjectId
npm.cmd run visual-search:import -- --project=$ProjectId --bucket=$Bucket --location=$Location --product-set=studio-viana-wallpapers
```

The script waits for the bulk import and reports how many images were accepted. Fix any failed rows before moving on. Wait for Google's Product Search index to refresh before judging match quality.

### 5. Add credentials to the live backend

The site frontend deploys through GitHub Pages; the API runs separately on Render. The browser calls the Render API, and only that server holds Google credentials.

1. In Google Cloud **IAM & Admin → Service Accounts**, open `studio-viana-image-search` and create a JSON key.
2. In the Render service `viana-fpph`, add the downloaded JSON as a **Secret File**, for example `/etc/secrets/studio-viana-vision.json`.
3. Add these Render environment variables:

   ```text
   GOOGLE_CLOUD_PROJECT=YOUR_GOOGLE_CLOUD_PROJECT_ID
   GOOGLE_CLOUD_LOCATION=us-west1
   GOOGLE_PRODUCT_SET_ID=studio-viana-wallpapers
   GOOGLE_APPLICATION_CREDENTIALS=/etc/secrets/studio-viana-vision.json
   ```

4. Deploy the backend commit containing `server/visual-search.js` and `server/api.js`.
5. Open `https://viana-fpph.onrender.com/api/visual-search/config`. It should return `{"enabled":true}`. That checks the project and product-set settings; test a photo on `https://studioviana.work.gd/work.html` as the final check.
6. The public feature needs no account or sign-in. If it fails, inspect the Render logs and confirm the service account can call Vision and read the uploaded bucket images.

The website resizes supported JPEG, PNG, and WebP photos before sending them to the API. It does not store the uploaded photo. It forwards that photo to Google Cloud to match only the Studio Viana wallpaper product set; the Work page explains this before upload and links to the privacy policy. The endpoint limits uploads to 4 MB and rate-limits requests.

### 6. Test the visitor flow

1. Open the Work page in a private/incognito browser window, while signed out.
2. Click **Choose a photo** and select a room or wallpaper inspiration image (JPEG, PNG, or WebP, under 4 MB).
3. Confirm matches appear under **Closest designs in our collection**.
4. Open a matched design or add it to the quote/cart using its card controls.
5. Repeat on a phone to check the camera/photo picker and mobile layout.

## B. Submit the sitemap and check Google indexing

The sitemap file is [`public/sitemap.xml`](../public/sitemap.xml); the production URL is:

```text
https://studioviana.work.gd/sitemap.xml
```

Current generated sitemap contains seven public canonical pages. The build regenerates it from indexable root HTML pages. The Work catalogue and individual design pages are access-gated/noindex, so they intentionally aren't sitemap entries.

1. Deploy the latest frontend to GitHub Pages and backend to Render. Confirm `https://studioviana.work.gd/sitemap.xml` opens and lists the current public URLs.
2. Open [Google Search Console](https://search.google.com/search-console/) and select the URL-prefix property `https://studioviana.work.gd/`. The homepage already contains the Search Console verification meta tag. If Search Console asks you to verify again, use the HTML-tag method for this exact HTTPS property and keep its verification tag in the homepage.
3. Select **Indexing → Sitemaps**. Enter `sitemap.xml` in **Add a new sitemap** and submit.
4. Open **URL Inspection** and inspect these canonical URLs:

   ```text
   https://studioviana.work.gd/
   https://studioviana.work.gd/about.html
   https://studioviana.work.gd/services.html
   https://studioviana.work.gd/contact.html
   ```

5. Click **Test Live URL** on each. Check that Google can fetch it and that indexing is allowed. Confirm Google's selected canonical matches the `https://studioviana.work.gd/` version.
6. If a page is eligible but absent from Google, click **Request indexing** once for the homepage and the most important public pages. Recheck **Page indexing** and the sitemap status over the next several days. A request or sitemap is a discovery signal, not a guarantee of indexing or ranking.
7. If Google reports a block, fix its reported reason first: verify the page isn't `noindex`, robots.txt allows crawling, canonical URL is correct, and the live response isn't a 404, redirect loop, or 5xx error. Then rerun Live Test and request indexing again after the fix.

Google Search Console ownership, sitemap submission, and indexing requests require access to the owner's Google account; the repository cannot perform those account actions. Google may take days or longer to crawl and index pages. The free `.work.gd` hostname can also be unreliable on some resolvers; an owned domain is the long-term improvement.

Official references: [verify ownership](https://support.google.com/webmasters/answer/9008080), [submit a sitemap](https://support.google.com/webmasters/answer/7451001), [URL Inspection](https://support.google.com/webmasters/answer/9012289/), [Google crawling and indexing FAQ](https://developers.google.com/search/help/crawling-index-faq).
