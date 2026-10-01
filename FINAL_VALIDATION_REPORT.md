# HFL Logistics Production Hardening - Final Validation Report

Date: 2026-09-25
Timezone standard: Asia/Phnom_Penh

## Verified in source
- Container lifecycle does not set Package to Delivered.
- Container transport updates are restricted to transport/arrival stages and do not overwrite packages after they leave that lifecycle.
- Repeated identical container transitions do not create duplicate package tracking events.
- Generic Package update cannot change Package status; operational endpoints control workflow transitions.
- Package financial/measurement fields are locked after billing/delivery stages.
- Cambodia Warehouse measurement detects unchanged measurements and uses `Measurement Updated` when an existing measurement changes.
- Ready for Billing requires Measurement Completed, measured CBM/weight, and an active database pricing rule.
- Delivery requires proof type and proof URL before Delivered.
- Customer Received requires Package Delivered and a completed Delivery record, is idempotent, records receiver details, and creates a TrackingEvent.
- Frontend has a Cambodia timezone formatter using `Asia/Phnom_Penh`.

## Installation validation
- PHP syntax validation: PASS for all PHP files under app/, database/, and routes/.
- Composer installation and Laravel migration/seeding were verified from the supplied installation log.
- `php artisan migrate` reported `Nothing to migrate` and route listing showed the Customer Received route in the supplied installation log.

## Local-machine validation still required
The build environment used for this package did not complete `npm ci` within the available execution window, so a local frontend build must still be run after extraction:

```bash
npm ci
npm run build
```

Backend setup:

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve --host=127.0.0.1 --port=8000
```

Frontend:

```bash
npm ci
npm run build
npm run dev
```

## End-to-end acceptance flow
1. Sync/create package from China.
2. Receive at China Warehouse.
3. Attach to Container/Shipment.
4. Move container through transport stages.
5. Receive package at Cambodia Warehouse.
6. Measure package and save final CBM/weight.
7. Confirm Ready for Billing with active pricing.
8. Create Invoice.
9. Record payment until Paid.
10. Create Delivery.
11. Schedule / Out for Delivery.
12. Mark Delivered with proof.
13. Confirm Customer Received.
14. Verify Tracking Timeline contains the lifecycle events without duplicate identical measurement/container events.

## 2026-09-25 Pricing UX Hardening

The Cambodia Warehouse billing action now resolves pricing automatically from the database through one shared resolver. Matching order is:
1. Exact Origin + Destination + Shipping Mode + Pricing Type + Active/effective dates.
2. Normalized warehouse origin, so `Yiwu Warehouse` can match a pricing origin of `Yiwu`.
3. An explicitly configured generic China origin (`China`, `China Warehouse`, `All China`, or `China Warehouses`) for the same destination/mode/type.

No rate is hard-coded. If no rule matches, the API returns the package's pricing context and tells staff to configure an Active pricing rule.
