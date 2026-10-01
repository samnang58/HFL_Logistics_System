# HFL Open Bill / Billing Edit Implementation

## Workflow

Cambodia Warehouse → Billing & Payment → Open Bill → Edit Billing → Save/Recalculate → Receive Payment → Send Bill → Print Bill

## Frontend

- `src/pages/InvoiceBillDetail.jsx`
  - Dedicated Open Bill page.
  - Edit final CBM, weight, pricing type, rate, delivery/handling/warehouse/other fees, discount and due date.
  - Shows customer/package information, calculated totals, paid/outstanding balance and payment history.
  - Receive partial/full payment from the same page.
  - Send Bill uses the browser share sheet when available and otherwise copies a customer-facing bill URL.
  - Print Bill opens the existing invoice print view.
- `src/pages/BillingManagement.jsx`
  - Adds `Open Bill` action to invoice rows and the package-linked banner.
- `src/services/billingApi.js`
  - Adds `updateInvoiceBilling()`.
- `src/App.jsx`
  - Adds `/accounting/sales-invoice/:id/edit`.

## Backend

- `backend/app/Http/Controllers/InvoiceController.php`
  - Adds `updateBilling()`.
  - Recalculates shipping cost, fees, discount, grand total and outstanding server-side.
  - Never trusts `paid_amount` from the browser.
  - Preserves existing payments.
  - Prevents an edit that would make the new bill total lower than money already paid.
  - Updates the linked package billing snapshot as well.
- `backend/routes/api.php`
  - Adds `PATCH /api/v1/invoices/{id}/billing`.

## Accounting rule

`Outstanding = Grand Total - Paid Amount`

Status is derived from the balances:

- `Unpaid` → Paid Amount = 0
- `Partially Paid` → Paid Amount > 0 and Outstanding > 0
- `Paid` → Outstanding = 0

The browser only previews the new amount. The Laravel API is the source of truth.

## Verification

PHP syntax and Laravel route registration were verified.
The frontend JSX/JS files were parsed successfully with Babel.
The supplied ZIP's Vite build environment is still missing Rollup's Linux optional native package (`@rollup/rollup-linux-x64-gnu`), so `npm run build` cannot be completed in this container until dependencies are reinstalled on the development machine.


## One-click warehouse billing

The simplified operational flow is:

China Warehouse → Container / Shipment → Cambodia Warehouse Receive → Measurement → Invoice / Open Bill → Payment → Delivery → Customer Received.

- Container status `Received` now moves linked transport-stage packages into `Cambodia Warehouse`.
- After Cambodia Warehouse measurement is saved, the existing idempotent package-invoice endpoint is called automatically.
- If an invoice already exists, the user goes directly to `Open Bill`.
- If pricing is missing, receiving/measurement remains successful and the user sees the pricing error; the system never creates a zero-value invoice.
- `Billing & Payment` keeps a direct `Create Bill` fallback for packages already at Cambodia Warehouse / Measurement Completed / Ready for Billing.
