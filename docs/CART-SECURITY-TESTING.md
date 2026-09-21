# Cart, downloads and security testing

## Run locally

From `E:\Viana`, run `npm.cmd run dev`, then open the URL printed by Vite and navigate to Work. Vite now starts the backend automatically on the same port. Node 24+ is required. Accounts are stored in `.private/studio.sqlite`; the old browser-only accounts are not imported or trusted. Register a new customer account through the website. Use the same hostname consistently (`localhost` and `127.0.0.1` have separate cookies).

Automated checks: `npm.cmd test` (cart tests and real HTTP authentication/download tests).

Production build: `npm.cmd run build`

Vite cache recovery: an extra agent-started dev server was stopped, the cache now uses `node_modules/.vite-viana`, and port 5173 is strict so a duplicate server fails visibly instead of silently sharing the cache on another port. Keep one `npm.cmd run dev` running. The previous cache was not deleted. Reload your browser after the server restarts.

## Cart checks

1. Click the basket on two different wallpapers. Each should show **Added to cart**, and the header Cart count should become 2.
2. Open **Cart** in the header. Verify both thumbnails and titles. Increase one quantity: the total count and summary should update.
3. Refresh, then open Cart again. The same items and quantities should remain. Open the site in another tab: cart changes should sync between tabs on the same origin.
4. Click an already-added card button. It should open the cart without removing or duplicating the item.
5. Remove an item inside the cart. Its card button should reset. Remove all items: the empty-cart message should appear.
6. Click **Request quote on WhatsApp**. Verify the draft includes every design and quantity. You decide whether to send it. No payment or order is submitted by this website.
7. Test at 375px width and with keyboard Tab, Enter and Escape. The drawer should fit the screen, retain keyboard focus, close with Escape and return focus to its opener.
8. On desktop, move over the Cart and Downloads navigation buttons, open each drawer, and hover over quantity, download and close controls. The same custom cursor should remain visible and change on interactive controls. Close the drawer and verify it continues on the page. Reduced-motion/touch users should retain the native cursor behavior.

Cart/history are saved per browser origin, not to a customer account. Clearing site data clears them; private browsing and different devices do not share them.

## Server setup and download tests

A download calls `GET /api/designs/:id/download`. The backend is implemented and refuses unsigned requests with 401 or requests without a grant with 403. No originals or real customer permissions are populated automatically.

1. Register a customer account in the website.
2. In a separate project terminal, explicitly grant that customer a design and provide its clean original:

   `npm.cmd run server:grant -- customer@example.com floral-branch-wall "C:\YourFiles\original.jpg"`

   Replace the email and file path with your actual values. The first grant copies that original into `.private/files`. Subsequent grants for the same design reuse the stored original. Existing originals are not overwritten. Only use this command after you have verified the customer's payment or otherwise approved access.
3. While signed in as that customer, click the corresponding download button. The file should download and appear in Downloads. Download again should work without duplicate history entries.
4. Revoke access with `npm.cmd run server:revoke -- customer@example.com floral-branch-wall`. The next download should fail with 403 even if its history entry remains.

Create an owner account using `npm.cmd run server:admin`; it prompts for the owner details and a hidden password. Then sign in at `admin-login.html`. The public website cannot create admin accounts.

If the owner account exists but its password is not accepted, run `npm.cmd run server:reset-admin` in a second project terminal. Enter the existing owner's email or full phone number, then enter and confirm a new password. This updates only that admin account, revokes its existing sessions, and never prints the password. Type the new password in the browser and update any outdated password-manager entry. This is a local server-owner operation, not a public recovery endpoint.

Login test: sign out first. Valid admin credentials must succeed on both `login.html` and `admin-login.html`, retaining the admin role. Customers can use `login.html` but must be rejected on `admin-login.html`. The server checks stored roles; client-supplied role flags never grant admin privileges.

Check `http://localhost:5173/api/health`: expect `{"ok":true}`. Opening `/.private/studio.sqlite` should return **403 Forbidden**. Do not add the private folder to Vite's serving allow list. The earlier Vite warning came from a security probe; private requests are now rejected before Vite's file handler.

