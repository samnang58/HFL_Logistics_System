# Customer Username + Password

- Add/Edit Customer: "Company Name" field replaced by **Username**; new **Password** field with Show / Generate.
- Customer ID (HFL00001...) is still created automatically. Username defaults to the Customer ID when left blank.
- Password is stored hashed in `customers.password` (never returned by the API). Editing a customer: blank password = keep current.
- Existing `company_name` values are kept in the database (no longer edited in this form and no longer overwritten).
- Run `php artisan migrate` (adds `customers.password`).
- Existing customers have no password yet: open Edit and set one.
- NOTE: this stores the credentials. A customer sign-in endpoint / portal that uses them is a separate step.
