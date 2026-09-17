# Wallpaper controls and carousel

Status: FINALIZED

- Replace catalogue selection and text actions with basket and image-download icon buttons.
- Keep existing download access checks pending the user's separate security requirements.
- Make carousel mouse swipes reliable, prevent native image dragging, and preserve vertical touch scrolling.
- Verify the build and browser behavior.

## Cart and downloads follow-up
- Persistent browser cart with thumbnails, quantities, removal, counts, and quote-request handoff.
- Accessible cart/download dialogs reachable from every site header.
- Persistent download history with download-again, loading/error feedback, and existing access checks.
- No payment gateway or account-synced backend in this change; security requirements remain pending.

## Server and enlarged-preview follow-up
- Add a local server with persistent users, hashed passwords, cookie sessions and per-design entitlement checks, plus owner-only terminal provisioning.
- Keep originals in a private directory denied by the development server and excluded from builds.
- Each catalogue image opens a large keyboard/swipe-accessible viewer. Repeat STUDIO VIANA across wallpaper previews and retain the cart action on each card.
