# HFL Logistics — Phase 2: Package + China Warehouse + Scan + Sync

## Implemented
- Package scan endpoint: `GET /api/v1/packages/scan?value=...`
- Scan searches Package ID, code, tracking number, customer ID/name and product name.
- China warehouse physical receipt endpoint: `POST /api/v1/packages/{id}/receive-china`
- China Warehouse UI now has **Scan Package** and **Confirm Received** actions.
- China API remains backend-only; token is not exposed to the frontend.
- Frontend API default was aligned to Laravel port `8000`.

## Operational rule
China API synchronization imports/updates records. Warehouse staff confirmation is a separate physical-receipt action so imported data is not incorrectly treated as physically received.

## Run
Frontend:
```bash
npm install
npm run dev
```

Backend:
```bash
cd backend
composer install
php artisan migrate
php artisan serve
```

China API environment:
```env
CHINA_API_URL=...
CHINA_API_TOKEN=...
CHINA_API_ENDPOINT=/api/WayBill/QueryWayBillSpeed
```
