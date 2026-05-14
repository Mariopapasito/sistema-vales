---
name: Project Tech Stack
description: Core technologies, versions, and key dependencies for the sistema-vales app
type: project
---

React 18 + TypeScript frontend at `client/src/`. Node/Express backend at `server/`.

Key dependencies:
- `@heroicons/react` v2 — icon library (`/24/outline` path, e.g. `ClipboardDocumentListIcon`)
- `react-redux` + Redux Toolkit — global state (auth slice at `store/slices/authSlice`)
- `react-router-dom` — routing
- `html2pdf.js` — PDF generation in OrderDetail
- Vite as bundler

CSS: glassmorphism design system. Styles live in `src/styles/`. Do NOT modify CSS files.

**Why:** Full-stack order-management ("vales") system for a gas station chain (Multiservicio La Villita). Roles: `jefe`, `sistemas`, `compras`, `estacion`.
**How to apply:** Match existing patterns; use heroicons v2 outline path for any new icons.
