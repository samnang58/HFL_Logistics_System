# HFL Logistics — Phase 3: Container + Shipment Operations

This phase keeps Customer/User Login unchanged and focuses on the China → Cambodia operational chain.

## Operational flow

1. Create/identify a Shipment.
2. Create a Container and link it to the Shipment with `shipment_id`.
3. Load eligible Packages into the Container.
4. Loading a package creates a package Tracking Event and changes its operational status to `Loading`.
5. Move the Container through the controlled lifecycle:
   - Pending
   - Loading
   - Departed China
   - In Transit
   - Cambodia Port
   - Customs
   - Cambodia Warehouse
   - Delivered
6. Each transition creates a Container Tracking Event.
7. Each relevant transition propagates to the Container's Packages and creates Package Tracking Events.
8. If the Container is linked to a Shipment, the Shipment status and Shipment Tracking Event are updated too.

## Safety rules

- A delivered/cancelled package cannot be loaded into a container.
- A package cannot be actively loaded into two different containers at the same time.
- Container transitions cannot move backwards through the operational lifecycle.
- The frontend uses the transition endpoint instead of directly changing the container status.
- Package, Container and Shipment movement is recorded in tracking events for auditability.

## API

`POST /api/v1/containers/{id}/packages`

Attach selected packages to a container.

`POST /api/v1/containers/{id}/transition`

Payload:

```json
{
  "status": "In Transit",
  "location": "South China Sea",
  "event_date": "2026-09-21 08:30:00",
  "remarks": "Container departed China"
}
```

## Frontend

Container Control now provides:

- Load Packages
- Update Movement
- Controlled lifecycle statuses
- Package/CBM/weight totals
- Container timeline
- Shipment relationship

Customer Login/User Login was intentionally not changed in Phase 3.
