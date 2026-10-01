# HFL Logistics — Phase 1 Core Logistics Flow

Customer Login / User Login is intentionally unchanged in this phase.

## Implemented

1. China/Cambodia warehouse receiving now propagates the package movement to linked containers and shipments.
2. Container location/status updates now propagate operational status to linked packages and the parent shipment, with tracking timeline events.
3. Loading packages into a container now records package status as `Loading` and creates a package tracking event.
4. Cambodia warehouse final measurement now recalculates the package pricing snapshot from the active database pricing after CBM/weight changes.
5. Package box count now sums box quantities instead of only counting dimension rows.

## Operational flow covered

Package → China Warehouse → Container → Shipment → In Transit → Cambodia Warehouse → Measurement/CBM → Pricing refresh → Billing-ready.

## Verification

- PHP syntax checks: passed for modified controllers.
- Laravel route registration: 93 API routes registered successfully.
- Frontend build in the supplied ZIP could not be completed because the bundled `node_modules` is missing Rollup's Linux optional native package. Reinstall dependencies on the target machine before building.
- PHPUnit could not run in this environment because the PHP DOM extension is unavailable.

## Next phase

Next, harden Package/Shipment/Container data relationships, warehouse scan workflow, China API sync reliability, and billing handoff without changing Customer Login/User Login.
