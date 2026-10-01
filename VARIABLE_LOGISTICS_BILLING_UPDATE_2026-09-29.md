# Variable Logistics Billing Update — 2026-09-29

## Business rule
HFL logistics rates are variable and must not be treated as a permanent hard-coded rate.

## New flow
China Warehouse → Container/Shipment → Cambodia Warehouse → Measurement Complete → Open Bill (Draft) → Enter Current Rate → Save → Invoice Unpaid → Payment → Delivery.

## Billing behavior
- No active Pricing List is required to open a bill.
- If a current Pricing List exists, it may prefill the rate, but it is not required.
- If no rate is available, the system creates a `Draft` invoice with zero total and clearly asks billing staff to enter the current rate.
- The current rate is saved into the invoice pricing snapshot and package billing snapshot.
- After the rate is saved, the invoice becomes `Unpaid`, the package becomes `Invoiced`, and payment can be recorded.
- Draft bills cannot be printed until a rate is entered.
- Existing invoices keep their saved rate and do not change when future logistics rates change.

## Important
No hard-coded `$165/CBM`, Yiwu rate, Foshan rate, Guangzhou rate, or other permanent logistics rate was added.
