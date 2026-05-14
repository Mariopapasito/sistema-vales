---
name: Standard Page Layout
description: Every page must use the same three-class layout structure to prevent visual glitches on navigation
type: project
---

All pages must use this exact outer structure:

```tsx
<div className="dashboard-layout">
  <Sidebar />
  <main className="dashboard-main">
    <div className="dashboard-container">
      {/* page content */}
    </div>
  </main>
</div>
```

Defined in `src/styles/Dashboard.css`.

**Why:** Navigation visual glitch — pages that used different outer wrapper classes (e.g. `monthly-orders-page`, `create-order-page`) caused layout shifts when switching routes because each class had different dimensions/positioning.

**How to apply:** Any new page or page edit must use `dashboard-layout` / `dashboard-main` / `dashboard-container`. Loading/error early-returns should also use `dashboard-layout` + `dashboard-main` as wrappers (with Sidebar included).
