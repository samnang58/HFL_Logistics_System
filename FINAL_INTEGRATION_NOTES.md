# HFL Logistics — Final Integration Notes

## API-first corrections
- Pricing Management now reads/writes pricing through Laravel `/api/v1/pricing` instead of localStorage.
- Pricing lookup uses Laravel `/api/v1/pricing/find`; invoice generation remains server-side.
- Sales Customer Overview now reads customers through Laravel `/api/v1/customers`.
- Customer Portal local login remains intentionally untouched, per project instruction.

## Production source of truth
Operational entities must come from MySQL through Laravel: customers, packages, shipments, containers, tracking events, pricing, invoices, payments, deliveries, income, expenses, and reports.

## Validation
Run locally after extracting:
```bash
npm install
npm run build
cd backend && composer install && php artisan migrate && php artisan route:list
```

## Known environment limitation
Dependency installation/build was not completed in the build environment because `npm ci` timed out.
