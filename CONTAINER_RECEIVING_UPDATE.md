# Container Receiving Update

## Implemented

- Container Control search now supports:
  - Container Number
  - China Tracking / Waybill
  - HFL Package Code
  - Package ID
  - Seal Number
  - Location
- Container list shows a compact Tracking preview and tracking count.
- Added `Received` to Container Movement status after `Cambodia Warehouse`.
- `Received` is treated as the physical confirmation that the container was checked and received at Cambodia Warehouse.
- Container transition remains auditable through `container_tracking_events`.
- Shipment remains at `Cambodia Warehouse` when the container is marked `Received`.
- Package statuses are not incorrectly overwritten to a new delivery state by the container `Received` action; package-level receiving/measurement remains controlled by Cambodia Warehouse workflow.

## Movement flow

Pending -> Loading -> Departed China -> In Transit -> Cambodia Port -> Customs -> Cambodia Warehouse -> Received -> Delivered

## Important identifiers

China Tracking / Waybill remains the original seller/courier tracking number. It is searchable from Container Control but is never replaced by the Container Number or HFL Package Code.

## Verification

- PHP syntax check: `backend/app/Http/Controllers/ContainerController.php` passed.
- Frontend dependency installation/build was not completed in the inspection environment because the uploaded project intentionally does not contain `node_modules`; run `npm install` locally before `npm run build`.
