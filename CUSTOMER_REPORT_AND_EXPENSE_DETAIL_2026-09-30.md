# Expense detail + Customer report (Excel)

- Finance Control Center > Expenses: the list was empty because the paginated API response was read wrongly. Fixed.
- Click an expense row: window with customer, delivery no., address, package tracking, goods, driver/company,
  payment, notes, who recorded it; Mark Paid / Cancel inside.
- New "Customer Report" tab: per customer -> invoiced, paid, outstanding, cost paid/pending, net (paid - cost).
  Date filter, click a row for payments / invoices / costs, "Excel" per customer,
  "Download Excel (all customers)" = summary sheet + one sheet per customer.
- Expenses tab also has "Download Excel" for the expense list.
- Excel files are real .xlsx made in the browser (no extra npm package).
- Costs are linked to a customer through the package or delivery they were recorded on.
  Costs recorded without a package/delivery are shown as "not linked to any customer".
- No migration needed for this step (backend: GET /expenses, GET /expenses/{id}, GET /reports/customer-finance).
