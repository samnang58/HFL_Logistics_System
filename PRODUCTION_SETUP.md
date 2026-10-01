# HFL Logistics — Production Setup

## Backend

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan route:list --path=packages
```

Configure MySQL and `APP_TIMEZONE=Asia/Phnom_Penh` in `.env`.

Before billing packages, create the required **Active Pricing** records in the Pricing module. Pricing is database-driven and is intentionally not hard-coded into the application.

## Frontend

```bash
npm ci
npm run build
npm run dev
```

Set `VITE_API_URL` in `.env` to the Laravel API, for example:

```text
VITE_API_URL=http://127.0.0.1:8000/api/v1
```

## Recommended smoke test

Use one test package and verify the exact sequence:

```text
China Sync
→ China Warehouse Receive
→ Container / Shipment
→ In Transit
→ Cambodia Warehouse Receive
→ Measurement
→ Ready for Billing
→ Invoice
→ Payment
→ Ready for Delivery
→ Scheduled
→ Out for Delivery
→ Delivered + POD
→ Customer Received
```

Do not manually edit package status to skip a workflow stage.
