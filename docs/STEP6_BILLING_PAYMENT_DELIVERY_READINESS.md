# Step 6 — Invoice → Payment → Ready for Delivery

## Source of truth
All invoice/payment state is stored in Laravel + MySQL. The frontend uses `billingApi.js`; `billingLocalService.js` is legacy and must not be used for operational billing.

## Package billing gate
A package can generate an invoice only when its status is `Ready for Billing`. This prevents bypassing Cambodia Warehouse measurement and pricing recalculation.

## Payment flow
`Invoice → Payment → Partially Paid / Paid`.

Payments are transactional, use a unique idempotency key, cannot exceed outstanding balance, cannot be recorded against cancelled/void invoices, and must match the invoice customer.

## Package status after payment
- Partial payment → `Partially Paid`
- Full payment → `Ready for Delivery`

Each payment creates an Income record and a Tracking Event for linked packages.

## Receipt
Each confirmed payment receives a unique `HFL-RCP-XXXXXX` receipt number. Receipt data is read from the payment + invoice records.
