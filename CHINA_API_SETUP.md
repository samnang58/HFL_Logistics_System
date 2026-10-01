# HFL Package — China API Integration

`HFL Package` is the central package hub. The primary source of package records is the configured China package API.

## Backend environment

Copy `backend/.env.example` to `backend/.env` and set:

```env
CHINA_PACKAGE_API_URL=https://your-china-api.example/packages
CHINA_PACKAGE_API_TOKEN=your-token
CHINA_PACKAGE_API_TIMEOUT=30
```

The API adapter accepts a JSON array or common wrappers such as:

```json
{"data": [ ... ]}
```

or

```json
{"packages": [ ... ]}
```

Each package should provide at minimum a unique `tracking_number`. Common field aliases are supported for tracking number, customer, product, warehouse, shipping mode, boxes, status, and ETA.

## Sync flow

```text
China API
  -> POST /api/v1/packages/sync-china
  -> validate + deduplicate by tracking_number
  -> create/update packages
  -> create initial tracking event for new packages
  -> persist sync log
```

The frontend `HFL Package` page calls the backend API. It does not use localStorage for package business data.

If `CHINA_PACKAGE_API_URL` is not configured, the Sync button returns a clear configuration error instead of inventing/mock data.

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

Set `VITE_API_URL` in the frontend `.env` if the Laravel API is not at the default `http://localhost:8000/api/v1`.

## Yangcheng / 海发物流 sync

The production adapter uses the observed browser endpoint:

- Base URL: `https://ycserver.zq-zn.com`
- Endpoint: `/api/WayBill/QueryWayBillSpeed`
- Method: `POST` with `application/x-www-form-urlencoded`
- Authentication token stays on the Laravel backend in `CHINA_API_TOKEN`.

HFL reads the China `Number` as the package/waybill tracking source and `InsideNO` as the container identifier. A container is created automatically when a previously unseen `InsideNO` is received, and the package is linked to that container. The container number is never hard-coded in application code.

The sync is paginated. Leaving the UI filters empty fetches all pages returned by the China API (subject to `CHINA_API_MAX_PAGES`).

### Automatic hourly sync

Laravel schedules `china:sync` hourly. On a local machine, keep the scheduler running with:

```bash
php artisan schedule:work
```

Manual sync:

```bash
php artisan china:sync
```

Optional container-only sync:

```bash
php artisan china:sync --container="YCL269171柜"
```

Do not put the China token in React, Git, or the frontend `.env`.
