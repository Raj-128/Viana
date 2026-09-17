# Technology Stack

> Audited 2026-09-16

## Runtime

| Technology | Version | Purpose |
|---|---:|---|
| Vite (rolldown-vite) | 7.2.5 | Multi-page development and build pipeline. |
| JavaScript | ES modules | Client-side behaviour. |
| HTML/CSS | Static | Page content and presentation. |

## Production Dependencies

| Package | Version | Purpose |
|---|---:|---|
| gsap | 3.14.2 | Animation support. |
| locomotive-scroll | 5.0.1 | Installed scrolling utility. |
| vanilla-tilt | 1.8.1 | Card tilt effects. |

## Development Dependencies

| Package | Version | Purpose |
|---|---:|---|
| gh-pages | 6.3.0 | Static-site deployment. |
| vite | 7.2.5 | Build tooling. |

## Configuration

| Setting | Purpose |
|---|---|
| `base: "./"` | Allows relative assets for static hosting. |
| `appType: "mpa"` | Builds the named HTML pages as separate entries. |
