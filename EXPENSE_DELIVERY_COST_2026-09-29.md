# Expense / Delivery cost management

- 05 Delivery page: each delivery has a "+ Cost" button (Tuk Tuk, VET, Grab, Rental Van, Motorbike, Other).
  Saved as an Expense of type "Delivery Cost" linked to the delivery and package.
- Finance Control Center > Expenses tab: delivery cost summary (fee charged, cost paid, margin, pending, by transport),
  full expense list, "+ Record Expense" for other costs, and per-row "Mark Paid" / "Cancel".
- Only Paid expenses are deducted from profit (Finance and Dashboard now use the same rule). Pending and Cancelled are not.
- Run `php artisan migrate` (adds expenses.delivery_id).
