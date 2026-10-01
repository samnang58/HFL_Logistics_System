# HFL Logistics - Tracking Module Fix

This build wires the Tracking Number navigation to the real TrackingManagement page.

## Tracking routes
- `/tracking-number` -> TrackingManagement
- `/tracking` -> TrackingManagement
- Home: Track Your Package -> `/tracking-number`
- Home: Create Shipment -> `/shipments`
- Package Details: Tracking -> `/tracking-number?tracking=...`

## Tracking features
- Search packages through Laravel API
- Search by Tracking Number / Package ID / Customer ID / Customer Name / Phone / Container / Shipment when supported by the API search endpoint
- Scan input for USB/Bluetooth barcode scanners
- Print tracking history
- Add Tracking Event through Laravel API
- Tracking timeline uses API data; localStorage is only used by the existing auth token mechanism

## Run frontend on Mac
```bash
npm install
npm run dev
```

If npm reports a Rollup optional-dependency error, run:
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## Run Laravel backend
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan serve
```

Keep the backend running at `http://127.0.0.1:8000` and configure `VITE_API_URL` if needed.
