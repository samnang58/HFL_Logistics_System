# Step 8 — End-to-End Integration Test

## Scope

Test one Mock China package through the operational lifecycle:

`Mock China API → Package → Container → Shipment → Cambodia Port → Customs → Cambodia Warehouse → Receive → Measure → Pricing Recalculation → Ready for Billing → Invoice → Partial Payment → Full Payment → Ready for Delivery → Scheduled → Out for Delivery → Delivered → POD → Tracking/Notification`

Default test package: `777777777001`.

## Static verification completed

- Laravel route registration: **PASS** (122 API routes registered).
- PHP syntax check across `backend/app`, `backend/routes`, and `backend/database`: **PASS**.
- Mock fixture contains 50 packages across 5 containers: **PASS**.
- `777777777001` belongs to `YCL269191` / `HFL-SHP-00001` and starts as `IN_TRANSIT`: **PASS**.
- Container transition endpoint synchronizes container, child packages, shipment status, and tracking events: **PASS by code inspection**.
- Cambodia Warehouse enforces Receive → Measure → Ready for Billing: **PASS by code inspection**.
- Invoice-from-package requires `Ready for Billing`: **PASS by code inspection**.
- Payment enforces outstanding balance, idempotency, partial/full states, and package readiness: **PASS by code inspection**.
- Delivery enforces `Ready for Delivery → Scheduled → Out for Delivery → Delivered` and requires POD for Delivered: **PASS by code inspection**.

## Live execution blocker in this build environment

A real HTTP/DB execution could not be completed inside this sandbox because PHP has PDO but neither `pdo_sqlite` nor `pdo_mysql`, and the `mysql` client/server is unavailable. The frontend dependency installation (`npm ci`) also timed out. Therefore this report does **not** claim a live end-to-end PASS.

## Important blocker found during the audit

`DatabaseSeeder` creates the admin user and shipping modes but does **not** seed any Pricing rows. The Mock China sync contains a legacy test rate of `165`, while the production calculation path correctly expects an active Pricing row in MySQL. Consequently, a fresh database can reach Cambodia measurement but may fail at `Ready for Billing` with `No active pricing was found` unless Pricing has been configured first.

This is intentional to preserve **DB-driven pricing**; the hard-coded mock rate should not become the production source of truth.

## How to run the real test on the developer Mac

1. Start MySQL and create/use `hfl_logistics`.
2. Run migrations and seed the admin user/shipping modes.
3. Create at least one active Pricing record matching the test package route, shipping mode, and pricing type.
4. Start Laravel on `http://127.0.0.1:8000`.
5. Ensure `jq` is installed.
6. Run:

```bash
HFL_ADMIN_EMAIL=admin@hfl-logistics.com \
HFL_ADMIN_PASSWORD=change-me \
API_URL=http://127.0.0.1:8000/api/v1 \
HFL_TRACKING=777777777001 \
./scripts/step8-e2e-smoke.sh
```

The script stops at the first failed step and prints `PASS` only after the final Delivered/POD step succeeds.
