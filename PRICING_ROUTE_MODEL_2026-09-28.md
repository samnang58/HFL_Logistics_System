# HFL Logistics — Pricing Route Model

## Business rule

HFL ships from multiple China origins to one Cambodia destination warehouse.
Pricing is matched by:

**China Origin + Shipping Mode + Pricing Type + Rate Type → Cambodia Warehouse**

### China origins
- Foshan
- Guangzhou
- Yiwu

### Shipping modes
- SEA
- LAND
- AIR

### Destination
- Cambodia Warehouse (one logical final destination)

Examples:
- Foshan + SEA + GC + CBM → Cambodia Warehouse
- Foshan + LAND + GC + CBM → Cambodia Warehouse
- Guangzhou + SEA + GC + CBM → Cambodia Warehouse
- Guangzhou + LAND + GC + CBM → Cambodia Warehouse
- Yiwu + SEA + GC + CBM → Cambodia Warehouse
- Yiwu + LAND + GC + CBM → Cambodia Warehouse

Rates are stored in Laravel/MySQL. The application does not invent missing rates.

## Important

`Phnom Penh`, `Phnom Penh Warehouse`, `Phnom Penh Cambodia Warehouse`, and `Cambodia Warehouse` are normalized as the same final destination for pricing matching.

Origin labels such as `Guangzhou`, `Guangzhou Warehouse`, and `Guangzhou, China` are normalized for matching.

## Billing

When a package is at `Cambodia Warehouse` / eligible billing status, Billing resolves the active pricing using the package origin and shipping mode. If no matching active rate exists, Billing shows a pricing configuration error instead of silently using a wrong rate.

## No database reset

Do not run `php artisan migrate:fresh` on an existing HFL database.
