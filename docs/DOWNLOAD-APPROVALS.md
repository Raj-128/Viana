# Website download approvals

## Customer

1. Register or sign in using the normal login page.
2. Click a design's download icon and choose **Request original access**.
3. Open **Downloads → Check approval status** to see the studio's decision.
4. Once approved, choose **Download original** in the request list or **Download approved original** in the design options.

Watermarked previews remain available without original-file approval. Request status is shown on the website; no automatic email or WhatsApp notifications are sent.

## Studio owner

1. Sign in as admin and open **Manage download approvals** from the account card, or click **Admin** in website navigation.
2. In `admin-downloads.html`, review customer requests and click **Upload original first** if necessary.
3. Select the correct design and upload its clean JPG, PNG or WebP original (maximum 25 MB). Files are stored privately. The website does not remove watermarks from source files.
4. Click **Approve** for the customer. You can also grant access directly using their registered account.
5. Use **Decline** for pending requests or **Revoke access** under Approved access.

An uploaded original is shared by all approved customers of that design. Existing originals are not overwritten by the upload form. Revoking access blocks future downloads; it cannot recall copies already saved.

## Check the flow locally

Run `npm.cmd run dev`. Use a normal browser session for admin and a separate private window for a test customer.

- Customer: submit a request and confirm it says pending.
- Admin: refresh requests, upload a clean test image, approve the customer.
- Customer: check approval status and download. The original should match the uploaded file, with no added watermark.
- Another unapproved customer: the original download must be denied.
- Admin: revoke access; the first customer's next original download must be denied.
- Preview: save a preview and verify that Studio Viana watermarks are inside the saved image.

Automated checks: `npm.cmd test` and `npm.cmd run build`.

For deployment, run the Node server and retain its `.private` data directory across releases. Static hosting alone cannot process accounts, uploads or approval requests.
