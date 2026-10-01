# HFL Mock China API (Development Only)

This sandbox provides 50 deterministic package records assigned to 5 containers so the HFL Tracking and Container workflow can be tested before connecting the real China API.

## Endpoints

Authenticated through the existing HFL API token:

- `GET /api/v1/china-sync/mock/data` — returns the 50 mock upstream records without writing to HFL.
- `POST /api/v1/china-sync/mock/sync` — imports the 50 records into HFL MySQL, creates/updates 5 containers, attaches packages, and creates package/container tracking events.
- `GET /api/v1/tracking/search?q=...` — searches both packages and containers by tracking/package/customer/container/location/status.

## UI

Go to **01 · China API Sync** and click **Load Mock API · 50 Packages / 5 Containers**.

Then go to **06 · Tracking** and search for a mock tracking number such as `777777777001` or a mock container such as `YCL269191`.

Mock data is for development/testing only and should not be used as real shipment data.
