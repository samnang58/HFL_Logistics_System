# HFL Logistics Frontend Architecture

## Boundary
The current application is a React/Vite frontend. Laravel + MySQL will be introduced later. The frontend therefore uses a stable service/API boundary now without pretending that a backend exists.

## Request flow
UI/Page → Hook → Service → apiClient → `/api/v1/`

## Rules
- Pages must not build API URLs directly.
- Pages must not contain financial source-of-truth calculations.
- Reuse existing UI components and layout.
- Keep demo/static datasets isolated under `src/data/` until a real API replaces them.
- Backend remains authoritative for CBM, pricing, invoice totals, payment balances and profit.
- API responses use `{ success, message, data }` and validation errors use `{ success, message, errors }`.

## Service boundary
`resourceService.js` exposes customers, packages, shipments, warehouses, pricing, quotations, invoices, payments, income, expenses and CRM leads, plus tracking, dashboard, reports and auth services.

## Environment
Set `VITE_API_URL` in `.env` for the eventual Laravel API. Do not hard-code API URLs in page components.
