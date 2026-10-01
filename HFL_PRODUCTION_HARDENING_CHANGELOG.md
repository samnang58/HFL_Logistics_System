# HFL Logistics — Production Hardening Changelog

## 2026-09-24 — Workflow Hardening V1

### Backend
- Container transitions no longer overwrite packages that have already moved into measurement, billing, payment, delivery, or customer receipt stages.
- Container `Delivered` no longer sets packages to `Delivered`.
- Package loading into a container is restricted to transport-stage packages.
- Generic Package update cannot change operational status.
- Generic Package update locks measurement/financial fields after billing starts.
- China warehouse receipt cannot move an advanced package backwards.
- Cambodia Warehouse receipt is idempotent and avoids duplicate tracking events.
- Repeated identical measurements do not create duplicate `Measurement Completed` events.
- Changed measurements create `Measurement Updated` events.
- `Ready for Billing` verifies a currently active DB pricing rule for the package route.
- Manual Tracking Event status changes are validated against the package workflow.
- Legacy tracking status codes are normalized to HFL workflow statuses.
- Customer receipt confirmation is centralized in `DeliveryController` and is idempotent.
- Customer receipt requires an actual completed Delivery with POD.
- Duplicate `confirm-received` API route was removed.

### Frontend
- Added `src/utils/dateTime.js` for Cambodia timezone display (`Asia/Phnom_Penh`).
- Operational timestamp displays were updated in major logistics, tracking, billing, finance, shipment, warehouse and audit screens.
- Package status editing is locked in the generic Package edit modal; operators must use the operational workflow pages.
- Package API normalization now exposes customer receipt fields.
- Delivery Management keeps the Customer Received confirmation flow.

### Documentation
- Added `docs/HFL_PRODUCTION_WORKFLOW_V1.md`.
- Added `PRODUCTION_SETUP.md`.
- Updated API contract with Customer Received endpoint.

## Validation
- PHP syntax check: PASS for 97 PHP files.
- Laravel route registration: PASS.
- Laravel timezone check: `Asia/Phnom_Penh`, `+07:00`.
- Frontend Vite build could not be completed in the build container because the supplied `node_modules` contains Mac/ARM native Rollup binaries and the Linux x64 optional Rollup binary is missing. Run `npm ci` on the target Mac before `npm run build`.
