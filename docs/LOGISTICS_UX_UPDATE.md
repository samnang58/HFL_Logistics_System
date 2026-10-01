# HFL Logistics UX Update

## Phase 2 — Package Control Center

The Package page has been reorganized around daily logistics operations:

- Package Control Center instead of a generic package list
- Operational queues: China Warehouse, In Transit, Cambodia, Delivery, Delivered, Exceptions
- Search by package ID, tracking number, customer, and product
- Status and shipping-mode filters
- Next Action guidance for operators
- China synchronization action remains connected to the existing API service
- Receive Package / manual package entry remains available for exceptional cases
- Package 360 route remains `/hfl-package/:id`
- CBM and weight calculations remain available in the package form
- Existing backend/API/database files were not intentionally changed

## Workflow

China Receiving
→ Measurement
→ Shipment Preparation
→ Container / Shipment
→ In Transit
→ Cambodia Warehouse
→ Delivery Queue
→ Delivered

## Installation

This archive intentionally excludes `node_modules` and Laravel `vendor` directories.

Frontend:
```bash
npm install
npm run dev
```

Backend:
```bash
cd backend
composer install
php artisan optimize:clear
php artisan serve --host=127.0.0.1 --port=8002
```
