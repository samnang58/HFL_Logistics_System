# HFL Mock China API - Test Guide

## Purpose

This is a development-only Mock China Warehouse API. It lets HFL test the complete integration flow before the China team provides the production API.

The mock source is inside the Laravel backend, so the frontend never talks directly to a China provider.

Flow:

User/Admin -> HFL Frontend -> HFL Laravel API -> Mock China API
                                      |
                                      +-> MySQL
                                      +-> Tracking
                                      +-> Containers
                                      +-> ETA / Location

## Seed data

- 50 packages
- 5 containers
- 10 packages per container
- 50 tracking numbers: CNMOCK0001 ... CNMOCK0050
- Container numbers: HFLMOCK240001 ... HFLMOCK240005
- Tracking events and ETA values

## Endpoints

All endpoints require the normal HFL Sanctum login token because they are protected by the same API middleware as the rest of the admin system.

Base URL:

    http://127.0.0.1:8000/api/v1

Mock endpoints:

    GET  /china-sync/mock/status
    GET  /china-sync/mock/data
    GET  /china-sync/mock/packages
    GET  /china-sync/mock/packages/CNMOCK0001
    GET  /china-sync/mock/containers
    GET  /china-sync/mock/containers/HFLMOCK240001
    POST /china-sync/mock/sync

## Test steps

1. Start Laravel:

    cd backend
    composer install
    php artisan migrate
    php artisan serve

2. Start frontend:

    npm install
    npm run dev

3. Login as HFL admin.

4. Open `01 · China API Sync`.

5. Confirm the page says `Mock API Mode`.

6. Click `Load Mock API · 50 Packages / 5 Containers`.

7. Open `03 · Packages` and verify the imported tracking numbers and container numbers.

8. Open `06 · Tracking`.

9. Search `CNMOCK0001`.

10. Search `HFLMOCK240001`.

The expected relationship is:

    Tracking Number
        -> Package
        -> Container
        -> Shipment
        -> Current Location
        -> ETA
        -> Tracking Timeline

## Switching to the China team's real API

When the China team provides the production API, do not change the frontend tracking flow.

In `backend/.env`:

    CHINA_API_MODE=real
    CHINA_API_URL=<real URL>
    CHINA_API_TOKEN=<secret token>

Keep the token only on the backend. Never put it in React/Vite environment variables or browser code.

Then clear Laravel config cache and restart the backend.

The frontend can continue to use the same HFL API and the same tracking/container screens.

## User access later

After the integration is verified, create normal HFL users with roles/permissions. Users should call only HFL endpoints. The China API credential remains server-side.

## Important

Mock data is fictional and must never be presented to customers as live China tracking data. The mock endpoints are for development/staging only.
