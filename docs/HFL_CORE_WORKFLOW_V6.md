# HFL Logistics Core Workflow v6

## Operational flow
China Sync → China Warehouse → Package → Container/Shipment → In Transit → Cambodia Warehouse → Receive → Measure → Warehouse Location → Ready for Billing → Invoice → Payment → Ready for Delivery → Delivery → Delivered.

## Exception flow
Problem / Exception and Returned are operational exceptions. They do not continue automatically into billing or delivery until the exception is resolved from Package 360.

## Package rules
- Package list does not expose Print as a row action.
- Print Label remains available from Package 360 when a physical package label is required.
- Next Action drives the operator to the next operational page.
- Existing legacy status values remain readable so imported records are not lost.

## Billing rules
- Create Invoice from a package is idempotent at the backend: an existing invoice is reused.
- Creating an invoice changes the package to `Invoiced` unless it is already Delivered, Cancelled, Returned, Partially Paid, Ready for Delivery, or Invoiced.
- Payment updates the invoice balance and package workflow.
- Partial payment changes package status to `Partially Paid`.
- Full payment changes package status to `Ready for Delivery`.

## Delivery rules
Delivery remains the final operational stage. Delivery status changes are already connected to package status and tracking events.
