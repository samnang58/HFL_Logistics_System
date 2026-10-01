# Container Movement -> Tracking Single Source of Truth

## Rule
04. Containers > Update Movement is the operational source of truth for container transport status/location.
06. Tracking is read-only for transport movement and reads the same container tracking events.

## Flow
Container YCL... -> container_tracking_events -> 06 Tracking search -> Package/Container current status + location + timeline

## Package lookup
Searching HFL Tracking, China Delivery Tracking, HFL Package Code, Package ID, Container Number or Shipment resolves the related package/container relationship. When a package belongs to a container, Tracking exposes the latest container movement, container number and shipment number.

## Fixes included
- TrackingEvent.event_at is cast to datetime/Carbon.
- TrackingController defensively parses event timestamps before comparing them.
- PricingController regex normalization fixed so origin names such as Foshan/Guangzhou do not trigger a PHP regex server error.
- No migration reset or data deletion was performed.
