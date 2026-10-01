# Step 5 — Cambodia Warehouse → Measurement → CBM → Pricing → Ready for Billing

## Operational flow

1. Package arrives in Cambodia / container reaches Cambodia.
2. Warehouse staff receives the individual package into `Cambodia Warehouse`.
3. Staff records physical box dimensions and final weight.
4. Laravel calculates final CBM on the server.
5. Laravel recalculates shipping pricing from the active Pricing DB record.
6. Package becomes `Measurement Completed`.
7. A final pricing refresh is performed immediately before `Ready for Billing`.
8. Package becomes `Ready for Billing` only after measurement is complete and an active pricing record exists.

## CBM formula

For centimeters: `(Length × Width × Height × Quantity) / 1,000,000`.
The API also accepts `m` and `mm` and normalizes them server-side.

## Source of truth

- Dimensions, CBM, weight, pricing, shipping cost and grand total are stored in MySQL through Laravel.
- Frontend values are inputs only; the server performs the final calculation.
- No hard-coded shipping rate is used by the warehouse flow.
- Pricing is selected by shipping mode, pricing type, origin, destination, active status and effective/expiry dates.

## Status rules

`In Transit / Cambodia Port / Customs → Cambodia Warehouse → Measurement Completed → Ready for Billing`

A package cannot be measured before it is physically received into Cambodia Warehouse, and it cannot be marked Ready for Billing before measurement is completed.
