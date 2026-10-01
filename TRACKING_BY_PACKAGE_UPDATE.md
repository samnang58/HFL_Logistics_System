# HFL Tracking by Package Update

Tracking now keeps package-level lookup visible and separate from container lookup.

Search supports:
- HFL Tracking (`tracking_number`)
- China Delivery Tracking (`china_waybill_number`)
- HFL Package Code (`hfl_package_code`)
- Package ID (`package_id`)
- Container Number
- Shipment Number
- Customer ID/name/phone

When a package identifier is searched, the API also returns the container containing that package. The UI shows all three identifiers separately so a package can be traced from China delivery -> China warehouse -> container -> Cambodia warehouse -> delivery.
