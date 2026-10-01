# HFL Logistics — Container → Tracking Sync

## Rule
`04. Containers` is the single source of truth for transport movement.
`06. Tracking` is the read-only tracking view of that movement.

When a container movement is updated, Tracking uses the latest Container Movement for:
- Current status
- Current location
- Container number
- Shipment number
- Transport timeline

Package-only events after the container transport timeline (billing/delivery/POD) can still appear after the container timeline.

## Identifier rules
- Container Number: `YCL...`
- HFL Tracking: `YC...`
- China Delivery Tracking: original China courier tracking
- Package ID: `PKG-...`

## Important behavior
Updating `04. Containers → Update Movement` to `Received` / `Cambodia Warehouse` / `Delivered` also refreshes each linked package's visible warehouse location so Tracking does not keep showing the old China warehouse location.

## Run
Backend:
```bash
cd ~/Downloads/hfl_update-4-2/backend
composer install
php artisan optimize:clear
php artisan serve --port=8003
```

Frontend:
```bash
cd ~/Downloads/hfl_update-4-2
npm install
printf 'VITE_API_URL=http://127.0.0.1:8003/api/v1\n' > .env
npm run dev
```

Do not run `migrate:fresh`.
