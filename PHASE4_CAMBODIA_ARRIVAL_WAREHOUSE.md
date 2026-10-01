# HFL Logistics — Phase 4: Cambodia Arrival + Cambodia Warehouse

Customer/User Login is intentionally unchanged.

## Operational rule

Container movement and package warehouse receiving are separate operations.

- Container/Shipment status is controlled by the Container transition flow.
- A single package being received must never automatically move the entire container or shipment.
- A package can be physically stored only after it is in a Cambodia-side arrival state.

## Cambodia flow

1. Container: In Transit
2. Container: Cambodia Port
3. Container: Customs
4. Container: Cambodia Warehouse
5. Package: Arrived Cambodia / Cambodia Warehouse
6. Warehouse staff scans the Package ID or Tracking Number.
7. Staff confirms the physical warehouse bin/location.
8. Package is stored at `Cambodia Warehouse`.
9. Staff measures all boxes and weight.
10. Server calculates final CBM and refreshes the pricing snapshot.
11. Package becomes `Measurement Completed`.
12. Staff marks `Ready for Billing`.
13. Billing/Invoice can then use the final package values.

## Important data rule

`POST /cambodia-warehouse/packages/{id}/receive` updates only the selected package.
It does NOT update the container or shipment. Container/Shipment transitions remain under:

`POST /containers/{id}/transition`

## Scan

Cambodia Warehouse Scan uses the backend package scan endpoint:

`GET /packages/scan?value=...`

Supported identifiers include Package ID, code, Tracking Number, Customer ID, Customer Name and Product Name.

## Measurement

The server remains the source of truth for CBM:

`Length × Width × Height × Quantity`

with unit normalization for cm, m and mm.

## Safety

- Do not measure a package before Cambodia warehouse receiving.
- Do not mark Ready for Billing before a valid measurement/weight is available.
- Do not move a whole container because one package was scanned.
- Every receiving and measurement action creates a Package Tracking Event.
