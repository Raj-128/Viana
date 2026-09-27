# Authentication and hosting security

These changes are local code changes until the backend and frontend are deployed. They do not enable a WAF or enroll a real owner automatically.

## Implemented in the application

| Layer | Behavior |
| --- | --- |
| SQL | Bound parameters for user input; no user-controlled SQL identifiers |
| Uploads | Owner-only upload, format allowlists, byte signature checks, size limits, random filenames, private storage and attachment downloads |
| Sessions | Random token at login; hashed tokens in SQLite; prior supplied session revoked; 30 minutes without authenticated API activity expires the session; 24-hour absolute expiry |
| Cookies | HttpOnly, SameSite=Strict, Path=/, Secure in production; host-only cookie (no broad Domain attribute) |
| Cross-origin requests | Exact allowed frontend origins; arbitrary github.io sites no longer accepted; cross-site mutations without Origin rejected when identified by Fetch Metadata |
| Passwords | Salted scrypt N=16384, r=8, p=5; previous hashes remain usable and upgrade after successful authentication |
| Login abuse | Five failed password/authenticator attempts per account within 15 minutes block further attempts until that window expires; email and phone share the counter; successful authentication clears it |
| Owner MFA | TOTP enrollment confirmed with a real code; code replay rejected; enrollment/recovery revokes owner sessions; encrypted secrets bound to their owner |
| Authorization | Customer can access only their own approved request file; owner role enforced by backend, not browser flags |
| HTTP | Existing CSP, nosniff, frame restrictions, HTTPS HSTS; Node static handler rejects directories and does not emit framework version headers |

The scrypt profile follows [OWASP's memory/CPU tradeoff profiles](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html). Authenticator codes follow [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238).

File signatures are format checks, not a malware scanner. Only trusted owners should upload finished print files. PDF/TIFF contents are not sanitized or converted by this service.

The GitHub Pages frontend and Render API are different sites. Existing cross-site bearer authentication remains necessary; HttpOnly cookie protection does not cover tokens accessible to frontend JavaScript. Keep CSP and third-party scripts tightly controlled. Moving frontend/API behind the same site would allow a cookie-only redesign, but is not part of this deployment.

## Enable the owner's authenticator

Run on the backend host, with the same `STUDIO_DATA_DIR` as the running API:

```sh
npm run server:admin-mfa
```

Enter the owner email/phone, add the displayed setup key to a trusted authenticator app as a time-based account, then enter its current six-digit code. No setting changes until that code is verified. The owner must then use **admin-login.html**, password and a fresh authenticator code. Both login API routes enforce MFA after enrollment, so the customer login cannot bypass it.

Enrollment is per owner; repeat for each owner account. Existing owners remain password-only until enrolled. This prevents an unannounced deployment lockout; MFA is not fully enabled until this step is completed.

Keep the host clock synchronized. Enrollment consumes the submitted code; wait for the next code before login. Keep private backups of the database AND `STUDIO_DATA_DIR/mfa.key`. The key is created only during enrollment. Losing it prevents existing MFA secrets from decrypting. Keep it out of Git and restrict filesystem access; encryption does not protect against a full compromise of the host and its key.

If the authenticator is lost, a trusted operator with backend terminal access can run:

```sh
npm run server:recover-admin-mfa
```

It requires explicit confirmation, disables MFA for the selected owner and revokes sessions. Re-enroll immediately. Password reset does not disable MFA. No browser-accessible MFA recovery endpoint is provided.

## Hosting steps still required

1. Confirm Render persistent storage and back up `studio.sqlite`, private files and any MFA key. Set `STUDIO_DATA_DIR` to the persistent mount before enrollment; see [deployment notes](LIVE-DATABASE-AND-PRINT-FILES.md).
2. Set `NODE_ENV=production` and `APP_ORIGIN=https://raj-128.github.io`. For an additional frontend, add its exact origin, comma-separated, with no path and no wildcard. Keep local HTTP development separate.
3. Deploy backend changes before the updated frontend. Database changes are additive. Once a password upgrades, an older backend that only understands legacy hashes cannot authenticate it; do not roll back only the auth code without a compatible migration plan.
4. WAF configuration requires access to the domain/DNS and hosting account. With a domain you control, proxy the API hostname through your chosen provider, enable its applicable rules, then verify that direct-origin access cannot bypass those rules. See [Cloudflare WAF setup](https://developers.cloudflare.com/waf/get-started/). Do not blindly apply upload limits that block the existing 250 MB print-file flow; check provider limits before routing uploads.
5. `raj-128.github.io` and `onrender.com` are provider-owned domains; this repository cannot change their DNS or install Apache/Nginx directives. No WAF subscription, DNS change, firewall rule or paid resource has been created.

The application uses a conservative socket-IP authentication limiter as well as per-account cooldowns. Behind a shared proxy, socket-IP limits can group customers together. Do not trust arbitrary X-Forwarded-For headers to fix this; configure a verified trusted-proxy/edge policy first.

## Verify

Run `npm test`. Isolated HTTP tests cover real account login, legacy hash upgrade, MFA, replay, encrypted secret binding, idle expiry, cooldown persistence, cookie flags, origin rejection, private uploads, cross-account denial and approval/revocation. They do not prove a hosting WAF or DNS policy is active.

Locally: owner → Studio → request inbox; customer → account → My requests and print files. Submit a design with dimensions, upload/check/approve its file as owner, then refresh the customer's requests and download. Browser visual verification remains a separate check.
