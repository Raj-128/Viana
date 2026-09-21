# Architecture

> Audited 2026-09-16

## Overview

Studio Viana is a Vite-built multi-page marketing and catalogue site. Browser-side JavaScript supplies catalogue filtering, wallpaper estimates, WhatsApp inquiries, visual interactions, and a local-only demo account experience.

## Components

| Component | Location | Purpose |
|---|---|---|
| Page entry points | `*.html` | Eight independently addressable Vite pages. |
| Site application | `src/js/main.js` | Catalogue, estimator, project detail, utilities, and responsive navigation. |
| Account UI | `src/js/auth.js` | Local browser-storage account and navigation state. |
| Premium interactions | `src/js/premium.js` | Page transitions, drag scroll, WhatsApp contact form, and decorative effects. |
| Catalogue data | `src/js/projects.js` | Project records, themes, paper types, and asset paths. |
| Styling | `src/css/` | Base, layout, component, interaction, auth, and premium styles. |

## Data Flow

`projects.js` feeds cards, project details, and the estimator in `main.js`. The estimate and contact form build prefilled WhatsApp URLs. Preferences and the account UI use `localStorage` only.

## Integration Points

| Service | Purpose |
|---|---|
| Vite | Local development and production build. |
| WhatsApp | Opens a prefilled inquiry/order message. |
| Google Fonts / unpkg GSAP | Remote presentation assets. |

## Audit Notes

- Authentication and authorization are client-side `localStorage` state, not access control. Do not use them to protect paid downloads, customer information, or admin functions; a backend-issued session and server-side authorization are required.
- The build has no automated browser or unit test suite. Production build and targeted registration checks are currently the available regression coverage.
