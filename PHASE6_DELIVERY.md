# Phase 6 — Delivery & Customer Handover

## Flow
Ready for Delivery → Scheduled → Out for Delivery → Delivered

Failure path: Scheduled/Out for Delivery → Failed; Failed may be rescheduled. Cancelled is terminal.

## Delivery assignment
- Create delivery from a package that is `Ready for Delivery`.
- Assign a delivery user/driver.
- Store address, phone, schedule, and notes.

## Proof of Delivery
A delivery cannot become `Delivered` without `proof_type` and `proof_url`. `proof_note` stores receiver/signature/photo notes.

## Failure
A `failure_reason` is required when a delivery is marked `Failed`.

## Tracking
Every delivery creation/status transition creates a package tracking event.

## Database
Migration `2026_09_21_090000_add_proof_fields_to_deliveries_table.php` adds proof and failure fields.

## API
- GET `/api/v1/deliveries`
- POST `/api/v1/deliveries`
- PUT `/api/v1/deliveries/{id}`
- GET `/api/v1/users/delivery-drivers`
