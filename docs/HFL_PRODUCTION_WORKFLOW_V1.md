# HFL Logistics — Production Workflow Hardening V1

This release hardens the logistics workflow so operational screens cannot silently move a package backwards or bypass billing/delivery controls.

## 1. Package lifecycle

1. Order Created
2. Received at China Warehouse
3. Loading
4. Departed China
5. In Transit
6. Arrived Cambodia
7. Cambodia Warehouse
8. Measurement Completed
9. Ready for Billing
10. Invoiced
11. Partially Paid (when applicable)
12. Ready for Delivery
13. Scheduled
14. Out for Delivery
15. Delivered + Proof of Delivery
16. Customer Received

`Customer Received` is stored in `packages.delivery_status`. The package `status` remains `Delivered` so transport completion and customer receipt remain separate business facts.

## 2. Ownership of status changes

- China receipt: `PackageController::receiveChina`
- Container transport: `ContainerController::transition`
- Cambodia receiving: `CambodiaWarehouseController::receive`
- Measurement: `CambodiaWarehouseController::measure`
- Billing readiness: `CambodiaWarehouseController::readyForBilling`
- Invoice: `InvoiceController::fromPackage`
- Payment: `PaymentController::store`
- Last-mile delivery: `DeliveryController::update`
- Customer receipt: `DeliveryController::confirmCustomerReceived`

The generic Package update endpoint does not change package status.

## 3. Container rules

A container can synchronize package status only through the transport/arrival stages. Once a package reaches Measurement, Billing, Payment, Delivery, or Customer Receipt, container movement cannot overwrite it.

Container `Delivered` does **not** mean customer delivery. Last-mile `Delivered` requires a Delivery record and proof of delivery.

## 4. Measurement rules

- First measurement creates `Measurement Completed`.
- Re-saving changed dimensions/weight creates `Measurement Updated` instead of duplicate `Measurement Completed` events.
- Saving identical measurements does not create another tracking event.

## 5. Billing rules

A package must be `Ready for Billing` before an invoice can be generated.

Before entering `Ready for Billing`, the system verifies an active DB pricing rule matching:

- Shipping mode
- Pricing type
- Origin
- Destination
- Effective date
- Expiry date
- Active status

Pricing is never hard-coded in React.

## 6. Payment rules

Payment is transactional and idempotent. A payment cannot exceed the outstanding balance. Full payment moves the package to `Ready for Delivery`; partial payment moves it to `Partially Paid`.

## 7. Delivery rules

`Ready for Delivery → Scheduled → Out for Delivery → Delivered`.

`Delivered` requires proof of delivery. Customer receipt is a separate confirmation and is idempotent.

## 8. Tracking rules

Manual tracking events are no longer allowed to arbitrarily change package status. Known legacy status codes are normalized to HFL workflow statuses, and invalid transitions are rejected.

## 9. Time display

Frontend operational timestamps use `Asia/Phnom_Penh`. Backend application timezone is configured from `APP_TIMEZONE` with the project default set to `Asia/Phnom_Penh`.

Existing historical timestamps created before timezone correction are not automatically rewritten by this release.

## 10. Recommended operating roles

- Super Admin: full control
- Admin: operational and management control
- Sales: customer, quotation and tracking visibility
- Warehouse: receive, scan, measure and warehouse operations
- Finance/Accounting: invoice, payment, receipt and financial reports
- Delivery: delivery, proof of delivery and customer receipt

## 11. Production principle

Every operational status should have:

- Owner
- Allowed next status
- Required data
- Permission
- Tracking event
- Audit trail

The UI is not the source of truth. Laravel + MySQL are the source of truth.
