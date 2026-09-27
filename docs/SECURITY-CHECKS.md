# Test the local security and approval flow

Start the project with `npm run dev` and use http://localhost:5173. Test locally with sample accounts and files before releasing to the live site.

## Right-click and screenshot checks

1. Hard-refresh localhost with **Ctrl+Shift+R**. Open a large wallpaper preview or detail page.
2. Right-click the artwork itself. The image context menu should not open. Right-clicking the page background and other non-editable content is blocked too. Text-input editing menus remain available.
3. Drag the artwork toward the desktop. Native image dragging should not start. A normal click on a card must still open the design.
4. With focus outside an input, try **Ctrl+S**, **Ctrl+U**, **Ctrl+Shift+I** or **F12**. The page cancels those keyboard events when the browser allows it.
5. Switch away with **Alt+Tab**, then return. The protected preview hides while the page is unfocused and returns after focus is restored.
6. Try **Print Screen** or **Win+Shift+S** (macOS: **Cmd+Shift+3/4/5**). If the browser receives the key/focus event in time, the protected preview hides briefly. The operating system may capture first or not deliver the shortcut to the page, so a screenshot may still succeed. This is a platform limitation, not a guaranteed lock.
7. Verify a large preview has the Studio Viana watermark and a short viewer reference. Public hero/catalogue thumbnails remain clean. The viewer reference is an overlay deterrent; the wallpaper preview also has its existing baked-in watermark.

The page must restore its artwork after returning to the browser. Approved file downloads and ordinary input editing must still work. Browser menus, extensions and operating-system capture tools can bypass client-side shortcuts.

## Customer and backend checks

Use three separate browser profiles: customer A, customer B, and the owner. Tabs in the same profile share the same login, so they cannot prove cross-account isolation.

| Test | Action | Expected result |
| --- | --- | --- |
| Pending request | As customer A, open a wallpaper, choose inches/paper/quantity and send the request. Open Downloads. | Its reference and exact specification appear. No print-file download button yet. |
| Upload is not approval | As owner, find the reference and upload its sample print file. Refresh customer A's requests. | It is still pending and locked. |
| Approval | Owner downloads the file to check it, confirms the file matches the request and approves. Customer A checks approval status. | Download my print file appears. The downloaded bytes are the uploaded file; the filename includes the request and dimensions. |
| Another size | Customer A sends another request for the same wallpaper with a different width. | A different reference appears. It remains locked, even though the first size was approved. |
| Another account | Customer B opens Downloads and requests the same design/size. | A's request is not listed. B's own request is locked until independently approved. |
| Decline | Owner declines B's request. | B sees Declined and cannot download a print file. |
| Revoke | Owner revokes A's approved request. A checks status again. | Future downloads are denied. Already downloaded files cannot be taken back. |
| File replacement | Upload a replacement while a request is pending. | The owner must check and confirm the replacement before approval. Approved files cannot be silently replaced. |
| Account records | Register a sample customer, sign out, sign in again. Open the owner's Users and sign-in history. | Registration, successful sign-ins and logout appear. A customer cannot access the owner records page/API. |
| Browser deterrents | Right-click or drag a hero/card/detail image; try Ctrl+S, Ctrl+U or F12 outside an input. | Supported browser events are blocked on artwork. Input editing, card clicks, size entry and approved downloads still work. |
| Watermarks | Open a clean browsing card into its large preview/detail. | Large wallpaper previews have watermarks; catalogue/hero thumbnails remain clean. |
| Local persistence | Stop and restart `npm run dev`, then sign in again. | Accounts, requests, approvals, activity and files remain in the local private data directory. Do not test a live Render restart until persistent storage and backups are confirmed. |

Pending customer requests refresh while Downloads is open; use **Check approval status** for an immediate refresh.

For an authorization check without a login, open `http://localhost:5173/api/admin/accounts` and `http://localhost:5173/api/print-requests`. Both must return 401, not customer records. Cross-account and revoked file downloads are also exercised by the automated HTTP tests.

Run the automated checks from the project terminal:

```powershell
npm test
```

For just the new permission/account/content tests:

```powershell
node --test tests/print-requests.test.js tests/print-request-client.test.js tests/account-records.test.js tests/media-deterrents.test.js
```

The HTTP tests create isolated temporary databases and sample users/files. They do not alter your live or local customer database.

Screenshots, browser-menu developer tools, extensions and public-thumbnail saving cannot be guaranteed blocked. A screenshot succeeding does not mean the private-file authorization failed. The important checks are that original files stay private, only the approved account can retrieve its assigned request file, and preview screenshots retain the watermark.
