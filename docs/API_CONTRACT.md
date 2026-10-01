# HFL Logistics API Contract

Base URL: `/api/v1`

## Authentication
- POST `/auth/login`
- POST `/auth/logout`
- GET `/auth/me`

## Core resources
- GET/POST `/customers`
- GET/PUT/DELETE `/customers/{id}`
- GET/POST `/packages`
- GET/PUT `/packages/{id}`
- POST `/packages/{id}/confirm-received` (only after Delivery is Delivered)
- GET `/tracking/{trackingNumber}`
- GET/POST `/shipments`
- GET/PUT `/shipments/{id}`
- GET/POST `/pricing`
- PUT `/pricing/{id}`
- GET/POST `/invoices`
- GET/PUT `/invoices/{id}`
- GET/POST `/payments`
- GET/POST `/income`
- GET/POST/PUT `/expenses`
- GET/POST/PUT `/crm/leads`
- GET `/dashboard`
- GET `/reports/shipments`
- GET `/reports/customers`
- GET `/reports/sales`
- GET `/reports/finance`
- GET `/reports/warehouse`

## Response envelope
Success: `{ "success": true, "message": "Success", "data": {} }`
Validation: `{ "success": false, "message": "Validation failed", "errors": {} }`

## Financial invariants
- CBM: `(L × W × H × quantity) / 1,000,000` for cm.
- Shipping cost: `chargeable CBM × rate`.
- Outstanding: `grand total − confirmed payments`.
- Net profit: `total income − total expenses`.
- Payment → invoice balance/status → income must execute in one DB transaction and must be idempotent.
