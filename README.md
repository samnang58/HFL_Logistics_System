# HFL Logistics — ERP / SaaS UI

A React + Tailwind implementation of the HFL Logistics ERP UI, built page-by-page from
UI reference screenshots. All pages share one design system (sidebar, header, cards,
tables, charts, buttons) via a common component library.

## Getting started

```bash
npm install
npm run dev      # start local dev server (Vite)
npm run build    # production build -> dist/
```

Requires Node.js 18+.

## Tech stack

- **React 18** + **React Router 6** (client-side routing)
- **Tailwind CSS** (utility-first styling, matches the HFL Blue design system)
- **Recharts** (bar / line / composed charts)
- **lucide-react** (icon set)

## File structure

```
src/
  main.jsx                  Entry point (BrowserRouter + App)
  App.jsx                   Route table — maps every sidebar path to a page
  index.css                 Tailwind entry + small global resets

  layout/
    AppLayout.jsx            Shell: Sidebar + Header + Breadcrumb + <Outlet/> + Footer
    Sidebar.jsx              Collapsible nav driven entirely by data/navigation.js
    Header.jsx               Search, notifications, language, theme toggle, profile menu
    Breadcrumb.jsx           Auto-generated from the current route
    Footer.jsx               Shared footer

  components/ui/             Reusable primitives used by every page
    Card.jsx                 Card, CardHeader, Dropdown, IconButton, ViewAllLink
    StatCard.jsx              KPI / stat card (icon, value, % change)
    StatusPill.jsx            Colored status badge (Paid/Pending/Overdue/...)
    DataTable.jsx              Generic table renderer (columns + rows)
    DonutStat.jsx              Donut chart + side legend (Recharts PieChart)
    FunnelStat.jsx             Sales/approval funnel visual
    PageHero.jsx               Module page hero banner (icon, title, quote panel)

  data/                       Mock data + the navigation config
    navigation.js              Sidebar structure, all routes, breadcrumb index
    homeData.js, hflLogisticsData.js, accountingData.js, approvalsData.js,
    crmData.js, buyingData.js, stockData.js, sellingData.js, hrData.js

  pages/
    PlaceholderPage.jsx         Fallback for any route without a built dashboard yet
    HflLogisticsHome.jsx        "HFL Logistics" module landing page
    Home.jsx                    Admin "Home" overview page
    accounting/Dashboard.jsx
    approvals/Dashboard.jsx
    crm/Dashboard.jsx
    buying/Dashboard.jsx
    stock/Dashboard.jsx
    selling/Dashboard.jsx
    hr/Dashboard.jsx
```

## Routing / navigation

`src/data/navigation.js` is the single source of truth for the sidebar. Every
top-level item and every submenu item has a `path`. `App.jsx` reads that same
config to build the route table automatically — any path that doesn't have a
real page component (yet) falls back to `PlaceholderPage`, so **navigation
never breaks** even for pages that haven't been designed from a screenshot.

Built (real) pages today:

| Sidebar item                         | Route          | Reference screenshot |
|---------------------------------------|----------------|------------------------|
| HFL Logistics (module landing)        | `/hfl-logistics` | Screenshot 1 / 2 |
| Home                                   | `/home`         | Screenshot 3 |
| Accounting → Dashboard                 | `/accounting`   | Screenshot 4 |
| Approval Workspaces → My Approvals     | `/approvals`    | Screenshot 5 |
| CRM → Dashboard                        | `/crm`          | Screenshot 6 |
| Buying → Dashboard                     | `/buying`       | Screenshot 7 |
| Stock → Dashboard                      | `/stock`        | Screenshot 8 |
| Selling → Dashboard                    | `/selling`      | Screenshot 9 |
| HR → Dashboard                         | `/hr`           | Screenshot 10 |

Every other submenu item (Sales Invoice, Leads, Item, Warehouse, Settings, etc.)
and every top-level module without a screenshot yet (DiPOS, Vouchers, Assets,
Manufacturing, Projects, Quality, Support, Users, Payroll, Website, Tools,
ERPNext Settings, Integrations, ERPNext Integrations, Build, Announcements)
renders the shared `PlaceholderPage`, keeping the same sidebar/header shell and
a clear "not designed yet" message — ready to be swapped for a real page the
moment a reference screenshot is provided.

## Working interactions

- **Sidebar**: expand/collapse submenus, active-route highlighting, mobile
  off-canvas toggle via the header hamburger.
- **Header search**: live-filters every nav route by label and jumps to it.
- **Header notifications / language / profile**: functional dropdowns (click
  outside to close).
- **Approval Workspaces**: tab switching, search + 3 filter dropdowns
  (client-side filter on title), working pagination.
- **Accounting → Outstanding Invoices**: Receivable / Payable tab switch.
- **Home → Quick Tracking**: typing a tracking number and pressing the button
  (or Enter) shows a mock tracking result card.
- All chart dropdowns (e.g. "Last 30 Days", "This Month") are functional
  `Dropdown` components — selecting an option updates the button label.
- Fully responsive: sidebar collapses under `lg`, stat/quick-action grids
  reflow from 2 → 3 → 4/5/6/8/9 columns, tables scroll horizontally on small
  screens.

## Design system

- **Brand blue**: `#2563EB` / `#1D4ED8` (`bg-blue-600` / `bg-blue-700` in
  Tailwind), used for primary actions, active nav state, and chart accents.
- **Cards**: white, `rounded-xl`, `border-slate-200`, `shadow-sm` — see
  `components/ui/Card.jsx`.
- **Status pills**: centralized color mapping in `StatusPill.jsx` so every
  table across every module (Paid, Overdue, Pending, Approved, ...) looks
  consistent without re-implementing the color logic per page.
- Typography: Inter, loaded via Google Fonts in `index.html`.

## API-ready architecture

The UI now has a centralized API client, resource services, reusable calculation utilities, API hook, and `.env.example`. Set `VITE_API_URL` to the Laravel `/api/v1` endpoint. The supplied ZIP does not contain a Laravel application, so the backend must be provisioned separately rather than being represented as a fake/mock implementation.

## Notes / known limitations

- All data is mock data (`src/data/*.js`) — wire these up to real API calls
  when a backend is available; the component props are already shaped for it.
- The hero banner photography (plane/ship/truck/containers) from the original
  screenshots is recreated as a stylized icon illustration rather than the
  exact photo, since the original is a copyrighted stock photo/collage.
- World "maps" in Shipment Overview / Supplier by Country are a lightweight
  dot-grid + route-line SVG, not a geo-accurate map library, matching the
  reference's visual style without adding a heavy mapping dependency.
