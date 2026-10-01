# HFL Logistics ERP — Final Working Package

## Architecture
React/Vite → Laravel REST API → MySQL

## Main flow
Customer → Package → China Warehouse → Container → Shipment → Cambodia Warehouse → Pricing → Invoice/Bill → Payment → Receipt → Delivery

## Backend
1. `cd backend`
2. `cp .env.example .env` (or configure your existing `.env`)
3. Set MySQL values and China API credentials.
4. `php artisan key:generate` if needed.
5. `php artisan migrate`
6. `php artisan serve --host=127.0.0.1 --port=8002`

## Frontend
1. From project root run `npm install`
2. Optional: create `.env` with `VITE_API_URL=http://127.0.0.1:8002/api/v1`
3. `npm run dev`

## Important
- `node_modules` is intentionally excluded from this package; install dependencies on the target machine.
- Secrets are not included. Put the China API token in `backend/.env`.
- `hfl_auth_token` is the frontend authentication storage key.
- Business data should come from Laravel/MySQL, not localStorage.
