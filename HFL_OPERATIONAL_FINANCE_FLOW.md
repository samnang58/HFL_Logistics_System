# HFL Logistics — Operational + Finance Flow

## 1. Main business flow

Customer
→ Package / China Tracking
→ China Warehouse Receive
→ HFL Package Code
→ Container
→ Shipment
→ Cambodia Arrival
→ Cambodia Warehouse Receive
→ Measure CBM / Weight
→ Ready for Billing
→ Invoice
→ Customer Payment
→ Ready for Delivery
→ Delivery
→ Customer Received

## 2. Money flow

### Customer money
Invoice → Payment → Receipt → Income → Customer Statement

- Invoice = amount HFL charges the customer.
- Payment = money actually received.
- Income = accounting record created from a confirmed payment.
- Outstanding = invoice amount still to be collected.

### Company money
Expense → Pending / Paid → Cash Out

Expense can be linked to:
- Shipment
- Container
- Package

Examples:
- China freight
- Customs / port charges
- Warehouse cost
- Truck / delivery cost
- Fuel
- Staff / administrative expense
- Other operating cost

## 3. Finance dashboard meaning

- Total Income = confirmed customer money received.
- Total Expenses = paid company expenses.
- Net Profit = Total Income - Total Expenses (cash-basis operational view).
- Outstanding = unpaid customer invoices.
- Pending Expenses = company expenses recorded but not yet paid.
- Payable = Pending Expenses.

## 4. Operational status rules

Package:

`Order Created`
→ `Received at China Warehouse`
→ `Waiting Shipment`
→ `In Transit`
→ `Cambodia Port`
→ `Customs`
→ `Arrived Cambodia`
→ `Cambodia Warehouse`
→ `Measurement Completed`
→ `Ready for Billing`
→ `Invoiced`
→ `Partially Paid` / `Ready for Delivery`
→ `Scheduled`
→ `Out for Delivery`
→ `Delivered`
→ `Customer Received`

## 5. Identifier rules

- Customer ID: `HFL00001`
- Package ID: `PKG-000001`
- China Tracking / Waybill: original seller/courier number
- HFL China Package Code: generated only after physical China warehouse receipt
- Container Number: separate container identifier
- Shipment Number: separate shipment identifier
- Payment: `HFL-PAY-000001`
- Receipt: `HFL-RCP-000001`
- Expense: `HFL-EXP-000001`

## 6. Important accounting rule

Do not treat an invoice as cash received.

An invoice creates **Accounts Receivable**.
A confirmed payment creates **Cash In + Income**.
A paid expense creates **Cash Out + Expense**.

This keeps the finance dashboard useful for daily logistics operations.
