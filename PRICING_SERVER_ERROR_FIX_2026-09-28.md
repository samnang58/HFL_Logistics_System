# Pricing Server Error Fix — 2026-09-28

## Cause
The selected package can have a valid route such as `Guangzhou -> Cambodia Warehouse`, while the database may not yet contain an Active pricing rule for that exact Origin + Shipping Mode + Pricing Type combination.

The old `/pricing/find` endpoint returned HTTP 404 for this normal business case, and the frontend displayed the generic `Server Error` banner.

## Fix
- `/pricing/find` now returns HTTP 200 with `data: null` and a clear message when no active rate exists.
- Pricing selection no longer treats a missing rate as a server failure.
- The Charge Calculation panel shows `No active rate` instead of a generic server error.
- `Generate Invoice` is disabled until an active pricing rule is available.
- Existing database pricing is not deleted or overwritten.
- No pricing rate is invented or hard-coded.

## Route model
China Origin + Shipping Mode + Pricing Type -> one Cambodia Warehouse destination.

Examples that can be configured independently:
- Foshan + SEA -> Cambodia Warehouse
- Foshan + LAND -> Cambodia Warehouse
- Guangzhou + SEA -> Cambodia Warehouse
- Guangzhou + LAND -> Cambodia Warehouse
- Yiwu + SEA -> Cambodia Warehouse
- Yiwu + LAND -> Cambodia Warehouse

Rates must be entered in Pricing; this fix does not invent business rates.
