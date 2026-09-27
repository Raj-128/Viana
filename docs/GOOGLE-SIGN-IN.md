# Google customer sign-in

The public Web client ID is configured in `server/google-auth.js`. No client secret is required or stored. The customer login page fetches this public configuration from the backend.

In Google Auth Platform, configure this Web client with authorized JavaScript origins:

```text
https://raj-128.github.io
http://localhost:5173
```

Add `http://127.0.0.1:5173` only if that address is used for development. Origins must not contain `/Viana/`. This integration uses the Google Identity Services popup/callback flow, not a redirect callback. Configure the app name, support email and audience in Google Cloud; if Google applies a testing restriction, include the testing accounts or complete its publishing requirements. Never send a Google password or OAuth secret in chat.

Customer flow:

1. Open login.html and choose Continue with Google.
2. New customers supply their phone number once. Google does not provide it; the studio uses it for design requests. Phone ownership is not verified by this form.
3. If the email already exists as a password account, supply that account password once to link Google. Existing requests and approvals stay attached to the same customer ID.
4. Returning Google customers sign in without entering that phone again. Google-only customers continue using Google; no password is silently generated for them to use.
5. Owner accounts must use the separate owner password/MFA login. Google sign-in cannot become an administrator or approve a download.

The backend uses Google's official auth library to verify the signature, audience, issuer and expiry. It additionally verifies the nonce and verified-email claim. Short-lived one-use challenges prevent completed login replay. Google `sub` identifies linked accounts. Linking requires the existing password and revokes older sessions; email equality alone never grants account access. Tokens are not logged or stored as Google credentials.

Existing authenticated download authorization remains in place. Google sign-in does not grant original-file access. It also does not make SQLite or uploads persistent on Render Free.

Deploy the backend and frontend from the same main revision. Check `/api/auth/google/config` returns the public client ID and a nonce. A 404 means Render is still running the older backend. The CSP permits the specific Google sign-in script/style/frame paths; other frame sources remain blocked. Backend COOP permits popups. GitHub Pages cannot set custom response headers, and this flow uses its default opener behavior.

Verification: isolated HTTP tests use an injected verifier for deterministic identity fixtures and exercise real account/session/authorization code. Google's official verifier is also checked for invalid-token rejection. A real Google account consent popup is a separate manual verification and is not claimed by these tests.

Official references: [Google setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid), [server token verification](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).