Implemented server controls and deployment requirements:

- Server-validated sessions use HttpOnly, SameSite=Strict cookies; production cookies also use Secure. Salted scrypt password hashes, origin checks for mutations, bounded JSON requests and persistent rate limits are implemented. Downloads check the server-owned entitlement on every request.
- Return 401 for unsigned users, 403 for no entitlement, 429 for rate limiting, or the approved binary image with a correct content type. Return `Cache-Control: private, no-store`, `Content-Disposition: attachment` and `X-Content-Type-Options: nosniff`.
- Originals live in `.private/files`, outside `src/assets`, `public` and deployed `dist`. Vite denies `.private` and the standalone server only serves `dist`. Browser roles, paid flags, client-sent prices and cart entries are never proof of purchase.
- Automatic payment processing is not implemented. Grants are manual terminal operations; a future payment integration must verify signed server webhooks before granting access.

Additional checks:

1. An authorized download should start and add one history item with a date. Download again should fetch a fresh authorized file without duplicating the history item.
2. An unauthorized request should return 401/403, not an image, and should never enter history.
3. Change the old `studioPaymentComplete`, `studioPaidDesigns`, or local admin session in DevTools. This must not grant download access.
4. Disconnect the network and try downloading. Expect an error and a usable retry button, not a success entry.
5. Request the endpoint directly while signed out. It must reject access. Knowing a design ID or another user's download URL must not grant entitlement.

## Media protection checks and limits

- Right-click and drag a wallpaper: the ordinary image context menu/native drag should be suppressed. Mouse swipe on the carousel should still move slides.
- Preview cards and project gallery have a visible Studio Viana preview overlay. Open print preview: protected artwork should be hidden, while text remains usable.
- Click a wallpaper image in Work: a large viewer should open with repeating diagonal STUDIO VIANA text. Try previous/next buttons, keyboard arrows and horizontal swipes. Escape closes it. The card and its cart button should still be present after closing.
- Text inputs, keyboard navigation and normal text copying remain usable. DevTools and OS screenshot shortcuts are intentionally not presented as blockable security controls.
- Screenshots, IDM, extensions, disabled JavaScript and direct requests can still capture **public preview images**. A CSS watermark can be removed and is not baked into the image. No percentage protection claim is valid.
- Before production, generate reduced-resolution, baked-in watermarked previews and deploy only those publicly. Audit all current images in `dist`: they are publicly downloadable, regardless of frontend controls. Replacing/removing previously public originals cannot erase copies already downloaded.

## Additional hardening included

- Download failures and invalid content types fail closed; no fallback to the public cover URL.
- Browser payment-unlock buttons and payment-flag authorization removed.
- New cart markup escapes displayed values; persisted cart data is normalized against known products. Quantities are restricted to 1–99 and repeated items are deduplicated.
- Vite dev/preview sends anti-framing, MIME-sniffing prevention, referrer and restricted browser-feature headers. Built HTML includes baseline object/base CSP and referrer policy.
- `public/_headers` supplies equivalent response headers on hosts supporting that format (such as Netlify). GitHub Pages does not apply this file. Verify actual deployed response headers with `curl.exe -I YOUR_SITE_URL`; configure unsupported hosts separately.

For deployment, build with `npm.cmd run build`, then run `npm.cmd start` on a Node 24+ host with persistent disk. Set `NODE_ENV=production` and `APP_ORIGIN=https://your-domain.example`, and place it behind HTTPS. `PORT` defaults to 3000 and `HOST` defaults to 127.0.0.1. Back up `.private` securely. Deploy at the site root. GitHub Pages cannot run this backend; the old static `deploy` script is not sufficient. Payment integration, account recovery and email verification are still separate production work.

References: [Chrome screenshot-capable extension API](https://developer.chrome.com/docs/extensions/reference/api/tabs#method-captureVisibleTab), [MDN website security](https://developer.mozilla.org/en-US/docs/Learn_web_development/Extensions/Server-side/First_steps/Website_security).
